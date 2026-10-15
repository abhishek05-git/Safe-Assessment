import React, { useState, useEffect } from 'react'
import { X, Lock, Check, AlertCircle } from 'lucide-react'
import Shell         from '../layout/Shell'
import Button        from '../ui/Button'
import DashboardTab  from '../admin/DashboardTab'
import AccessTab     from '../admin/AccessTab'
import QuestionsTab  from '../admin/QuestionsTab'
import ProfilesTab   from '../admin/ProfilesTab'
import ReportTab     from '../admin/ReportTab'
import SettingsTab   from '../admin/SettingsTab'
import { save }      from '../../hooks/useStore'

/**
 * Admin panel shell — authenticated via HttpOnly admin session cookie (SEC 02)
 */
export default function Admin({
  onExit,
  questions,   setQuestions,
  profiles,    setProfiles,
  sections,    setSections,
  settings,    setSettings,
  approvals,   setApprovals,
}) {
  const [activeTab, setActiveTab] = useState('dashboard')
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [loadingCheck, setLoadingCheck] = useState(true)
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [saveStatus, setSaveStatus] = useState(null) // null | 'success' | 'error'

  const handleSaveChanges = async () => {
    setIsSaving(true)
    setSaveStatus(null)

    // Authoritative server-side persistence (Item 13)
    try {
      const res = await fetch('/api/admin/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          questions,
          profiles,
          sections,
          settings,
        })
      })

      const data = await res.json().catch(() => ({}))

      if (res.ok && data.success) {
        // Cache to local storage only after authoritative server confirms save
        save('safe_questions_v11', questions)
        save('safe_profiles', profiles)
        save('safe_sections', sections)
        save('safe_settings', settings)
        setSaveStatus('success')
        setTimeout(() => setSaveStatus(null), 2500)
      } else {
        setSaveStatus('error')
        alert(`Failed to save configuration to server: ${data.error || 'Server rejected changes'}`)
        setTimeout(() => setSaveStatus(null), 3000)
      }
    } catch (e) {
      setSaveStatus('error')
      alert('Network error: Unable to reach authoritative server to save configuration.')
      setTimeout(() => setSaveStatus(null), 3000)
    } finally {
      setIsSaving(false)
    }
  }

  // Verify existing admin session on mount
  useEffect(() => {
    let isMounted = true
    const checkSession = async () => {
      try {
        const res = await fetch('/api/admin/check', {
          credentials: 'include',
          headers: { 'Accept': 'application/json' }
        })
        if (res.ok) {
          const json = await res.json()
          if (isMounted && json && json.authenticated) {
            setIsAuthenticated(true)
          }
        }
      } catch (e) {}
      if (isMounted) setLoadingCheck(false)
    }
    checkSession()
    return () => { isMounted = false }
  }, [])

  const handleLogin = async (e) => {
    e.preventDefault()
    setError('')
    setIsSubmitting(true)
    try {
      const res = await fetch('/api/admin/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ password })
      })
      const data = await res.json().catch(() => ({}))
      if (res.ok && data.success) {
        setIsAuthenticated(true)
        setPassword('')
      } else {
        setError(data.error || 'Authentication failed. Please try again.')
      }
    } catch (err) {
      setError('Unable to reach authentication server.')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleLogout = async () => {
    try {
      await fetch('/api/admin/logout', {
        method: 'POST',
        credentials: 'include'
      })
    } catch (e) {}
    setIsAuthenticated(false)
    onExit()
  }

  if (loadingCheck) {
    return (
      <Shell onHome={onExit}>
        <div className="max-w-md mx-auto pt-20 text-center text-slate-400">
          Checking administrator authorization...
        </div>
      </Shell>
    )
  }

  if (!isAuthenticated) {
    return (
      <Shell
        onHome={onExit}
        right={
          <Button
            id="exit-admin-btn"
            variant="secondary"
            size="sm"
            icon={<X className="w-4 h-4" />}
            onClick={onExit}
          >
            Exit Admin
          </Button>
        }
      >
        <div className="max-w-md mx-auto pt-10 slide-up">
          <div className="glass p-8 text-center">
            <div className="w-16 h-16 bg-sky/10 border border-sky/20 rounded-2xl flex items-center justify-center mx-auto mb-5">
              <Lock className="w-8 h-8 text-sky" />
            </div>
            <h2 className="font-heading font-bold text-2xl text-navy mb-2">Admin Access</h2>
            <p className="text-slate-500 text-sm mb-6">Please enter the admin password to continue.</p>
            
            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <input
                  type="password"
                  placeholder="Password"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  className={`w-full border-2 rounded-xl px-4 py-3 text-sm focus:outline-none transition-colors bg-white ${
                    error ? 'border-red-400 focus:border-red-500' : 'border-slate-200 focus:border-sky'
                  }`}
                  autoFocus
                />
                {error && <p className="text-red-500 text-xs mt-1.5 text-left">{error}</p>}
              </div>
              <Button
                type="submit"
                variant="primary"
                size="md"
                disabled={isSubmitting}
                className="w-full justify-center"
              >
                {isSubmitting ? 'Authenticating...' : 'Login'}
              </Button>
            </form>
          </div>
        </div>
      </Shell>
    )
  }

  const pendingCount = Object.values(approvals || {}).filter(item => item.status !== 'approved').length

  const tabs = [
    { id: 'dashboard', label: '📊 Dashboard' },
    {
      id: 'access',
      label: pendingCount > 0 ? `🔐 Access (${pendingCount} pending)` : '🔐 Candidate Access',
      highlight: pendingCount > 0
    },
    { id: 'questions', label: '❓ Questions' },
    { id: 'profiles',  label: '👤 Profiles'  },
    { id: 'report',    label: '📋 Report'    },
    { id: 'settings',  label: '⚙️ Settings'  },
  ]

  return (
    <Shell
      onHome={onExit}
      right={
        <div className="flex gap-2">
          <Button
            variant={saveStatus === 'error' ? 'danger' : 'success'}
            size="sm"
            disabled={isSaving}
            onClick={handleSaveChanges}
            icon={saveStatus === 'success' ? <Check className="w-4 h-4" /> : saveStatus === 'error' ? <AlertCircle className="w-4 h-4" /> : null}
          >
            <span>
              {isSaving ? 'Saving...' : saveStatus === 'success' ? '✓ Saved to Cloud!' : saveStatus === 'error' ? 'Error Saving' : 'Save Changes'}
            </span>
          </Button>
          <Button
            id="exit-admin-btn"
            variant="secondary"
            size="sm"
            icon={<X className="w-4 h-4" />}
            onClick={handleLogout}
          >
            Exit Admin
          </Button>
        </div>
      }
    >
      <div className="glass p-6 md:p-8 slide-up">
        {/* Panel heading */}
        <h2 className="font-heading font-bold text-2xl text-navy mb-6">Admin Panel</h2>

        {/* Tab bar */}
        <div className="flex gap-1 flex-wrap mb-7 bg-slate-100 rounded-2xl p-1">
          {tabs.map(t => (
            <button
              key={t.id}
              id={`admin-tab-${t.id}`}
              onClick={() => setActiveTab(t.id)}
              className={[
                'flex-1 min-w-max px-4 py-2.5 rounded-xl text-sm font-semibold transition-all duration-200 flex items-center justify-center gap-1.5',
                activeTab === t.id
                  ? 'bg-white text-navy shadow-sm'
                  : t.highlight
                    ? 'text-amber-700 bg-amber-50/80 hover:bg-amber-100/60 font-bold'
                    : 'text-slate-500 hover:text-slate-700',
              ].join(' ')}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* Tab content — key forces fade-in on tab change */}
        <div key={activeTab} className="fade">
          {activeTab === 'dashboard' && (
            <DashboardTab
              questions={questions}
              pendingAccessCount={pendingCount}
              onGoToAccess={() => setActiveTab('access')}
            />
          )}
          {activeTab === 'access' && (
            <AccessTab
              approvals={approvals}
              setApprovals={setApprovals}
            />
          )}
          {activeTab === 'questions' && (
            <QuestionsTab questions={questions} setQuestions={setQuestions} />
          )}
          {activeTab === 'profiles' && (
            <ProfilesTab profiles={profiles} setProfiles={setProfiles} />
          )}
          {activeTab === 'report' && (
            <ReportTab sections={sections} setSections={setSections} />
          )}
          {activeTab === 'settings' && (
            <SettingsTab settings={settings} setSettings={setSettings} />
          )}
        </div>
      </div>
    </Shell>
  )
}
