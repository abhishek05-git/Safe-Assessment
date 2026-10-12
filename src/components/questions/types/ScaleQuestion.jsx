import React from 'react'

/**
 * Scale (Likert) question — renders N dots in a row.
 * Works for both scale5 (5 dots) and scale7 (7 dots).
 *
 * Question data shape:
 *   { type: 'scale5' | 'scale7', scoring: { 1:'I', 2:'I', 3:'neutral', ... } }
 */
export default function ScaleQuestion({ q, value, onChange, points = 5 }) {
  // Reverse the array to render Agree (5) on the left and Disagree (1) on the right
  const dots = Array.from({ length: points }, (_, i) => points - i)
  const center = (points + 1) / 2

  // Labels for 5-point scale
  const labels = {
    1: 'Strongly Disagree',
    2: 'Disagree',
    3: 'Neutral',
    4: 'Agree',
    5: 'Strongly Agree'
  }

  return (
    <div className="py-4">
      {/* Dots */}
      <div className="flex justify-between items-center gap-2 md:gap-4 px-2">
        {dots.map(v => {
          const isActive = value === v
          const distance = Math.abs(v - center)
          const maxDist = (points - 1) / 2
          
          // Size maps from 32px (center) up to 56px (outer edges)
          const size = 32 + (distance / maxDist) * 24

          // Determine side for colors
          const isDisagree = v < center
          const isAgree = v > center
          const isNeutral = v === center

          // Color classes
          let colorClass = ''
          if (isActive) {
            if (isDisagree) colorClass = 'bg-rose-500 border-rose-500 shadow-lg shadow-rose-500/40'
            else if (isAgree) colorClass = 'bg-emerald-500 border-emerald-500 shadow-lg shadow-emerald-500/40'
            else colorClass = 'bg-slate-400 border-slate-400 shadow-lg shadow-slate-400/40'
          } else {
            if (isDisagree) colorClass = 'border-rose-400 bg-white hover:bg-rose-50'
            else if (isAgree) colorClass = 'border-emerald-400 bg-white hover:bg-emerald-50'
            else colorClass = 'border-slate-300 bg-white hover:bg-slate-50'
          }

          return (
            <div key={v} className="flex flex-col items-center flex-1">
              <button
                id={`${q.id}-dot-${v}`}
                onClick={() => onChange(v)}
                title={labels[v] || `Option ${v}`}
                aria-label={labels[v] || `Option ${v}`}
                aria-pressed={isActive}
                style={{ width: `${size}px`, height: `${size}px` }}
                className={[
                  'rounded-full border-2 transition-all duration-200 cursor-pointer',
                  'hover:scale-110 focus:outline-none focus:ring-2 focus:ring-offset-2',
                  isActive ? 'scale-110' : '',
                  isDisagree ? 'focus:ring-rose-400' : isAgree ? 'focus:ring-emerald-400' : 'focus:ring-slate-400',
                  colorClass
                ].join(' ')}
              />
              {/* Optional labels directly underneath for absolute clarity */}
              <span className={`mt-3 text-[10px] md:text-xs font-semibold text-center transition-colors ${
                isActive 
                  ? (isDisagree ? 'text-rose-600' : isAgree ? 'text-emerald-600' : 'text-slate-600') 
                  : 'text-slate-400 opacity-0 md:opacity-100'
              }`}>
                {labels[v]}
              </span>
            </div>
          )
        })}
      </div>
    </div>
  )
}
