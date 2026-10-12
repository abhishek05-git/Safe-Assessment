import React, { useState } from 'react'
import { Download, RotateCcw, Home } from 'lucide-react'
import Shell from '../layout/Shell'
import Button from '../ui/Button'
import { profiles as DEFAULT_PROFILES } from '../../data/config'

// Emoji per 4-letter code
const EMOJI = {
  INTJ: '🧩', INTP: '🔬', ENTJ: '🚀', ENTP: '💡',
  INFJ: '🌟', INFP: '🌱', ENFJ: '🤝', ENFP: '✨',
  ISTJ: '📋', ISFJ: '🛡️', ESTJ: '⚡', ESFJ: '🏘️',
  ISTP: '🔧', ISFP: '🎨', ESTP: '🎯', ESFP: '🎉',
}

/* ── Dimension card ──────────────────────────────────────────────── */
function DimensionCard({ dim }) {
  const [p1, p2] = dim.poles
  const winner = dim.winner
  const pct = dim.pct[winner]
  const other = p1 === winner ? p2 : p1

  return (
    <div className="glass p-5 slide-up print:p-3.5 print:bg-white print:border print:border-slate-200 print:rounded-xl print:shadow-none print:break-inside-avoid">
      <div className="text-[11px] font-bold text-slate-400 tracking-[0.15em] mb-2 uppercase print:text-[10px] print:mb-1">
        {dim.name}
      </div>
      <div className="flex justify-between items-baseline mb-3 print:mb-1.5">
        <span className="font-heading font-bold text-navy text-lg print:text-sm">{dim.labels[winner]}</span>
        <span className="text-sky font-bold text-lg print:text-sm">{pct}%</span>
      </div>
      <div className="h-2.5 print:h-2 bg-slate-100 rounded-full overflow-hidden print:border print:border-slate-200">
        <div
          className="h-full rounded-full transition-all duration-1000 ease-out"
          style={{ width: `${pct}%`, background: 'linear-gradient(90deg, #0EA5E9, #38BDF8)' }}
        />
      </div>
      <div className="flex justify-between text-xs print:text-[10px] text-slate-400 mt-2 print:mt-1">
        <span>{dim.labels[p1]} {dim.pct[p1]}%</span>
        <span>{dim.labels[p2]} {dim.pct[p2]}%</span>
      </div>
    </div>
  )
}

/* ── Content for each report section ─────────────────────────────── */
function buildContent(profile) {
  return {
    traits: [
      { heading: 'Overview', items: [profile.overview] },
      { heading: 'Your Strengths', items: profile.strengths },
      { heading: 'Watch Out For', items: profile.challenges },
    ],
    career: [{ heading: 'Career Paths to Explore', items: profile.career }],
    growth: [{ heading: 'Growth Opportunities', items: profile.growth }],
    relationships: [{ heading: 'In Relationships', items: profile.relationships }],
    team: [{ heading: 'Your Team Style', items: profile.team }],
  }
}

/**
 * Result / personality report page.
 *
 * Props:
 *  result    — { code, type, dims } from scoring engine
 *  profiles  — profile map keyed by 4-letter code
 *  sections  — report section config array
 *  onHome    — navigate to landing
 *  onRetake  — clear progress and restart
 */
export default function Result({ result, user, profiles, sections, onHome, onRetake, onLogout }) {
  const profile = profiles[result.code]
  const [activeTab, setActiveTab] = useState(
    sections.find(s => s.on)?.id ?? 'traits'
  )

  if (!profile) {
    return (
      <Shell onHome={onHome} user={user} onLogout={onLogout}>
        <div className="glass p-8 text-center mt-10">
          <p className="text-slate-600 mb-4">Profile not found for type: <strong>{result.code}</strong></p>
          <Button variant="navy" onClick={onHome}>Go Home</Button>
        </div>
      </Shell>
    )
  }

  const emoji = EMOJI[result.code] ?? '🧠'
  const activeSections = sections.filter(s => s.on)
  const content = buildContent(profile)

  // Identity pole label (A = Assertive, T = Turbulent)
  const identityDim = result.dims[4]
  const identityLabel = identityDim ? identityDim.labels[identityDim.winner] : null

  // Extract user entries
  const userEntries = Object.entries(user || {}).filter(([k, v]) => v)

  // Avatar illustration image for the personality profile
  const profileImage = profile.image || DEFAULT_PROFILES[result.code]?.image

  // Download PDF handler with smart filename
  const handleDownloadReport = () => {
    const originalTitle = document.title
    const candidateName = user?.['Name'] || user?.['Full Name'] || 'Candidate'
    document.title = `${candidateName} - SAFE Personality Assessment Report (${result.code})`
    window.print()
    setTimeout(() => {
      document.title = originalTitle
    }, 1000)
  }

  return (
    <Shell
      onHome={onHome}
      user={user}
      onLogout={onLogout}
      right={
        <div className="flex gap-2">
          <Button variant="secondary" size="sm" onClick={onRetake} icon={<RotateCcw className="w-4 h-4" />}>
            Retake
          </Button>
          <Button variant="secondary" size="sm" onClick={onHome} icon={<Home className="w-4 h-4" />}>
            Home
          </Button>
        </div>
      }
    >
      {/* ── User Details (Printable) ── */}
      {userEntries.length > 0 && (
        <div className="glass p-4 md:p-6 slide-up mb-5 flex flex-wrap gap-x-8 gap-y-3 justify-center items-center text-sm border-t-4 border-sky print:p-3.5 print:bg-white print:border print:border-slate-200 print:border-t-4 print:border-t-sky print:rounded-xl print:shadow-none print:justify-start print:gap-x-6 print:gap-y-2 print:mb-4 print:break-inside-avoid">
          {userEntries.map(([key, val]) => (
            <div key={key} className="flex flex-col text-left">
              <span className="text-[9.5px] uppercase tracking-wider text-slate-400 font-bold">{key}</span>
              <span className="font-semibold text-slate-800 text-xs sm:text-sm">{val}</span>
            </div>
          ))}
        </div>
      )}

      {/* ── Personality banner ── */}
      <div
        className="glass overflow-hidden mb-5 slide-up relative print:bg-white print:border print:border-slate-200 print:rounded-2xl print:shadow-none print:mb-4 print:break-inside-avoid"
        style={{ borderTop: `5px solid ${profile.color}` }}
      >
        {/* Subtle diagonal pinstripe texture inspired by the reference card */}
        <div
          className="absolute inset-0 pointer-events-none opacity-[0.035] print:opacity-0"
          style={{
            backgroundImage:
              'repeating-linear-gradient(45deg, #0f172a 0px, #0f172a 2px, transparent 2px, transparent 16px)',
          }}
        />

        <div className="p-6 md:p-8 relative print:p-4">
          <div className="text-[11px] print:text-[9.5px] font-bold tracking-[0.25em] text-slate-400 mb-4 print:mb-2 uppercase text-center md:text-left print:text-left">
            Your SAFE Ltd. Personality Type
          </div>

          {/* Reference-style Personality Card */}
          <div className="bg-white/90 backdrop-blur-sm rounded-3xl border border-slate-200/90 shadow-sm p-5 md:p-7 flex flex-col md:flex-row print:flex-row print:items-center print:justify-between items-center gap-6 md:gap-8 print:gap-5 print:p-3.5 print:rounded-xl print:border print:border-slate-200 print:shadow-none">
            {/* Left: Avatar / Character Image */}
            <div className="shrink-0 flex items-center justify-center print:shrink-0">
              {profileImage ? (
                <div className="relative group flex items-center justify-center">
                  <img
                    src={profileImage}
                    alt={profile.name}
                    className="h-44 md:h-52 print:h-28 w-auto max-w-[200px] print:max-w-[110px] object-contain drop-shadow-md rounded-2xl print:rounded-lg transition-transform duration-300 group-hover:scale-105"
                  />
                </div>
              ) : (
                <div
                  className="w-32 h-32 md:w-40 md:h-40 print:w-24 print:h-24 rounded-2xl flex items-center justify-center text-6xl print:text-4xl shadow-inner border border-slate-100"
                  style={{ background: `${profile.color}15` }}
                >
                  {emoji}
                </div>
              )}
            </div>

            {/* Middle: Title, Identity Badge & Description */}
            <div className="flex-1 text-center md:text-left print:text-left space-y-2.5 print:space-y-1">
              <div className="flex flex-wrap items-center justify-center md:justify-start print:justify-start gap-2.5">
                <h1 className="font-heading font-black text-2xl md:text-3xl print:text-xl text-slate-900 tracking-tight">
                  {profile.name}
                </h1>
                {identityLabel && (
                  <span
                    className="text-xs print:text-[10px] font-bold px-3 py-1 print:px-2 print:py-0.5 rounded-full print:border print:border-slate-200"
                    style={{ background: `${profile.color}18`, color: profile.color }}
                  >
                    {identityLabel}
                  </span>
                )}
              </div>

              <p className="text-slate-600 text-sm md:text-base print:text-[11px] leading-relaxed">
                {profile.overview || profile.tagline}
              </p>

              {profile.overview && profile.tagline && profile.overview !== profile.tagline && (
                <p className="text-xs print:text-[10px] font-semibold text-slate-400 italic">
                  "{profile.tagline}"
                </p>
              )}
            </div>

            {/* Right: Solid 4-letter Code Badge matching the reference */}
            <div className="shrink-0 w-full md:w-auto print:w-auto flex justify-center print:shrink-0">
              <div
                className="w-full md:w-48 print:w-32 py-8 md:py-12 print:py-5 px-6 print:px-3 rounded-2xl print:rounded-xl flex flex-col items-center justify-center text-white shadow-md print:shadow-none transition-transform hover:scale-[1.02]"
                style={{ backgroundColor: profile.color }}
              >
                <span className="font-heading font-black text-5xl md:text-6xl print:text-3xl tracking-wider leading-none">
                  {result.code}
                </span>
                {identityDim && (
                  <span className="text-white/80 text-[11px] print:text-[9px] font-bold mt-2.5 print:mt-1 uppercase tracking-widest">
                    {identityDim.winner === 'A' ? 'Assertive' : 'Turbulent'}
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex gap-3 justify-center mt-6 flex-wrap print:hidden">
            <Button
              id="download-report-btn"
              variant="primary"
              size="md"
              onClick={handleDownloadReport}
              icon={<Download className="w-4 h-4" />}
            >
              Download Report
            </Button>
            <Button
              id="retake-assessment-btn"
              variant="navy"
              size="md"
              onClick={onRetake}
              icon={<RotateCcw className="w-4 h-4" />}
            >
              Retake Assessment
            </Button>
          </div>
        </div>
      </div>

      {/* ── Dimension cards ── */}
      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4 mb-5 print:grid print:grid-cols-2 print:gap-3 print:mb-4 print:break-inside-avoid">
        {result.dims.map(d => <DimensionCard key={d.key} dim={d} />)}
      </div>

      {/* ── Tabbed report content ── */}
      <div className="glass p-6 md:p-8 slide-up print:p-5 print:bg-white print:border print:border-slate-200 print:rounded-2xl print:shadow-none">
        {/* Tab bar (hidden when printing) */}
        <div className="flex gap-1.5 flex-wrap mb-6 bg-slate-100 rounded-2xl p-1 print:hidden">
          {activeSections.map(s => (
            <button
              key={s.id}
              id={`tab-${s.id}`}
              onClick={() => setActiveTab(s.id)}
              className={[
                'flex-1 min-w-max px-4 py-2.5 rounded-xl text-sm font-semibold transition-all duration-200',
                activeTab === s.id
                  ? 'bg-white text-navy shadow-sm'
                  : 'text-slate-500 hover:text-slate-700',
              ].join(' ')}
            >
              {s.title}
            </button>
          ))}
        </div>

        {/* Tab bodies — Only the active tab shows on screen, but ALL tabs show when printing */}
        <div className="fade print:fade-none">
          {activeSections.map(s => (
            <div
              key={s.id}
              className={`${activeTab === s.id ? 'block' : 'hidden'} print:block print:mb-6 print:break-inside-avoid`}
            >
              {/* Print-only section title to separate the content */}
              <h2 className="hidden print:flex items-center gap-2 font-heading font-black text-base text-slate-900 mb-2.5 border-b-2 border-slate-200 pb-1 uppercase tracking-wide">
                <span className="w-2 h-2 rounded-full" style={{ backgroundColor: profile.color }} />
                {s.title}
              </h2>

              {(content[s.id] ?? []).map(({ heading, items }) => (
                <div key={heading} className="mb-4 print:mb-3 break-inside-avoid print:break-inside-avoid">
                  <h3 className="font-heading font-bold text-slate-900 mb-2 text-base print:text-xs uppercase tracking-wider">{heading}</h3>
                  <ul className="space-y-2.5 print:space-y-1">
                    {items.map((item, i) => (
                      <li key={i} className="flex items-start gap-3 print:gap-2 text-slate-700 text-sm print:text-xs">
                        <span
                          className="w-5 h-5 print:w-4 print:h-4 rounded-full flex items-center justify-center shrink-0 mt-0.5 text-[10px] print:text-[8.5px] font-bold"
                          style={{ background: `${profile.color}18`, color: profile.color }}
                        >
                          ✓
                        </span>
                        <span className="leading-relaxed">{item}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          ))}
        </div>
      </div>
    </Shell>
  )
}
