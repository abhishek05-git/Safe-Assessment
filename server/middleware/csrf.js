/**
 * Strict Origin and CSRF Protection Middleware (Item 7)
 * Blocks unauthorized cross-origin state-changing requests.
 */

const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS'])

export function requireSameOrigin(req, res, next) {
  if (SAFE_METHODS.has(req.method)) {
    return next()
  }

  // Extract request host
  const host = req.get('host')
  const origin = req.headers.origin
  const referer = req.headers.referer

  // If Origin header is present (standard on all fetch/XHR POST requests)
  if (origin) {
    try {
      const originUrl = new URL(origin)
      if (originUrl.host === host) {
        return next()
      }
      
      // Allow configured public domain
      if (process.env.PUBLIC_DOMAIN && originUrl.host === process.env.PUBLIC_DOMAIN) {
        return next()
      }
    } catch (e) {}

    console.warn(`[CSRF BLOCKED] Rejected state-changing request from unauthorized Origin: ${origin} (Host: ${host})`)
    return res.status(403).json({ error: 'Forbidden: Cross-origin state change blocked (Origin mismatch).' })
  }

  // Fallback to Referer header if Origin was omitted
  if (referer) {
    try {
      const refererUrl = new URL(referer)
      if (refererUrl.host === host) {
        return next()
      }
      if (process.env.PUBLIC_DOMAIN && refererUrl.host === process.env.PUBLIC_DOMAIN) {
        return next()
      }
    } catch (e) {}

    console.warn(`[CSRF BLOCKED] Rejected state-changing request from unauthorized Referer: ${referer} (Host: ${host})`)
    return res.status(403).json({ error: 'Forbidden: Cross-origin state change blocked (Referer mismatch).' })
  }

  // In non-production tests or headless tools without headers, permit if explicit test header or dev
  if (process.env.NODE_ENV !== 'production' && req.headers['x-test-bypass'] === '1') {
    return next()
  }

  // If neither Origin nor Referer is provided for a mutation request in production
  if (process.env.NODE_ENV === 'production') {
    console.warn(`[CSRF BLOCKED] Missing Origin and Referer on state-changing ${req.method} request to ${req.originalUrl}`)
    return res.status(403).json({ error: 'Forbidden: Missing Origin verification header.' })
  }

  next()
}
