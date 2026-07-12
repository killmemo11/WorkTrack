import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'

const LandingContact = () => {
  const [s, setS] = useState({})

  const g = (key, fallback) => s[key] || fallback

  useEffect(() => {
    fetch('/api/platform/public/settings')
      .then(r => r.json())
      .then(data => setS(data.settings || {}))
      .catch(() => {})
  }, [])

  return (
    <div className="landing-contact-page">
      <div className="landing-page-hero">
        <div className="landing-page-hero-bg" />
        <div className="landing-page-hero-content">
          <div className="landing-page-badge">GET STARTED</div>
          <h1>Ready to Transform Your HR?</h1>
          <p>Join teams that use WorkTrack to streamline their operations.</p>
        </div>
      </div>

      <section className="landing-cta-section">
        <div className="landing-cta-cards">
          <div className="landing-cta-card">
            <div className="landing-cta-icon">
              <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#818cf8" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
                <polyline points="9 22 9 12 15 12 15 22"/>
              </svg>
            </div>
            <h3>{g('landing_cta_card_1_title', 'Register Your Company')}</h3>
            <p>{g('landing_cta_card_1_text', 'Create your company workspace and start your free trial today. No credit card required.')}</p>
            <Link to="/tenant-register" className="landing-btn-primary">
              {g('landing_cta_card_1_button', 'Register Your Company')}
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg>
            </Link>
          </div>

          <div className="landing-cta-card">
            <div className="landing-cta-icon">
              <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#22c55e" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
                <circle cx="12" cy="7" r="4"/>
              </svg>
            </div>
            <h3>{g('landing_cta_card_2_title', 'Already Have an Account?')}</h3>
            <p>{g('landing_cta_card_2_text', 'Sign in to your workspace and pick up right where you left off.')}</p>
            <Link to="/login" className="landing-btn-secondary">
              {g('landing_cta_card_2_button', 'Sign In')}
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg>
            </Link>
          </div>
        </div>
      </section>

      <section className="landing-trust">
        <div className="landing-trust-items">
          <div className="landing-trust-item">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#22c55e" strokeWidth="2"><polyline points="20 6 9 17 4 12"/></svg>
            <span>No credit card required</span>
          </div>
          <div className="landing-trust-item">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#22c55e" strokeWidth="2"><polyline points="20 6 9 17 4 12"/></svg>
            <span>Setup in 30 minutes</span>
          </div>
          <div className="landing-trust-item">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#22c55e" strokeWidth="2"><polyline points="20 6 9 17 4 12"/></svg>
            <span>Cancel anytime</span>
          </div>
        </div>
      </section>
    </div>
  )
}

export default LandingContact
