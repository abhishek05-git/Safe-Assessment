import { verifySessionToken } from '../services/sessionService.js'

/**
 * Middleware ensuring request is from an authenticated participant
 */
export function requireParticipantAuth(req, res, next) {
  const token = req.cookies?.safe_user_session

  if (!token) {
    return res.status(401).json({ error: 'Authentication required. Please verify with your email first.' })
  }

  const session = verifySessionToken(token)
  if (!session || session.role !== 'participant' || !session.email) {
    return res.status(401).json({ error: 'Session expired or invalid. Please sign in again.' })
  }

  req.user = session
  next()
}

/**
 * Middleware ensuring request is from an authenticated administrator
 */
export function requireAdminAuth(req, res, next) {
  const authHeader = req.headers?.authorization
  const bearerToken = authHeader && authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null
  const token = req.cookies?.safe_admin_session || req.signedCookies?.safe_admin_session || bearerToken

  if (!token) {
    if (req.cookies?.safe_user_session || req.signedCookies?.safe_user_session) {
      return res.status(403).json({ error: 'Forbidden: Admin authorization required.' })
    }
    return res.status(401).json({ error: 'Admin authentication required.' })
  }

  const session = verifySessionToken(token)
  if (!session || session.role !== 'admin') {
    return res.status(403).json({ error: 'Forbidden: Invalid or non-admin session.' })
  }

  req.admin = session
  next()
}
