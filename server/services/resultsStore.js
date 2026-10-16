import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const DATA_DIR = path.resolve(__dirname, '../data')
const RESULTS_FILE = path.resolve(DATA_DIR, 'results.json')

function ensureDataDir() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true })
  }
}

export function getLocalResults() {
  try {
    ensureDataDir()
    if (!fs.existsSync(RESULTS_FILE)) {
      return []
    }
    const raw = fs.readFileSync(RESULTS_FILE, 'utf-8')
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? parsed : []
  } catch (err) {
    console.error('[ResultsStore Read Error]:', err.message)
    return []
  }
}

export function saveLocalResult(record) {
  try {
    ensureDataDir()
    const current = getLocalResults()
    const cleanEmail = (record.user?.['Email Id'] || record.user?.['Email'] || '').trim().toLowerCase()
    
    // Replace existing if same email, or prepend new
    const filtered = current.filter(r => {
      const existingEmail = (r.user?.['Email Id'] || r.user?.['Email'] || '').trim().toLowerCase()
      return !cleanEmail || existingEmail !== cleanEmail
    })

    filtered.unshift(record)
    fs.writeFileSync(RESULTS_FILE, JSON.stringify(filtered, null, 2), 'utf-8')
    return true
  } catch (err) {
    console.error('[ResultsStore Save Error]:', err.message)
    return false
  }
}

export function deleteLocalResult(email) {
  try {
    ensureDataDir()
    const current = getLocalResults()
    const cleanEmail = String(email || '').trim().toLowerCase()
    if (!cleanEmail) return false

    const filtered = current.filter(r => {
      const existingEmail = (r.user?.['Email Id'] || r.user?.['Email'] || '').trim().toLowerCase()
      return existingEmail !== cleanEmail
    })

    fs.writeFileSync(RESULTS_FILE, JSON.stringify(filtered, null, 2), 'utf-8')
    return true
  } catch (err) {
    console.error('[ResultsStore Delete Error]:', err.message)
    return false
  }
}

