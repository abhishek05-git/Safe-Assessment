import express from 'express'
import { generateOtpChallenge, verifyOtp } from '../services/otpService.js'
import { sendOtpEmail } from '../services/googleSheets.js'
import { createSessionToken, getCookieOptions, verifySessionToken } from '../services/sessionService.js'
import { otpRequestRateLimiter, otpVerifyRateLimiter } from '../middleware/rateLimiter.js'

const router = express.Router()

/**
 * POST /api/auth/request-otp
 * Generates OTP and sends via Apps Script email.
 * OTP is never returned to the caller.
 */
router.post('/request-otp', otpRequestRateLimiter, async (req, res) => {
  try {
    const { email, name, userDetails } = req.body || {}

    if (!email || typeof email !== 'string' || !email.includes('@')) {
      return res.status(400).json({ error: 'A valid email address is required.' })
    }

    const { otp, expiresAt } = generateOtpChallenge(email, userDetails || { Name: name, 'Email Id': email })

    // Send email via Apps Script integration
    await sendOtpEmail(email, name, otp)

    // In non-production local development without an email service, log notice
    if (process.env.NODE_ENV !== 'production' && !process.env.GOOGLE_SCRIPT_URL) {
      console.log(`[DEV OTP NOTIFICATION] Code for ${email}: ${otp}`)
    }

    return res.json({
      success: true,
      message: 'Verification code sent to your registered email.',
      expiresAt,
    })
  } catch (err) {
    return res.status(400).json({ error: err.message || 'Failed to send verification code.' })
  }
})

/**
 * POST /api/auth/verify-otp
 * Verifies OTP hash and issues HttpOnly participant session.
 */
router.post('/verify-otp', otpVerifyRateLimiter, (req, res) => {
  const { email, otp } = req.body || {}

  if (!email || !otp) {
    return res.status(400).json({ error: 'Email and verification code are required.' })
  }

  const result = verifyOtp(email, otp)
  if (!result.valid) {
    return res.status(400).json({ error: result.error || 'Invalid verification code.' })
  }

  // Verification succeeded - issue HttpOnly session cookie
  const sessionToken = createSessionToken({
    role: 'participant',
    email: email.trim().toLowerCase(),
    userDetails: result.userDetails,
  })

  res.cookie('safe_user_session', sessionToken, getCookieOptions(24 * 60 * 60 * 1000))

  return res.json({
    success: true,
    verified: true,
    user: result.userDetails,
  })
})

/**
 * GET /api/auth/me
 * Retrieves current participant profile from valid session.
 */
router.get('/me', (req, res) => {
  const token = req.cookies?.safe_user_session
  const session = verifySessionToken(token)

  if (!session || session.role !== 'participant') {
    return res.json({ authenticated: false, user: null })
  }

  return res.json({
    authenticated: true,
    user: session.userDetails || { 'Email Id': session.email },
  })
})

/**
 * POST /api/auth/logout
 * Clears participant session cookie.
 */
router.post('/logout', (req, res) => {
  res.clearCookie('safe_user_session', { path: '/' })
  return res.json({ success: true })
})

export default router
