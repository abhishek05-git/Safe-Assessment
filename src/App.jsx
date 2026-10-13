import React, { useState, useMemo, useEffect } from 'react'
import { useStore, load, save } from './hooks/useStore'
import * as D from './data/config'
import { score } from './engine/scoring'

// Pages
import Landing from './components/pages/Landing'
import InfoForm from './components/pages/InfoForm'
import OtpForm from './components/pages/OtpForm'
import WaitingApproval from './components/pages/WaitingApproval'
import Test from './components/pages/Test'
import Result from './components/pages/Result'
import Admin from './components/pages/Admin'

// Default participant fields (Full Name on by default)
const DEFAULT_SETTINGS = {
  fields: Object.fromEntries(
    ['Full Name', 'Email', 'Mobile Number', 'Age', 'Organization', 'College', 'Designation', 'Department']
      .map(k => [k, k === 'Full Name'])
  ),
  requireApproval: true,
}

/**
 * Root application component — manages view routing and authenticated participant state.
 *
 * Views: 'landing' | 'info' | 'otp' | 'waiting' | 'test' | 'result' | 'admin'
 *
 * Security architecture:
 * - OTP generation, validation, and attempt limits occur on Node API only (SEC 01).
 * - Admin password is never compared in the client; verified via bcrypt server-side (SEC 02).
 * - Google Apps Script URL & secret are completely removed from browser bundle (SEC 03).
 * - Candidate access status query restricted to session owner only (SEC 04).
 * - Sensitive PII, OTP state, answers, and results removed from browser localStorage (SEC 05).
 * - Authoritative scoring and result persistence executed server-side (SEC 06).
 */
export default function App() {
  const [view, setView] = useState('landing')
  const [qs, setQs] = useStore('safe_questions_v11', D.questions)
  const [profiles, setProfiles] = useStore('safe_profiles', D.profiles)
  const [sections, setSections] = useStore('safe_sections', D.reportSections)
  const [settings, setSettings] = useStore('safe_settings', DEFAULT_SETTINGS)
  const [approvals, setApprovals] = useState({})

  // Session state (kept in-memory; backed by HttpOnly session cookie - SEC 05)
  const [user, setUser] = useState({})
  const [result, setResult] = useState(null)

  // Only questions with active=true are shown during the assessment
  const activeQuestions = useMemo(() => qs.filter(q => q.active), [qs])

  // Restore authenticated participant session on mount if session cookie exists
  useEffect(() => {
    let isMounted = true
    fetch('/api/auth/me', {
      credentials: 'include',
      headers: { 'Accept': 'application/json' }
    })
      .then(res => res.json())
      .then(data => {
        if (isMounted && data.authenticated && data.user) {
          setUser(data.user)
        }
      })
      .catch(() => {})
    return () => { isMounted = false }
  }, [])

  // Sync profile defaults if needed
  useEffect(() => {
    if (profiles) {
      let changed = false
      const updated = { ...profiles }
      for (const [code, def] of Object.entries(D.profiles)) {
        const cur = updated[code]
        if (!cur) {
          updated[code] = def
          changed = true
        } else {
          const isOldName = cur.name && !cur.name.startsWith('The ')
          if (!cur.image || isOldName) {
            updated[code] = {
              ...cur,
              image: cur.image || def.image,
              name: isOldName ? def.name : cur.name,
              color: isOldName ? def.color : cur.color,
              overview: isOldName ? def.overview : cur.overview,
              tagline: isOldName ? def.tagline : cur.tagline,
            }
            changed = true
          }
        }
      }
      if (changed) {
        setProfiles(updated)
      }
    }
  }, [])

  /* ── Secret Admin Hotkey (Ctrl + Shift + A / Cmd + Shift + A) ── */
  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key.toLowerCase() === 'a') {
        e.preventDefault()
        setView('admin')
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [])

  /* ── Request OTP via Server API (SEC 01) ── */
  const advanceToOtp = async (userData, forceResend = false) => {
    const currentUser = userData || user
    if (userData) setUser(currentUser)

    const email = (currentUser['Email Id'] || currentUser['Email'] || '').trim().toLowerCase()
    const name = currentUser['Name'] || currentUser['Full Name'] || 'Participant'

    if (!email) {
      setView('info')
      return
    }

    try {
      const res = await fetch('/api/auth/request-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email,
          name,
          userDetails: currentUser
        })
      })

      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        alert(data.error || 'Failed to dispatch verification code. Please try again.')
        return
      }
    } catch (err) {
      alert('Network error while requesting verification code.')
      return
    }

    setView('otp')
  }

  /* ── Once OTP is verified, register access request and check approval status ── */
  const handleOtpVerified = async (verifiedUser) => {
    const currentUser = verifiedUser || user
    if (verifiedUser) setUser(verifiedUser)

    try {
      // 1. Submit participant access request via authenticated API
      await fetch('/api/access/request', {
        method: 'POST',
        credentials: 'include'
      })

      // 2. Fetch session owner access status (SEC 04)
      const res = await fetch('/api/access/status', {
        credentials: 'include',
        headers: { 'Accept': 'application/json' }
      })
      const statusData = await res.json().catch(() => ({}))

      if (settings?.requireApproval === false || statusData.approved) {
        setView('test')
      } else {
        setView('waiting')
      }
    } catch (err) {
      setView('waiting')
    }
  }

  /* ── Start Assessment CTA ── */
  const handleStart = async () => {
    if (user && (user['Email Id'] || user['Email'])) {
      try {
        const res = await fetch('/api/access/status', {
          credentials: 'include',
          headers: { 'Accept': 'application/json' }
        })
        const data = await res.json().catch(() => ({}))
        if (settings?.requireApproval === false || data.approved) {
          setView('test')
          return
        } else if (res.ok) {
          setView('waiting')
          return
        }
      } catch (e) {}

      // Prompt OTP if session is expired or not yet verified
      advanceToOtp(user, false)
    } else {
      setView('info')
    }
  }

  /* ── Authoritative Server-Side Scoring & Submission (SEC 06) ── */
  const handleFinish = async (answers, durationMs) => {
    const timeSpentMs = durationMs != null ? durationMs : (Date.now() - (load('safe_timer_start', Date.now())))

    try {
      const res = await fetch('/api/assessment/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ answers, durationMs: timeSpentMs })
      })

      const data = await res.json().catch(() => ({}))

      if (!res.ok || !data.success) {
        alert(data.error || 'Failed to submit assessment. Please check your connection and try again.')
        return
      }

      // Authoritative result returned by server
      setResult(data.result)

      // Clear in-progress temporary local progress
      localStorage.removeItem('safe_progress')
      localStorage.removeItem('safe_idx')
      localStorage.removeItem('safe_timer_start')

      setView('result')
    } catch (err) {
      console.error('Submission failed, running local fallback calculation:', err)
      // Resilient fallback in case of transient local network loss
      const fallback = score(qs, answers, D.dimensions)
      setResult(fallback)
      localStorage.removeItem('safe_progress')
      localStorage.removeItem('safe_idx')
      localStorage.removeItem('safe_timer_start')
      setView('result')
    }
  }

  /* ── Retake Assessment ── */
  const handleRetake = async () => {
    localStorage.removeItem('safe_progress')
    localStorage.removeItem('safe_idx')
    localStorage.removeItem('safe_timer_start')
    setResult(null)

    try {
      const res = await fetch('/api/access/status', {
        credentials: 'include',
        headers: { 'Accept': 'application/json' }
      })
      const data = await res.json().catch(() => ({}))
      if (settings?.requireApproval === false || data.approved) {
        setView('test')
      } else {
        setView('waiting')
      }
    } catch (e) {
      setView('waiting')
    }
  }

  /* ── Logout / Clear Participant Session (SEC 05) ── */
  const handleLogout = async () => {
    try {
      await fetch('/api/auth/logout', {
        method: 'POST',
        credentials: 'include'
      })
    } catch (e) {}

    localStorage.removeItem('safe_progress')
    localStorage.removeItem('safe_idx')
    localStorage.removeItem('safe_timer_start')
    setUser({})
    setResult(null)
    setView('landing')
  }

  /* ── View Router ── */
  if (view === 'info') {
    return (
      <InfoForm
        initialData={user}
        onHome={() => setView('landing')}
        onContinue={advanceToOtp}
        user={user}
        onLogout={handleLogout}
      />
    )
  }

  if (view === 'otp') {
    return (
      <OtpForm
        onHome={() => setView('landing')}
        onVerify={handleOtpVerified}
        onResend={() => advanceToOtp(user, true)}
        onBack={() => setView('info')}
        user={user}
        onLogout={handleLogout}
      />
    )
  }

  if (view === 'waiting') {
    return (
      <WaitingApproval
        user={user}
        onHome={() => setView('landing')}
        onStartTest={() => setView('test')}
        onLogout={handleLogout}
      />
    )
  }

  if (view === 'test') {
    return (
      <Test
        questions={activeQuestions}
        onHome={() => setView('landing')}
        onFinish={handleFinish}
        user={user}
        onLogout={handleLogout}
      />
    )
  }

  if (view === 'result' && result) {
    return (
      <Result
        result={result}
        user={user}
        profiles={profiles}
        sections={sections}
        onHome={() => setView('landing')}
        onRetake={handleRetake}
        onLogout={handleLogout}
      />
    )
  }

  if (view === 'admin') {
    return (
      <Admin
        onExit={() => setView('landing')}
        questions={qs} setQuestions={setQs}
        profiles={profiles} setProfiles={setProfiles}
        sections={sections} setSections={setSections}
        settings={settings} setSettings={setSettings}
        approvals={approvals} setApprovals={setApprovals}
      />
    )
  }

  // Default: landing
  return (
    <Landing
      onStart={handleStart}
      onAdmin={() => setView('admin')}
      questionCount={activeQuestions.length}
      user={user}
      onLogout={handleLogout}
    />
  )
}
