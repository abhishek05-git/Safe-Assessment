import React from 'react'
import { Check, AlertCircle, Save } from 'lucide-react'
import { save } from '../../hooks/useStore'

/**
 * Settings tab — toggles which participant fields to collect before the assessment.
 * Persists permanently to authoritative cloud and local storage.
 */
export default function SettingsTab({ settings, setSettings, onSave, isSaving, saveStatus }) {
  const updateSettings = (next) => {
    setSettings(next)
    save('safe_settings', next)
  }

  const toggle = (field, checked) => {
    const updated = { ...settings, fields: { ...settings.fields, [field]: checked } }
    updateSettings(updated)
  }

  const toggleApproval = (checked) => {
    const updated = { ...settings, requireApproval: checked }
    updateSettings(updated)
  }

  return (
    <div>
      {/* ── Persistent Save Header Banner ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 mb-5 rounded-2xl bg-white border border-slate-200 shadow-xs">
        <div>
          <h3 className="font-heading font-bold text-base text-navy flex items-center gap-2">
            <span>⚙️ Assessment Settings</span>
          </h3>
          <p className="text-xs text-slate-500 mt-0.5">
            Configure access control gates and participant registration fields. Changes persist permanently to the server.
          </p>
        </div>
        {onSave && (
          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              id="save-settings-top-btn"
              onClick={onSave}
              disabled={isSaving}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 shadow-xs ${
                saveStatus === 'success'
                  ? 'bg-emerald-600 text-white'
                  : saveStatus === 'error'
                  ? 'bg-rose-600 text-white'
                  : 'bg-emerald-600 hover:bg-emerald-700 text-white active:scale-95'
              }`}
            >
              {saveStatus === 'success' ? (
                <>
                  <Check className="w-4 h-4" />
                  <span>✓ Settings Saved Permanently!</span>
                </>
              ) : saveStatus === 'error' ? (
                <>
                  <AlertCircle className="w-4 h-4" />
                  <span>Error Saving</span>
                </>
              ) : isSaving ? (
                <span>Saving to Cloud...</span>
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  <span>Save Settings Changes</span>
                </>
              )}
            </button>
          </div>
        )}
      </div>

      <div className="max-w-md space-y-3">
        <p className="text-sm text-slate-500 mb-5">
          Select which fields to collect from participants on the "Before We Begin" screen.
          All fields are optional for participants regardless of this setting.
        </p>

        {Object.entries(settings.fields || {}).map(([field, enabled]) => (
          <label
            key={field}
            className={[
              'flex items-center gap-3 p-4 rounded-2xl border-2 cursor-pointer transition-all',
              enabled ? 'border-sky bg-sky/5' : 'border-slate-200 bg-white hover:border-slate-300',
            ].join(' ')}
          >
            <input
              type="checkbox"
              className="w-4 h-4 accent-sky"
              checked={enabled}
              onChange={e => toggle(field, e.target.checked)}
            />
            <div>
              <div className={`font-medium text-sm ${enabled ? 'text-navy' : 'text-slate-500'}`}>
                {field}
              </div>
              <div className="text-xs text-slate-400 mt-0.5">Collected before the assessment starts</div>
            </div>
          </label>
        ))}

        {/* Candidate Access Gate Settings */}
        <div className="pt-6 border-t border-slate-200 mt-6 space-y-3">
          <h4 className="font-heading font-bold text-slate-700 text-sm">🔐 Candidate Access Control</h4>
          <label
            className={[
              'flex items-start gap-3 p-4 rounded-2xl border-2 cursor-pointer transition-all',
              settings.requireApproval !== false ? 'border-sky bg-sky/5' : 'border-slate-200 bg-white hover:border-slate-300',
            ].join(' ')}
          >
            <input
              type="checkbox"
              className="w-4 h-4 accent-sky mt-0.5"
              checked={settings.requireApproval !== false}
              onChange={e => toggleApproval(e.target.checked)}
            />
            <div>
              <div className={`font-medium text-sm ${settings.requireApproval !== false ? 'text-navy' : 'text-slate-500'}`}>
                Require Admin Approval to Start Assessment
              </div>
              <div className="text-xs text-slate-500 mt-0.5 leading-relaxed">
                When enabled, participants cannot begin the 30-minute test after OTP verification until an administrator approves their access.
              </div>
            </div>
          </label>
        </div>

      {/* Security Information */}
      <div className="pt-6 border-t border-slate-200 mt-6 space-y-3">
        <h4 className="font-heading font-bold text-slate-700 text-sm">🔒 Administrator Authentication</h4>
        <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 text-xs text-slate-600 space-y-2">
          <p className="font-medium text-slate-800">
            Admin access is secured server-side using bcrypt hashing (SEC 02).
          </p>
          <p className="leading-relaxed">
            To update the administrator password, generate a new hash using:
          </p>
          <code className="block bg-slate-900 text-emerald-400 p-2.5 rounded-lg font-mono text-[11px]">
            npm run hash-password "YourNewStrongPassword"
          </code>
          <p className="text-slate-500 text-[11px]">
            Then set the resulting hash in your server's <span className="font-mono text-slate-700">.env</span> file as <span className="font-mono text-slate-700">ADMIN_PASSWORD_HASH</span> and restart the Node service.
          </p>
        </div>
      </div>
    </div>
  </div>
)
}
