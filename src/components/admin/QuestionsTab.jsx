import React, { useState } from 'react'
import { Plus, Copy, Trash2, GripVertical, Eye, EyeOff } from 'lucide-react'
import Button            from '../ui/Button'
import QuestionRenderer  from '../questions/QuestionRenderer'
import { QUESTION_TYPES } from '../questions/QuestionRenderer'

const CATEGORIES = ['Energy', 'Mind', 'Nature', 'Tactics', 'Identity']

function makeNewQuestion(qs) {
  const id = 'Q' + String(qs.length + 1).padStart(3, '0')
  return {
    id,
    question: 'New question text here',
    category: 'Energy',
    type: 'scale5',
    weight: 1,
    required: true,
    active: true,
    scoring: { 1: 'I', 2: 'I', 3: 'neutral', 4: 'E', 5: 'E' },
  }
}

const TYPE_ICON = Object.fromEntries(QUESTION_TYPES.map(t => [t.value, t.icon]))
const TYPE_LABEL = Object.fromEntries(QUESTION_TYPES.map(t => [t.value, t.label]))

/**
 * Full question editor with:
 * - Drag-to-reorder list
 * - Per-field form controls (text, type, category, weight, active, required)
 * - Raw JSON editor (advanced)
 * - Live preview
 */
export default function QuestionsTab({ questions, setQuestions }) {
  const [selectedId, setSelectedId] = useState(null)
  const [showPreview, setShowPreview] = useState(false)
  const [showJson, setShowJson] = useState(false)
  const [dragIdx, setDragIdx] = useState(null)

  const selected = questions.find(q => q.id === selectedId)

  const update = (patch) =>
    setQuestions(questions.map(q => q.id === selectedId ? { ...q, ...patch } : q))

  const addQuestion = () => {
    const q = makeNewQuestion(questions)
    setQuestions([...questions, q])
    setSelectedId(q.id)
    setShowPreview(false)
  }

  const duplicate = () => {
    if (!selected) return
    const id = 'Q' + String(questions.length + 1).padStart(3, '0')
    const copy = { ...selected, id }
    setQuestions([...questions, copy])
    setSelectedId(id)
  }

  const remove = () => {
    setQuestions(questions.filter(q => q.id !== selectedId))
    setSelectedId(null)
  }

  return (
    <div className="grid md:grid-cols-5 gap-5 min-h-[600px]">
      {/* ── Left: list ── */}
      <div className="md:col-span-2 flex flex-col gap-2">
        <Button
          id="add-question-btn"
          variant="primary"
          size="sm"
          className="w-full justify-center"
          icon={<Plus className="w-4 h-4" />}
          onClick={addQuestion}
        >
          Add Question
        </Button>

        <div className="flex-1 overflow-y-auto space-y-1.5 pr-1 max-h-[68vh]">
          {questions.map((q, i) => (
            <div
              key={q.id}
              draggable
              onDragStart={() => setDragIdx(i)}
              onDragOver={e => e.preventDefault()}
              onDrop={() => {
                if (dragIdx == null) return
                const arr = [...questions]
                const [moved] = arr.splice(dragIdx, 1)
                arr.splice(i, 0, moved)
                setQuestions(arr)
                setDragIdx(null)
              }}
              onClick={() => { setSelectedId(q.id); setShowPreview(false) }}
              className={[
                'flex items-center gap-2 p-3 rounded-xl border text-sm cursor-pointer transition-all',
                selectedId === q.id
                  ? 'border-sky bg-sky/5 shadow-sm'
                  : 'border-slate-200 bg-white hover:border-slate-300',
                q.active ? '' : 'opacity-40',
              ].join(' ')}
            >
              <GripVertical className="w-4 h-4 text-slate-300 cursor-grab shrink-0" />
              <span className="text-base shrink-0">{TYPE_ICON[q.type]}</span>
              <div className="flex-1 min-w-0">
                <div className="text-[11px] font-bold text-slate-400">{q.id} · {TYPE_LABEL[q.type]}</div>
                <div className="truncate text-slate-700 text-xs mt-0.5">{q.question}</div>
              </div>
              {!q.active && <EyeOff className="w-3 h-3 text-slate-400 shrink-0" />}
            </div>
          ))}
        </div>
      </div>

      {/* ── Right: editor ── */}
      <div className="md:col-span-3">
        {!selected ? (
          <div className="h-full flex flex-col items-center justify-center text-slate-400 p-8 gap-3">
            <div className="text-5xl">👈</div>
            <p className="font-medium">Select a question to edit</p>
            <p className="text-sm text-center">Or click "Add Question" to create a new one.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Question text */}
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-1.5">
                Question Text
              </label>
              <textarea
                className="w-full border-2 border-slate-200 rounded-xl p-3 text-sm
                           focus:outline-none focus:border-sky resize-none transition-colors"
                rows={3}
                value={selected.question}
                onChange={e => update({ question: e.target.value })}
              />
            </div>

            {/* Type + Category */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-1.5">
                  Question Type
                </label>
                <select
                  className="w-full border-2 border-slate-200 rounded-xl p-2.5 text-sm
                             focus:outline-none focus:border-sky bg-white"
                  value={selected.type}
                  onChange={e => update({ type: e.target.value })}
                >
                  {QUESTION_TYPES.map(t => (
                    <option key={t.value} value={t.value}>
                      {t.icon} {t.label}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-1.5">
                  Category
                </label>
                <select
                  className="w-full border-2 border-slate-200 rounded-xl p-2.5 text-sm
                             focus:outline-none focus:border-sky bg-white"
                  value={selected.category}
                  onChange={e => update({ category: e.target.value })}
                >
                  {CATEGORIES.map(c => <option key={c}>{c}</option>)}
                </select>
              </div>
            </div>

            {/* Weight + toggles */}
            <div className="flex items-center gap-5 flex-wrap">
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-1.5">
                  Weight
                </label>
                <input
                  type="number"
                  min={1}
                  max={10}
                  className="w-20 border-2 border-slate-200 rounded-xl p-2.5 text-sm
                             focus:outline-none focus:border-sky"
                  value={selected.weight}
                  onChange={e => update({ weight: +e.target.value })}
                />
              </div>
              <label className="flex items-center gap-2 text-sm cursor-pointer">
                <input
                  type="checkbox"
                  className="w-4 h-4 accent-sky"
                  checked={selected.active}
                  onChange={e => update({ active: e.target.checked })}
                />
                <span className="font-medium text-slate-700">Active</span>
              </label>
              <label className="flex items-center gap-2 text-sm cursor-pointer">
                <input
                  type="checkbox"
                  className="w-4 h-4 accent-sky"
                  checked={selected.required}
                  onChange={e => update({ required: e.target.checked })}
                />
                <span className="font-medium text-slate-700">Required</span>
              </label>
            </div>

            {/* Type-Specific Options */}
            {selected.type === 'spectrum' && (
              <div className="grid grid-cols-2 gap-3 p-3 bg-slate-50 rounded-xl border border-slate-200">
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-1.5">Left Option (A)</label>
                  <textarea
                    rows={2}
                    className="w-full border-2 border-slate-200 rounded-xl p-2.5 text-sm focus:outline-none focus:border-sky resize-none"
                    value={selected.left || ''}
                    onChange={e => update({ left: e.target.value })}
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-1.5">Right Option (B)</label>
                  <textarea
                    rows={2}
                    className="w-full border-2 border-slate-200 rounded-xl p-2.5 text-sm focus:outline-none focus:border-sky resize-none"
                    value={selected.right || ''}
                    onChange={e => update({ right: e.target.value })}
                  />
                </div>
              </div>
            )}

            {['single', 'multi', 'scenario'].includes(selected.type) && (
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                <div className="flex justify-between items-center mb-2">
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide">Options</label>
                  <button
                    className="text-xs text-sky font-bold hover:underline"
                    onClick={() => {
                      const opts = selected.options ? [...selected.options] : []
                      opts.push({ label: 'New Option', scores: {} })
                      update({ options: opts })
                    }}
                  >
                    + Add Option
                  </button>
                </div>
                <div className="space-y-2">
                  {(selected.options || []).map((opt, idx) => (
                    <div key={idx} className="flex gap-2 items-center">
                      <input
                        type="text"
                        className="flex-1 border-2 border-slate-200 rounded-xl p-2 text-sm focus:outline-none focus:border-sky"
                        value={opt.label}
                        onChange={e => {
                          const opts = [...selected.options]
                          opts[idx] = { ...opts[idx], label: e.target.value }
                          update({ options: opts })
                        }}
                      />
                      <button
                        className="text-slate-400 hover:text-red-500"
                        onClick={() => {
                          const opts = selected.options.filter((_, i) => i !== idx)
                          update({ options: opts })
                        }}
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                  {(!selected.options || selected.options.length === 0) && (
                    <p className="text-xs text-slate-400 italic">No options added yet.</p>
                  )}
                </div>
              </div>
            )}

            {/* JSON editor (advanced) */}
            <div>
              <div className="flex justify-between items-center mb-1.5">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wide">
                  Full Config (JSON)
                </label>
                <button
                  className="text-xs text-sky hover:text-sky-dark font-medium"
                  onClick={() => setShowJson(v => !v)}
                >
                  {showJson ? 'Hide JSON ↑' : 'Edit JSON ↓'}
                </button>
              </div>
              {showJson && (
                <textarea
                  key={selected.id + selected.type}
                  className="w-full border-2 border-slate-200 rounded-xl p-3 font-mono text-xs h-52
                             focus:outline-none focus:border-sky resize-y"
                  defaultValue={JSON.stringify(selected, null, 2)}
                  onBlur={e => {
                    try {
                      const parsed = JSON.parse(e.target.value)
                      setQuestions(questions.map(q => q.id === selected.id ? parsed : q))
                    } catch {
                      alert('Invalid JSON — changes were not saved.')
                    }
                  }}
                />
              )}
            </div>

            {/* Preview */}
            <div className="border-2 border-dashed border-slate-200 rounded-2xl p-4">
              <div className="flex justify-between items-center mb-3">
                <span className="text-xs font-bold text-slate-500 uppercase tracking-wide">Preview</span>
                <button
                  className="text-xs text-sky hover:text-sky-dark font-medium flex items-center gap-1"
                  onClick={() => setShowPreview(v => !v)}
                >
                  {showPreview ? <><EyeOff className="w-3 h-3" /> Hide</> : <><Eye className="w-3 h-3" /> Show</>}
                </button>
              </div>
              {showPreview && (
                <div className="fade">
                  <h4 className="font-heading font-bold text-slate-800 mb-4">{selected.question}</h4>
                  <QuestionRenderer q={selected} value={undefined} onChange={() => {}} />
                </div>
              )}
            </div>

            {/* Actions */}
            <div className="flex gap-2 flex-wrap pt-1">
              <Button variant="success" size="sm" icon={<Copy className="w-4 h-4" />} onClick={duplicate}>
                Duplicate
              </Button>
              <Button variant="danger" size="sm" icon={<Trash2 className="w-4 h-4" />} onClick={remove}>
                Delete
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
