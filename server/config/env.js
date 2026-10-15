import 'dotenv/config'

/**
 * Validates critical security environment variables on server startup (P0 SEC 01 / SEC 02).
 * Fails closed immediately in production or if secrets are missing / using insecure placeholders.
 */

const isProd = process.env.NODE_ENV === 'production'
const isTest = process.env.NODE_ENV === 'test'

const INSECURE_PLACEHOLDERS = [
  'replace_with_long_random_session_secret_at_least_32_characters',
  'replace_with_separate_long_random_otp_pepper_secret',
  'replace_with_bcrypt_hash_of_admin_password',
  'replace_with_strong_shared_secret_token',
  'admin',
  'password',
  'secret',
  '123456',
]

export function validateEnv() {
  const errors = []

  const {
    SESSION_SECRET,
    OTP_PEPPER,
    ADMIN_PASSWORD_HASH,
    GOOGLE_SCRIPT_URL,
    GOOGLE_SCRIPT_SHARED_SECRET,
  } = process.env

  // 1. SESSION_SECRET
  if (!SESSION_SECRET) {
    errors.push('SESSION_SECRET environment variable is missing.')
  } else if (SESSION_SECRET.length < 32) {
    errors.push('SESSION_SECRET must be at least 32 characters long for cryptographic security.')
  } else if (INSECURE_PLACEHOLDERS.includes(SESSION_SECRET)) {
    errors.push('SESSION_SECRET is using a known default placeholder value.')
  }

  // 2. OTP_PEPPER
  if (!OTP_PEPPER) {
    errors.push('OTP_PEPPER environment variable is missing.')
  } else if (OTP_PEPPER.length < 16) {
    errors.push('OTP_PEPPER must be at least 16 characters long.')
  } else if (INSECURE_PLACEHOLDERS.includes(OTP_PEPPER)) {
    errors.push('OTP_PEPPER is using a known default placeholder value.')
  } else if (OTP_PEPPER === SESSION_SECRET) {
    errors.push('OTP_PEPPER must be distinct from SESSION_SECRET.')
  }

  // 3. ADMIN_PASSWORD_HASH
  if (!ADMIN_PASSWORD_HASH) {
    errors.push('ADMIN_PASSWORD_HASH environment variable is missing.')
  } else if (!ADMIN_PASSWORD_HASH.startsWith('$2a$') && !ADMIN_PASSWORD_HASH.startsWith('$2b$')) {
    errors.push('ADMIN_PASSWORD_HASH must be a valid bcrypt hash string (starting with $2a$ or $2b$).')
  }

  // 4. GOOGLE_SCRIPT_URL
  if (isProd && !GOOGLE_SCRIPT_URL) {
    errors.push('GOOGLE_SCRIPT_URL environment variable is required in production.')
  } else if (GOOGLE_SCRIPT_URL && !GOOGLE_SCRIPT_URL.startsWith('https://script.google.com/macros/s/')) {
    errors.push('GOOGLE_SCRIPT_URL must be a valid Google Apps Script URL (https://script.google.com/macros/s/...).')
  }

  // 5. GOOGLE_SCRIPT_SHARED_SECRET
  if (isProd && !GOOGLE_SCRIPT_SHARED_SECRET) {
    errors.push('GOOGLE_SCRIPT_SHARED_SECRET environment variable is required in production.')
  } else if (GOOGLE_SCRIPT_SHARED_SECRET && INSECURE_PLACEHOLDERS.includes(GOOGLE_SCRIPT_SHARED_SECRET)) {
    errors.push('GOOGLE_SCRIPT_SHARED_SECRET is using a known default placeholder value.')
  }

  if (errors.length > 0) {
    if (isProd || !isTest) {
      console.error('\n🚨 [FATAL SECURITY ERROR] Server cannot start with missing or invalid credentials:')
      errors.forEach(err => console.error(`  ❌ ${err}`))
      console.error('\nPlease configure valid secrets in your environment / .env file before launching.\n')
      
      // In production, exit immediately (fail closed)
      if (isProd) {
        process.exit(1)
      }
    }
  }

  return { isValid: errors.length === 0, errors }
}
