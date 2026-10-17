import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import { sanitizeForSpreadsheet, sanitizeRecordForSpreadsheet } from '../utils/sanitizer.js'
import { getLocalResults, saveLocalResult, deleteLocalResult } from './resultsStore.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const DATA_DIR = path.resolve(__dirname, '../data')
const APPROVALS_FILE = path.resolve(DATA_DIR, 'approvals.json')

function loadLocalApprovals() {
  try {
    if (fs.existsSync(APPROVALS_FILE)) {
      const data = JSON.parse(fs.readFileSync(APPROVALS_FILE, 'utf-8'))
      return typeof data === 'object' && data !== null ? data : {}
    }
  } catch (e) {}
  return {}
}

function saveLocalApprovals(approvalsObj) {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true })
    }
    fs.writeFileSync(APPROVALS_FILE, JSON.stringify(approvalsObj, null, 2), 'utf-8')
  } catch (e) {}
}

const localStoredApprovals = loadLocalApprovals()
// In-memory development & fallback state for approvals
const devApprovals = new Map(
  Object.entries(localStoredApprovals).map(([em, val]) => [em, typeof val === 'object' ? (val.status || 'pending') : val])
)

// Active candidates currently in retake mode (bypasses prior completed result until new test submission)
const retakingParticipants = new Set()

export function setParticipantRetaking(email) {
  const cleanEmail = String(email || '').trim().toLowerCase()
  if (!cleanEmail) return
  retakingParticipants.add(cleanEmail)
  deleteLocalResult(cleanEmail)
  resultsCache = null
  resultsCacheTime = 0
}

export function clearParticipantRetake(email) {
  const cleanEmail = String(email || '').trim().toLowerCase()
  if (!cleanEmail) return
  retakingParticipants.delete(cleanEmail)
}

export function isParticipantRetaking(email) {
  const cleanEmail = String(email || '').trim().toLowerCase()
  return retakingParticipants.has(cleanEmail)
}


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
async function callAppsScript(action, params = {}, retryCount = 0) {
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
  const timeoutId = setTimeout(() => controller.abort(), 20000)

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
    let json = null
    try {
      json = JSON.parse(text)
    } catch (parseErr) {
      if (text.includes('Success') || text.includes('OTP Sent')) {
        return { status: 'success', text }
      }
      throw new Error(`Invalid response format from Google Apps Script: ${text.slice(0, 100)}`)
    }

    if (json && (json.status === 'error' || json.error)) {
      throw new Error(json.error || json.message || 'Apps Script returned an error status')
    }
    return json
  } catch (err) {
    clearTimeout(timeoutId)
    if (retryCount === 0 && (err.name === 'AbortError' || err.message.includes('aborted'))) {
      console.warn(`[GoogleSheets Warning] ${action} timed out, retrying once on warm container...`)
      return callAppsScript(action, params, 1)
    }
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

    // If local record is already approved, preserve approved status
    const currentStatus = devApprovals.get(cleanEmail)
    if (currentStatus !== 'approved') {
      const nextStatus = json.candidateStatus || (json.status === 'approved' ? 'approved' : 'pending')
      devApprovals.set(cleanEmail, nextStatus)
      localStoredApprovals[cleanEmail] = {
        email: cleanEmail,
        status: nextStatus,
        name: cleanName,
        org: cleanOrg,
        phone: cleanPhone,
        requestedAt: new Date().toISOString()
      }
      saveLocalApprovals(localStoredApprovals)
    }

    return { success: true, status: devApprovals.get(cleanEmail) || json.candidateStatus || 'pending' }
  } catch (err) {
    if (process.env.NODE_ENV !== 'production' || !process.env.GOOGLE_SCRIPT_URL) {
      if (devApprovals.get(cleanEmail) !== 'approved') {
        devApprovals.set(cleanEmail, 'pending')
        localStoredApprovals[cleanEmail] = {
          email: cleanEmail,
          status: 'pending',
          name: cleanName,
          org: cleanOrg,
          phone: cleanPhone,
          requestedAt: new Date().toISOString()
        }
        saveLocalApprovals(localStoredApprovals)
      }
      return { success: true, status: devApprovals.get(cleanEmail) || 'pending' }
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
  const localApproved = devApprovals.get(cleanEmail) === 'approved'

  try {
    const json = await callAppsScript('GET_APPROVAL_STATUS', {
      Email: cleanEmail,
    })

    // Direct response from hardened Apps Script GET_APPROVAL_STATUS (Audit Item 9)
    if (json.candidateStatus !== undefined || json.approved !== undefined) {
      const candidateStatus = String(json.candidateStatus || (json.status !== 'success' ? json.status : 'pending')).toLowerCase()
      const isApproved = json.approved === true || candidateStatus === 'approved' || localApproved

      return {
        email: cleanEmail,
        status: isApproved ? 'approved' : candidateStatus,
        approved: isApproved,
      }
    }

    // Compatibility fallback for active deployments transitioning to hardened script
    const allApprovals = await fetchAllApprovals()
    const record = allApprovals && allApprovals[cleanEmail]
    const candidateStatus = record && record.status ? String(record.status).toLowerCase() : (localApproved ? 'approved' : 'pending')
    const isApproved = candidateStatus === 'approved' || localApproved
    return {
      email: cleanEmail,
      status: isApproved ? 'approved' : candidateStatus,
      approved: isApproved,
    }
  } catch (err) {
    if (process.env.NODE_ENV !== 'production' || !process.env.GOOGLE_SCRIPT_URL) {
      const devStatus = devApprovals.get(cleanEmail) || 'pending'
      return { email: cleanEmail, status: devStatus, approved: devStatus === 'approved' }
    }
    const devStatus = devApprovals.get(cleanEmail)
    if (devStatus) {
      return { email: cleanEmail, status: devStatus, approved: devStatus === 'approved' }
    }
    throw err // Fail closed (Item 6)
  }
}

/**
 * Get all candidate approvals (Admin only - POST only)
 */
export async function fetchAllApprovals() {
  let combined = { ...localStoredApprovals }
  try {
    const json = await callAppsScript('GET_APPROVALS')
    if (json && typeof json.data === 'object') {
      combined = { ...json.data, ...combined }
    }
    return combined
  } catch (err) {
    if (process.env.NODE_ENV !== 'production' || !process.env.GOOGLE_SCRIPT_URL) {
      for (const [em, st] of devApprovals.entries()) {
        if (!combined[em]) combined[em] = { email: em, status: st }
      }
      return combined
    }
    return combined
  }
}

/**
 * Set candidate access approval status (Admin only - POST only)
 */
export async function updateCandidateApproval(email, status) {
  const cleanEmail = String(email || '').trim().toLowerCase()
  const cleanStatus = status === 'approved' ? 'approved' : 'pending'

  // Persist locally for immediate authoritative availability
  devApprovals.set(cleanEmail, cleanStatus)
  const existing = localStoredApprovals[cleanEmail] || {}
  localStoredApprovals[cleanEmail] = {
    ...existing,
    email: cleanEmail,
    status: cleanStatus,
    approvedAt: cleanStatus === 'approved' ? new Date().toISOString() : null,
  }
  saveLocalApprovals(localStoredApprovals)

  try {
    await callAppsScript('SET_APPROVAL', {
      Email: cleanEmail,
      Status: cleanStatus,
    })

    return { email: cleanEmail, status: cleanStatus }
  } catch (err) {
    if (process.env.NODE_ENV !== 'production' || !process.env.GOOGLE_SCRIPT_URL) {
      return { email: cleanEmail, status: cleanStatus }
    }
    // Return the updated status if local persistence succeeded even if remote sync delayed
    return { email: cleanEmail, status: cleanStatus }
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

    const localRecord = {
      id: Date.now(),
      date: new Date().toISOString(),
      user: {
        'Full Name': cleanName,
        'Name': cleanName,
        'Name of the Organization': cleanOrg,
        'Location': cleanLoc,
        'Gender': cleanGender,
        'Date of Birth': cleanDob,
        'Phone Number': cleanPhone,
        'Email Id': cleanEmail,
        'Time Taken': cleanTimeSpent,
      },
      code: cleanCode,
      type: cleanType,
      timeSpent: cleanTimeSpent,
      result: scoreResult,
    }
    saveLocalResult(localRecord)
    resultsCache = null
    resultsCacheTime = 0

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
 * Ensures a result record has a fully populated result object with 5 dimensions
 */
export function hydrateResultObject(record) {
  if (!record) return null
  const code = (record.code || '').trim().toUpperCase()
  if (!code || code.length < 4) return null

  if (record.result && Array.isArray(record.result.dims) && record.result.dims.length === 5) {
    return {
      ...record.result,
      code,
      type: record.type || record.result.type || `${code}-A`,
      timeSpent: record.timeSpent || record.result.timeSpent || '',
    }
  }

  // Synthesize standard 5 dimensions if only summary code was stored
  const identityPole = (record.type && String(record.type).includes('-T')) ? 'T' : 'A'
  const winners = [code[0], code[1], code[2], code[3], identityPole]
  const defaultDims = [
    { name: 'Energy', poles: ['E', 'I'], labels: { E: 'Extraverted', I: 'Introverted' } },
    { name: 'Mind', poles: ['S', 'N'], labels: { S: 'Observant', N: 'Intuitive' } },
    { name: 'Nature', poles: ['T', 'F'], labels: { T: 'Thinking', F: 'Feeling' } },
    { name: 'Tactics', poles: ['J', 'P'], labels: { J: 'Judging', P: 'Prospecting' } },
    { name: 'Identity', poles: ['A', 'T'], labels: { A: 'Assertive', T: 'Turbulent' } },
  ]

  const dims = defaultDims.map((d, idx) => {
    const winner = winners[idx] || d.poles[0]
    const loser = d.poles[0] === winner ? d.poles[1] : d.poles[0]
    return {
      ...d,
      winner,
      pct: {
        [winner]: 65,
        [loser]: 35,
      }
    }
  })

  return {
    code,
    type: record.type || `${code}-${identityPole}`,
    id: identityPole,
    dims,
    timeSpent: record.timeSpent || '',
  }
}

/**
 * Fetch completed assessment result for a single participant email (Item 9 safe)
 */
export async function getParticipantResult(email) {
  const cleanEmail = String(email || '').trim().toLowerCase()
  if (!cleanEmail) return null
  if (retakingParticipants.has(cleanEmail)) return null

  // 1. Check local persistent store first
  const localList = getLocalResults()
  const localRecord = localList.find(r =>
    (r.user?.['Email Id'] || r.user?.['Email'] || '').trim().toLowerCase() === cleanEmail
  )
  if (localRecord) {
    return {
      ...localRecord,
      result: hydrateResultObject(localRecord)
    }
  }

  // 2. Fallback to Google Sheets
  try {
    const allResults = await fetchAllResults()
    const found = allResults.find(r =>
      (r.user?.['Email Id'] || r.user?.['Email'] || '').trim().toLowerCase() === cleanEmail
    )
    if (found) {
      return {
        ...found,
        result: hydrateResultObject(found)
      }
    }
  } catch (err) {}

  return null
}

// In-memory cache for Google Sheets results to prevent polling latency
let resultsCache = null
let resultsCacheTime = 0

/**
 * Fetch results for Admin dashboard (Admin only - POST only)
 */
export async function fetchAllResults(forceFresh = false) {
  const now = Date.now()
  if (!forceFresh && resultsCache && (now - resultsCacheTime < 30000)) {
    return resultsCache
  }
  try {
    const json = await callAppsScript('GET_RESULTS')
    if (json && Array.isArray(json.data) && json.data.length > 0) {
      resultsCache = json.data
      resultsCacheTime = now
      return json.data
    }
    const local = getLocalResults()
    resultsCache = local
    resultsCacheTime = now
    return local
  } catch (err) {
    const local = getLocalResults()
    resultsCache = local
    resultsCacheTime = now
    return local
  }
}
