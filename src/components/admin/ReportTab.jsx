import React from 'react'
import { ChevronUp, ChevronDown, Check, AlertCircle, Save } from 'lucide-react'
import { save } from '../../hooks/useStore'

/**
 * Report sections configurator — toggle and reorder result tabs.
 * Persists permanently to authoritative cloud and local storage.
 */
export default function ReportTab({ sections, setSections, onSave, isSaving, saveStatus }) {
  const updateSections = (next) => {
    setSections(next)
    save('safe_sections', next)
  }

  const toggle = (id, checked) => {
    const updated = sections.map(s => s.id === id ? { ...s, on: checked } : s)
    updateSections(updated)
  }

  const move = (i, dir) => {
    const arr = [...sections]
    const target = i + dir
    if (target < 0 || target >= arr.length) return
    ;[arr[i], arr[target]] = [arr[target], arr[i]]
    updateSections(arr)
  }

  return (
    <div>
      {/* ── Persistent Save Header Banner ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 mb-5 rounded-2xl bg-white border border-slate-200 shadow-xs">
        <div>
          <h3 className="font-heading font-bold text-base text-navy flex items-center gap-2">
            <span>📋 Report Sections Layout ({sections.filter(s => s.on).length} active)</span>
          </h3>
          <p className="text-xs text-slate-500 mt-0.5">
            Configure which tabs appear on candidate assessment reports. Changes persist permanently to the server.
          </p>
        </div>
        {onSave && (
          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              id="save-report-top-btn"
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
                  <span>✓ Layout Saved Permanently!</span>
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
                  <span>Save Report Layout</span>
                </>
              )}
            </button>
          </div>
        )}
      </div>

      <div className="max-w-md space-y-2">
        <p className="text-sm text-slate-500 mb-5">
          Choose which sections appear in the personality report and drag or use arrows to set their order.
        </p>

        {sections.map((s, i) => (
          <div
            key={s.id}
            className={[
              'flex items-center gap-3 p-4 rounded-2xl border-2 transition-all',
              s.on ? 'border-sky bg-sky/5' : 'border-slate-200 bg-white',
            ].join(' ')}
          >
            <input
              id={`section-${s.id}`}
              type="checkbox"
              className="w-4 h-4 accent-sky"
              checked={s.on}
              onChange={e => toggle(s.id, e.target.checked)}
            />
            <label
              htmlFor={`section-${s.id}`}
              className={`flex-1 font-medium cursor-pointer ${s.on ? 'text-navy' : 'text-slate-400'}`}
            >
              {s.title}
            </label>
            <div className="flex flex-col gap-0.5">
              <button
                disabled={i === 0}
                onClick={() => move(i, -1)}
                className="text-slate-300 hover:text-slate-600 disabled:opacity-20 transition-colors"
              >
                <ChevronUp className="w-4 h-4" />
              </button>
              <button
                disabled={i === sections.length - 1}
                onClick={() => move(i, 1)}
                className="text-slate-300 hover:text-slate-600 disabled:opacity-20 transition-colors"
              >
                <ChevronDown className="w-4 h-4" />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
