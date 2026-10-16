import React, { useRef } from 'react'
import { Upload, Trash2, Image as ImageIcon, Sparkles, Link as LinkIcon, Check, AlertCircle, Save } from 'lucide-react'
import { profiles as DEFAULT_PROFILES } from '../../data/config'
import { save } from '../../hooks/useStore'

const TEXT_FIELDS  = ['name', 'tagline', 'overview', 'color']
const ARRAY_FIELDS = ['strengths', 'challenges', 'career', 'growth', 'relationships', 'team']

/**
 * Profiles editor — edit personality profile copy, avatar/illustration image, and colour per 4-letter code.
 * Array fields (strengths, career, etc.) are newline-separated in the textarea.
 * Edits persist permanently to authoritative server store and client storage.
 */
export default function ProfilesTab({ profiles, setProfiles, onSave, isSaving, saveStatus }) {
  const update = (code, field, value) => {
    const updated = { ...profiles, [code]: { ...profiles[code], [field]: value } }
    setProfiles(updated)
    save('safe_profiles', updated)
  }

  // Handle client-side image compression and conversion to data URL
  const handleFileUpload = (code, file) => {
    if (!file) return
    const reader = new FileReader()
    reader.onload = (e) => {
      const img = new Image()
      img.onload = () => {
        const canvas = document.createElement('canvas')
        const maxDim = 600
        let { width, height } = img
        if (width > maxDim || height > maxDim) {
          if (width > height) {
            height = Math.round((height * maxDim) / width)
            width = maxDim
          } else {
            width = Math.round((width * maxDim) / height)
            height = maxDim
          }
        }
        canvas.width = width
        canvas.height = height
        const ctx = canvas.getContext('2d')
        ctx.drawImage(img, 0, 0, width, height)
        const dataUrl = canvas.toDataURL('image/png', 0.85)
        update(code, 'image', dataUrl)
      }
      img.src = e.target.result
    }
    reader.readAsDataURL(file)
  }

  return (
    <div>
      {/* ── Persistent Save Header Banner ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 mb-5 rounded-2xl bg-white border border-slate-200 shadow-xs">
        <div>
          <h3 className="font-heading font-bold text-base text-navy flex items-center gap-2">
            <span>👤 Personality Profiles (16 Types)</span>
          </h3>
          <p className="text-xs text-slate-500 mt-0.5">
            Changes made here are permanently saved to the server and appear on all candidate assessment reports until modified.
          </p>
        </div>
        {onSave && (
          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              id="save-profiles-top-btn"
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
                  <span>✓ Profiles Saved Permanently!</span>
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
                  <span>Save Profile Changes</span>
                </>
              )}
            </button>
          </div>
        )}
      </div>

      <div className="grid md:grid-cols-2 gap-4">
      {Object.values(profiles).map(p => (
        <details key={p.code} className="border border-slate-200 rounded-2xl overflow-hidden group bg-white shadow-sm">
          <summary className="px-5 py-4 font-heading font-bold cursor-pointer flex items-center gap-3.5 hover:bg-slate-50 transition-colors list-none">
            {p.image ? (
              <div className="w-12 h-12 rounded-xl bg-slate-50 border border-slate-200 p-1 shrink-0 flex items-center justify-center overflow-hidden">
                <img
                  src={p.image}
                  alt={p.code}
                  className="w-full h-full object-contain"
                />
              </div>
            ) : (
              <div
                className="w-12 h-12 rounded-xl flex items-center justify-center font-heading font-black text-sm tracking-wide shrink-0"
                style={{
                  backgroundColor: `${p.color}15`,
                  color: p.color,
                  border: `1.5px solid ${p.color}35`,
                }}
              >
                {p.code}
              </div>
            )}
            
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <span className="text-slate-800 font-bold truncate text-base">{p.name}</span>
                {p.image && (
                  <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded bg-slate-100 text-slate-600">
                    {p.code}
                  </span>
                )}
              </div>
              <div className="text-xs font-normal text-slate-400 truncate mt-0.5">{p.tagline}</div>
            </div>

            {p.image && (
              <span className="text-[10px] font-bold text-sky bg-sky/10 border border-sky/20 px-2 py-0.5 rounded-full shrink-0">
                Image
              </span>
            )}

            <span className="ml-auto text-slate-300 text-lg group-open:rotate-90 transition-transform shrink-0">›</span>
          </summary>

          <div className="px-5 pb-5 space-y-4 border-t border-slate-100 pt-4 bg-slate-50/40">
            {/* ── Profile Image / Avatar Editor ── */}
            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
              <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-2 flex items-center justify-between">
                <span>Profile Image / Illustration</span>
                {p.image && (
                  <span className="text-[10px] font-semibold text-emerald-600 flex items-center gap-1">
                    <Check className="w-3 h-3" /> Active
                  </span>
                )}
              </label>

              <div className="flex flex-col sm:flex-row items-center gap-4">
                {/* Image Preview Box */}
                <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-2xl border-2 border-dashed border-slate-200 bg-slate-50 flex items-center justify-center overflow-hidden shrink-0 relative group">
                  {p.image ? (
                    <img
                      src={p.image}
                      alt={p.name}
                      className="w-full h-full object-contain p-1.5 transition-transform group-hover:scale-105"
                    />
                  ) : (
                    <div className="text-center p-2 text-slate-400 flex flex-col items-center">
                      <ImageIcon className="w-6 h-6 text-slate-300 mb-1" />
                      <span className="text-[10px] font-semibold leading-tight">No image</span>
                    </div>
                  )}
                </div>

                {/* Upload & Link Controls */}
                <div className="flex-1 w-full space-y-2.5">
                  <div className="flex flex-wrap items-center gap-2">
                    {/* Hidden file input */}
                    <input
                      type="file"
                      id={`upload-${p.code}`}
                      accept="image/*"
                      className="hidden"
                      onChange={e => {
                        if (e.target.files?.[0]) {
                          handleFileUpload(p.code, e.target.files[0])
                        }
                      }}
                    />
                    
                    <label
                      htmlFor={`upload-${p.code}`}
                      className="cursor-pointer inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-xl bg-sky text-white hover:bg-sky/90 transition-colors shadow-xs"
                    >
                      <Upload className="w-3.5 h-3.5" />
                      Upload File
                    </label>

                    {p.image && (
                      <button
                        type="button"
                        onClick={() => update(p.code, 'image', '')}
                        className="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-semibold rounded-xl text-rose-500 hover:bg-rose-50 border border-rose-200 transition-colors"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        Remove
                      </button>
                    )}

                    {DEFAULT_PROFILES[p.code]?.image && p.image !== DEFAULT_PROFILES[p.code]?.image && (
                      <button
                        type="button"
                        onClick={() => update(p.code, 'image', DEFAULT_PROFILES[p.code]?.image || '')}
                        className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-semibold rounded-xl text-purple-600 bg-purple-50 hover:bg-purple-100 border border-purple-200 transition-colors"
                      >
                        <Sparkles className="w-3 h-3" />
                        Default Avatar
                      </button>
                    )}
                  </div>

                  {/* Direct Image URL input */}
                  <div className="relative">
                    <input
                      type="text"
                      placeholder="Or paste image URL (https://... or /profiles/...)"
                      value={p.image || ''}
                      onChange={e => update(p.code, 'image', e.target.value)}
                      className="w-full border border-slate-200 rounded-xl px-3 py-1.5 text-xs font-mono focus:outline-none focus:border-sky transition-colors bg-slate-50/50"
                    />
                  </div>

                  <p className="text-[11px] text-slate-400 leading-tight">
                    This illustration appears at the top of the Result report page (16Personalities style).
                  </p>
                </div>
              </div>
            </div>

            {/* Single-value fields */}
            {TEXT_FIELDS.map(f => (
              <div key={f}>
                <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                  {f}
                </label>
                {f === 'color' ? (
                  <div className="flex items-center gap-3">
                    <input
                      type="color"
                      className="w-10 h-10 rounded-xl border-2 border-slate-200 cursor-pointer p-0.5"
                      value={p[f]}
                      onChange={e => update(p.code, f, e.target.value)}
                    />
                    <input
                      type="text"
                      className="flex-1 border border-slate-200 rounded-xl p-2 text-sm font-mono focus:outline-none focus:border-sky bg-white"
                      value={p[f]}
                      onChange={e => update(p.code, f, e.target.value)}
                    />
                  </div>
                ) : (
                  <input
                    type="text"
                    className="w-full border border-slate-200 rounded-xl p-2.5 text-sm
                               focus:outline-none focus:border-sky transition-colors bg-white"
                    value={p[f]}
                    onChange={e => update(p.code, f, e.target.value)}
                  />
                )}
              </div>
            ))}

            {/* Array fields (one per line) */}
            {ARRAY_FIELDS.map(f => (
              <div key={f}>
                <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                  {f} <span className="normal-case font-normal">(one per line)</span>
                </label>
                <textarea
                  className="w-full border border-slate-200 rounded-xl p-2.5 text-sm h-24
                             resize-y focus:outline-none focus:border-sky transition-colors bg-white"
                  defaultValue={(p[f] ?? []).join('\n')}
                  onBlur={e => update(p.code, f, e.target.value.split('\n').filter(Boolean))}
                />
              </div>
            ))}
          </div>
        </details>
      ))}
      </div>

      {/* ── Bottom Save Action Bar ── */}
      {onSave && (
        <div className="mt-6 flex flex-col sm:flex-row items-center justify-between gap-3 p-4 rounded-2xl bg-slate-50 border border-slate-200">
          <p className="text-xs text-slate-500">
            Remember to save your changes so they persist permanently on the server and result reports.
          </p>
          <button
            type="button"
            id="save-profiles-bottom-btn"
            onClick={onSave}
            disabled={isSaving}
            className={`px-5 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2 shadow-xs ${
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
                <span>✓ All Profiles Saved Permanently!</span>
              </>
            ) : saveStatus === 'error' ? (
              <>
                <AlertCircle className="w-4 h-4" />
                <span>Error Saving Changes</span>
              </>
            ) : isSaving ? (
              <span>Saving to Cloud...</span>
            ) : (
              <>
                <Save className="w-4 h-4" />
                <span>Save All Profile Changes</span>
              </>
            )}
          </button>
        </div>
      )}
    </div>
  )
}
