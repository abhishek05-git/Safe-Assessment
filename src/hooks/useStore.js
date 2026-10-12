// Persistent state hook — syncs React state to localStorage automatically.
import { useState } from 'react'

export const load = (key, fallback) => {
  try { return JSON.parse(localStorage.getItem(key)) ?? fallback }
  catch { return fallback }
}

export const save = (key, value) =>
  localStorage.setItem(key, JSON.stringify(value))

export function useStore(key, defaultValue) {
  const [state, setState] = useState(() => load(key, defaultValue))
  const set = (value) => { setState(value); save(key, value) }
  return [state, set]
}
