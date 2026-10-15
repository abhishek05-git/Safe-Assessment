import assert from 'assert'

async function testOrigins() {
  const baseUrl = 'http://127.0.0.1:3000'
  const { default: app, server } = await import('../index.js')

  try {
    // 1. Test localhost:5173 (Vite dev server) - Should NOT be blocked with 403 CSRF mismatch
    const devRes = await fetch(`${baseUrl}/api/auth/request-otp`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Origin': 'http://localhost:5173',
      },
      body: JSON.stringify({ email: `devtest.${Date.now()}@example.com`, name: 'Dev Tester' }),
    })
    console.log('Dev server Origin http://localhost:5173 status:', devRes.status)
    assert(devRes.status !== 403, 'Localhost dev origin should not be blocked with 403 Forbidden')
    assert(devRes.status === 200, 'Localhost dev origin should succeed with 200 OK')

    // 2. Test 127.0.0.1:5173 - Should NOT be blocked with 403
    const ipDevRes = await fetch(`${baseUrl}/api/auth/request-otp`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Origin': 'http://127.0.0.1:5173',
      },
      body: JSON.stringify({ email: `ipdevtest.${Date.now()}@example.com`, name: 'IP Dev Tester' }),
    })
    console.log('Dev server Origin http://127.0.0.1:5173 status:', ipDevRes.status)
    assert(ipDevRes.status !== 403, '127.0.0.1 dev origin should not be blocked with 403 Forbidden')
    assert(ipDevRes.status === 200, '127.0.0.1 dev origin should succeed with 200 OK')

    // 3. Test attacker domain - MUST BE BLOCKED with 403
    const attackerRes = await fetch(`${baseUrl}/api/auth/request-otp`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Origin': 'https://attacker-steals-tokens.com',
      },
      body: JSON.stringify({ email: `attacker.${Date.now()}@example.com`, name: 'Attacker' }),
    })
    console.log('Attacker Origin status:', attackerRes.status)
    assert(attackerRes.status === 403, 'Malicious external origin must be rejected with 403 Forbidden')

    console.log('🎉 ALL CSRF ORIGIN TESTS PASSED!')
  } finally {
    if (server && server.close) {
      server.close()
    }
  }
}

testOrigins().catch(err => {
  console.error('Test failed:', err)
  process.exit(1)
})
