import React, { useState, useEffect } from 'react'
import { ArrowRight, ShieldCheck, RefreshCw, Loader2 } from 'lucide-react'
import Shell from '../layout/Shell'
import Button from '../ui/Button'

/**
 * OtpForm:
 * Verifies the 6-digit verification code with the server (SEC 01).
 * Relies on HttpOnly session cookie issued by the API.
 */
export default function OtpForm({ onHome, onVerify, onResend, onBack, user, onLogout }) {
  const [otp, setOtp] = useState('')
  const [errorMessage, setErrorMessage] = useState('')
  const [loading, setLoading] = useState(false)
  const [timeLeft, setTimeLeft] = useState(45)

  const email = (user?.['Email Id'] || user?.['Email'] || '').trim().toLowerCase()

  useEffect(() => {
    if (timeLeft <= 0) return
    const timer = setInterval(() => setTimeLeft(t => t - 1), 1000)
    return () => clearInterval(timer)
  }, [timeLeft])

  const handleVerify = async () => {
    if (!otp || otp.length < 6) {
      setErrorMessage('Please enter the 6-digit verification code.')
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
        onVerify(data.user || user)
      } else {
        setErrorMessage(data.error || 'Invalid verification code. Please check and try again.')
      }
    } catch (err) {
      setErrorMessage('Network connection error. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const handleResend = () => {
    if (timeLeft > 0 || loading) return
    setErrorMessage('')
    setOtp('')
    setTimeLeft(45)
    onResend()
  }

  return (
    <Shell onHome={onHome} user={user} onLogout={onLogout}>
      <div className="max-w-md mx-auto pt-8 sm:pt-16 slide-up mb-10 px-1 sm:px-0">
        <div className="glass p-5 sm:p-8 md:p-10 text-center">
          <div className="w-16 h-16 bg-emerald-50 border border-emerald-100 rounded-2xl flex items-center justify-center mx-auto mb-6">
            <ShieldCheck className="w-8 h-8 text-emerald-500" />
          </div>

          <h2 className="font-heading font-bold text-2xl text-navy leading-tight mb-2">
            Verification Required
          </h2>
          <p className="text-slate-500 text-sm mb-8">
            We have emailed a 6-digit verification code to <strong>{email || 'your email'}</strong>. Please enter it below to begin.
          </p>

          <div className="mb-6">
            <input
              type="text"
              maxLength={6}
              value={otp}
              onChange={e => {
                setOtp(e.target.value.replace(/\D/g, ''))
                if (errorMessage) setErrorMessage('')
              }}
              onKeyDown={e => {
                if (e.key === 'Enter') handleVerify()
              }}
              className={`w-full text-center tracking-[0.5em] font-heading font-bold text-2xl sm:text-3xl border-2 rounded-xl px-4 py-4 focus:outline-none transition-colors bg-white ${
                errorMessage
                  ? 'border-red-400 focus:border-red-500 text-red-500'
                  : 'border-slate-200 focus:border-emerald-500 text-slate-800'
              }`}
              placeholder="••••••"
              autoFocus
            />
            {errorMessage && (
              <p className="text-red-500 text-xs sm:text-sm mt-3 font-semibold text-left">
                {errorMessage}
              </p>
            )}
          </div>

          <Button
            variant="success"
            size="md"
            className="w-full justify-center text-base mb-4"
            onClick={handleVerify}
            disabled={loading || otp.length < 6}
            iconRight={loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <ArrowRight className="w-5 h-5" />}
          >
            {loading ? 'Verifying...' : 'Verify & Continue'}
          </Button>

          <div className="flex flex-col gap-2">
            <button
              onClick={handleResend}
              disabled={timeLeft > 0 || loading}
              className={`text-sm font-semibold flex items-center justify-center gap-1.5 w-full py-2 transition-colors ${
                timeLeft > 0 || loading ? 'text-slate-400 cursor-not-allowed' : 'text-sky hover:text-sky-600'
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
              disabled={loading}
              className="text-sm font-semibold text-slate-500 hover:text-slate-800 transition-colors py-2"
            >
              Wait, I need to edit my details
            </button>
          </div>
        </div>
      </div>
    </Shell>
  )
}
