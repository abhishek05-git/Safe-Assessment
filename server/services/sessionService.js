import crypto from 'crypto'

/**
 * Session service for signing and verifying HttpOnly session cookies.
 * Supports roles: 'participant' and 'admin'.
 */

const DEFAULT_SECRET = 'safe_assessment_dev_secret_key_change_in_production_32chars'

function getSecret() {
  return process.env.SESSION_SECRET || DEFAULT_SECRET
}

/**
 * Create a signed session token.
 * Token format: base64Payload.signature
 */
export function createSessionToken(payload, expiresInMs = 24 * 60 * 60 * 1000) {
  const secret = getSecret()
  const fullPayload = {
    ...payload,
    createdAt: Date.now(),
    expiresAt: Date.now() + expiresInMs,
  }

  const payloadStr = Buffer.from(JSON.stringify(fullPayload)).toString('base64url')
  const signature = crypto
    .createHmac('sha256', secret)
    .update(payloadStr)
    .digest('base64url')

  return `${payloadStr}.${signature}`
}

/**
 * Verify a signed session token.
 * Returns payload if valid and not expired, or null if invalid.
 */
export function verifySessionToken(token) {
  if (!token || typeof token !== 'string') return null
  const parts = token.split('.')
  if (parts.length !== 2) return null

  const [payloadStr, signature] = parts
  const secret = getSecret()

  const expectedSignature = crypto
    .createHmac('sha256', secret)
    .update(payloadStr)
    .digest('base64url')

  // Timing safe comparison to prevent timing attacks
  try {
    const a = Buffer.from(signature)
    const b = Buffer.from(expectedSignature)
    if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) {
      return null
    }

    const payload = JSON.parse(Buffer.from(payloadStr, 'base64url').toString('utf8'))
    if (payload.expiresAt && Date.now() > payload.expiresAt) {
      return null // Expired
    }

    return payload
  } catch (err) {
    return null
  }
}

/**
 * Helper to get standard secure cookie options.
 */
export function getCookieOptions(maxAgeMs = 24 * 60 * 60 * 1000) {
  const isProd = process.env.NODE_ENV === 'production'
  return {
    httpOnly: true,
    secure: isProd, // Set to true in production (HTTPS)
    sameSite: 'lax',
    path: '/',
    maxAge: maxAgeMs,
  }
}
