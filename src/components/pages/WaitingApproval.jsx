import React, { useState, useEffect } from 'react'
import { Clock, ShieldCheck, CheckCircle2, RefreshCw, AlertCircle, ArrowRight, UserCheck, ShieldAlert } from 'lucide-react'
import Shell from '../layout/Shell'
import Button from '../ui/Button'
import { load } from '../../hooks/useStore'

/**
 * WaitingApproval page:
 * Shown after participant registers and verifies OTP, but before admin grants access.
 * The test and its 30-minute timer CANNOT start until approval is granted.
 */
export default function WaitingApproval({ user, onHome, onStartTest, onLogout }) {
  const [isApproved, setIsApproved] = useState(false)
  const [checking, setChecking] = useState(false)
  const [lastChecked, setLastChecked] = useState(new Date())

  // Check approval status in real-time via authenticated server-side API (SEC 04)
  useEffect(() => {
    let isMounted = true

    const updateStatus = async () => {
      try {
        const res = await fetch('/api/access/status', {
          credentials: 'include',
          headers: { 'Accept': 'application/json' }
        })
        if (res.ok) {
          const json = await res.json()
          if (isMounted && json && json.approved) {
            setIsApproved(true)
          }
        }
      } catch (e) {
        // Silent fallback on network drop
      }
      if (isMounted) setLastChecked(new Date())
    }

    updateStatus()

    // Interval poll every 2.5 seconds
    const interval = setInterval(updateStatus, 2500)

    return () => {
      isMounted = false
      clearInterval(interval)
    }
  }, [])

  const handleManualCheck = async () => {
    setChecking(true)
    try {
      const res = await fetch('/api/access/status', {
        credentials: 'include',
        headers: { 'Accept': 'application/json' }
      })
      if (res.ok) {
        const json = await res.json()
        if (json && json.approved) {
          setIsApproved(true)
        }
      }
    } catch (e) {}
    setLastChecked(new Date())
    setChecking(false)
  }

  const userName = user?.['Name'] || user?.['Full Name'] || 'Candidate'
  const userOrg = user?.['Name of the Organization'] || user?.['Organization'] || ''
  const userEmail = user?.['Email Id'] || user?.['Email'] || ''

  return (
    <Shell onHome={onHome} user={user} onLogout={onLogout}>
      <div className="max-w-xl mx-auto pt-10 md:pt-14 pb-16 px-4 slide-up">
        <div className="glass p-8 md:p-10 text-center relative overflow-hidden">
          {/* Subtle background glow */}
          <div
            className={`absolute -top-24 -left-24 w-60 h-60 rounded-full blur-3xl opacity-30 pointer-events-none transition-colors duration-700 ${
              isApproved ? 'bg-emerald-400' : 'bg-amber-400'
            }`}
          />
          <div
            className={`absolute -bottom-24 -right-24 w-60 h-60 rounded-full blur-3xl opacity-30 pointer-events-none transition-colors duration-700 ${
              isApproved ? 'bg-sky-400' : 'bg-sky-400'
            }`}
          />

          {/* Status Icon with animation */}
          <div className="relative mb-6 flex justify-center">
            {isApproved ? (
              <div className="relative">
                <div className="w-20 h-20 bg-emerald-50 border-2 border-emerald-200 rounded-3xl flex items-center justify-center text-emerald-600 shadow-lg shadow-emerald-500/10">
                  <CheckCircle2 className="w-10 h-10 animate-scale-up" />
                </div>
                <div className="absolute -bottom-1 -right-1 w-6 h-6 bg-emerald-500 rounded-full flex items-center justify-center text-white border-2 border-white shadow">
                  <UserCheck className="w-3.5 h-3.5" />
                </div>
              </div>
            ) : (
              <div className="relative">
                <div className="w-20 h-20 bg-amber-50 border-2 border-amber-200 rounded-3xl flex items-center justify-center text-amber-600 shadow-lg shadow-amber-500/10">
                  <Clock className="w-10 h-10 animate-pulse" />
                </div>
                <span className="absolute -top-1 -right-1 flex h-4 w-4">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-4 w-4 bg-amber-500"></span>
                </span>
              </div>
            )}
          </div>

          {/* Heading and explanation */}
          {isApproved ? (
            <>
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-emerald-100 text-emerald-700 mb-3 border border-emerald-200">
                <ShieldCheck className="w-3.5 h-3.5" /> Access Approved
              </div>
              <h2 className="font-heading font-black text-2xl md:text-3xl text-navy mb-2">
                You Are Authorized to Begin!
              </h2>
              <p className="text-slate-600 text-sm md:text-base max-w-md mx-auto mb-6 leading-relaxed">
                Your test access has been approved by the administrator. Once you click start, your <strong>30-minute timer</strong> will begin.
              </p>
            </>
          ) : (
            <>
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-amber-100 text-amber-800 mb-3 border border-amber-200">
                <ShieldAlert className="w-3.5 h-3.5" /> Awaiting Admin Approval
              </div>
              <h2 className="font-heading font-black text-2xl md:text-3xl text-navy mb-2">
                Approval Required to Start Test
              </h2>
              <p className="text-slate-600 text-sm md:text-base max-w-md mx-auto mb-6 leading-relaxed">
                Welcome, <strong>{userName}</strong>. Your OTP verification is complete. The assessment cannot begin until an administrator grants you access.
              </p>
            </>
          )}

          {/* Candidate Info Summary Box */}
          <div className="bg-slate-50/80 border border-slate-200/80 rounded-2xl p-4 md:p-5 text-left mb-6 text-sm backdrop-blur-sm">
            <div className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2.5">
              Candidate Information
            </div>
            <div className="space-y-1.5">
              <div className="flex justify-between items-center py-0.5">
                <span className="text-slate-500 text-xs">Name:</span>
                <span className="font-bold text-slate-800">{userName}</span>
              </div>
              {userEmail && (
                <div className="flex justify-between items-center py-0.5 border-t border-slate-100 pt-1.5">
                  <span className="text-slate-500 text-xs">Email:</span>
                  <span className="font-medium text-slate-700 text-xs">{userEmail}</span>
                </div>
              )}
              {userOrg && (
                <div className="flex justify-between items-center py-0.5 border-t border-slate-100 pt-1.5">
                  <span className="text-slate-500 text-xs">Organization:</span>
                  <span className="font-medium text-slate-700 text-xs">{userOrg}</span>
                </div>
              )}
              <div className="flex justify-between items-center py-0.5 border-t border-slate-100 pt-1.5">
                <span className="text-slate-500 text-xs">Access Status:</span>
                <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold ${
                  isApproved ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'
                }`}>
                  <span className={`w-1.5 h-1.5 rounded-full ${isApproved ? 'bg-emerald-500' : 'bg-amber-500 animate-ping'}`} />
                  {isApproved ? 'Approved by Admin' : 'Pending Approval'}
                </span>
              </div>
            </div>
          </div>

          {/* Action CTA */}
          {isApproved ? (
            <div className="space-y-3">
              <Button
                variant="primary"
                size="lg"
                className="w-full justify-center text-base py-3.5 shadow-xl shadow-sky/20 group"
                iconRight={<ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />}
                onClick={onStartTest}
              >
                Start Assessment (30 Minutes)
              </Button>
              <p className="text-[11px] text-slate-400">
                Make sure you are in a quiet environment before starting.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="p-3 bg-amber-50/70 border border-amber-200/60 rounded-xl text-left flex gap-3 items-start">
                <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                <div className="text-xs text-amber-900 leading-relaxed">
                  Please notify your assessment coordinator or administrator to approve your email. This page will <strong>automatically unlock</strong> the instant access is granted.
                </div>
              </div>

              <div className="flex flex-col sm:flex-row gap-2 justify-center items-center pt-2">
                <button
                  type="button"
                  onClick={handleManualCheck}
                  disabled={checking}
                  className="inline-flex items-center gap-1.5 px-4 py-2 bg-white hover:bg-slate-50 text-slate-700 rounded-xl border border-slate-200 text-xs font-semibold shadow-sm transition-all cursor-pointer disabled:opacity-50"
                >
                  <RefreshCw className={`w-3.5 h-3.5 text-sky ${checking ? 'animate-spin' : ''}`} />
                  {checking ? 'Checking...' : 'Check Status Now'}
                </button>
                <button
                  type="button"
                  onClick={onLogout}
                  className="text-xs text-slate-400 hover:text-slate-600 transition-colors px-3 py-2 cursor-pointer"
                >
                  Log out / Change Details
                </button>
              </div>

              <div className="text-[11px] text-slate-400">
                Auto-syncing active &bull; Last checked {lastChecked.toLocaleTimeString()}
              </div>
            </div>
          )}
        </div>
      </div>
    </Shell>
  )
}
