import express from 'express'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import { requireAdminAuth } from '../middleware/auth.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const dataDir = path.resolve(__dirname, '../data')
const configFile = path.join(dataDir, 'customConfig.json')

const router = express.Router()

// Ensure data directory exists
try {
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true })
  }
} catch (e) {}

// In-memory cache
let inMemoryConfig = null

function loadSavedConfig() {
  if (inMemoryConfig) return inMemoryConfig
  try {
    if (fs.existsSync(configFile)) {
      const content = fs.readFileSync(configFile, 'utf8')
      inMemoryConfig = JSON.parse(content)
      return inMemoryConfig
    }
  } catch (err) {
    console.warn('[Config] Failed to read saved config file:', err.message)
  }
  return null
}

function saveConfigToFile(config) {
  inMemoryConfig = config
  try {
    fs.writeFileSync(configFile, JSON.stringify(config, null, 2), 'utf8')
    return true
  } catch (err) {
    console.warn('[Config] Could not write to disk (e.g. read-only serverless environment):', err.message)
    return false
  }
}

/**
 * GET /api/config
 * Retrieves customized questions, profiles, report sections, and settings
 */
router.get('/', (req, res) => {
  const saved = loadSavedConfig()
  return res.json({
    success: true,
    hasCustomConfig: Boolean(saved),
    config: saved || null,
  })
})

/**
 * POST /api/admin/config
 * Saves customized configuration from Admin panel
 */
router.post('/', requireAdminAuth, (req, res) => {
  try {
    const { questions, profiles, sections, settings } = req.body || {}

    const newConfig = {
      updatedAt: new Date().toISOString(),
      questions: Array.isArray(questions) ? questions : undefined,
      profiles: profiles && typeof profiles === 'object' ? profiles : undefined,
      sections: sections && typeof sections === 'object' ? sections : undefined,
      settings: settings && typeof settings === 'object' ? settings : undefined,
    }

    saveConfigToFile(newConfig)

    console.log(`[AUDIT] Admin updated global assessment configuration at ${newConfig.updatedAt}`)

    return res.json({
      success: true,
      message: 'Configuration saved successfully.',
      updatedAt: newConfig.updatedAt,
    })
  } catch (err) {
    console.error('[Config Error]:', err)
    return res.status(500).json({ error: 'Failed to save configuration.' })
  }
})

export default router
