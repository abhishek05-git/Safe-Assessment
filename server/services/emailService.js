import nodemailer from 'nodemailer'

/**
 * Direct Email Dispatch Service
 * Sends transactional emails (such as OTP verification) directly via SMTP.
 * Supports:
 * - Hostinger SMTP (smtp.hostinger.com, port 465)
 * - Gmail SMTP (smtp.gmail.com with App Password)
 * - Any standard RFC-compliant SMTP provider
 */

let cachedTransporter = null

export function isSmtpConfigured() {
  const { SMTP_HOST, SMTP_USER, SMTP_PASS } = process.env
  return Boolean(SMTP_HOST && SMTP_USER && SMTP_PASS)
}

export function getTransporter() {
  if (cachedTransporter) return cachedTransporter

  const host = process.env.SMTP_HOST
  const port = parseInt(process.env.SMTP_PORT || '465', 10)
  const secure = process.env.SMTP_SECURE === 'true' || port === 465
  const user = process.env.SMTP_USER
  const pass = process.env.SMTP_PASS

  if (!host || !user || !pass) {
    return null
  }

  cachedTransporter = nodemailer.createTransport({
    host,
    port,
    secure,
    auth: {
      user,
      pass,
    },
    connectionTimeout: 10000,
    greetingTimeout: 10000,
  })

  return cachedTransporter
}

/**
 * Send an OTP verification code email directly via SMTP
 */
export async function sendOtpEmailDirect(email, name, otp) {
  const transporter = getTransporter()
  if (!transporter) {
    return { success: false, reason: 'smtp_unconfigured' }
  }

  const cleanEmail = email.trim().toLowerCase()
  const cleanName = name || 'Participant'
  const fromAddress = process.env.SMTP_FROM || `SAFE Assessment <${process.env.SMTP_USER}>`

  const mailOptions = {
    from: fromAddress,
    to: cleanEmail,
    subject: `Your SAFE Ltd. Assessment Verification Code: ${otp}`,
    text: `Hello ${cleanName},\n\nYour verification code to start the assessment is: ${otp}\n\nThis code expires in 10 minutes.\n\nThank you,\nSAFE Ltd.`,
    html: `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 540px; margin: 0 auto; padding: 24px; border: 1px solid #e2e8f0; border-radius: 12px; background: #ffffff;">
        <h2 style="color: #0f172a; margin-top: 0;">SAFE Assessment Verification</h2>
        <p style="color: #475569; font-size: 15px; line-height: 1.5;">Hello <strong>${cleanName}</strong>,</p>
        <p style="color: #475569; font-size: 15px; line-height: 1.5;">Your one-time verification code to start the assessment is:</p>
        <div style="text-align: center; margin: 24px 0;">
          <span style="display: inline-block; font-size: 32px; font-weight: 700; letter-spacing: 6px; color: #1e40af; background: #eff6ff; padding: 12px 28px; border-radius: 8px; border: 1px solid #bfdbfe;">
            ${otp}
          </span>
        </div>
        <p style="color: #64748b; font-size: 13px; line-height: 1.5;">This code will expire in 10 minutes. If you did not request this verification, please safely ignore this message.</p>
        <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 24px 0;" />
        <p style="color: #94a3b8; font-size: 12px; margin: 0;">© ${new Date().getFullYear()} SAFE Ltd. All rights reserved.</p>
      </div>
    `,
  }

  const info = await transporter.sendMail(mailOptions)
  console.log(`[SMTP EMAIL SENT] OTP dispatched to ${cleanEmail} (MessageId: ${info.messageId})`)
  return { success: true, messageId: info.messageId }
}
