import express from 'express'
import { requireParticipantAuth } from '../middleware/auth.js'
import { getParticipantStatus, saveAssessmentResult } from '../services/googleSheets.js'
import { score } from '../../src/engine/scoring.js'
import { questions, dimensions, profiles } from '../../src/data/config.js'

const router = express.Router()

/**
 * POST /api/assessment/submit
 * Server-authoritative scoring and result submission (SEC 06)
 */
router.post('/submit', requireParticipantAuth, async (req, res) => {
  try {
    const { answers, durationMs } = req.body || {}

    if (!answers || typeof answers !== 'object') {
      return res.status(400).json({ error: 'Assessment answers are required.' })
    }

    // Verify candidate is approved
    const status = await getParticipantStatus(req.user.email)
    if (!status.approved) {
      return res.status(403).json({ error: 'Assessment submission rejected: Access approval is required.' })
    }

    // Active questions check
    const activeQuestions = questions.filter(q => q.active)
    const missing = activeQuestions.filter(q => q.required && answers[q.id] == null)
    if (missing.length > 0) {
      return res.status(400).json({ error: `Incomplete assessment. ${missing.length} required question(s) missing.` })
    }

    // Authoritative server-side calculation using UNCHANGED scoring engine
    const scored = score(questions, answers, dimensions)

    // Calculate completion time
    const safeDurationMs = typeof durationMs === 'number' && durationMs > 0 ? durationMs : 0
    const mins = Math.floor(safeDurationMs / 60000)
    const secs = Math.floor((safeDurationMs % 60000) / 1000)
    const formattedTime = `${mins}m ${secs}s`

    const finalResult = {
      ...scored,
      timeSpent: formattedTime,
      timeSpentMs: safeDurationMs,
    }

    const userDetails = req.user.userDetails || { 'Email Id': req.user.email }

    // Persist to Google Sheets server-to-server
    await saveAssessmentResult(userDetails, scored, formattedTime)

    return res.json({
      success: true,
      result: finalResult,
    })
  } catch (err) {
    console.error('[Assessment Submit Error]:', err)
    return res.status(500).json({ error: 'Failed to process assessment submission.' })
  }
})

export default router
