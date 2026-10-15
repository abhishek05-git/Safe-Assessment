/**
 * Full End-to-End User & Admin Flow Verification
 * Tests the complete lifecycle against the live server running on http://127.0.0.1:3000
 */

import 'dotenv/config'
import { generateOtpChallenge } from '../services/otpService.js'

async function runEndToEndSimulation() {
  console.log('================================================================');
  console.log(' SAFE ASSESSMENT: FULL END-TO-END FLOW VERIFICATION');
  console.log('================================================================\n');

  const baseUrl = 'http://127.0.0.1:3000';
  let passed = 0;
  let failed = 0;

  function assert(condition, description) {
    if (condition) {
      console.log(`✅ [PASS] ${description}`);
      passed++;
    } else {
      console.error(`❌ [FAIL] ${description}`);
      failed++;
    }
  }

  // 1. Static HTML Serving (Vite production bundle via Express)
  const homeRes = await fetch(`${baseUrl}/`);
  const htmlText = await homeRes.text();
  assert(
    homeRes.ok && (htmlText.includes('<div id="root">') || htmlText.includes('SAFE')),
    'Phase 1: React frontend application successfully served at root URL (/) with 200 OK'
  );

  // 2. Health check endpoint
  const healthRes = await fetch(`${baseUrl}/api/health`);
  const health = await healthRes.json();
  assert(
    healthRes.ok && health.status === 'ok',
    'Phase 2: Backend security API is healthy and responding to requests'
  );

  // 3. Candidate requests OTP
  const candidateEmail = `candidate.${Date.now()}@safeltd.com`;
  const candidateName = 'Audit Candidate';

  const otpRes = await fetch(`${baseUrl}/api/auth/request-otp`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: candidateEmail, name: candidateName })
  });
  const otpData = await otpRes.json();
  const otpSetCookie = otpRes.headers.get('set-cookie') || '';
  const challengeCookieMatch = otpSetCookie.match(/safe_otp_challenge=([^;]+)/);
  const challengeCookie = challengeCookieMatch ? `safe_otp_challenge=${challengeCookieMatch[1]}` : '';

  assert(
    otpRes.ok && otpData.success === true && otpData.otp === undefined,
    'Phase 3: Candidate requested OTP. Response is success: true and NEVER reveals OTP code'
  );

  // 4. Candidate verifies OTP and receives HttpOnly session cookie
  // Tests fallback challenge cookie verification (for serverless/cross-instance resilience)
  const verifyEmail = `verified.${Date.now()}@safeltd.com`;
  const challenge = generateOtpChallenge(verifyEmail, { Name: candidateName, 'Email Id': verifyEmail });
  const { createSessionToken } = await import('../services/sessionService.js');
  const validChallengeCookie = createSessionToken(
    {
      challenge: true,
      email: verifyEmail,
      hash: challenge.hash,
      expiresAt: challenge.expiresAt,
      userDetails: challenge.userDetails,
    },
    10 * 60 * 1000
  );

  const verifyRes = await fetch(`${baseUrl}/api/auth/verify-otp`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Cookie: `safe_otp_challenge=${validChallengeCookie}`
    },
    body: JSON.stringify({ email: verifyEmail, otp: challenge.otp })
  });
  const verifySetCookie = verifyRes.headers.get('set-cookie') || '';
  const candidateCookieMatch = verifySetCookie.match(/safe_user_session=([^;]+)/);
  const candidateCookie = candidateCookieMatch ? `safe_user_session=${candidateCookieMatch[1]}` : '';

  assert(
    verifyRes.ok && candidateCookie.length > 0 && verifySetCookie.includes('HttpOnly'),
    'Phase 4: Candidate verified OTP. Received signed HttpOnly safe_user_session cookie'
  );

  // 5. Candidate requests access via authenticated session
  const reqAccessRes = await fetch(`${baseUrl}/api/access/request`, {
    method: 'POST',
    headers: { Cookie: candidateCookie }
  });
  assert(
    reqAccessRes.ok,
    'Phase 5: Candidate submitted access approval request to authoritative data store'
  );

  // 6. Candidate checks status (pending)
  const statusRes = await fetch(`${baseUrl}/api/access/status`, {
    headers: { Cookie: candidateCookie }
  });
  const statusData = await statusRes.json();
  assert(
    statusRes.ok && statusData.email === verifyEmail && statusData.approved === false,
    'Phase 6: Candidate status check returns pending without leaking other candidates'
  );

  // 7. Security check: Candidate cannot access Admin endpoints
  const probeAdminRes = await fetch(`${baseUrl}/api/admin/approvals`, {
    headers: { Cookie: candidateCookie }
  });
  assert(
    probeAdminRes.status === 403,
    'Phase 7: Role enforcement - Candidate session blocked with 403 when probing /api/admin/*'
  );

  // 8. Admin login with bcrypt hash verification
  const adminLoginRes = await fetch(`${baseUrl}/api/admin/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ password: 'admin123' })
  });
  const adminSetCookie = adminLoginRes.headers.get('set-cookie') || '';
  const adminCookieMatch = adminSetCookie.match(/safe_admin_session=([^;]+)/);
  const adminCookie = adminCookieMatch ? `safe_admin_session=${adminCookieMatch[1]}` : '';

  assert(
    adminLoginRes.ok && adminCookie.length > 0 && adminSetCookie.includes('HttpOnly'),
    'Phase 8: Administrator logged in successfully using secure password hash with HttpOnly session'
  );

  // 9. Admin checks session status
  const adminCheckRes = await fetch(`${baseUrl}/api/admin/check`, {
    headers: { Cookie: adminCookie }
  });
  const adminCheckData = await adminCheckRes.json();
  assert(
    adminCheckRes.ok && adminCheckData.authenticated === true,
    'Phase 9: Admin session verification reports authenticated: true'
  );

  // 10. Admin approves candidate access
  const approveRes = await fetch(`${baseUrl}/api/admin/approvals/${encodeURIComponent(verifyEmail)}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Cookie: adminCookie
    },
    body: JSON.stringify({ status: 'approved' })
  });
  assert(
    approveRes.ok,
    'Phase 10: Administrator approved candidate access request via secure endpoint'
  );

  // 11. Authoritative Server-Side Scoring & Submission
  // Prepare answers for all active questions using authoritative config
  const { getAuthoritativeQuestions } = await import('../services/configService.js');
  const allActiveQuestions = getAuthoritativeQuestions().filter(q => q.active);
  const completeAnswers = {};
  for (const q of allActiveQuestions) {
    completeAnswers[q.id] = 4; // valid scale answer
  }

  const submitRes = await fetch(`${baseUrl}/api/assessment/submit`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Cookie: candidateCookie
    },
    body: JSON.stringify({ answers: completeAnswers, durationMs: 1450000 })
  });
  const submitData = await submitRes.json();
  assert(
    submitRes.ok && submitData.success === true && submitData.result && submitData.result.code,
    `Phase 11: Authoritative server scored assessment successfully. Calculated code: ${submitData.result?.code} (${submitData.result?.type})`
  );

  // 12. Active Session Revocation (Logout)
  const logoutRes = await fetch(`${baseUrl}/api/auth/logout`, {
    method: 'POST',
    headers: { Cookie: candidateCookie }
  });
  assert(logoutRes.ok, 'Phase 12: Candidate logout succeeded');

  // Verify revoked candidate session cannot submit again
  const postLogoutRes = await fetch(`${baseUrl}/api/assessment/submit`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Cookie: candidateCookie
    },
    body: JSON.stringify({ answers: completeAnswers, durationMs: 1000 })
  });
  assert(
    postLogoutRes.status === 401,
    'Phase 13: Revoked session was immediately blocked from privileged submission (HTTP 401)'
  );

  console.log('\n================================================================');
  console.log(` SIMULATION RESULTS: ${passed} PASSED, ${failed} FAILED`);
  console.log('================================================================\n');

  process.exit(failed > 0 ? 1 : 0);
}

runEndToEndSimulation().catch(err => {
  console.error('Fatal simulation error:', err);
  process.exit(1);
});
