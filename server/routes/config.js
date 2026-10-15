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
    config,
  })
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
