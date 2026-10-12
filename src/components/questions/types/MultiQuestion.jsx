import React from 'react'

/**
 * Multi-select question — checkbox-style cards.
 *
 * Question data shape:
 *   {
 *     type: 'multi',
 *     options: [{ label: string, scores: { E: 2, ... } }, ...]
 *   }
 *
 * `value` is an array of selected option indices.
 */
export default function MultiQuestion({ q, value = [], onChange }) {
  const toggle = (i) => {
    const next = value.includes(i)
      ? value.filter(x => x !== i)
      : [...value, i]
    onChange(next)
  }

  return (
    <div className="space-y-3">
      {/* Hint */}
      <p className="flex items-center gap-2 text-sm text-slate-500 mb-4">
        <span className="inline-flex w-5 h-5 rounded-md border-2 border-sky/50 bg-sky/10 items-center justify-center text-sky text-xs font-bold">✓</span>
        Select all that apply
      </p>

      {(q.options || []).map((opt, i) => {
        const isSelected = value.includes(i)
        return (
          <button
            key={i}
            id={`${q.id}-opt-${i}`}
            onClick={() => toggle(i)}
            aria-pressed={isSelected}
            className={[
              'w-full text-left flex items-start gap-4 p-4 md:p-5 rounded-2xl border-2',
              'transition-all duration-200 group cursor-pointer',
              isSelected
                ? 'border-sky bg-sky/10 shadow-sm shadow-sky/20'
                : 'border-slate-200 bg-white/50 hover:border-sky/50 hover:bg-sky/5',
            ].join(' ')}
          >
            {/* Checkbox */}
            <span className={[
              'shrink-0 w-6 h-6 rounded-md border-2 flex items-center justify-center text-xs font-bold transition-all',
              isSelected
                ? 'bg-sky border-sky text-white'
                : 'border-slate-300 bg-white group-hover:border-sky/50',
            ].join(' ')}>
              {isSelected && '✓'}
            </span>

            {/* Label */}
            <span className={[
              'text-sm md:text-base leading-snug',
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
