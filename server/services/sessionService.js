import crypto from 'crypto'

/**
 * Session service for signing, verifying, and revoking HttpOnly session cookies.
 * Implements session IDs/nonces and revocation verification (Item 11).
 * Default hardcoded secret removed (Item 1).
 */

// In-memory revocation cache: sessionId -> revokedTimestamp
const revokedSessions = new Map()

// Map user email to set of active sessionIds for targeted revocation upon access revoke
const userSessions = new Map()

function getSecret() {
  const secret = process.env.SESSION_SECRET
  if (!secret) {
    throw new Error('SESSION_SECRET environment variable is missing. Server cannot sign session tokens.')
  }
  return secret
}

/**
 * Create a signed session token with unique session ID (Item 11).
 * Format: base64Payload.signature
 */
export function createSessionToken(payload, expiresInMs = 4 * 60 * 60 * 1000) {
  const secret = getSecret()
  const sessionId = crypto.randomUUID()

  const fullPayload = {
    ...payload,
    sessionId,
    createdAt: Date.now(),
    expiresAt: Date.now() + expiresInMs,
  }

  // Track session for user if email provided
  if (fullPayload.email) {
    const cleanEmail = fullPayload.email.trim().toLowerCase()
    if (!userSessions.has(cleanEmail)) {
      userSessions.set(cleanEmail, new Set())
    }
    userSessions.get(cleanEmail).add(sessionId)
  }

  const payloadStr = Buffer.from(JSON.stringify(fullPayload)).toString('base64url')
  const signature = crypto
    .createHmac('sha256', secret)
    .update(payloadStr)
    .digest('base64url')

  return `${payloadStr}.${signature}`
}

/**
 * Revoke an active session by its ID
 */
export function revokeSession(sessionId) {
  if (sessionId) {
    revokedSessions.set(sessionId, Date.now())
  }
}

/**
 * Revoke all sessions associated with an email (e.g. when admin revokes access)
 */
export function revokeAllUserSessions(email) {
  if (!email) return
  const cleanEmail = email.trim().toLowerCase()
  const sessions = userSessions.get(cleanEmail)
  if (sessions) {
    for (const sid of sessions) {
      revokeSession(sid)
    }
    userSessions.delete(cleanEmail)
  }
}

/**
 * Check if a session ID has been revoked
 */
export function isSessionRevoked(sessionId) {
  if (!sessionId) return true
  return revokedSessions.has(sessionId)
}

/**
 * Verify a signed session token.
 * Validates HMAC-SHA256 signature, expiry, and revocation state.
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
    
    // Check expiry
    if (payload.expiresAt && Date.now() > payload.expiresAt) {
      return null
    }

    // Check revocation (Item 11)
    if (isSessionRevoked(payload.sessionId)) {
      return null
    }

    return payload
  } catch (err) {
    return null
  }
}

/**
 * Standard secure cookie options.
 */
export function getCookieOptions(maxAgeMs = 4 * 60 * 60 * 1000) {
  const isProd = process.env.NODE_ENV === 'production'
  return {
    httpOnly: true,
    secure: isProd, // Set to true in production (HTTPS)
    sameSite: 'lax',
    path: '/',
    maxAge: maxAgeMs,
  }
}
