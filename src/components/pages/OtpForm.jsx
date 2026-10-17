import React, { useState, useEffect } from 'react'
import { ArrowRight, ShieldCheck, RefreshCw, Loader2, CheckCircle2, XCircle } from 'lucide-react'
import Shell from '../layout/Shell'
import Button from '../ui/Button'

/**
 * OtpForm:
 * Verifies the 6-digit verification code with the server (SEC 01).
 * Relies on HttpOnly session cookie issued by the API.
 *
 * Button States:
 *  - Disabled (grey)  → while OTP input has fewer than 6 digits
 *  - Active (green)   → when 6 digits entered, ready to submit
 *  - Loading (spinner)→ while API call is in progress — button is unclickable
 *  - Success (check)  → briefly shown on correct OTP before navigating forward
 *  - Error (red input)→ on wrong OTP, input is cleared so user can re-enter
 */
export default function OtpForm({ onHome, onVerify, onResend, onBack, user, onLogout }) {
  const [otp, setOtp] = useState('')
  const [errorMessage, setErrorMessage] = useState('')
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const [timeLeft, setTimeLeft] = useState(45)
  const [attemptCount, setAttemptCount] = useState(0)

  const email = (user?.['Email Id'] || user?.['Email'] || '').trim().toLowerCase()

  // Countdown timer for resend cooldown
  useEffect(() => {
    if (timeLeft <= 0) return
    const timer = setInterval(() => setTimeLeft(t => t - 1), 1000)
    return () => clearInterval(timer)
  }, [timeLeft])

  const handleVerify = async () => {
    // Guard: do not proceed if loading or success already (prevents double-click)
    if (loading || success) return

    if (!otp || otp.length < 6) {
      setErrorMessage('Please enter the full 6-digit verification code.')
      return
    }

    setLoading(true)
    setErrorMessage('')

    try {
      const res = await fetch('/api/auth/verify-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, otp }),
      })

      const data = await res.json()

      if (res.ok && data.verified) {
        // ✅ Correct OTP — show success state briefly, then navigate
        setSuccess(true)
        setTimeout(() => {
          onVerify(data.user || user)
        }, 800)
      } else {
        // ❌ Wrong OTP — show error, clear input so user can re-enter
        const attempts = attemptCount + 1
        setAttemptCount(attempts)
        setErrorMessage(data.error || 'Incorrect verification code. Please re-enter the code from your email.')
        setOtp('')   // clear input so user must retype
        setLoading(false)
        // Re-focus the input after clearing
        setTimeout(() => {
          const input = document.getElementById('otp-input')
          if (input) input.focus()
        }, 50)
      }
    } catch (err) {
      setErrorMessage('Network connection error. Please check your internet and try again.')
      setLoading(false)
    }
  }

  const handleResend = () => {
    if (timeLeft > 0 || loading || success) return
    setErrorMessage('')
    setOtp('')
    setAttemptCount(0)
    setTimeLeft(45)
    onResend()
  }

  // Determine the button label and icon based on state
  const buttonLabel = success
    ? 'Verified!'
    : loading
    ? 'Verifying...'
    : 'Verify & Continue'

  const buttonIcon = success
    ? <CheckCircle2 className="w-5 h-5" />
    : loading
    ? <Loader2 className="w-5 h-5 animate-spin" />
    : <ArrowRight className="w-5 h-5" />

  return (
    <Shell onHome={onHome} user={user} onLogout={onLogout}>
      <div className="max-w-md mx-auto pt-8 sm:pt-16 slide-up mb-10 px-1 sm:px-0">
        <div className="glass p-5 sm:p-8 md:p-10 text-center">

          {/* Icon — changes on success */}
          <div className={`w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-6 transition-colors duration-300 ${
            success
              ? 'bg-emerald-100 border border-emerald-300'
              : 'bg-emerald-50 border border-emerald-100'
          }`}>
            {success
              ? <CheckCircle2 className="w-8 h-8 text-emerald-600 animate-scale-up" />
              : <ShieldCheck className="w-8 h-8 text-emerald-500" />
            }
          </div>

          <h2 className="font-heading font-bold text-2xl text-navy leading-tight mb-2">
            {success ? 'Identity Verified!' : 'Verification Required'}
          </h2>
          <p className="text-slate-500 text-sm mb-8">
            {success
              ? 'Your code was accepted. Taking you to the next step…'
              : <>We have emailed a 6-digit verification code to <strong>{email || 'your email'}</strong>. Please enter it below to begin.</>
            }
          </p>

          {/* OTP Input */}
          <div className="mb-6">
            <input
              id="otp-input"
              type="text"
              inputMode="numeric"
              maxLength={6}
              value={otp}
              disabled={loading || success}
              onChange={e => {
                setOtp(e.target.value.replace(/\D/g, ''))
                if (errorMessage) setErrorMessage('')
              }}
              onKeyDown={e => {
                if (e.key === 'Enter') handleVerify()
              }}
              className={`w-full text-center tracking-[0.5em] font-heading font-bold text-2xl sm:text-3xl border-2 rounded-xl px-4 py-4 focus:outline-none transition-all duration-200 ${
                success
                  ? 'border-emerald-400 bg-emerald-50 text-emerald-700 cursor-not-allowed'
                  : loading
                  ? 'border-slate-200 bg-slate-50 text-slate-400 cursor-not-allowed'
                  : errorMessage
                  ? 'border-red-400 focus:border-red-500 text-red-500 bg-white'
                  : 'border-slate-200 focus:border-emerald-500 text-slate-800 bg-white'
              }`}
              placeholder="••••••"
              autoFocus
              autoComplete="one-time-code"
            />

            {/* Error message — shown inline below input */}
            {errorMessage && !success && (
              <div className="flex items-start gap-2 mt-3 text-left">
                <XCircle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
                <p className="text-red-500 text-xs sm:text-sm font-semibold leading-snug">
                  {errorMessage}
                </p>
              </div>
            )}

            {/* Attempt counter hint */}
            {attemptCount > 0 && !success && (
              <p className="text-slate-400 text-xs mt-2 text-left">
                Attempt {attemptCount} — please check your email and try again.
              </p>
            )}
          </div>

          {/* Verify Button */}
          <Button
            variant={success ? 'success' : 'success'}
            size="md"
            className={`w-full justify-center text-base mb-4 transition-all duration-300 ${
              success ? 'opacity-90 cursor-default' : ''
            }`}
            onClick={handleVerify}
            disabled={loading || success || otp.length < 6}
            iconRight={buttonIcon}
          >
            {buttonLabel}
          </Button>

          {/* Resend / Back links — disabled while loading or verified */}
          <div className="flex flex-col gap-2">
            <button
              onClick={handleResend}
              disabled={timeLeft > 0 || loading || success}
              className={`text-sm font-semibold flex items-center justify-center gap-1.5 w-full py-2 transition-colors ${
                timeLeft > 0 || loading || success
                  ? 'text-slate-400 cursor-not-allowed'
                  : 'text-sky hover:text-sky-600'
              }`}
            >
              <RefreshCw
                className={`w-4 h-4 ${timeLeft > 0 ? '' : 'animate-spin-slow'}`}
                style={{ animationDuration: '3s' }}
              />
              {timeLeft > 0 ? `Resend code in ${timeLeft}s` : 'Resend Code'}
            </button>

            <button
              onClick={onBack}
              disabled={loading || success}
              className={`text-sm font-semibold transition-colors py-2 ${
                loading || success
                  ? 'text-slate-300 cursor-not-allowed'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              Wait, I need to edit my details
            </button>
          </div>
        </div>
      </div>
    </Shell>
  )
}
