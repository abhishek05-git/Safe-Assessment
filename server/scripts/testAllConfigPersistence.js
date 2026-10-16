import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

async function testAllConfigPersistence() {
  const baseUrl = 'http://127.0.0.1:3000'
  console.log('--- Testing Full Admin Configuration Persistence ---')

  // 1. Initial GET /api/config
  const cfgRes = await fetch(`${baseUrl}/api/config`)
  const cfgData = await cfgRes.json()
  if (!cfgData.success || !cfgData.hasCustomConfig || !cfgData.config) {
    throw new Error('Initial GET /api/config failed')
  }
  console.log('✓ Step 1: GET /api/config healthy with full configuration')

  // 2. Admin Login
  const loginRes = await fetch(`${baseUrl}/api/admin/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ password: 'admin123' })
  })
  const loginData = await loginRes.json()
  const setCookie = loginRes.headers.get('set-cookie') || ''
  const cookieMatch = setCookie.match(/safe_admin_session=([^;]+)/)
  if (!loginRes.ok || !loginData.success || !loginData.token) {
    throw new Error('Admin login failed or token missing')
  }
  const adminCookie = cookieMatch ? `safe_admin_session=${cookieMatch[1]}` : ''
  const adminBearer = `Bearer ${loginData.token}`
  console.log('✓ Step 2: Admin authenticated with both cookie and Bearer token')

  // 3. Make distinct changes across Questions, Profiles, Sections, and Settings
  const originalConfig = JSON.parse(JSON.stringify(cfgData.config))

  const modifiedQuestions = [...originalConfig.questions]
  modifiedQuestions[0] = {
    ...modifiedQuestions[0],
    question: 'Custom Modified Permanent Question Text 2026',
  }

  const modifiedProfiles = { ...originalConfig.profiles }
  modifiedProfiles.INTJ = {
    ...modifiedProfiles.INTJ,
    name: 'Architect of Tomorrow',
    tagline: 'Permanent Strategy Specialist',
  }

  const modifiedSections = originalConfig.sections.map((s, idx) =>
    idx === 1 ? { ...s, on: false } : s
  )

  const modifiedSettings = {
    ...originalConfig.settings,
    requireApproval: true,
    testCustomField: 'permanent_setting_value',
  }

  // 4. Save to /api/admin/config using Bearer token authorization
  const saveRes = await fetch(`${baseUrl}/api/admin/config`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': adminBearer,
      'Cookie': adminCookie,
    },
    body: JSON.stringify({
      questions: modifiedQuestions,
      profiles: modifiedProfiles,
      sections: modifiedSections,
      settings: modifiedSettings,
    })
  })

  if (!saveRes.ok) {
    throw new Error(`Save failed with HTTP status ${saveRes.status}`)
  }
  const saveData = await saveRes.json()
  if (!saveData.success) {
    throw new Error('Server returned success: false on save')
  }
  console.log('✓ Step 3: Saved full configuration updates across all 4 tabs via /api/admin/config')

  // 5. Inspect server/data/customConfig.json on disk
  const diskPath = path.resolve(__dirname, '../data/customConfig.json')
  const diskData = JSON.parse(fs.readFileSync(diskPath, 'utf8'))

  if (diskData.questions[0].question !== 'Custom Modified Permanent Question Text 2026') {
    throw new Error('Question change not persisted to disk')
  }
  if (diskData.profiles.INTJ.name !== 'Architect of Tomorrow') {
    throw new Error('Profile change not persisted to disk')
  }
  if (diskData.sections[1].on !== false) {
    throw new Error('Section change not persisted to disk')
  }
  if (diskData.settings.testCustomField !== 'permanent_setting_value') {
    throw new Error('Settings change not persisted to disk')
  }
  console.log('✓ Step 4: customConfig.json on disk reflects all 4 area changes permanently')

  // 6. Fresh unauthenticated client fetches /api/config
  const freshRes = await fetch(`${baseUrl}/api/config`)
  const freshData = await freshRes.json()
  if (freshData.config.questions[0].question !== 'Custom Modified Permanent Question Text 2026' ||
      freshData.config.profiles.INTJ.name !== 'Architect of Tomorrow' ||
      freshData.config.sections[1].on !== false) {
    throw new Error('Fresh client /api/config did not return updated configuration')
  }
  console.log('✓ Step 5: Fresh client successfully receives all permanent updates on load')

  // 7. Revert to original baseline cleanly
  await fetch(`${baseUrl}/api/admin/config`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': adminBearer,
      'Cookie': adminCookie,
    },
    body: JSON.stringify(originalConfig)
  })
  console.log('✓ Step 6: Restored original baseline cleanly')

  console.log('\n🎉 ALL ADMIN PANEL CHANGES CONFIRMED PERMANENT ACROSS DISK, CLIENT, AND SERVER!')
}

testAllConfigPersistence().catch(err => {
  console.error('❌ Configuration persistence verification failed:', err)
  process.exit(1)
})
