import express from 'express'
import bcrypt from 'bcryptjs'
import { requireAdminAuth } from '../middleware/auth.js'
import { adminLoginRateLimiter } from '../middleware/rateLimiter.js'
import { createSessionToken, getCookieOptions, verifySessionToken, revokeSession, revokeAllUserSessions } from '../services/sessionService.js'
import { fetchAllApprovals, updateCandidateApproval, fetchAllResults } from '../services/googleSheets.js'

const router = express.Router()

/**
 * POST /api/admin/login
 * Verifies admin password hash and issues HttpOnly admin session (SEC 02)
 * Default fallback credentials removed (Item 1).
 */
router.post('/login', adminLoginRateLimiter, async (req, res) => {
  const { password } = req.body || {}

  if (!password || typeof password !== 'string') {
    return res.status(400).json({ error: 'Admin password is required.' })
  }

  const hash = process.env.ADMIN_PASSWORD_HASH
  if (!hash) {
    console.error('[SECURITY FATAL] Admin login attempted but ADMIN_PASSWORD_HASH is not set.')
    return res.status(500).json({ error: 'Server authentication configuration missing. Access denied.' })
  }

  const isMatch = await bcrypt.compare(password, hash)

  if (!isMatch) {
    return res.status(401).json({ error: 'Incorrect administrator password.' })
  }

  // Issue HttpOnly admin session cookie with 2-hour expiry and unique nonce (Item 11)
  const sessionToken = createSessionToken(
    { role: 'admin' },
    2 * 60 * 60 * 1000 // 2 hours admin session
  )

  res.cookie('safe_admin_session', sessionToken, getCookieOptions(2 * 60 * 60 * 1000, req))

  console.log(`[AUDIT] Successful admin login from ${req.ip} at ${new Date().toISOString()}`)

  return res.json({
    success: true,
    message: 'Admin authenticated.',
    token: sessionToken,
  })
})

/**
 * GET /api/admin/check
 * Verifies current admin session
 */
router.get('/check', (req, res) => {
  const authHeader = req.headers?.authorization
  const bearerToken = authHeader && authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null
  const token = req.cookies?.safe_admin_session || req.signedCookies?.safe_admin_session || bearerToken
  const session = verifySessionToken(token)

  if (!session || session.role !== 'admin') {
    return res.json({ authenticated: false })
  }

  return res.json({ authenticated: true })
})

/**
 * POST /api/admin/logout
 * Clears and actively revokes admin session cookie (Item 11)
 */
router.post('/logout', (req, res) => {
  const authHeader = req.headers?.authorization
  const bearerToken = authHeader && authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null
  const token = req.cookies?.safe_admin_session || req.signedCookies?.safe_admin_session || bearerToken
  const session = verifySessionToken(token)
  if (session?.sessionId) {
    revokeSession(session.sessionId)
  }

  res.clearCookie('safe_admin_session', { path: '/' })
  return res.json({ success: true })
})

/**
 * GET /api/admin/approvals
 * Returns all candidate access requests (Admin authorization required - SEC 04)
 */
router.get('/approvals', requireAdminAuth, async (req, res) => {
  try {
    const approvals = await fetchAllApprovals()
    return res.json({ success: true, approvals })
  } catch (err) {
    console.error('[Admin Approvals Error]:', err.message)
    return res.status(502).json({ error: 'Failed to fetch candidate approvals from data store.' })
  }
})

/**
 * POST /api/admin/approvals/:email
 * Updates candidate access status and writes audit log event
 * Revokes sessions immediately if access is revoked (Item 11).
 */
router.post('/approvals/:email', requireAdminAuth, async (req, res) => {
  try {
    const { email } = req.params
    const { status } = req.body

    if (!email || !status || !['approved', 'pending'].includes(status)) {
      return res.status(400).json({ error: 'Valid email and status ("approved" | "pending") required.' })
    }

    const cleanEmail = email.trim().toLowerCase()
    const updated = await updateCandidateApproval(cleanEmail, status)

    // If revoked to pending, invalidate any active participant sessions immediately (Item 11)
    if (status === 'pending') {
      revokeAllUserSessions(cleanEmail)
    }

    console.log(
      `[AUDIT] Admin updated approval for ${cleanEmail} to "${status}" at ${new Date().toISOString()} (IP: ${req.ip})`
    )

    return res.json({ success: true, record: updated })
  } catch (err) {
    console.error('[Admin Update Approval Error]:', err.message)
    return res.status(502).json({ error: 'Failed to update candidate approval in data store.' })
  }
})

/**
 * GET /api/admin/results
 * Returns participant results for Admin dashboard
 */
router.get('/results', requireAdminAuth, async (req, res) => {
  try {
    const results = await fetchAllResults()
    return res.json({ success: true, results })
  } catch (err) {
    console.error('[Admin Results Error]:', err.message)
    return res.status(502).json({ error: 'Failed to fetch assessment results from data store.' })
  }
})

export default router
