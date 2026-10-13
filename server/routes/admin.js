import express from 'express'
import bcrypt from 'bcryptjs'
import { requireAdminAuth } from '../middleware/auth.js'
import { adminLoginRateLimiter } from '../middleware/rateLimiter.js'
import { createSessionToken, getCookieOptions, verifySessionToken } from '../services/sessionService.js'
import { fetchAllApprovals, updateCandidateApproval, fetchAllResults } from '../services/googleSheets.js'

const router = express.Router()

// Default hash for 'admin' (used as dev fallback if ADMIN_PASSWORD_HASH is not set in .env)
const DEV_DEFAULT_ADMIN_HASH = '$2b$10$aw5EQ3Nv8c50FX4gdApNZOfNL0Cb2kRxzk5Y4YBeFWBkoDmTGM1Ci' // bcrypt of 'admin'

function getAdminHash() {
  return process.env.ADMIN_PASSWORD_HASH || DEV_DEFAULT_ADMIN_HASH
}

/**
 * POST /api/admin/login
 * Verifies admin password hash and issues HttpOnly admin session (SEC 02)
 */
router.post('/login', adminLoginRateLimiter, async (req, res) => {
  const { password } = req.body || {}

  if (!password || typeof password !== 'string') {
    return res.status(400).json({ error: 'Admin password is required.' })
  }

  const hash = getAdminHash()
  const isMatch = await bcrypt.compare(password, hash)

  if (!isMatch) {
    return res.status(401).json({ error: 'Incorrect administrator password.' })
  }

  // Issue HttpOnly admin session cookie
  const sessionToken = createSessionToken(
    { role: 'admin' },
    8 * 60 * 60 * 1000 // 8 hours admin session
  )

  res.cookie('safe_admin_session', sessionToken, getCookieOptions(8 * 60 * 60 * 1000))

  console.log(`[AUDIT] Successful admin login from ${req.ip} at ${new Date().toISOString()}`)

  return res.json({ success: true, message: 'Admin authenticated.' })
})

/**
 * GET /api/admin/check
 * Verifies current admin session
 */
router.get('/check', (req, res) => {
  const token = req.cookies?.safe_admin_session
  const session = verifySessionToken(token)

  if (!session || session.role !== 'admin') {
    return res.json({ authenticated: false })
  }

  return res.json({ authenticated: true })
})

/**
 * POST /api/admin/logout
 * Clears admin session cookie
 */
router.post('/logout', (req, res) => {
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
    return res.status(500).json({ error: 'Failed to fetch candidate approvals.' })
  }
})

/**
 * POST /api/admin/approvals/:email
 * Updates candidate access status and writes audit log event
 */
router.post('/approvals/:email', requireAdminAuth, async (req, res) => {
  try {
    const { email } = req.params
    const { status } = req.body

    if (!email || !status || !['approved', 'pending'].includes(status)) {
      return res.status(400).json({ error: 'Valid email and status ("approved" | "pending") required.' })
    }

    const updated = await updateCandidateApproval(email, status)

    console.log(
      `[AUDIT] Admin updated approval for ${email} to "${status}" at ${new Date().toISOString()} (IP: ${req.ip})`
    )

    return res.json({ success: true, record: updated })
  } catch (err) {
    return res.status(500).json({ error: 'Failed to update candidate approval.' })
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
    return res.status(500).json({ error: 'Failed to fetch assessment results.' })
  }
})

export default router
