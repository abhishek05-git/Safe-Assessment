import React from 'react'

/**
 * Settings tab — toggles which participant fields to collect before the assessment.
 */
export default function SettingsTab({ settings, setSettings }) {
  const toggle = (field, checked) =>
    setSettings({ ...settings, fields: { ...settings.fields, [field]: checked } })

  return (
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
            onChange={e => setSettings({ ...settings, requireApproval: e.target.checked })}
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
  )
}
