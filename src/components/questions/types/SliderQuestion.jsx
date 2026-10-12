import React, { useRef, useEffect } from 'react'

/**
 * Range slider question.
 *
 * Question data shape:
 *   {
 *     type: 'slider',
 *     min: 0, max: 100,
 *     left: 'Label for min end',
 *     right: 'Label for max end',
 *     pole: 'E',      // pole that gets higher score as slider moves right
 *     other: 'I',
 *   }
 */
export default function SliderQuestion({ q, value, onChange }) {
  const min     = q.min ?? 0
  const max     = q.max ?? 100
  const current = value ?? null          // null = not yet answered
  const display = current ?? Math.round((min + max) / 2)
  const pct     = ((display - min) / (max - min)) * 100
  const trackRef = useRef(null)

  // Keep the CSS custom-property on the track in sync so the fill colour works.
  useEffect(() => {
    if (trackRef.current) {
      trackRef.current.style.setProperty('--progress', `${pct}%`)
    }
  }, [pct])

  return (
    <div className="py-2">
      {/* Pole labels */}
      <div className="flex justify-between text-sm font-semibold mb-8">
        <span className="text-emerald-700 max-w-[42%] leading-snug">{q.left}</span>
        <span className="text-sky text-right max-w-[42%] leading-snug">{q.right}</span>
      </div>

      {/* Slider track */}
      <div className="px-1">
        <input
          ref={trackRef}
          id={q.id}
          type="range"
          min={min}
          max={max}
          step={1}
          value={display}
          onChange={e => onChange(+e.target.value)}
          onMouseDown={() => { if (current == null) onChange(display) }}
          style={{ '--progress': `${pct}%` }}
          aria-label={q.question}
        />
      </div>

      {/* Current value badge */}
      <div className="text-center mt-6">
        <span className="inline-flex items-center justify-center min-w-[4rem] px-5 py-2 bg-sky/10 text-sky font-heading font-bold text-2xl rounded-2xl border border-sky/20">
          {current != null ? display : '—'}
        </span>
        <p className="text-xs text-slate-400 mt-2">
          {current == null ? 'Drag the slider to answer' : `${display} / ${max}`}
        </p>
      </div>
    </div>
  )
}
