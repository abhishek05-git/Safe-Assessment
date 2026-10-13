/**
 * Google Sheets Integration Service
 * Communicates strictly server-to-server with Google Apps Script.
 * Never called directly by the browser.
 */

// In-memory fallback stores for resilience when Apps Script is unreachable
const memoryApprovals = new Map()
const memoryResults = []

function getScriptConfig() {
  const url = process.env.GOOGLE_SCRIPT_URL
  const secret = process.env.GOOGLE_SCRIPT_SHARED_SECRET

  return { url, secret }
}

/**
 * Send an OTP email via Google Apps Script MailApp
 */
export async function sendOtpEmail(email, name, otp) {
  const { url, secret } = getScriptConfig()

  if (!url) {
    console.warn('[GoogleSheets] GOOGLE_SCRIPT_URL not configured. OTP not sent to email.')
    return { success: false, reason: 'unconfigured' }
  }

  const formData = new URLSearchParams()
  formData.append('Action', 'SEND_OTP')
  formData.append('SecretToken', secret || '')
  formData.append('Email', email)
  formData.append('Name', name || 'Participant')
  formData.append('OTP', otp)

  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: formData,
    })
    return { success: res.ok }
  } catch (err) {
    console.error('[GoogleSheets] Failed to send OTP email:', err.message)
    return { success: false, error: err.message }
  }
}

/**
 * Request access for a participant
 */
export async function requestCandidateAccess(details) {
  const { email, name, org, phone } = details
  const cleanEmail = email.trim().toLowerCase()

  // Save to local cache
  const localRecord = {
    email: cleanEmail,
    name: name || 'Participant',
    org: org || '',
    phone: phone || '',
    status: memoryApprovals.get(cleanEmail)?.status || 'pending',
    requestedAt: new Date().toISOString(),
    approvedAt: memoryApprovals.get(cleanEmail)?.approvedAt || null,
  }
  memoryApprovals.set(cleanEmail, localRecord)

  const { url, secret } = getScriptConfig()
  if (!url) return { success: true, status: localRecord.status }

  const params = new URLSearchParams({
    Action: 'REQUEST_ACCESS',
    SecretToken: secret || '',
    Email: cleanEmail,
    Name: name || '',
    Organization: org || '',
    Phone: phone || '',
  })

  try {
    await fetch(`${url}?${params.toString()}`)
    return { success: true, status: localRecord.status }
  } catch (err) {
    console.error('[GoogleSheets] Error requesting candidate access:', err.message)
    return { success: true, status: localRecord.status }
  }
}

/**
 * Get all candidate approvals (Admin only)
 */
export async function fetchAllApprovals() {
  const { url, secret } = getScriptConfig()

  if (url && secret) {
    try {
      const res = await fetch(`${url}?Action=GET_APPROVALS&SecretToken=${encodeURIComponent(secret)}&_t=${Date.now()}`)
      const json = await res.json()
      if (json && json.data && typeof json.data === 'object') {
        for (const [k, v] of Object.entries(json.data)) {
          memoryApprovals.set(k.toLowerCase(), v)
        }
      }
    } catch (err) {
      console.warn('[GoogleSheets] Could not fetch approvals from Apps Script, using memory store:', err.message)
    }
  }

  const out = {}
  for (const [k, v] of memoryApprovals.entries()) {
    out[k] = v
  }
  return out
}

/**
 * Get approval status for a single participant (Participant only)
 */
export async function getParticipantStatus(email) {
  const cleanEmail = email.trim().toLowerCase()
  const { url, secret } = getScriptConfig()

  if (url && secret) {
    try {
      const res = await fetch(`${url}?Action=GET_APPROVALS&SecretToken=${encodeURIComponent(secret)}&_t=${Date.now()}`)
      const json = await res.json()
      if (json && json.data && json.data[cleanEmail]) {
        memoryApprovals.set(cleanEmail, json.data[cleanEmail])
      }
    } catch (err) {
      // Use local cache on network error
    }
  }

  const record = memoryApprovals.get(cleanEmail)
  return {
    email: cleanEmail,
    status: record?.status || 'pending',
    approved: record?.status === 'approved',
  }
}

/**
 * Set candidate access approval status (Admin only)
 */
export async function updateCandidateApproval(email, status) {
  const cleanEmail = email.trim().toLowerCase()
  const current = memoryApprovals.get(cleanEmail) || { email: cleanEmail }

  const updated = {
    ...current,
    status,
    approvedAt: status === 'approved' ? new Date().toISOString() : null,
  }
  memoryApprovals.set(cleanEmail, updated)

  const { url, secret } = getScriptConfig()
  if (url && secret) {
    try {
      await fetch(
        `${url}?Action=SET_APPROVAL&SecretToken=${encodeURIComponent(secret)}&Email=${encodeURIComponent(
          cleanEmail
        )}&Status=${encodeURIComponent(status)}`
      )
    } catch (err) {
      console.error('[GoogleSheets] Failed to update approval in Apps Script:', err.message)
    }
  }

  return updated
}

/**
 * Save final assessment result to Google Sheets
 */
export async function saveAssessmentResult(user, scoreResult, timeSpent) {
  const record = {
    id: Date.now(),
    date: new Date().toISOString(),
    user: { ...user, 'Time Taken': timeSpent },
    code: scoreResult.code,
    type: scoreResult.type,
    timeSpent,
  }

  memoryResults.push(record)

  const { url, secret } = getScriptConfig()
  if (!url) return record

  try {
    const formData = new URLSearchParams()
    formData.append('Action', 'SAVE_RESULT')
    formData.append('SecretToken', secret || '')
    formData.append('Date', new Date().toLocaleDateString())
    formData.append('Name', user['Name'] || user['Full Name'] || '')
    formData.append('Organization', user['Name of the Organization'] || user['Organization'] || '')
    formData.append('Location', user['Location'] || '')
    formData.append('Gender', user['Gender'] || '')
    formData.append('DOB', user['Date of Birth'] || '')
    formData.append('Phone', user['Phone Number'] || '')
    formData.append('Email', user['Email Id'] || user['Email'] || '')
    formData.append('Result Code', scoreResult.code)
    formData.append('Personality Type', scoreResult.type)
    formData.append('Time Taken', timeSpent)

    await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: formData,
    })
  } catch (err) {
    console.error('[GoogleSheets] Failed to save result to Google Sheets:', err.message)
  }

  return record
}

/**
 * Fetch results for Admin dashboard
 */
export async function fetchAllResults() {
  const { url, secret } = getScriptConfig()

  if (url && secret) {
    try {
      const res = await fetch(`${url}?Action=GET_RESULTS&SecretToken=${encodeURIComponent(secret)}&_t=${Date.now()}`)
      const json = await res.json()
      if (json && Array.isArray(json.data)) {
        return json.data
      }
    } catch (err) {
      // Fallback to memory
    }
  }

  return memoryResults
}
