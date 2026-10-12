import React from 'react'
import { LogOut } from 'lucide-react'

/**
 * App-wide layout shell — provides the dark gradient background,
 * SAFE header, and a centred main content area.
 *
 * Props:
 *  onHome   — click handler for the SAFE logo (navigate home)
 *  right    — ReactNode rendered on the right side of the header
 *  user     — current user object (if available)
 *  onLogout — handler to trigger logout
 */
export default function Shell({ children, onHome, right, user, onLogout }) {
  return (
    <div
      className="min-h-screen flex flex-col text-slate-900 print:bg-white print:min-h-0"
      style={{ background: 'linear-gradient(135deg, #0A1F44 0%, #12356b 55%, #1B4080 100%)' }}
    >
      {/* ── Screen Header (Hidden on Print) ── */}
      <header className="flex justify-between items-center px-3.5 sm:px-6 py-3.5 sm:py-5 text-white print:hidden">
        <button
          onClick={onHome}
          className="text-left group flex items-center gap-2.5 sm:gap-3 hover:opacity-90 transition-opacity"
          aria-label="Go to home"
        >
          {/* Logo badge */}
          <div className="w-9 h-9 sm:w-10 sm:h-10 bg-white rounded-xl flex items-center justify-center shrink-0 group-hover:bg-gray-50 transition-colors overflow-hidden">
            <img src="/logo.png" alt="SAFE Ltd. Logo" className="w-full h-full object-contain p-1" />
          </div>
          <div>
            <div className="font-heading font-bold text-lg sm:text-xl tracking-tight leading-tight">SAFE Ltd.</div>
            <div className="text-[10px] sm:text-[11px] text-white/55 leading-tight hidden xs:block sm:block">Sodhani Academy of Fintech Enablers Ltd.</div>
          </div>
        </button>

        <div className="flex items-center gap-2 sm:gap-4">
          {user && user['Name'] && onLogout && (
            <button
              onClick={onLogout}
              className="flex items-center gap-1.5 text-white/60 text-xs sm:text-sm hover:text-red-400 transition-colors px-2.5 sm:px-3 py-1.5 sm:py-2 rounded-xl hover:bg-white/10"
              title="Log Out"
            >
              <LogOut className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              <span className="hidden sm:inline">Log out</span>
            </button>
          )}
          {right && <div>{right}</div>}
        </div>
      </header>

      {/* ── Official Print/PDF Header (Visible only in PDF / Print) ── */}
      <div className="hidden print:flex justify-between items-center pb-3 mb-4 border-b-2 border-slate-200 px-1">
        <div className="flex items-center gap-3">
          <img src="/logo.png" alt="SAFE Ltd. Logo" className="w-9 h-9 object-contain" />
          <div>
            <div className="font-heading font-bold text-base text-slate-900 tracking-tight leading-tight">SAFE Ltd.</div>
            <div className="text-[9.5px] text-slate-500 font-medium">Sodhani Academy of Fintech Enablers Ltd.</div>
          </div>
        </div>
        <div className="text-right">
          <div className="text-xs font-bold uppercase tracking-wider text-sky-700">Personality Assessment Report</div>
          <div className="text-[9.5px] text-slate-400 font-medium">
            Generated: {new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
          </div>
        </div>
      </div>

      {/* ── Content ── */}
      <main className="px-3 sm:px-4 pb-20 max-w-5xl mx-auto flex-1 w-full print:max-w-none print:w-full print:p-0 print:m-0">
        {children}
      </main>

      {/* ── Screen Footer (Hidden on Print) ── */}
      <footer className="w-full text-center py-6 mt-auto border-t border-white/10 print:hidden">
        <div className="flex flex-col md:flex-row justify-center items-center gap-2 md:gap-6 text-xs text-white/50">
          <p>© {new Date().getFullYear()} Sodhani Academy of Fintech Enablers Ltd. All rights reserved.</p>
          <div className="hidden md:block w-1 h-1 rounded-full bg-white/20"></div>
          <div className="flex gap-4">
            <a href="#" className="hover:text-white/80 transition-colors">Privacy Policy</a>
            <a href="#" className="hover:text-white/80 transition-colors">Terms of Service</a>
          </div>
        </div>
      </footer>

      {/* ── Print Footnote ── */}
      <div className="hidden print:flex justify-between items-center pt-2.5 mt-5 border-t border-slate-200 text-[9px] text-slate-400 px-1">
        <span>SAFE Ltd. • Confidential Personality Assessment</span>
        <span>© {new Date().getFullYear()} Sodhani Academy of Fintech Enablers Ltd.</span>
      </div>
    </div>
  )
}
