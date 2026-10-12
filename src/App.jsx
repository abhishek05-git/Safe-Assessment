import React, { useState, useMemo, useEffect } from 'react'
import { useStore, load, save } from './hooks/useStore'
import * as D from './data/config'
import { score } from './engine/scoring'

// Pages
import Landing from './components/pages/Landing'
import InfoForm from './components/pages/InfoForm'
import OtpForm from './components/pages/OtpForm'
import Test from './components/pages/Test'
import Result from './components/pages/Result'
import Admin from './components/pages/Admin'

// Default participant fields (Full Name on by default)
const DEFAULT_SETTINGS = {
  fields: Object.fromEntries(
    ['Full Name', 'Email', 'Mobile Number', 'Age', 'Organization', 'College', 'Designation', 'Department']
      .map(k => [k, k === 'Full Name'])
  ),
}

/**
 * Root application component — manages view routing and all persisted state.
 *
 * Views: 'landing' | 'info' | 'test' | 'result' | 'admin'
 *
 * All question/profile/section/settings state is persisted to localStorage
 * via useStore so Admin changes survive page refresh.
 */
export default function App() {
  const [view, setView] = useState('landing')
  const [qs, setQs] = useStore('safe_questions_v10', D.questions)
  const [profiles, setProfiles] = useStore('safe_profiles', D.profiles)
  const [sections, setSections] = useStore('safe_sections', D.reportSections)
  const [settings, setSettings] = useStore('safe_settings', DEFAULT_SETTINGS)

  const [user, setUser] = useStore('safe_user', {})
  const [result, setResult] = useState(null)
  const [otpState, setOtpState] = useStore('safe_otp', { code: '', verified: false })

  // Only questions with active=true are shown during the assessment
  const activeQuestions = useMemo(() => qs.filter(q => q.active), [qs])

  // Sync all 16 profile images and 16Personalities defaults if not yet set in localStorage
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

  /* ── Secret Admin Hotkey ── */
  useEffect(() => {
    const handleKeyDown = (e) => {
      // Ctrl + Shift + A (or Cmd + Shift + A) to open Admin
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key.toLowerCase() === 'a') {
        e.preventDefault()
        setView('admin')
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [])

  // 👇 PASTE YOUR GOOGLE APPS SCRIPT WEB APP URL & SECRET TOKEN HERE 👇
  const GOOGLE_SHEET_URL = 'https://script.google.com/macros/s/AKfycbx4KboSPbs2JRquKk40gei6NYcCkm9HHu2ddmKHQvk3_UTLj9GZ2Knzk_lzeFoWWMkgVQ/exec'
  const SECRET_TOKEN = 'SAFE_2026_SECURE_TOKEN'

  /* ── Dispatch OTP Email ── */
  const dispatchOtpEmail = (code, targetUser) => {
    if (GOOGLE_SHEET_URL && targetUser['Email Id']) {
      try {
        const formData = new URLSearchParams()
        formData.append('Action', 'SEND_OTP')
        formData.append('SecretToken', SECRET_TOKEN)
        formData.append('Email', targetUser['Email Id'])
        formData.append('Name', targetUser['Name'] || 'Participant')
        formData.append('OTP', code)

        fetch(GOOGLE_SHEET_URL, {
          method: 'POST',
          mode: 'no-cors',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body: formData
        })
      } catch (e) {
        console.error('Failed to dispatch OTP', e)
      }
    }
  }

  /* ── Generate OTP & Advance ── */
  const advanceToOtp = (userData, forceResend = false) => {
    const currentUser = userData || user
    if (userData) setUser(userData)

    let codeToUse = otpState.code

    // Generate and send a new OTP if none exists, or if they explicitly clicked Resend
    if (!codeToUse || forceResend) {
      codeToUse = Math.floor(1000 + Math.random() * 9000).toString()
      setOtpState({ code: codeToUse, verified: false })
      dispatchOtpEmail(codeToUse, currentUser)
    }

    setView('otp')
  }

  /* ── Start Assessment ── */
  const handleStart = () => {
    // If user is already identified (has an email or name)
    if (user && (user['Email Id'] || user['Name'])) {
      const allResults = load('safe_results', [])
      const email = (user['Email Id'] || user['Email'] || '').trim().toLowerCase()
      const existing = allResults.find(r => 
        (r.user?.['Email Id'] || r.user?.['Email'] || '').trim().toLowerCase() === email
      )

      if (existing && existing.answers) {
        const r = score(qs, existing.answers, D.dimensions)
        setResult(r)
        setView('result')
        return
      }

      // If already verified, go straight to test
      if (otpState.verified) {
        setView('test')
      } else {
        // Go to OTP screen
        advanceToOtp(user, false)
      }
    } else {
      setView('info')
    }
  }

  /* ── Send to Google Sheets ── */
  const sendToSheets = (targetUser, statusCode, statusType) => {
    if (!GOOGLE_SHEET_URL) return
    try {
      // Find proper personality name (e.g. 'Idea Igniter') from code (e.g. 'ENTP')
      const codeKey = (statusCode || '').slice(0, 4)
      const resolvedType = profiles[codeKey]?.name || statusType || statusCode

      const formData = new URLSearchParams()
      formData.append('Action', 'SAVE_RESULT')
      formData.append('SecretToken', SECRET_TOKEN)
      formData.append('Date', new Date().toLocaleDateString())
      formData.append('Name', targetUser['Name'] || '')
      formData.append('Organization', targetUser['Name of the Organization'] || '')
      formData.append('Location', targetUser['Location'] || '')
      formData.append('Gender', targetUser['Gender'] || '')
      formData.append('DOB', targetUser['Date of Birth'] || '')
      formData.append('Phone', targetUser['Phone Number'] || '')
      formData.append('Email', targetUser['Email Id'] || '')
      formData.append('Result Code', statusCode)
      formData.append('Personality Type', resolvedType)

      fetch(GOOGLE_SHEET_URL, {
        method: 'POST',
        mode: 'no-cors',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: formData
      })
    } catch (e) {
      console.error('Failed to submit to Google Sheets', e)
    }
  }

  /* ── Called when the user submits the final answer ── */
  const handleFinish = (answers, durationMs) => {
    const r = score(qs, answers, D.dimensions)

    // Calculate accurate completion time (capped at 30 minutes)
    const timeSpentMs = durationMs != null ? durationMs : (Date.now() - (load('safe_timer_start', Date.now())))
    const mins = Math.floor(timeSpentMs / 60000)
    const secs = Math.floor((timeSpentMs % 60000) / 1000)
    const formattedTime = `${mins}m ${secs}s`

    const userWithTime = {
      ...user,
      'Time Taken': formattedTime
    }

    const finalResult = {
      ...r,
      timeSpent: formattedTime,
      timeSpentMs
    }

    setResult(finalResult)
    setUser(userWithTime)

    // Persist result record locally
    const record = {
      id: Date.now(),
      user: userWithTime,
      date: new Date().toISOString(),
      answers,
      code: r.code,
      type: r.type,
      timeSpent: formattedTime,
      timeSpentMs,
      reportVersion: 1,
    }

    const currentResults = load('safe_results', [])
    const email = (user['Email Id'] || user['Email'] || '').trim().toLowerCase()
    
    // Replace existing record for this email if present, or add new
    const filteredResults = currentResults.filter(r => 
      (r.user?.['Email Id'] || r.user?.['Email'] || '').trim().toLowerCase() !== email
    )
    save('safe_results', [...filteredResults, record])

    // Save to Google Sheets with full type name (e.g. The Campaigner)
    const profileTitle = profiles[r.code]?.name || r.type
    sendToSheets(userWithTime, r.type, profileTitle)

    // Clear in-progress state
    localStorage.removeItem('safe_progress')
    localStorage.removeItem('safe_idx')
    localStorage.removeItem('safe_timer_start')

    setView('result')
  }

  /* ── Retake Assessment ── */
  const handleRetake = () => {
    localStorage.removeItem('safe_progress')
    localStorage.removeItem('safe_idx')
    localStorage.removeItem('safe_timer_start')
    setResult(null)
    setView('test')
  }

  /* ── Logout / Change User — clear everything and restart ── */
  const handleLogout = () => {
    localStorage.removeItem('safe_progress')
    localStorage.removeItem('safe_idx')
    localStorage.removeItem('safe_timer_start')
    setUser({})
    setResult(null)
    setOtpState({ code: '', verified: false })
    setView('landing')
  }

  /* ── View router ── */
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
        expectedOtp={otpState.code}
        onHome={() => setView('landing')}
        onVerify={() => {
          setOtpState({ ...otpState, verified: true })
          
          // Check if user with this email has a completed result report
          const allResults = load('safe_results', [])
          const email = (user['Email Id'] || user['Email'] || '').trim().toLowerCase()
          const existing = allResults.find(r => 
            (r.user?.['Email Id'] || r.user?.['Email'] || '').trim().toLowerCase() === email
          )

          if (existing && existing.answers) {
            const r = score(qs, existing.answers, D.dimensions)
            setResult(r)
            setView('result')
          } else {
            setView('test')
          }
        }}
        onResend={() => advanceToOtp(user, true)}
        onBack={() => setView('info')}
        user={user}
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
