import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

async function testProfilePersistence() {
  const baseUrl = 'http://127.0.0.1:3000'
  console.log('--- Testing Profile Customization Persistence ---')

  // 1. Check GET /api/config
  const cfgRes = await fetch(`${baseUrl}/api/config`)
  const cfgData = await cfgRes.json()
  if (!cfgData.success || !cfgData.hasCustomConfig || !cfgData.config || !cfgData.config.profiles) {
    throw new Error('GET /api/config failed or missing hasCustomConfig / profiles')
  }
  console.log('✓ Step 1: GET /api/config returns hasCustomConfig: true and profiles')

  // 2. Admin Login
  const loginRes = await fetch(`${baseUrl}/api/admin/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ password: 'admin123' })
  })
  const setCookie = loginRes.headers.get('set-cookie') || ''
  const cookieMatch = setCookie.match(/safe_admin_session=([^;]+)/)
  if (!loginRes.ok || !cookieMatch) {
    throw new Error('Admin login failed')
  }
  const adminCookie = `safe_admin_session=${cookieMatch[1]}`
  console.log('✓ Step 2: Admin authenticated successfully')

  // 3. Prepare modified profiles with custom fields and custom avatar
  const profiles = { ...cfgData.config.profiles }
  const originalINTJ = { ...profiles.INTJ }
  
  // Create a large 150KB test image payload to ensure body parser handles it
  const largeImagePayload = 'data:image/png;base64,' + 'A'.repeat(150 * 1024)

  profiles.INTJ = {
    ...profiles.INTJ,
    name: 'Mastermind (Custom Permanent)',
    tagline: 'Strategic Visionary Leader',
    overview: 'This is a permanently saved custom profile overview.',
    strengths: ['Strategic Thinking', 'Independent Analysis', 'High Agency'],
    image: largeImagePayload,
  }

  // 4. Save to /api/admin/config
  const saveRes = await fetch(`${baseUrl}/api/admin/config`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Cookie': adminCookie,
    },
    body: JSON.stringify({
      questions: cfgData.config.questions,
      profiles,
      sections: cfgData.config.sections,
      settings: cfgData.config.settings,
    })
  })

  if (!saveRes.ok) {
    const errText = await saveRes.text()
    throw new Error(`Failed to save config to server (Status ${saveRes.status}): ${errText}`)
  }
  const saveData = await saveRes.json()
  if (!saveData.success) {
    throw new Error(`Server returned success: false on save: ${JSON.stringify(saveData)}`)
  }
  console.log('✓ Step 3: Admin saved updated profile with 150KB avatar to /api/admin/config (200 OK)')

  // 5. Verify server/data/customConfig.json exists and contains updated profile
  const diskConfigPath = path.resolve(__dirname, '../data/customConfig.json')
  if (!fs.existsSync(diskConfigPath)) {
    throw new Error('server/data/customConfig.json was not created on disk')
  }
  const diskContent = JSON.parse(fs.readFileSync(diskConfigPath, 'utf8'))
  if (diskContent.profiles.INTJ.name !== 'Mastermind (Custom Permanent)') {
    throw new Error(`Disk config does not reflect updated profile name: ${diskContent.profiles.INTJ.name}`)
  }
  console.log('✓ Step 4: Authoritative customConfig.json on disk contains permanent changes')

  // 6. Verify fresh unauthenticated GET /api/config returns new profile
  const freshCfgRes = await fetch(`${baseUrl}/api/config`)
  const freshCfgData = await freshCfgRes.json()
  if (freshCfgData.config.profiles.INTJ.name !== 'Mastermind (Custom Permanent)') {
    throw new Error('Fresh client GET /api/config did not receive updated profile')
  }
  console.log('✓ Step 5: Fresh client /api/config loads permanently modified profile')

  // 7. Test dedicated POST /api/admin/config/profiles endpoint
  profiles.INTJ.name = 'Architect & Visionary'
  const postProfilesRes = await fetch(`${baseUrl}/api/admin/config/profiles`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Cookie': adminCookie,
    },
    body: JSON.stringify({ profiles })
  })
  if (!postProfilesRes.ok) {
    throw new Error(`Dedicated /api/admin/config/profiles failed: ${postProfilesRes.status}`)
  }
  const postProfilesData = await postProfilesRes.json()
  if (!postProfilesData.success || postProfilesData.profiles.INTJ.name !== 'Architect & Visionary') {
    throw new Error('Dedicated /profiles endpoint did not update profile')
  }
  console.log('✓ Step 6: Dedicated /api/admin/config/profiles route confirmed functional')

  // 8. Revert INTJ back to original
  profiles.INTJ = originalINTJ
  await fetch(`${baseUrl}/api/admin/config`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Cookie': adminCookie,
    },
    body: JSON.stringify({ profiles })
  })
  console.log('✓ Step 7: Cleanly restored original INTJ profile baseline')

  console.log('\n🎉 ALL PROFILE PERMANENCE TESTS PASSED SUCCESSFULLY!')
}

testProfilePersistence().catch(err => {
  console.error('❌ Test failed:', err)
  process.exit(1)
})
