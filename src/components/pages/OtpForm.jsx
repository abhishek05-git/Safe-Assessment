import React, { useState, useEffect } from 'react'
import { ArrowRight, ShieldCheck, RefreshCw } from 'lucide-react'
import Shell  from '../layout/Shell'
import Button from '../ui/Button'

export default function OtpForm({ onHome, onVerify, expectedOtp, onResend, onBack, user, onLogout }) {
  const [otp, setOtp] = useState('')
  const [error, setError] = useState(false)
  const [timeLeft, setTimeLeft] = useState(30)

  useEffect(() => {
    if (timeLeft <= 0) return
    const timer = setInterval(() => setTimeLeft(t => t - 1), 1000)
    return () => clearInterval(timer)
  }, [timeLeft])

  const handleVerify = () => {
    if (otp === expectedOtp) {
      setError(false)
      onVerify()
    } else {
      setError(true)
    }
  }

  const handleResend = () => {
    if (timeLeft > 0) return
    onResend()
    setTimeLeft(30)
    setOtp('')
    setError(false)
  }

  return (
    <Shell onHome={onHome} user={user} onLogout={onLogout}>
      <div className="max-w-md mx-auto pt-16 slide-up mb-10">
        <div className="glass p-8 md:p-10 text-center">
          <div className="w-16 h-16 bg-emerald-50 border border-emerald-100 rounded-2xl flex items-center justify-center mx-auto mb-6">
            <ShieldCheck className="w-8 h-8 text-emerald-500" />
          </div>
          
          <h2 className="font-heading font-bold text-2xl text-navy leading-tight mb-2">
            Verification Required
          </h2>
          <p className="text-slate-500 text-sm mb-8">
            We have emailed a 4-digit OTP to your registered email address. Please enter it below to begin the assessment.
          </p>

          <div className="mb-6">
            <input
              type="text"
              maxLength={4}
              value={otp}
              onChange={e => setOtp(e.target.value.replace(/\D/g, ''))}
              className={`w-full text-center tracking-[1em] font-heading font-bold text-3xl border-2 rounded-xl px-4 py-4 focus:outline-none transition-colors bg-white ${
                error ? 'border-red-400 focus:border-red-500 text-red-500' : 'border-slate-200 focus:border-emerald-500 text-slate-800'
              }`}
              placeholder="••••"
              autoFocus
            />
            {error && (
              <p className="text-red-500 text-sm mt-3 font-semibold">
                Invalid OTP. Please try again.
              </p>
            )}
          </div>

          <Button
            variant="success"
            size="md"
            className="w-full justify-center text-base mb-4"
            onClick={handleVerify}
            iconRight={<ArrowRight className="w-5 h-5" />}
          >
            Verify & Start
          </Button>

          <div className="flex flex-col gap-2">
            <button
              onClick={handleResend}
              disabled={timeLeft > 0}
              className={`text-sm font-semibold flex items-center justify-center gap-1.5 w-full py-2 transition-colors ${
                timeLeft > 0 ? 'text-slate-400 cursor-not-allowed' : 'text-sky hover:text-sky-600'
              }`}
            >
              <RefreshCw className={`w-4 h-4 ${timeLeft > 0 ? '' : 'animate-spin-slow'}`} style={{ animationDuration: '3s' }} />
              {timeLeft > 0 ? `Resend OTP in ${timeLeft}s` : 'Resend OTP'}
            </button>

            <button
              onClick={onBack}
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
