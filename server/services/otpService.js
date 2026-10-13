import crypto from 'crypto'

/**
 * OTP Service
 * - Cryptographically secure 6-digit OTP generation
 * - HMAC-SHA256 hashing using OTP_PEPPER
 * - Expiration and attempt-rate enforcement
 * - Timing-safe verification
 */

const DEFAULT_PEPPER = 'safe_assessment_otp_pepper_secret_change_in_production'
const OTP_EXPIRY_MS = 10 * 60 * 1000 // 10 minutes
const MAX_ATTEMPTS = 5
const RESEND_COOLDOWN_MS = 45 * 1000 // 45 seconds

// In-memory challenge store: email -> { hash, expiresAt, attempts, lastSentAt, userDetails }
const challenges = new Map()

function getPepper() {
  return process.env.OTP_PEPPER || DEFAULT_PEPPER
}

function hashOtp(otp, email) {
  const pepper = getPepper()
  return crypto
    .createHmac('sha256', pepper)
    .update(`${email.trim().toLowerCase()}:${otp}`)
    .digest('hex')
}

/**
 * Create a new OTP challenge.
 * Returns { otp, expiresAt } - the plaintext OTP is returned ONLY so the caller can send it via email.
 */
export function generateOtpChallenge(email, userDetails = {}) {
  const cleanEmail = email.trim().toLowerCase()
  const existing = challenges.get(cleanEmail)

  // Enforce resend cooldown
  if (existing && Date.now() - existing.lastSentAt < RESEND_COOLDOWN_MS) {
    const waitSec = Math.ceil((RESEND_COOLDOWN_MS - (Date.now() - existing.lastSentAt)) / 1000)
    throw new Error(`Please wait ${waitSec} seconds before requesting a new code.`)
  }

  // Generate 6-digit cryptographically secure OTP
  const otp = crypto.randomInt(100000, 1000000).toString()
  const hash = hashOtp(otp, cleanEmail)
  const expiresAt = Date.now() + OTP_EXPIRY_MS

  challenges.set(cleanEmail, {
    hash,
    expiresAt,
    attempts: 0,
    lastSentAt: Date.now(),
    userDetails: {
      ...userDetails,
      'Email Id': cleanEmail,
      Email: cleanEmail,
    },
  })

  return { otp, expiresAt }
}

/**
 * Verify an OTP.
 * Returns { valid: boolean, error?: string, userDetails?: object }
 */
export function verifyOtp(email, enteredOtp) {
  const cleanEmail = email.trim().toLowerCase()
  const challenge = challenges.get(cleanEmail)

  if (!challenge) {
    return { valid: false, error: 'No verification code found. Please request a new one.' }
  }

  if (Date.now() > challenge.expiresAt) {
    challenges.delete(cleanEmail)
    return { valid: false, error: 'Verification code has expired. Please request a new one.' }
  }

  if (challenge.attempts >= MAX_ATTEMPTS) {
    challenges.delete(cleanEmail)
    return { valid: false, error: 'Too many incorrect attempts. Please request a new code.' }
  }

  challenge.attempts += 1

  const enteredHash = hashOtp(String(enteredOtp).trim(), cleanEmail)
  const a = Buffer.from(enteredHash, 'hex')
  const b = Buffer.from(challenge.hash, 'hex')

  const isMatch = a.length === b.length && crypto.timingSafeEqual(a, b)

  if (!isMatch) {
    const remaining = MAX_ATTEMPTS - challenge.attempts
    return {
      valid: false,
      error: remaining > 0 ? `Incorrect code. ${remaining} attempts remaining.` : 'Too many incorrect attempts.',
    }
  }

  // Verification succeeded - consume challenge
  const userDetails = challenge.userDetails
  challenges.delete(cleanEmail)

  return { valid: true, userDetails }
}

/**
 * Cleanup expired challenges periodically
 */
setInterval(() => {
  const now = Date.now()
  for (const [email, challenge] of challenges.entries()) {
    if (now > challenge.expiresAt) {
      challenges.delete(email)
    }
  }
}, 5 * 60 * 1000)
