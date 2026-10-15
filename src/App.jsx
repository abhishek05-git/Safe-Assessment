import React, { useState, useMemo, useEffect } from 'react'
import { useStore, load, save } from './hooks/useStore'
import * as D from './data/config'

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
 * Root application component — manages view routing, persisted configuration, and participant state.
 *
 * Views: 'landing' | 'info' | 'otp' | 'waiting' | 'test' | 'result' | 'admin'
 *
 * Details persistence:
 * - Candidate information is preserved so details do not vanish on refresh.
 * - Completed assessment results and reports are saved and persist across reloads.
 * - Admin configuration changes (questions, profiles, settings) are saved locally and synced with the server.
 */
export default function App() {
  const [view, setView] = useStore('safe_view', 'landing')
  const [qs, setQs] = useStore('safe_questions_v11', D.questions)
  const [profiles, setProfiles] = useStore('safe_profiles', D.profiles)
  const [sections, setSections] = useStore('safe_sections', D.reportSections)
  const [settings, setSettings] = useStore('safe_settings', DEFAULT_SETTINGS)
  const [approvals, setApprovals] = useState({})

  // Persistent user details and assessment result so details don't vanish on navigation/refresh
  const [user, setUser] = useStore('safe_user', {})
  const [result, setResult] = useStore('safe_result', null)

  // Only questions with active=true are shown during the assessment
  const activeQuestions = useMemo(() => qs.filter(q => q.active), [qs])

  // Sync cloud configuration from server on mount if set by admin
  useEffect(() => {
    fetch('/api/config')
      .then(r => r.json())
      .then(d => {
        if (d && d.hasCustomConfig && d.config) {
          if (Array.isArray(d.config.questions) && d.config.questions.length > 0) {
            setQs(d.config.questions)
          }
          if (d.config.profiles && typeof d.config.profiles === 'object') {
            setProfiles(d.config.profiles)
          }
          if (d.config.sections && typeof d.config.sections === 'object') {
            setSections(d.config.sections)
          }
          if (d.config.settings && typeof d.config.settings === 'object') {
            setSettings(d.config.settings)
          }
        }
      })
      .catch(() => {})
  }, [])

  // Restore authenticated participant profile from session if session cookie exists
  useEffect(() => {
    let isMounted = true
    fetch('/api/auth/me', {
      credentials: 'include',
      headers: { 'Accept': 'application/json' }
    })
      .then(res => res.json())
      .then(data => {
        if (isMounted && data.authenticated && data.user) {
          setUser(prev => ({ ...prev, ...data.user }))
        }
      })
      .catch(() => {})
    return () => { isMounted = false }
  }, [])

  // Ensure all 16 profile codes exist without overwriting admin's custom edits
  useEffect(() => {
    if (profiles) {
      let changed = false
      const updated = { ...profiles }
      for (const [code, def] of Object.entries(D.profiles)) {
        if (!updated[code]) {
          updated[code] = def
          changed = true
        } else if (!updated[code].image && def.image) {
          updated[code] = { ...updated[code], image: def.image }
          changed = true
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
    const currentUser = verifiedUser ? { ...user, ...verifiedUser } : user
    setUser(currentUser)

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
    // If a result is already present, view the result report
    if (result) {
      setView('result')
      return
    }

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

  /* ── Authoritative Server-Side Scoring & Submission (P0 Item 2) ── */
  const handleFinish = async (answers, durationMs) => {
    const timeSpentMs = durationMs != null ? durationMs : 0

    try {
      const res = await fetch('/api/assessment/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ answers, durationMs: timeSpentMs })
      })

      const data = await res.json().catch(() => ({}))

      if (!res.ok || !data.success || !data.result) {
        const errorMsg = data.error || 'Server rejected submission or failed to record result.'
        console.error('Server submission failed:', errorMsg)
        return { success: false, error: errorMsg }
      }

      // Authoritative result returned exclusively by server (P0 Item 2)
      const resPayload = data.result
      setResult(resPayload)
      save('safe_result', resPayload)

      // Add to local historical records for admin dashboard
      const currentResults = load('safe_results', [])
      const email = (user['Email Id'] || user['Email'] || '').trim().toLowerCase()
      const record = {
        id: Date.now(),
        user,
        date: new Date().toISOString(),
        answers,
        code: resPayload.code,
        type: resPayload.type,
        timeSpent: resPayload.timeSpent,
        timeSpentMs: resPayload.timeSpentMs || timeSpentMs,
      }
      const filteredResults = currentResults.filter(r =>
        (r.user?.['Email Id'] || r.user?.['Email'] || '').trim().toLowerCase() !== email
      )
      save('safe_results', [...filteredResults, record])

      // Clean up temporary local markers
      localStorage.removeItem('safe_progress')
      localStorage.removeItem('safe_idx')
      localStorage.removeItem('safe_timer_start')

      setView('result')
      return { success: true }
    } catch (err) {
      console.error('Submission network error:', err)
      return {
        success: false,
        error: 'Network connection error while contacting scoring server. Please check your internet connection and retry.'
      }
    }
  }

  /* ── Retake Assessment ── */
  const handleRetake = async () => {
    localStorage.removeItem('safe_progress')
    localStorage.removeItem('safe_idx')
    localStorage.removeItem('safe_timer_start')
    localStorage.removeItem('safe_result')
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

    localStorage.removeItem('safe_user')
    localStorage.removeItem('safe_result')
    localStorage.removeItem('safe_view')
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
