import React, { useState, useEffect } from 'react'
import { ArrowLeft, ArrowRight, CheckCircle } from 'lucide-react'
import Shell             from '../layout/Shell'
import Button            from '../ui/Button'
import ProgressBar       from '../ui/ProgressBar'
import QuestionRenderer  from '../questions/QuestionRenderer'
import { load, save }    from '../../hooks/useStore'

// These types auto-advance to the next question 300 ms after selection.
const AUTO_ADVANCE = new Set(['scale5', 'scale7', 'single', 'scenario', 'spectrum'])

// Category → colour tokens used on the category badge.
const CAT_STYLES = {
  Energy:   'text-emerald-700 bg-emerald-50 border-emerald-100',
  Mind:     'text-purple-700  bg-purple-50  border-purple-100',
  Nature:   'text-orange-700  bg-orange-50  border-orange-100',
  Tactics:  'text-blue-700    bg-blue-50    border-blue-100',
  Identity: 'text-rose-700    bg-rose-50    border-rose-100',
}

/**
 * Main assessment screen.
 *
 * Props:
 *  questions  — active (filtered) question array
 *  onHome     — navigate back to landing
 *  onFinish   — called with the full answers map when user submits
 */
export default function Test({ questions, onHome, onFinish, user, onLogout }) {
  const [answers, setAnswers] = useState(() => load('safe_progress', {}))
  const [index,   setIndex]   = useState(() =>
    Math.min(load('safe_idx', 0), Math.max(questions.length - 1, 0))
  )

  const question  = questions[index]
  const answered  = Object.keys(answers).length
  const isLast    = index === questions.length - 1
  const missing   = questions.filter(q => q.required && answers[q.id] == null).length

  /* ── Navigate ─────────────────────────────────────── */
  const navigate = (dir) => {
    setIndex(i => {
      const next = Math.max(0, Math.min(questions.length - 1, i + dir))
      save('safe_idx', next)
      return next
    })
  }

  const jumpTo = (i) => { setIndex(i); save('safe_idx', i) }

  /* ── Handle answer ────────────────────────────────── */
  const handleAnswer = (value) => {
    const next = { ...answers, [question.id]: value }
    setAnswers(next)
    save('safe_progress', next)
    if (AUTO_ADVANCE.has(question.type) && !isLast) {
      setTimeout(() => navigate(1), 300)
    }
  }

  /* ── Keyboard shortcuts ───────────────────────────── */
  useEffect(() => {
    const handler = (e) => {
      if (e.key === 'ArrowRight') navigate(1)
      if (e.key === 'ArrowLeft')  navigate(-1)
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [])

  /* ── Warn on unload ───────────────────────────────── */
  useEffect(() => {
    const handler = (e) => {
      if (answered < questions.length) { e.preventDefault(); e.returnValue = '' }
    }
    window.addEventListener('beforeunload', handler)
    return () => window.removeEventListener('beforeunload', handler)
  }, [answered, questions.length])

  if (!question) return null

  const catStyle = CAT_STYLES[question.category] ?? 'text-slate-600 bg-slate-50 border-slate-100'

  /* ── Quick-nav window: show ±3 neighbours ─────────── */
  const navStart = Math.max(0, Math.min(index - 3, questions.length - 7))
  const navSlice = questions.slice(navStart, navStart + 7)

  return (
    <Shell onHome={onHome} user={user} onLogout={onLogout}>
      {/* ── Top progress bar ── */}
      <div className="mb-5">
        <ProgressBar value={answered} max={questions.length} />
      </div>

      {/* ── Question card (key forces re-mount → fade animation) ── */}
      <div key={question.id} className="glass p-6 md:p-10 fade">
        {/* Meta row */}
        <div className="flex items-center gap-3 mb-6 flex-wrap">
          <span className={`text-xs font-bold px-3 py-1.5 rounded-full uppercase tracking-wider border ${catStyle}`}>
            {question.category}
          </span>
          <span className="text-xs text-slate-400 font-medium">
            {index + 1} of {questions.length}
          </span>
          <span className="text-xs text-slate-400">
            · {Math.round((answered / questions.length) * 100)}% complete
          </span>
        </div>

        {/* Question text */}
        <h2 className="font-heading font-bold text-xl md:text-3xl text-navy mb-8 leading-tight">
          {question.question}
        </h2>

        {/* Answer renderer */}
        <QuestionRenderer
          q={question}
          value={answers[question.id]}
          onChange={handleAnswer}
        />

        {/* Navigation row */}
        <div className="flex justify-between items-center mt-10 pt-6 border-t border-slate-100">
          <Button
            id="prev-btn"
            variant="outline"
            size="md"
            disabled={index === 0}
            onClick={() => navigate(-1)}
            icon={<ArrowLeft className="w-4 h-4" />}
          >
            Back
          </Button>

          {/* Mini dots */}
          <div className="flex gap-1.5 items-center">
            {navSlice.map((q, si) => {
              const ai = navStart + si
              return (
                <button
                  key={q.id}
                  onClick={() => jumpTo(ai)}
                  className={[
                    'rounded-full transition-all duration-200',
                    ai === index
                      ? 'bg-sky w-6 h-2'
                      : answers[q.id] != null
                        ? 'bg-sky/40 w-2 h-2'
                        : 'bg-slate-300 w-2 h-2',
                  ].join(' ')}
                />
              )
            })}
          </div>

          {isLast ? (
            <Button
              id="finish-btn"
              variant="primary"
              size="md"
              disabled={missing > 0}
              onClick={() => onFinish(answers)}
              icon={<CheckCircle className="w-4 h-4" />}
            >
              {missing > 0 ? `${missing} required left` : 'Finish'}
            </Button>
          ) : (
            <Button
              id="next-btn"
              variant="navy"
              size="md"
              onClick={() => navigate(1)}
              iconRight={<ArrowRight className="w-4 h-4" />}
            >
              Next
            </Button>
          )}
        </div>
      </div>

      {/* ── Question overview grid ── */}
      <div className="mt-5 glass p-5">
        <div className="text-xs text-slate-500 font-semibold uppercase tracking-wide mb-3">
          Question Overview
        </div>
        <div className="flex flex-wrap gap-2">
          {questions.map((q, i) => (
            <button
              key={q.id}
              onClick={() => jumpTo(i)}
              title={q.question}
              className={[
                'w-8 h-8 rounded-xl text-xs font-bold transition-all duration-150 hover:scale-110',
                i === index
                  ? 'bg-sky text-white shadow-sm shadow-sky/40'
                  : answers[q.id] != null
                    ? 'bg-emerald-100 text-emerald-700 hover:bg-emerald-200'
                    : 'bg-slate-100 text-slate-400 hover:bg-slate-200',
              ].join(' ')}
            >
              {i + 1}
            </button>
          ))}
        </div>
      </div>
    </Shell>
  )
}
