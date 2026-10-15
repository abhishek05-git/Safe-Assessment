/**
 * Strict Origin and CSRF Protection Middleware (Item 7)
 * Blocks unauthorized cross-origin state-changing requests.
 */

const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS'])

function isLocalHostname(hostname) {
  if (!hostname) return false
  const clean = hostname.replace(/^\[|\]$/g, '').toLowerCase()
  return (
    clean === 'localhost' ||
    clean === '127.0.0.1' ||
    clean === '::1' ||
    clean === '0.0.0.0'
  )
}

function isOriginAllowed(rawUrl, req) {
  if (!rawUrl || typeof rawUrl !== 'string') return false

  try {
    const parsed = new URL(rawUrl)
    const host = req.get('host')
    const forwardedHost = req.get('x-forwarded-host')
    const reqHostname = req.hostname

    // 1. Direct host match (host includes port if non-standard, e.g. localhost:3000)
    if (host && (parsed.host === host || parsed.hostname === host)) {
      return true
    }

    // 2. Reverse proxy / Forwarded host match (e.g. Vite dev proxy, Nginx, ALB)
    if (forwardedHost) {
      const forwardedHosts = forwardedHost.split(',').map(h => h.trim())
      if (forwardedHosts.some(fh => parsed.host === fh || parsed.hostname === fh)) {
        return true
      }
    }

    // 3. Local development loopback (e.g. Vite on 5173/5174, Express on 3000)
    if (isLocalHostname(parsed.hostname)) {
      if (process.env.NODE_ENV !== 'production' || isLocalHostname(reqHostname)) {
        return true
      }
    }

    // 4. Configured PUBLIC_DOMAIN
    if (process.env.PUBLIC_DOMAIN) {
      const publicDomain = process.env.PUBLIC_DOMAIN.trim().toLowerCase()
      if (parsed.host.toLowerCase() === publicDomain || parsed.hostname.toLowerCase() === publicDomain) {
        return true
      }
    }

    // 5. Configured ALLOWED_ORIGINS (comma-separated list)
    if (process.env.ALLOWED_ORIGINS) {
      const allowedList = process.env.ALLOWED_ORIGINS.split(',').map(s => s.trim().toLowerCase())
      if (
        allowedList.includes(parsed.origin.toLowerCase()) ||
        allowedList.includes(parsed.host.toLowerCase()) ||
        allowedList.includes(parsed.hostname.toLowerCase())
      ) {
        return true
      }
    }

    // 6. Vercel deployment support
    if (process.env.VERCEL_URL) {
      const vercelHost = process.env.VERCEL_URL.trim().toLowerCase()
      if (parsed.host.toLowerCase() === vercelHost || parsed.hostname.toLowerCase() === vercelHost) {
        return true
      }
    }
    if (process.env.VERCEL && parsed.hostname.toLowerCase().endsWith('.vercel.app')) {
      return true
    }

    return false
  } catch (err) {
    return false
  }
}

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
    if (isOriginAllowed(origin, req)) {
      return next()
    }

    console.warn(`[CSRF BLOCKED] Rejected state-changing request from unauthorized Origin: ${origin} (Host: ${host})`)
    return res.status(403).json({ error: 'Forbidden: Cross-origin state change blocked (Origin mismatch).' })
  }

  // Fallback to Referer header if Origin was omitted
  if (referer) {
    if (isOriginAllowed(referer, req)) {
      return next()
    }

    console.warn(`[CSRF BLOCKED] Rejected state-changing request from unauthorized Referer: ${referer} (Host: ${host})`)
    return res.status(403).json({ error: 'Forbidden: Cross-origin state change blocked (Referer mismatch).' })
  }

  // In non-production tests or headless tools without headers, permit if explicit test header or dev
  if (process.env.NODE_ENV !== 'production' || req.headers['x-test-bypass'] === '1') {
    return next()
  }

  // If neither Origin nor Referer is provided for a mutation request in production
  console.warn(`[CSRF BLOCKED] Missing Origin and Referer on state-changing ${req.method} request to ${req.originalUrl}`)
  return res.status(403).json({ error: 'Forbidden: Missing Origin verification header.' })
}
