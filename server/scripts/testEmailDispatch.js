import assert from 'assert'
import { isSmtpConfigured, sendOtpEmailDirect } from '../services/emailService.js'

async function runTest() {
  console.log('Testing Email Service...')
  
  // 1. Without SMTP credentials configured
  assert.strictEqual(isSmtpConfigured(), false, 'isSmtpConfigured should return false when vars are unset')

  const unconfiguredResult = await sendOtpEmailDirect('test@example.com', 'Tester', '123456')
  assert.strictEqual(unconfiguredResult.success, false)
  assert.strictEqual(unconfiguredResult.reason, 'smtp_unconfigured')
  console.log('✅ Unconfigured SMTP handled safely without crashing.')

  console.log('🎉 Email Service tests passed successfully!')
}

runTest().catch(err => {
  console.error('Test error:', err)
  process.exit(1)
})
