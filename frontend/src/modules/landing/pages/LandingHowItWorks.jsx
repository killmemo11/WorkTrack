import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'

const DEFAULT_STEPS = [
  { icon: 'lucide:user-plus', title: 'Register Your Company', desc: 'Create your account and tell us about your team. It takes less than 5 minutes.' },
  { icon: 'lucide:check-circle', title: 'Get Approved', desc: 'Our team reviews and approves your workspace within 24 hours.' },
  { icon: 'lucide:rocket', title: 'Set Up & Go', desc: 'Add your employees, configure settings, and start managing your workforce.' },
]

function lucideIcon(name) {
  const paths = {
    'lucide:user-plus': <><path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="8.5" cy="7" r="4"/><line x1="20" y1="8" x2="20" y2="14"/><line x1="23" y1="11" x2="17" y2="11"/></>,
    'lucide:check-circle': <><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></>,
    'lucide:rocket': <><path d="M4.5 16.5c-1.5 1.26-2 5-2 5s3.74-.5 5-2c.71-.84.7-1.66.5-3-1.5-1-4-.5-5 1z"/><path d="M12 15l-3-3a22 22 0 0 1 2-3.95A12.88 12.88 0 0 1 22 2c0 2.72-.78 7.5-6 11a22.35 22.35 0 0 1-4 2z"/><path d="M9 12H4s.55-3.03 2-4c1.62-1.08 5 0 5 0"/><path d="M12 15v5s3.03-.55 4-2c1.08-1.62 0-5 0-5"/></>,
  }
  return paths[name] || paths['lucide:user-plus']
}

export default function LandingHowItWorks() {
  const [s, setS] = useState({})

  const g = (key, fallback) => s[key] || fallback

  function parseJSON(val, fallback) {
    if (!val) return fallback;
    if (typeof val === 'object') return val;
    try { return JSON.parse(val); } catch { return fallback; }
  }

  useEffect(() => {
    fetch('/api/platform/public/settings')
      .then(res => res.json())
      .then(data => setS(data))
      .catch(() => {})
  }, [])

  const steps = (parseJSON(g('landing_steps_list', null), { steps: DEFAULT_STEPS }).steps) || DEFAULT_STEPS

  return (
    <div className="landing-how-it-works-page">
      <div className="landing-page-hero">
        <div className="landing-page-hero-bg" />
        <div className="landing-page-hero-content">
          <div className="landing-page-badge">HOW IT WORKS</div>
          <h1>{g('landing_steps_title', 'Get Started in 3 Simple Steps')}</h1>
          <p>{g('landing_steps_subtitle', 'No technical expertise required — just a few clicks and you\'re live.')}</p>
        </div>
      </div>

      <section className="landing-how">
        <div className="landing-steps-visual">
          {steps.map((step, i) => (
            <div key={i} className="landing-step-visual">
              <div className="landing-step-visual-number">
                <span>{i + 1}</span>
                {i < steps.length - 1 && <div className="landing-step-connector" />}
              </div>
              <div className="landing-step-visual-content">
                <div className="landing-step-visual-icon">
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                    {lucideIcon(step.icon)}
                  </svg>
                </div>
                <h3>{step.title}</h3>
                <p>{step.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="landing-page-cta">
        <h2>Ready to Get Started?</h2>
        <p>Set up your workspace in minutes, not months.</p>
        <Link to="/tenant-register" className="landing-btn-primary">
          Create Your Account
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg>
        </Link>
      </section>
    </div>
  )
}
