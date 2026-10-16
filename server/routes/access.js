import express from 'express'
import { requireParticipantAuth } from '../middleware/auth.js'
import { requestCandidateAccess, getParticipantStatus, getParticipantResult } from '../services/googleSheets.js'
import { validateParticipantDetails } from '../middleware/validation.js'
import { getAuthoritativeSettings } from '../services/configService.js'

const router = express.Router()

/**
 * POST /api/access/request
 * Registers access request for the authenticated participant
 * Validates and sanitizes inputs (Item 8) and fails closed on store errors (Item 6).
 */
router.post('/request', requireParticipantAuth, async (req, res) => {
  try {
    const user = req.user.userDetails || {}
    const validation = validateParticipantDetails({
      ...user,
      'Email Id': req.user.email,
    })

    if (!validation.isValid) {
      return res.status(400).json({ error: validation.errors[0] })
    }

    const result = await requestCandidateAccess({
      email: req.user.email,
      name: validation.sanitized['Name'],
      org: validation.sanitized['Organization'],
      phone: validation.sanitized['Phone Number'],
    })

    return res.json({
      success: true,
      status: result.status || 'pending',
    })
  } catch (err) {
    console.error('[Access Request Error]:', err.message)
    return res.status(502).json({ error: 'Failed to submit candidate access request to data store.' })
  }
})

/**
 * GET /api/access/status
 * Returns access status & completed assessment result for ONLY the authenticated participant (SEC 04 & Item 9)
 * Fetches status for a single candidate email without reading full candidate list.
 */
router.get('/status', requireParticipantAuth, async (req, res) => {
  try {
    const statusResult = await getParticipantStatus(req.user.email)
    const existingResult = await getParticipantResult(req.user.email)
    const settings = getAuthoritativeSettings()
    const requireApproval = settings?.requireApproval !== false

    const hasCompleted = Boolean(existingResult && existingResult.result)
    const approved = requireApproval ? statusResult.approved : true

    return res.json({
      success: true,
      email: statusResult.email,
      status: requireApproval ? statusResult.status : 'approved',
      approved,
      hasCompleted,
      result: hasCompleted ? existingResult.result : null,
      user: hasCompleted ? existingResult.user : req.user.userDetails,
    })
  } catch (err) {
    console.error('[Access Status Error]:', err.message)
    return res.status(502).json({ error: 'Failed to retrieve access status from data store.' })
  }
})

export default router
