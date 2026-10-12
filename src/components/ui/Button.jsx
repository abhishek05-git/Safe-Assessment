import React from 'react'

// Variant → Tailwind class map. Add new variants here without touching callers.
const VARIANTS = {
  primary:    'bg-sky text-white shadow-lg shadow-sky/25 hover:bg-sky-dark hover:shadow-sky/40',
  secondary:  'bg-white/10 text-white border border-white/30 hover:bg-white/20',
  navy:       'bg-navy text-white shadow-lg shadow-navy/30 hover:bg-navy-mid',
  ghost:      'text-slate-600 hover:bg-slate-100',
  outline:    'border-2 border-slate-200 text-slate-700 hover:border-sky hover:bg-sky/5',
  danger:     'bg-red-50 text-red-600 border border-red-200 hover:bg-red-100',
  success:    'bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100',
  'tab-active':   'bg-navy text-white shadow-sm',
  'tab-inactive': 'text-slate-500 hover:text-slate-700 hover:bg-slate-50',
}

const SIZES = {
  sm: 'px-3 py-1.5 text-sm rounded-xl gap-1.5',
  md: 'px-5 py-3 rounded-2xl gap-2',
  lg: 'px-7 py-4 text-lg rounded-2xl gap-2',
  xl: 'px-10 py-5 text-xl rounded-2xl gap-3',
}

/**
 * Reusable Button component.
 * - variant: primary | secondary | navy | ghost | outline | danger | success | tab-active | tab-inactive
 * - size:    sm | md | lg | xl
 * - icon / iconRight: ReactNode slotted before/after label
 */
export default function Button({
  variant = 'ghost',
  size    = 'md',
  className = '',
  icon,
  iconRight,
  children,
  ...props
}) {
  return (
    <button
      className={[
        'inline-flex items-center font-semibold transition-all duration-200',
        'hover:-translate-y-0.5 active:translate-y-0',
        'disabled:opacity-40 disabled:cursor-not-allowed disabled:transform-none',
        VARIANTS[variant] ?? VARIANTS.ghost,
        SIZES[size]       ?? SIZES.md,
        className,
      ].join(' ')}
      {...props}
    >
      {icon      && <span className="shrink-0">{icon}</span>}
      {children}
      {iconRight && <span className="shrink-0">{iconRight}</span>}
    </button>
  )
}
