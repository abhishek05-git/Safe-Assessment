import React, { useState } from 'react'
import { X, Lock } from 'lucide-react'
import Shell         from '../layout/Shell'
import Button        from '../ui/Button'
import DashboardTab  from '../admin/DashboardTab'
import QuestionsTab  from '../admin/QuestionsTab'
import ProfilesTab   from '../admin/ProfilesTab'
import ReportTab     from '../admin/ReportTab'
import SettingsTab   from '../admin/SettingsTab'

const TABS = [
  { id: 'dashboard', label: '📊 Dashboard' },
  { id: 'questions', label: '❓ Questions' },
  { id: 'profiles',  label: '👤 Profiles'  },
  { id: 'report',    label: '📋 Report'    },
  { id: 'settings',  label: '⚙️ Settings'  },
]

// The hardcoded password for now
const ADMIN_PASSWORD = 'admin'

/**
 * Admin panel shell — tab bar + routed content.
 */
export default function Admin({
  onExit,
  questions,   setQuestions,
  profiles,    setProfiles,
  sections,    setSections,
  settings,    setSettings,
}) {
  const [activeTab, setActiveTab] = useState('dashboard')
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [password, setPassword] = useState('')
  const [error, setError] = useState(false)

  const handleLogin = (e) => {
    e.preventDefault()
    const validPassword = settings?.adminPassword || 'admin'
    if (password === validPassword) {
      setIsAuthenticated(true)
      setError(false)
    } else {
      setError(true)
    }
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
                {error && <p className="text-red-500 text-xs mt-1.5 text-left">Incorrect password. Please try again.</p>}
              </div>
              <Button
                type="submit"
                variant="primary"
                size="md"
                className="w-full justify-center"
              >
                Login
              </Button>
            </form>
          </div>
        </div>
      </Shell>
    )
  }

  return (
    <Shell
      onHome={onExit}
      right={
        <div className="flex gap-2">
          <Button
            variant="success"
            size="sm"
            onClick={() => {
              const btn = document.getElementById('save-btn-text')
              if(btn) {
                btn.innerText = 'Saved!'
                setTimeout(() => btn.innerText = 'Save Changes', 2000)
              }
            }}
          >
            <span id="save-btn-text">Save Changes</span>
          </Button>
          <Button
            id="exit-admin-btn"
            variant="secondary"
            size="sm"
            icon={<X className="w-4 h-4" />}
            onClick={onExit}
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
          {TABS.map(t => (
            <button
              key={t.id}
              id={`admin-tab-${t.id}`}
              onClick={() => setActiveTab(t.id)}
              className={[
                'flex-1 min-w-max px-4 py-2.5 rounded-xl text-sm font-semibold transition-all duration-200',
                activeTab === t.id
                  ? 'bg-white text-navy shadow-sm'
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
            <DashboardTab questions={questions} />
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
