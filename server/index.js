import 'dotenv/config'
import express from 'express'
import helmet from 'helmet'
import cookieParser from 'cookie-parser'
import path from 'path'
import { fileURLToPath } from 'url'

import { validateEnv } from './config/env.js'
import authRoutes from './routes/auth.js'
import accessRoutes from './routes/access.js'
import assessmentRoutes from './routes/assessment.js'
import adminRoutes from './routes/admin.js'
import configRoutes from './routes/config.js'
import { generalRateLimiter } from './middleware/rateLimiter.js'
import { requireSameOrigin } from './middleware/csrf.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// 1. Validate security configuration on startup (Item 1)
validateEnv()

const app = express()
const PORT = process.env.PORT || 3000
const HOST = process.env.HOST || '127.0.0.1' // Bind privately to localhost (SEC VPS baseline)

// 2. Proxy-aware configuration for Nginx / Vercel (Item 10)
app.set('trust proxy', 1)

// 3. Security headers with Helmet
app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'", "'unsafe-inline'"],
        styleSrc: ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com'],
        fontSrc: ["'self'", 'https://fonts.gstatic.com'],
        imgSrc: ["'self'", 'data:', 'https:', 'blob:'],
        connectSrc: ["'self'"],
      },
    },
    crossOriginEmbedderPolicy: false,
  })
)

// Body parser with size limits
app.use(express.json({ limit: '100kb' }))
app.use(cookieParser(process.env.SESSION_SECRET))

// 4. Strict Origin / CSRF validation for all state-changing API endpoints (Item 7)
app.use('/api', requireSameOrigin)

// 5. General API rate limiting (proxy-aware - Item 10)
app.use('/api', generalRateLimiter)

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', service: 'SAFE Assessment Security API', timestamp: new Date().toISOString() })
})

// Mount secure API routes
app.use('/api/auth', authRoutes)
app.use('/api/access', accessRoutes)
app.use('/api/assessment', assessmentRoutes)
app.use('/api/admin', adminRoutes)
app.use('/api/config', configRoutes)
app.use('/api/admin/config', configRoutes)

// In production on standalone VPS, can optionally serve built React dist if Nginx routes here
const distPath = path.resolve(__dirname, '../dist')
app.use(express.static(distPath))

app.use((req, res, next) => {
  if (req.method === 'GET' && !req.path.startsWith('/api')) {
    return res.sendFile(path.join(distPath, 'index.html'), err => {
      if (err) next()
    })
  }
  if (req.path.startsWith('/api')) {
    return res.status(404).json({ error: 'API route not found' })
  }
  next()
})

// Generic production-safe error handler
app.use((err, req, res, next) => {
  console.error('[SERVER ERROR]', err.message)
  res.status(500).json({
    error: 'An unexpected internal error occurred. Please try again.',
  })
})

let server = null
if (!process.env.VERCEL) {
  server = app.listen(PORT, HOST, () => {
    console.log(`🛡️ SAFE Assessment Security API running on http://${HOST}:${PORT}`)
    console.log(`🔒 Boundary: Private service (Reverse proxy via Nginx recommended)`)
  })
}

export { server }
export default app
