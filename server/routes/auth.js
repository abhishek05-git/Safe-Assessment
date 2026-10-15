import express from 'express'
import { generateOtpChallenge, verifyOtp } from '../services/otpService.js'
import { sendOtpEmail } from '../services/googleSheets.js'
import { isSmtpConfigured, sendOtpEmailDirect } from '../services/emailService.js'
import { createSessionToken, getCookieOptions, verifySessionToken, revokeSession } from '../services/sessionService.js'
import { otpRequestRateLimiter, otpVerifyRateLimiter } from '../middleware/rateLimiter.js'
import { validateParticipantDetails } from '../middleware/validation.js'

const router = express.Router()

/**
 * POST /api/auth/request-otp
 * Generates OTP and sends via SMTP or Apps Script email.
 * OTP is never returned to the caller (SEC 01).
 * Validates inputs server-side (Item 8).
 */
router.post('/request-otp', otpRequestRateLimiter, async (req, res) => {
  try {
    const { email, name, userDetails } = req.body || {}

    // Server-side validation of participant details (Item 8)
    const validation = validateParticipantDetails({
      ...(userDetails || {}),
      'Name': name || userDetails?.['Name'],
      'Email Id': email || userDetails?.['Email Id'],
    })

    if (!validation.isValid) {
      return res.status(400).json({ error: validation.errors[0] })
    }

    const cleanEmail = validation.sanitized['Email Id']
    const cleanName = validation.sanitized['Name']

    const { otp, expiresAt, hash, userDetails: savedDetails } = generateOtpChallenge(
      cleanEmail,
      validation.sanitized
    )

    // Issue signed HttpOnly challenge cookie so serverless environments (like Vercel) maintain state
    const challengeToken = createSessionToken(
      {
        challenge: true,
        email: cleanEmail,
        hash,
        expiresAt,
        userDetails: savedDetails,
      },
      10 * 60 * 1000
    )

    res.cookie('safe_otp_challenge', challengeToken, getCookieOptions(10 * 60 * 1000))

    // 1. If direct SMTP is configured (Hostinger / Gmail / Custom SMTP), dispatch directly
    let dispatched = false
    if (isSmtpConfigured()) {
      try {
        const smtpResult = await sendOtpEmailDirect(cleanEmail, cleanName, otp)
        if (smtpResult.success) {
          dispatched = true
        }
      } catch (smtpErr) {
        console.error('[SMTP Send Error]:', smtpErr.message)
      }
    }

    // 2. If not dispatched via SMTP, use Google Apps Script MailApp if configured
    if (!dispatched && process.env.GOOGLE_SCRIPT_URL) {
      try {
        const sendResult = await sendOtpEmail(cleanEmail, cleanName, otp)
        if (sendResult.success) {
          dispatched = true
        }
      } catch (gsErr) {
        console.warn(`[OTP Dispatch Warning] Google Apps Script dispatch failed:`, gsErr.message)
      }
    }

    // In production, fail closed if email could not be dispatched (Item 6)
    if (!dispatched && process.env.NODE_ENV === 'production') {
      return res.status(502).json({ error: 'Failed to dispatch verification email. Please check mail service configuration.' })
    }

    // In local dev without configured mail transport, log notification for testing
    if (!dispatched) {
      console.log(`[DEV OTP NOTIFICATION] Code for ${cleanEmail}: ${otp}`)
    }

    return res.json({
      success: true,
      message: 'Verification code sent to your registered email.',
      expiresAt,
    })
  } catch (err) {
    console.error('[Request OTP Error]:', err.message)
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

  const cleanEmail = String(email).trim().toLowerCase()
  const challengeCookie = req.cookies?.safe_otp_challenge
  const cookieChallenge = verifySessionToken(challengeCookie)

  const result = verifyOtp(cleanEmail, otp, cookieChallenge)
  if (!result.valid) {
    return res.status(400).json({ error: result.error || 'Invalid verification code.' })
  }

  // Clear challenge cookie
  res.clearCookie('safe_otp_challenge', { path: '/' })

  // Verification succeeded - issue HttpOnly session cookie (4 hours max - Item 11)
  const sessionToken = createSessionToken(
    {
      role: 'participant',
      email: cleanEmail,
      userDetails: result.userDetails,
    },
    4 * 60 * 60 * 1000
  )

  res.cookie('safe_user_session', sessionToken, getCookieOptions(4 * 60 * 60 * 1000))

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
 * Clears and actively revokes participant session cookie (Item 11).
 */
router.post('/logout', (req, res) => {
  const token = req.cookies?.safe_user_session
  const session = verifySessionToken(token)
  if (session?.sessionId) {
    revokeSession(session.sessionId)
  }

  res.clearCookie('safe_user_session', { path: '/' })
  return res.json({ success: true })
})

export default router
