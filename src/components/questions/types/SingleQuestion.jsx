import React from 'react'

/**
 * Single-choice question — radio-style cards.
 * Used for both `single` and `scenario` types.
 *
 * Question data shape:
 *   {
 *     type: 'single' | 'scenario',
 *     options: [{ label: string, scores: { E: 2, ... } }, ...]
 *   }
 *
 * `scenario` mode prefixes options with A, B, C … instead of ○/●.
 */
export default function SingleQuestion({ q, value, onChange, scenario = false }) {
  const letters = 'ABCDEFGH'

  const options = q.options || []

  return (
    <div className="space-y-3">
      {options.map((opt, i) => {
        const isSelected = value === i
        return (
          <button
            key={i}
            id={`${q.id}-opt-${i}`}
            onClick={() => onChange(i)}
            aria-pressed={isSelected}
            className={[
              'w-full text-left flex items-start gap-4 p-4 md:p-5 rounded-2xl border-2',
              'transition-all duration-200 group cursor-pointer',
              isSelected
                ? 'border-sky bg-sky/10 shadow-sm shadow-sky/20'
                : 'border-slate-200 bg-white/50 hover:border-sky/50 hover:bg-sky/5',
            ].join(' ')}
          >
            {/* Leading badge */}
            <span className={[
              'shrink-0 w-8 h-8 rounded-xl flex items-center justify-center text-sm font-bold transition-colors',
              isSelected
                ? 'bg-sky text-white'
                : 'bg-slate-100 text-slate-500 group-hover:bg-sky/10 group-hover:text-sky',
            ].join(' ')}>
              {scenario ? letters[i] : (isSelected ? '●' : '○')}
            </span>

            {/* Label */}
            <span className={[
              'text-sm md:text-base leading-snug pt-0.5',
              isSelected ? 'text-navy font-medium' : 'text-slate-700',
            ].join(' ')}>
              {opt.label}
            </span>
          </button>
        )
      })}
    </div>
  )
}
