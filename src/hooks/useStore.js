// Persistent state hook — syncs React state to localStorage automatically.
import { useState } from 'react'

export const load = (key, fallback) => {
  try {
    const raw = localStorage.getItem(key)
    if (raw === null || raw === undefined || raw === 'undefined') return fallback
    const parsed = JSON.parse(raw)
    return parsed ?? fallback
  } catch {
    return fallback
  }
}

export const save = (key, value) => {
  try {
    if (value === undefined) {
      localStorage.removeItem(key)
    } else {
      localStorage.setItem(key, JSON.stringify(value))
    }
  } catch (err) {
    console.warn(`[useStore] Failed to save key "${key}" to localStorage:`, err)
  }
}

export function useStore(key, defaultValue) {
  const [state, setState] = useState(() => load(key, defaultValue))

  const set = (value) => {
    setState(prev => {
      const next = typeof value === 'function' ? value(prev) : value
      save(key, next)
      return next
    })
  }

  return [state, set]
}
