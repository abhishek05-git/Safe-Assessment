/**
 * Spreadsheet & CSV Formula Injection Sanitizer
 * Mitigates CSV Injection (CWE-1236) by neutralising leading formula characters (=, +, -, @, \t, \r).
 */

const FORMULA_PREFIXES = ['=', '+', '-', '@', '\t', '\r']

/**
 * Escapes values before writing to Google Sheets or exporting to CSV.
 * Prepend a single quote if string starts with formula characters.
 */
export function sanitizeForSpreadsheet(val) {
  if (val === null || val === undefined) return ''
  const str = String(val).trim()
  if (!str) return ''

  // Strip null bytes and control chars (except standard whitespace)
  const cleaned = str.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F]/g, '')

  // Neutralize formula triggers
  if (FORMULA_PREFIXES.some(prefix => cleaned.startsWith(prefix))) {
    return `'${cleaned}`
  }

  return cleaned
}

/**
 * Sanitizes an object of key/value pairs for spreadsheet storage.
 */
export function sanitizeRecordForSpreadsheet(record = {}) {
  const sanitized = {}
  for (const [key, val] of Object.entries(record)) {
    if (typeof val === 'object' && val !== null) {
      sanitized[key] = sanitizeRecordForSpreadsheet(val)
    } else {
      sanitized[key] = sanitizeForSpreadsheet(val)
    }
  }
  return sanitized
}
