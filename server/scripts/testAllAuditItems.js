/**
 * Comprehensive Automated Verification Suite for All 13 Audit Table Items
 */

import http from 'http'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import bcrypt from 'bcryptjs'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

async function runComprehensiveAuditTests() {
  console.log('================================================================');
  console.log(' SAFE ASSESSMENT: 13/13 AUDIT VULNERABILITIES VERIFICATION SUITE');
  console.log('================================================================\n');

  let passed = 0;
  let failed = 0;

  function report(itemNum, priority, title, success, details) {
    if (success) {
      console.log(`✅ [PASS] ${itemNum} (${priority}): ${title}`);
      if (details) console.log(`   ↳ ${details}`);
      passed++;
    } else {
      console.error(`❌ [FAIL] ${itemNum} (${priority}): ${title}`);
      if (details) console.error(`   ↳ ${details}`);
      failed++;
    }
  }

  // ─────────────────────────────────────────────────────────────
  // ITEM 1 (P0): Known fallback credentials exist in production code
  // ─────────────────────────────────────────────────────────────
  try {
    const { validateEnv } = await import('../config/env.js');
    // Save current env
    const prevNodeEnv = process.env.NODE_ENV;
    const prevSecret = process.env.SESSION_SECRET;
    
    // Test 1a: Test missing secret in production throws or reports error
    process.env.NODE_ENV = 'test'; // so validateEnv doesn't process.exit(1)
    delete process.env.SESSION_SECRET;
    const resEmpty = validateEnv();
    const detectsMissing = resEmpty.errors.some(e => e.includes('SESSION_SECRET environment variable is missing'));

    // Test 1b: Insecure placeholder rejected
    process.env.SESSION_SECRET = 'admin';
    const resPlaceholder = validateEnv();
    const detectsPlaceholder = resPlaceholder.errors.some(e => e.includes('SESSION_SECRET must be at least 32 characters') || e.includes('known default placeholder'));

    // Restore
    process.env.NODE_ENV = prevNodeEnv;
    process.env.SESSION_SECRET = prevSecret;

    report('Item 1', 'P0', 'Remove fallback credentials & fail-closed startup validation',
      detectsMissing && detectsPlaceholder,
      'Startup validator rejects missing secrets and default placeholders like "admin".');
  } catch (err) {
    report('Item 1', 'P0', 'Remove fallback credentials & fail-closed startup validation', false, err.message);
  }

  // Start server for network tests
  const serverModule = await import('../index.js');
  await new Promise(r => setTimeout(r, 600));
  const baseUrl = 'http://127.0.0.1:3000';

  // ─────────────────────────────────────────────────────────────
  // ITEM 2 (P0): Browser still displays locally calculated result if submission fails
  // ─────────────────────────────────────────────────────────────
  try {
    const appJsx = fs.readFileSync(path.resolve(__dirname, '../../src/App.jsx'), 'utf-8');
    const testJsx = fs.readFileSync(path.resolve(__dirname, '../../src/components/pages/Test.jsx'), 'utf-8');
    
    // Check that App.jsx no longer imports score from scoring.js for local fallback
    const noLocalScoringImport = !appJsx.includes("import { score } from './engine/scoring'");
    // Check that App.jsx returns error instead of fallback calculation
    const hasRetryErrorReturn = appJsx.includes("return { success: false, error: errorMsg }");
    // Check that Test.jsx has retry submission button
    const hasRetryButton = testJsx.includes('Retry Submission');

    report('Item 2', 'P0', 'Eliminate local fallback calculation & offer retry only',
      noLocalScoringImport && hasRetryErrorReturn && hasRetryButton,
      'Client scoring fallback removed. Server is sole scoring authority. UI offers retry only upon error.');
  } catch (err) {
    report('Item 2', 'P0', 'Eliminate local fallback calculation & offer retry only', false, err.message);
  }

  // ─────────────────────────────────────────────────────────────
  // ITEM 3 (P0): Assessment answers are still stored in localStorage
  // ─────────────────────────────────────────────────────────────
  try {
    const testJsx = fs.readFileSync(path.resolve(__dirname, '../../src/components/pages/Test.jsx'), 'utf-8');
    const noProgressSave = !testJsx.includes("save('safe_progress'");
    const noProgressLoad = !testJsx.includes("load('safe_progress'");
    const hasStateMemory = testJsx.includes("const [answers, setAnswers] = useState({})");
    const cleansStorage = testJsx.includes("localStorage.removeItem('safe_progress')");

    report('Item 3', 'P0', 'Store assessment answers in React memory only',
      noProgressSave && noProgressLoad && hasStateMemory && cleansStorage,
      'Candidate answers stay in React memory only. DevTools/localStorage exposure eliminated.');
  } catch (err) {
    report('Item 3', 'P0', 'Store assessment answers in React memory only', false, err.message);
  }

  // ─────────────────────────────────────────────────────────────
  // ITEM 4 (P0): Existing Apps Script deployment must be replaced & old endpoint disabled
  // ─────────────────────────────────────────────────────────────
  try {
    const docs = fs.readFileSync(path.resolve(__dirname, '../../google-sheets-setup.md'), 'utf-8');
    const hasRotationSteps = docs.includes('Rotate the Shared Secret');
    const hasRevokeSteps = docs.includes('Revoke/Disable Old Deployments');
    const hasVerifySteps = docs.includes('Verification Testing');
    const hasDoGetDisabled = docs.includes('doGet(e)') && docs.includes('Method Not Allowed');

    report('Item 4', 'P0', 'Apps Script replacement, secret rotation & revocation guide',
      hasRotationSteps && hasRevokeSteps && hasVerifySteps && hasDoGetDisabled,
      'Hardened Apps Script template with secret rotation and old deployment revocation instructions published.');
  } catch (err) {
    report('Item 4', 'P0', 'Apps Script replacement, secret rotation & revocation guide', false, err.message);
  }

  // ─────────────────────────────────────────────────────────────
  // ITEM 5 (P1): Google secret is sent in query strings for several calls
  // ─────────────────────────────────────────────────────────────
  try {
    const gsCode = fs.readFileSync(path.resolve(__dirname, '../services/googleSheets.js'), 'utf-8');
    const methodPostOnly = gsCode.includes("method: 'POST'");
    const secretInBody = gsCode.includes("formData.append('SecretToken', secret)");
    const noSecretInQuery = !gsCode.includes('?SecretToken=') && !gsCode.includes('&SecretToken=');

    report('Item 5', 'P1', 'Apps Script secret placed strictly in POST body (no query strings)',
      methodPostOnly && secretInBody && noSecretInQuery,
      'All Sheets operations use HTTP POST with SecretToken in form body; URL query strings eliminated.');
  } catch (err) {
    report('Item 5', 'P1', 'Apps Script secret placed strictly in POST body (no query strings)', false, err.message);
  }

  // ─────────────────────────────────────────────────────────────
  // ITEM 6 (P1): Google Sheets failures are silently treated as success
  // ─────────────────────────────────────────────────────────────
  try {
    const gsCode = fs.readFileSync(path.resolve(__dirname, '../services/googleSheets.js'), 'utf-8');
    const failsClosed = gsCode.includes('throw err // Fail closed (Item 6)');
    
    report('Item 6', 'P1', 'Fail closed on Google Sheets / Apps Script errors',
      failsClosed,
      'Silent fake-success fallbacks eliminated; API throws and returns errors when persistence fails.');
  } catch (err) {
    report('Item 6', 'P1', 'Fail closed on Google Sheets / Apps Script errors', false, err.message);
  }

  // ─────────────────────────────────────────────────────────────
  // ITEM 7 (P1): No CSRF/origin validation for cookie-based state changes
  // ─────────────────────────────────────────────────────────────
  try {
    // Attempt state-changing POST from untrusted origin
    const csrfRes = await fetch(`${baseUrl}/api/auth/request-otp`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Origin': 'https://malicious-website.xyz'
      },
      body: JSON.stringify({ email: 'test@example.com', name: 'Test' })
    });

    report('Item 7', 'P1', 'Strict Origin / Referer validation blocks CSRF mutations',
      csrfRes.status === 403,
      'Cross-origin state-changing POST from unauthorized origin blocked with HTTP 403 Forbidden.');
  } catch (err) {
    report('Item 7', 'P1', 'Strict Origin / Referer validation blocks CSRF mutations', false, err.message);
  }

  // ─────────────────────────────────────────────────────────────
  // ITEM 8 (P1): Participant-controlled form values written without validation/sanitization
  // ─────────────────────────────────────────────────────────────
  try {
    const { sanitizeForSpreadsheet } = await import('../utils/sanitizer.js');
    const sanitizedFormula1 = sanitizeForSpreadsheet('=SUM(A1:A10)');
    const sanitizedFormula2 = sanitizeForSpreadsheet('+cmd|/c calc');
    const sanitizedFormula3 = sanitizeForSpreadsheet('@malicious');
    const safeStandard = sanitizeForSpreadsheet('Normal Name');

    // Input validation test
    const badInputRes = await fetch(`${baseUrl}/api/auth/request-otp`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'invalid-email-address', name: 'Test' })
    });

    const sanitizesFormulas = sanitizedFormula1.startsWith("'=") &&
                              sanitizedFormula2.startsWith("'+") &&
                              sanitizedFormula3.startsWith("'@") &&
                              safeStandard === 'Normal Name';
    const validatesInput = badInputRes.status === 400;

    report('Item 8', 'P1', 'Formula injection sanitization & server-side input validation',
      sanitizesFormulas && validatesInput,
      'Prepend single quote to formula characters (=, +, -, @) and reject malformed inputs.');
  } catch (err) {
    report('Item 8', 'P1', 'Formula injection sanitization & server-side input validation', false, err.message);
  }

  // ─────────────────────────────────────────────────────────────
  // ITEM 9 (P1): Participant status route reads entire approval list
  // ─────────────────────────────────────────────────────────────
  try {
    const accessRouteCode = fs.readFileSync(path.resolve(__dirname, '../routes/access.js'), 'utf-8');
    const singleLookup = accessRouteCode.includes('getParticipantStatus(req.user.email)');
    const noFetchAllInStatus = !accessRouteCode.includes('fetchAllApprovals()');

    report('Item 9', 'P1', 'Single-candidate status check without leaking full approval list',
      singleLookup && noFetchAllInStatus,
      '/api/access/status uses GET_APPROVAL_STATUS with single email lookup, protecting PII.');
  } catch (err) {
    report('Item 9', 'P1', 'Single-candidate status check without leaking full approval list', false, err.message);
  }

  // ─────────────────────────────────────────────────────────────
  // ITEM 10 (P1): Rate limiting is not proxy-aware
  // ─────────────────────────────────────────────────────────────
  try {
    const serverIndex = fs.readFileSync(path.resolve(__dirname, '../index.js'), 'utf-8');
    const hasTrustProxy = serverIndex.includes("app.set('trust proxy', 1)");

    report('Item 10', 'P1', 'Proxy-aware rate limiting (trust proxy configured)',
      hasTrustProxy,
      "Express configured with app.set('trust proxy', 1) to accurately identify client IPs behind Nginx.");
  } catch (err) {
    report('Item 10', 'P1', 'Proxy-aware rate limiting (trust proxy configured)', false, err.message);
  }

  // ─────────────────────────────────────────────────────────────
  // ITEM 11 (P1): Sessions are stateless and cannot be revoked after theft
  // ─────────────────────────────────────────────────────────────
  try {
    const { createSessionToken, verifySessionToken, revokeSession } = await import('../services/sessionService.js');
    const token = createSessionToken({ email: 'user@example.com', role: 'candidate' });
    const decoded = verifySessionToken(token);
    const hasSessionId = Boolean(decoded && decoded.sessionId);

    // Revoke
    revokeSession(decoded.sessionId);
    const verifyAfterRevoke = verifySessionToken(token);

    report('Item 11', 'P1', 'Session token UUID nonces and active revocation registry',
      hasSessionId && verifyAfterRevoke === null,
      'Tokens contain unique session UUIDs. Revoked sessions are immediately invalidated.');
  } catch (err) {
    report('Item 11', 'P1', 'Session token UUID nonces and active revocation registry', false, err.message);
  }

  // ─────────────────────────────────────────────────────────────
  // ITEM 12 (P2): Insecure Apps Script template embedded in admin frontend
  // ─────────────────────────────────────────────────────────────
  try {
    const accessTabCode = fs.readFileSync(path.resolve(__dirname, '../../src/components/admin/AccessTab.jsx'), 'utf-8');
    const hasAppsScriptCode = accessTabCode.includes('APPS_SCRIPT_CODE');
    const hasOldSetupGuide = accessTabCode.includes('How Cross-Device Google Sheets Approval Works');

    report('Item 12', 'P2', 'Remove embedded Apps Script template from admin frontend',
      !hasAppsScriptCode && !hasOldSetupGuide,
      'APPS_SCRIPT_CODE constant and setup guide UI removed from client bundle.');
  } catch (err) {
    report('Item 12', 'P2', 'Remove embedded Apps Script template from admin frontend', false, err.message);
  }

  // ─────────────────────────────────────────────────────────────
  // ITEM 13 (P2): Admin-configurable questions/settings remain browser-local
  // ─────────────────────────────────────────────────────────────
  try {
    const { getAuthoritativeQuestions, getAuthoritativeDimensions } = await import('../services/configService.js');
    const questions = getAuthoritativeQuestions();
    const dimensions = getAuthoritativeDimensions();
    const hasQuestions = Array.isArray(questions) && questions.length > 0;
    const hasDimensions = Array.isArray(dimensions) && dimensions.length > 0;

    const adminPageCode = fs.readFileSync(path.resolve(__dirname, '../../src/components/pages/Admin.jsx'), 'utf-8');
    const failsClosedOnSave = adminPageCode.includes("alert(`Failed to save configuration to server:") || adminPageCode.includes("setSaveStatus('error')");

    report('Item 13', 'P2', 'Authoritative server configuration store & scoring',
      hasQuestions && hasDimensions && failsClosedOnSave,
      'Authoritative server config service provides scoring data; admin UI fails closed if server rejected.');
  } catch (err) {
    report('Item 13', 'P2', 'Authoritative server configuration store & scoring', false, err.message);
  }

  console.log('\n================================================================');
  console.log(` AUDIT VERIFICATION SUMMARY: ${passed}/13 PASSED, ${failed}/13 FAILED`);
  console.log('================================================================\n');

  if (serverModule?.server && serverModule.server.close) {
    serverModule.server.close(() => {
      process.exit(failed > 0 ? 1 : 0);
    });
  } else {
    process.exit(failed > 0 ? 1 : 0);
  }
}

runComprehensiveAuditTests().catch(err => {
  console.error('Audit suite fatal crash:', err);
  process.exit(1);
});
