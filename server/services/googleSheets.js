import { sanitizeForSpreadsheet, sanitizeRecordForSpreadsheet } from '../utils/sanitizer.js'

/**
 * Hardened Google Sheets Integration Service
 * - All Apps Script actions execute via HTTP POST with SecretToken in the form body (Item 5).
 * - Never transmits SecretToken or Action in URL query strings (Item 5).
 * - Fails closed: throws errors on Sheets / network failure; never fakes success (Item 6).
 * - Single-candidate status check using GET_APPROVAL_STATUS without leaking others (Item 9).
 * - Sanitizes all user inputs against CSV/Spreadsheet formula injection (Item 8).
 */

function getScriptConfig() {
  const url = process.env.GOOGLE_SCRIPT_URL
  const secret = process.env.GOOGLE_SCRIPT_SHARED_SECRET

  if (!url || !secret) {
    throw new Error('Google Sheets integration is unconfigured (missing GOOGLE_SCRIPT_URL or GOOGLE_SCRIPT_SHARED_SECRET).')
  }

  return { url, secret }
}

/**
 * Helper to execute a secure POST request to Google Apps Script.
 * Puts Action, SecretToken, and payload strictly in the POST form body (Item 5).
 */
async function callAppsScript(action, params = {}) {
  const { url, secret } = getScriptConfig()

  const formData = new URLSearchParams()
  formData.append('Action', action)
  formData.append('SecretToken', secret)

  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== null) {
      formData.append(key, String(value))
    }
  }

  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), 12000) // 12 second timeout

  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Accept': 'application/json, text/plain',
      },
      body: formData,
      signal: controller.signal,
    })

    clearTimeout(timeoutId)

    if (!res.ok) {
      throw new Error(`Google Apps Script HTTP error: status ${res.status} ${res.statusText}`)
    }

    const text = await res.text()
    try {
      const json = JSON.parse(text)
      if (json.status === 'error' || json.error) {
        throw new Error(json.error || json.message || 'Apps Script returned an error status')
      }
      return json
    } catch (parseErr) {
      // If response was plain text "Success" / "OTP Sent"
      if (text.includes('Success') || text.includes('OTP Sent')) {
        return { status: 'success', text }
      }
      throw new Error(`Invalid response format from Google Apps Script: ${text.slice(0, 100)}`)
    }
  } catch (err) {
    clearTimeout(timeoutId)
    console.error(`[GoogleSheets Error] ${action} failed:`, err.message)
    throw err // Fail closed (Item 6)
  }
}

/**
 * Send an OTP email via Google Apps Script MailApp (POST only - Item 5)
 */
export async function sendOtpEmail(email, name, otp) {
  try {
    const cleanEmail = email.trim().toLowerCase()
    const cleanName = sanitizeForSpreadsheet(name || 'Participant')

    await callAppsScript('SEND_OTP', {
      Email: cleanEmail,
      Name: cleanName,
      OTP: otp,
    })

    return { success: true }
  } catch (err) {
    if (process.env.NODE_ENV !== 'production' && !process.env.GOOGLE_SCRIPT_URL) {
      return { success: false, reason: 'unconfigured_local' }
    }
    throw err
  }
}

/**
 * Request access for a participant (POST only, sanitized - Item 5 & 8)
 */
export async function requestCandidateAccess(details) {
  const cleanEmail = String(details.email || '').trim().toLowerCase()
  const cleanName = sanitizeForSpreadsheet(details.name || 'Participant')
  const cleanOrg = sanitizeForSpreadsheet(details.org || '')
  const cleanPhone = sanitizeForSpreadsheet(details.phone || '')

  try {
    const json = await callAppsScript('REQUEST_ACCESS', {
      Email: cleanEmail,
      Name: cleanName,
      Organization: cleanOrg,
      Phone: cleanPhone,
    })

    return { success: true, status: json.status || 'pending' }
  } catch (err) {
    if (process.env.NODE_ENV !== 'production' && !process.env.GOOGLE_SCRIPT_URL) {
      return { success: true, status: 'pending' }
    }
    throw err // Fail closed (Item 6)
  }
}

/**
 * Get approval status for a single participant (Item 9)
 * Uses GET_APPROVAL_STATUS with single email lookup, never pulling full list.
 */
export async function getParticipantStatus(email) {
  const cleanEmail = String(email || '').trim().toLowerCase()

  try {
    const json = await callAppsScript('GET_APPROVAL_STATUS', {
      Email: cleanEmail,
    })

    return {
      email: cleanEmail,
      status: json.status || 'pending',
      approved: json.status === 'approved' || json.approved === true,
    }
  } catch (err) {
    if (process.env.NODE_ENV !== 'production' && !process.env.GOOGLE_SCRIPT_URL) {
      return { email: cleanEmail, status: 'pending', approved: false }
    }
    throw err // Fail closed (Item 6)
  }
}

/**
 * Get all candidate approvals (Admin only - POST only)
 */
export async function fetchAllApprovals() {
  try {
    const json = await callAppsScript('GET_APPROVALS')
    return (json && typeof json.data === 'object') ? json.data : {}
  } catch (err) {
    if (process.env.NODE_ENV !== 'production' && !process.env.GOOGLE_SCRIPT_URL) {
      return {}
    }
    throw err // Fail closed (Item 6)
  }
}

/**
 * Set candidate access approval status (Admin only - POST only)
 */
export async function updateCandidateApproval(email, status) {
  const cleanEmail = String(email || '').trim().toLowerCase()
  const cleanStatus = status === 'approved' ? 'approved' : 'pending'

  try {
    await callAppsScript('SET_APPROVAL', {
      Email: cleanEmail,
      Status: cleanStatus,
    })

    return { email: cleanEmail, status: cleanStatus }
  } catch (err) {
    if (process.env.NODE_ENV !== 'production' && !process.env.GOOGLE_SCRIPT_URL) {
      return { email: cleanEmail, status: cleanStatus }
    }
    throw err // Fail closed (Item 6)
  }
}

/**
 * Save final assessment result to Google Sheets (POST only, sanitized, fail closed - Item 5, 6, 8)
 */
export async function saveAssessmentResult(user, scoreResult, timeSpent) {
  const cleanEmail = String(user['Email Id'] || user['Email'] || '').trim().toLowerCase()
  const cleanName = sanitizeForSpreadsheet(user['Name'] || user['Full Name'] || 'Participant')
  const cleanOrg = sanitizeForSpreadsheet(user['Name of the Organization'] || user['Organization'] || '')
  const cleanLoc = sanitizeForSpreadsheet(user['Location'] || '')
  const cleanGender = sanitizeForSpreadsheet(user['Gender'] || '')
  const cleanDob = sanitizeForSpreadsheet(user['Date of Birth'] || '')
  const cleanPhone = sanitizeForSpreadsheet(user['Phone Number'] || '')
  const cleanTimeSpent = sanitizeForSpreadsheet(timeSpent || '')
  const cleanCode = sanitizeForSpreadsheet(scoreResult.code || '')
  const cleanType = sanitizeForSpreadsheet(scoreResult.type || '')

  try {
    await callAppsScript('SAVE_RESULT', {
      Date: new Date().toLocaleDateString(),
      Name: cleanName,
      Organization: cleanOrg,
      Location: cleanLoc,
      Gender: cleanGender,
      DOB: cleanDob,
      Phone: cleanPhone,
      Email: cleanEmail,
      'Result Code': cleanCode,
      'Personality Type': cleanType,
      'Time Taken': cleanTimeSpent,
    })

    return {
      success: true,
      email: cleanEmail,
      savedAt: new Date().toISOString(),
    }
  } catch (err) {
    if (process.env.NODE_ENV !== 'production' && !process.env.GOOGLE_SCRIPT_URL) {
      return { success: true, email: cleanEmail }
    }
    throw err // Fail closed (Item 6)
  }
}

/**
 * Fetch results for Admin dashboard (Admin only - POST only)
 */
export async function fetchAllResults() {
  try {
    const json = await callAppsScript('GET_RESULTS')
    return (json && Array.isArray(json.data)) ? json.data : []
  } catch (err) {
    if (process.env.NODE_ENV !== 'production' && !process.env.GOOGLE_SCRIPT_URL) {
      return []
    }
    throw err // Fail closed (Item 6)
  }
}
