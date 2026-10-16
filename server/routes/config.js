import express from 'express'
import { requireAdminAuth } from '../middleware/auth.js'
import { getFullAuthoritativeConfig, setAuthoritativeConfig } from '../services/configService.js'

const router = express.Router()

/**
 * GET /api/config
 * Retrieves authoritative questions, profiles, report sections, and settings
 */
router.get('/', (req, res) => {
  const config = getFullAuthoritativeConfig()
  return res.json({
    success: true,
    hasCustomConfig: true,
    config,
  })
})

/**
 * POST /api/admin/config/profiles
 * Dedicated endpoint for saving personality profiles permanently
 */
router.post('/profiles', requireAdminAuth, (req, res) => {
  try {
    const { profiles } = req.body || {}
    if (!profiles || typeof profiles !== 'object') {
      return res.status(400).json({ error: 'Profiles object is required.' })
    }

    const updated = setAuthoritativeConfig({ profiles })
    console.log(`[AUDIT] Admin updated authoritative profiles at ${new Date().toISOString()}`)

    return res.json({
      success: true,
      message: 'Profiles permanently saved.',
      profiles: updated.profiles,
    })
  } catch (err) {
    console.error('[Config Profiles Error]:', err)
    return res.status(500).json({ error: 'Failed to update profiles.' })
  }
})

/**
 * POST /api/admin/config
 * Updates authoritative configuration from Admin panel (Item 13)
 */
router.post('/', requireAdminAuth, (req, res) => {
  try {
    const { questions, profiles, sections, settings } = req.body || {}

    const updated = setAuthoritativeConfig({
      questions,
      profiles,
      sections,
      settings,
    })

    console.log(`[AUDIT] Admin updated authoritative assessment configuration at ${new Date().toISOString()}`)

    return res.json({
      success: true,
      message: 'Authoritative configuration updated successfully.',
      config: updated,
    })
  } catch (err) {
    console.error('[Config Error]:', err)
    return res.status(500).json({ error: 'Failed to update authoritative configuration.' })
  }
})

export default router
