import express from 'express'
import { requireParticipantAuth } from '../middleware/auth.js'
import { requestCandidateAccess, getParticipantStatus } from '../services/googleSheets.js'

const router = express.Router()

/**
 * POST /api/access/request
 * Registers access request for the authenticated participant
 */
router.post('/request', requireParticipantAuth, async (req, res) => {
  try {
    const user = req.user.userDetails || {}
    const result = await requestCandidateAccess({
      email: req.user.email,
      name: user['Name'] || user['Full Name'] || 'Participant',
      org: user['Name of the Organization'] || user['Organization'] || '',
      phone: user['Phone Number'] || '',
    })

    return res.json({
      success: true,
      status: result.status || 'pending',
    })
  } catch (err) {
    return res.status(500).json({ error: 'Failed to submit access request.' })
  }
})

/**
 * GET /api/access/status
 * Returns access status for ONLY the authenticated participant (SEC 04)
 */
router.get('/status', requireParticipantAuth, async (req, res) => {
  try {
    const statusResult = await getParticipantStatus(req.user.email)
    return res.json({
      success: true,
      email: statusResult.email,
      status: statusResult.status,
      approved: statusResult.approved,
    })
  } catch (err) {
    return res.status(500).json({ error: 'Failed to retrieve access status.' })
  }
})

export default router
