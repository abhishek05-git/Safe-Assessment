import { sanitizeForSpreadsheet } from '../utils/sanitizer.js'

/**
 * Server-side Participant Input Validation Middleware (Item 8)
 * Enforces length limits, valid email RFC regex, phone number formats, and valid DOB.
 */

const EMAIL_REGEX = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)+$/
const PHONE_REGEX = /^\d{10}$/

export function validateParticipantDetails(details = {}) {
  const errors = []

  const name = String(details['Name'] || details['Full Name'] || '').trim()
  const email = String(details['Email Id'] || details['Email'] || '').trim().toLowerCase()
  const phone = String(details['Phone Number'] || details['Phone'] || '').trim()
  const org = String(details['Name of the Organization'] || details['Organization'] || '').trim()
  const loc = String(details['Location'] || '').trim()
  const gender = String(details['Gender'] || '').trim()
  const dob = String(details['Date of Birth'] || '').trim()

  // Validate Name
  if (!name) {
    errors.push('Name is required.')
  } else if (name.length > 100) {
    errors.push('Name must be 100 characters or fewer.')
  }

  // Validate Email
  if (!email) {
    errors.push('Email is required.')
  } else if (email.length > 150) {
    errors.push('Email must be 150 characters or fewer.')
  } else if (!EMAIL_REGEX.test(email)) {
    errors.push('A valid email address is required.')
  }

  // Validate Phone Number
  if (phone && !PHONE_REGEX.test(phone.replace(/\D/g, ''))) {
    errors.push('Phone number must be a valid 10-digit number.')
  }

  // Validate Lengths of other optional fields
  if (org.length > 120) errors.push('Organization must be 120 characters or fewer.')
  if (loc.length > 100) errors.push('Location must be 100 characters or fewer.')
  if (gender.length > 50) errors.push('Gender must be 50 characters or fewer.')

  // Validate Date of Birth
  if (dob) {
    // Expected format: DD/MM/YYYY or YYYY-MM-DD
    let parsedDate = null
    if (dob.includes('/')) {
      const parts = dob.split('/')
      if (parts.length === 3) {
        parsedDate = new Date(`${parts[2]}-${parts[1]}-${parts[0]}`)
      }
    } else {
      parsedDate = new Date(dob)
    }

    if (!parsedDate || isNaN(parsedDate.getTime())) {
      errors.push('Date of Birth must be a valid date.')
    } else if (parsedDate > new Date()) {
      errors.push('Date of Birth cannot be in the future.')
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
    sanitized: {
      'Name': sanitizeForSpreadsheet(name),
      'Full Name': sanitizeForSpreadsheet(name),
      'Email Id': email,
      'Email': email,
      'Phone Number': sanitizeForSpreadsheet(phone.replace(/\D/g, '').slice(0, 10)),
      'Name of the Organization': sanitizeForSpreadsheet(org),
      'Organization': sanitizeForSpreadsheet(org),
      'Location': sanitizeForSpreadsheet(loc),
      'Gender': sanitizeForSpreadsheet(gender),
      'Date of Birth': sanitizeForSpreadsheet(dob),
    }
  }
}
