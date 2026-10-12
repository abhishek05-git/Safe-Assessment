import React from 'react'
import ScaleQuestion    from './types/ScaleQuestion'
import SliderQuestion   from './types/SliderQuestion'
import SingleQuestion   from './types/SingleQuestion'
import MultiQuestion    from './types/MultiQuestion'
import SpectrumQuestion from './types/SpectrumQuestion'

/**
 * Registry-based question dispatcher.
 *
 * ─── Adding a new question type ────────────────────────────────────────────
 * 1. Create `src/components/questions/types/YourQuestion.jsx`
 * 2. Import it here
 * 3. Add an entry to REGISTRY below
 * 4. Add the type string to the Admin panel's type selector
 * ───────────────────────────────────────────────────────────────────────────
 */
export const QUESTION_TYPES = [
  { value: 'scale5',   label: '5-Point Scale',  icon: '⚖️' },
  { value: 'scale7',   label: '7-Point Scale',  icon: '📊' },
  { value: 'slider',   label: 'Range Slider',   icon: '🔢' },
  { value: 'single',   label: 'Single Choice',  icon: '🔘' },
  { value: 'multi',    label: 'Multi-Select',   icon: '☑️' },
  { value: 'scenario', label: 'Scenario',       icon: '📖' },
  { value: 'spectrum', label: 'Spectrum',       icon: '↔️' },
]

const REGISTRY = {
  scale5:   (p) => <ScaleQuestion    {...p} points={5} />,
  scale7:   (p) => <ScaleQuestion    {...p} points={7} />,
  slider:   (p) => <SliderQuestion   {...p} />,
  single:   (p) => <SingleQuestion   {...p} />,
  scenario: (p) => <SingleQuestion   {...p} scenario />,
  multi:    (p) => <MultiQuestion    {...p} />,
  spectrum: (p) => <SpectrumQuestion {...p} />,
}

/**
 * QuestionRenderer — looks up the type in REGISTRY and renders the component.
 * Falls back to an error box for unknown types.
 */
export default function QuestionRenderer({ q, value, onChange }) {
  const renderer = REGISTRY[q?.type]

  if (!renderer) {
    return (
      <div className="p-4 bg-red-50 border border-red-200 rounded-2xl text-red-600 text-sm">
        Unknown question type: <code className="font-mono bg-red-100 px-1 rounded">{q?.type}</code>
      </div>
    )
  }

  return renderer({ q, value, onChange })
}
