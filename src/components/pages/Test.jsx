import React, { useState, useEffect, useRef } from 'react'
import { ArrowLeft, ArrowRight, CheckCircle, Clock, AlertTriangle } from 'lucide-react'
import Shell             from '../layout/Shell'
import Button            from '../ui/Button'
import ProgressBar       from '../ui/ProgressBar'
import QuestionRenderer  from '../questions/QuestionRenderer'
import { load, save }    from '../../hooks/useStore'

// Total time: 30 minutes in milliseconds
const TOTAL_TIME_MS = 30 * 60 * 1000
// Warning threshold: 5 minutes in milliseconds
const WARNING_TIME_MS = 5 * 60 * 1000

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

const pad = (n, len = 2) => String(n).padStart(len, '0')

// Format remaining milliseconds into MM:SS.ms (e.g. 29:58.42)
const formatTimeWithMs = (ms) => {
  if (ms <= 0) return '00:00.00'
  const m = Math.floor(ms / 60000)
  const s = Math.floor((ms % 60000) / 1000)
  const milli = Math.floor((ms % 1000) / 10) // 2-digit centiseconds (00-99)
  return `${pad(m)}:${pad(s)}.${pad(milli)}`
}

// Get or initialize persistent start time so page refresh doesn't reset countdown
const getStartTime = () => {
  const saved = load('safe_timer_start', null)
  if (saved && typeof saved === 'number') return saved
  const now = Date.now()
  save('safe_timer_start', now)
  return now
}

/**
 * Main assessment screen with 30-minute countdown timer and timeline.
 */
export default function Test({ questions, onHome, onFinish, user, onLogout }) {
  const [answers, setAnswers] = useState(() => load('safe_progress', {}))
  const [index,   setIndex]   = useState(() =>
    Math.min(load('safe_idx', 0), Math.max(questions.length - 1, 0))
  )

  // Timer state
  const [startTime] = useState(getStartTime)
  const [remainingMs, setRemainingMs] = useState(() => {
    const elapsed = Date.now() - startTime
    return Math.max(0, TOTAL_TIME_MS - elapsed)
  })

  const question  = questions[index]
  const answered  = Object.keys(answers).length
  const isLast    = index === questions.length - 1
  const missing   = questions.filter(q => q.required && answers[q.id] == null).length
  const isWarning = remainingMs <= WARNING_TIME_MS && remainingMs > 0
  const isExpired = remainingMs <= 0

  const answersRef = useRef(answers)
  answersRef.current = answers

  /* ── Finish test with accurate time taken ─────────────────────── */
  const handleFinishTest = () => {
    const timeSpentMs = Math.min(TOTAL_TIME_MS, Date.now() - startTime)
    onFinish(answersRef.current, timeSpentMs)
  }

  /* ── 30-Minute Countdown Interval with Milliseconds ──────────── */
  useEffect(() => {
    const interval = setInterval(() => {
      const elapsed = Date.now() - startTime
      const rem = Math.max(0, TOTAL_TIME_MS - elapsed)
      setRemainingMs(rem)

      if (rem <= 0) {
        clearInterval(interval)
        // Auto-finish when 30 minutes expire
        handleFinishTest()
      }
    }, 35) // ~28 updates per second for smooth millisecond display

    return () => clearInterval(interval)
  }, [startTime])

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
      if (answered < questions.length && remainingMs > 0) { e.preventDefault(); e.returnValue = '' }
    }
    window.addEventListener('beforeunload', handler)
    return () => window.removeEventListener('beforeunload', handler)
  }, [answered, questions.length, remainingMs])

  if (!question) return null

  const catStyle = CAT_STYLES[question.category] ?? 'text-slate-600 bg-slate-50 border-slate-100'

  /* ── Quick-nav window: show ±3 neighbours ─────────── */
  const navStart = Math.max(0, Math.min(index - 3, questions.length - 7))
  const navSlice = questions.slice(navStart, navStart + 7)

  // Timeline progress percentage (100% at start, goes to 0%)
  const timelinePct = Math.min(100, Math.max(0, (remainingMs / TOTAL_TIME_MS) * 100))

  /* ── Top-Right Timer Badge ────────────────────────── */
  const timerBadge = (
    <div
      id="test-timer"
      className={`flex items-center gap-2 px-3.5 py-1.5 rounded-2xl border font-mono font-bold transition-all duration-300 shadow-sm ${
        isWarning
          ? 'bg-red-500/20 border-red-500 text-red-400 animate-pulse shadow-red-500/20'
          : isExpired
            ? 'bg-red-600 text-white border-red-700'
            : 'bg-white/10 border-white/20 text-white shadow-black/10'
      }`}
      title={isWarning ? 'Less than 5 minutes remaining!' : 'Time Remaining (30 Min limit)'}
    >
      <Clock className={`w-4 h-4 shrink-0 ${isWarning ? 'text-red-400' : 'text-sky-300'}`} />
      <span className="text-xs sm:text-sm tracking-wider font-extrabold tabular-nums">
        {formatTimeWithMs(remainingMs)}
      </span>
      {isWarning && (
        <span className="text-[10px] uppercase font-black px-1.5 py-0.5 rounded bg-red-500 text-white tracking-widest hidden sm:inline">
          5m Left
        </span>
      )}
    </div>
  )

  return (
    <Shell
      onHome={onHome}
      user={user}
      onLogout={onLogout}
      right={timerBadge}
    >
      {/* ── 30-Min Timeline Bar ── */}
      <div className={`mb-4 glass p-3.5 px-4 md:px-5 transition-colors ${
        isWarning ? 'border-red-400/50 bg-red-50/70' : ''
      }`}>
        <div className="flex justify-between items-center text-xs mb-1.5">
          <span className="font-semibold text-slate-600 flex items-center gap-1.5">
            <Clock className={`w-3.5 h-3.5 ${isWarning ? 'text-red-500 animate-pulse' : 'text-sky'}`} />
            <span>Assessment Timeline (30 Min Limit)</span>
          </span>
          <span className={`font-mono font-bold text-xs tabular-nums ${
            isWarning ? 'text-red-600 font-black' : 'text-slate-700'
          }`}>
            {formatTimeWithMs(remainingMs)} left
          </span>
        </div>
        {/* Timeline depleting bar */}
        <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-100 ease-linear ${
              isWarning
                ? 'bg-gradient-to-r from-red-500 via-rose-500 to-red-600 shadow-sm shadow-red-400/50'
                : 'bg-gradient-to-r from-sky to-blue-600'
            }`}
            style={{ width: `${timelinePct}%` }}
          />
        </div>
      </div>

      {/* ── Question Progress Bar ── */}
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
              onClick={handleFinishTest}
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
