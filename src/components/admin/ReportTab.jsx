import React from 'react'
import { ChevronUp, ChevronDown } from 'lucide-react'

/**
 * Report sections configurator — toggle and reorder result tabs.
 */
export default function ReportTab({ sections, setSections }) {
  const toggle = (id, checked) =>
    setSections(sections.map(s => s.id === id ? { ...s, on: checked } : s))

  const move = (i, dir) => {
    const arr    = [...sections]
    const target = i + dir
    if (target < 0 || target >= arr.length) return
    ;[arr[i], arr[target]] = [arr[target], arr[i]]
    setSections(arr)
  }

  return (
    <div className="max-w-md space-y-2">
      <p className="text-sm text-slate-500 mb-5">
        Choose which sections appear in the personality report and drag them into your preferred order.
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
  )
}
