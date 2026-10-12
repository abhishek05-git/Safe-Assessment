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

      {/* Security Settings */}
      <div className="pt-6 border-t border-slate-200 mt-6 space-y-3">
        <h4 className="font-heading font-bold text-slate-700 text-sm">🔒 Security Settings</h4>
        <div>
          <label className="block text-xs font-semibold text-slate-600 mb-1">Admin Password</label>
          <input
            type="password"
            value={settings.adminPassword || 'admin'}
            onChange={e => setSettings({ ...settings, adminPassword: e.target.value })}
            className="w-full border-2 border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-sky bg-white"
            placeholder="Set Admin Password"
          />
          <p className="text-[11px] text-slate-400 mt-1">
            This password is required when accessing the Admin Panel via Ctrl+Shift+A.
          </p>
        </div>
      </div>
    </div>
  )
}
