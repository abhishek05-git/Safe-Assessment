import React from 'react'
import { ArrowRight, Brain, Target, Zap, Users, TrendingUp, Shield, Settings } from 'lucide-react'
import Shell from '../layout/Shell'
import Button from '../ui/Button'

const FEATURES = [
  { icon: Brain, title: 'Understand Yourself', desc: 'Discover how you naturally think, process information and make decisions in finance.' },
  { icon: Target, title: 'Discover Your Strengths', desc: 'Uncover the unique strengths that set you apart in the fintech ecosystem.' },
  { icon: Zap, title: 'Explore Your Work Style', desc: 'Learn how you prefer to work, organise and tackle complex challenges.' },
  { icon: Users, title: 'Build Better Teams', desc: 'Understand how you collaborate and complement others around you.' },
  { icon: TrendingUp, title: 'Plan Your Growth', desc: 'Get personalised insights for your professional development in fintech.' },
]

export default function Landing({ onStart, onAdmin, questionCount, user, onLogout }) {
  // Assume ~12 seconds per question
  const estimatedMinutes = Math.max(1, Math.ceil((questionCount * 12) / 60))

  return (
    <Shell
      onHome={() => { }}
      right={null}
      user={user}
      onLogout={onLogout}
    >
      {/* ── Hero ── */}
      <section className="text-center text-white pt-10 pb-16">
        {/* Pill badge */}
        <div className="slide-up inline-flex items-center gap-2 bg-sky/20 border border-sky/30 text-sky text-sm px-4 py-2 rounded-full mb-8 font-medium">
          <Zap className="w-3.5 h-3.5" />
          SAFE Ltd. Personality Assessment
        </div>

        <h1 className="slide-up-1 font-heading font-black text-4xl md:text-6xl lg:text-7xl leading-tight mb-6">
          Discover Your<br />
          <span
            className="text-transparent bg-clip-text"
            style={{ backgroundImage: 'linear-gradient(135deg, #38BDF8 0%, #0EA5E9 50%, #60A5FA 100%)' }}
          >
            Personality.
          </span>
        </h1>

        <p className="slide-up-2 text-white/70 text-lg md:text-xl max-w-2xl mx-auto mb-10 leading-relaxed">
          Take the SAFE Ltd. Assessment and discover how you think, communicate, work, lead
          and grow in the world of finance and fintech.
        </p>

        {/* CTAs */}
        <div className="slide-up-3 flex flex-col sm:flex-row gap-4 justify-center items-center mb-12">
          <Button
            id="start-btn"
            variant="primary"
            size="lg"
            onClick={onStart}
            iconRight={<ArrowRight className="w-5 h-5" />}
            className="text-base shadow-2xl shadow-sky/40"
          >
            Start Assessment
          </Button>
          <Button
            variant="secondary"
            size="lg"
            onClick={() => document.getElementById('features-section')?.scrollIntoView({ behavior: 'smooth' })}
            className="text-base"
          >
            How It Works
          </Button>
        </div>

        {/* Stats row */}
        <div className="slide-up-4 flex flex-wrap justify-center gap-3">
          {[`${questionCount} Questions`, `~${estimatedMinutes} Minutes`, '5 Dimensions', '16 Profiles'].map(s => (
            <span key={s} className="bg-white/10 backdrop-blur border border-white/20 text-white/85 text-sm px-4 py-2 rounded-full font-medium">
              {s}
            </span>
          ))}
          <span className="bg-white/10 backdrop-blur border border-white/20 text-white/85 text-sm px-4 py-2 rounded-full font-medium flex items-center gap-1.5">
            <Shield className="w-3.5 h-3.5" /> Private & Secure
          </span>
        </div>
      </section>

      {/* ── Features grid ── */}
      <section id="features-section" className="pb-10">
        <div className="text-center mb-10">
          <h2 className="font-heading font-bold text-3xl text-white mb-3">What You'll Discover</h2>
          <p className="text-white/55 max-w-xl mx-auto">
            Our assessment maps you across 5 dimensions rooted in personality science,
            tailored for the fintech & finance world.
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {FEATURES.map((f, i) => (
            <div
              key={f.title}
              className="glass p-6 hover:-translate-y-1 transition-transform duration-200"
              style={{ animationDelay: `${i * 0.08}s` }}
            >
              <div className="w-12 h-12 rounded-2xl bg-sky/10 border border-sky/20 flex items-center justify-center mb-4">
                <f.icon className="w-6 h-6 text-sky" />
              </div>
              <h3 className="font-heading font-bold text-navy text-lg mb-2">{f.title}</h3>
              <p className="text-slate-600 text-sm leading-relaxed">{f.desc}</p>
            </div>
          ))}

          {/* CTA card */}
          <div className="glass p-6 flex flex-col justify-center items-center text-center border-sky/30"
            style={{ borderColor: 'rgba(14,165,233,0.2)' }}>
            <div className="text-5xl mb-3">🎯</div>
            <h3 className="font-heading font-bold text-navy text-lg mb-2">Ready to begin?</h3>
            <p className="text-slate-500 text-sm mb-5">Takes ~{estimatedMinutes} minutes. No sign-up needed.</p>
            <Button id="start-btn-2" variant="navy" size="sm" onClick={onStart} iconRight={<ArrowRight className="w-4 h-4" />}>
              Start Now
            </Button>
          </div>
        </div>
      </section>
    </Shell>
  )
}
