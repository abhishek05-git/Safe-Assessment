import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import { questions as defaultQuestions, dimensions as defaultDimensions, profiles as defaultProfiles, reportSections as defaultSections } from '../../src/data/config.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const dataDir = path.resolve(__dirname, '../data')
const configFile = path.join(dataDir, 'customConfig.json')

let currentConfig = {
  questions: defaultQuestions,
  dimensions: defaultDimensions,
  profiles: defaultProfiles,
  sections: defaultSections,
  settings: { requireApproval: true },
}

// Try loading saved configuration on startup
try {
  if (fs.existsSync(configFile)) {
    const raw = fs.readFileSync(configFile, 'utf8')
    const parsed = JSON.parse(raw)
    if (parsed) {
      if (Array.isArray(parsed.questions) && parsed.questions.length > 0) {
        currentConfig.questions = parsed.questions
      }
      if (parsed.profiles && typeof parsed.profiles === 'object') {
        currentConfig.profiles = parsed.profiles
      }
      if (parsed.sections && typeof parsed.sections === 'object') {
        currentConfig.sections = parsed.sections
      }
      if (parsed.settings && typeof parsed.settings === 'object') {
        currentConfig.settings = parsed.settings
      }
    }
  }
} catch (e) {
  console.warn('[ConfigService] Using default configuration:', e.message)
}

export function getAuthoritativeQuestions() {
  return currentConfig.questions
}

export function getAuthoritativeDimensions() {
  return currentConfig.dimensions
}

export function getAuthoritativeProfiles() {
  return currentConfig.profiles
}

export function getAuthoritativeSettings() {
  return currentConfig.settings
}

export function getFullAuthoritativeConfig() {
  return currentConfig
}

export function setAuthoritativeConfig(newConfig = {}) {
  if (Array.isArray(newConfig.questions)) {
    currentConfig.questions = newConfig.questions
  }
  if (newConfig.profiles && typeof newConfig.profiles === 'object') {
    currentConfig.profiles = newConfig.profiles
  }
  if (newConfig.sections && typeof newConfig.sections === 'object') {
    currentConfig.sections = newConfig.sections
  }
  if (newConfig.settings && typeof newConfig.settings === 'object') {
    currentConfig.settings = newConfig.settings
  }

  // Persist to disk if writable
  try {
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true })
    }
    fs.writeFileSync(configFile, JSON.stringify(currentConfig, null, 2), 'utf8')
  } catch (err) {
    console.warn('[ConfigService] Could not persist to disk (e.g. serverless read-only filesystem):', err.message)
  }

  return currentConfig
}
