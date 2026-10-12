import React from 'react'

/**
 * Spectrum / bipolar question — five dots between two labelled poles.
 * The middle dot is neutral; outer dots are strongest preference.
 *
 * Question data shape:
 *   {
 *     type: 'spectrum',
 *     left: 'I trust proven methods.',
 *     right: 'I like inventing new methods.',
 *     leftPole: 'S',
 *     rightPole: 'N',
 *   }
 */
export default function SpectrumQuestion({ q, value, onChange }) {
  const dots   = [1, 2, 3, 4, 5]
  const labels = {
    1: 'Strongly A',
    2: 'Lean A',
    3: 'Neutral',
    4: 'Lean B',
    5: 'Strongly B',
  }

  const leanLeft  = value != null && value < 3
  const leanRight = value != null && value > 3

  return (
    <div className="py-2">
      {/* Pole cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-6 sm:mb-8">
        <div className={[
          'p-4 rounded-2xl border-2 transition-all duration-200',
          leanLeft ? 'border-emerald-400 bg-emerald-50' : 'border-slate-200 bg-white/60',
        ].join(' ')}>
          <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Option A</div>
          <div className="text-sm md:text-base font-semibold text-slate-800 leading-snug">{q.left}</div>
        </div>

        <div className={[
          'p-4 rounded-2xl border-2 transition-all duration-200',
          leanRight ? 'border-sky bg-sky/5' : 'border-slate-200 bg-white/60',
        ].join(' ')}>
          <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Option B</div>
          <div className="text-sm md:text-base font-semibold text-slate-800 leading-snug">{q.right}</div>
        </div>
      </div>

      {/* Dot selector */}
      <div className="flex items-center justify-between gap-2 px-4">
        {dots.map(v => {
          const isActive = value === v
          const isMid    = v === 3
          
          // Calculate distance from center (v=3)
          const distance = Math.abs(v - 3)
          
          // Size maps from 32px (center) up to 56px (outer edges)
          const size = 32 + (distance / 2) * 24

          return (
            <button
              key={v}
              id={`${q.id}-dot-${v}`}
              onClick={() => onChange(v)}
              title={labels[v]}
              aria-label={labels[v]}
              aria-pressed={isActive}
              style={{ maxWidth: `${size}px`, maxHeight: `${size}px` }}
              className={[
                'rounded-full border-2 w-full aspect-square transition-all duration-200 cursor-pointer mx-auto',
                'hover:scale-110 focus:outline-none focus:ring-2 focus:ring-sky focus:ring-offset-2',
                isActive
                  ? 'bg-sky border-sky scale-110 shadow-lg shadow-sky/40'
                  : isMid
                    ? 'border-slate-300 bg-slate-100 hover:border-sky/50'
                    : 'border-slate-300 bg-white hover:border-sky/70',
              ].join(' ')}
            />
          )
        })}
      </div>

      {/* Axis labels */}
      <div className="flex justify-between text-xs text-slate-400 mt-3 px-4">
        <span>Strongly A</span>
        <span className="text-center">Neutral</span>
        <span>Strongly B</span>
      </div>
    </div>
  )
}
