import { useState, useEffect, useRef, useCallback } from 'react';
import { Link } from 'react-router-dom';
import ParticlesBackground from '../components/ParticlesBackground';
import TiltCard from '../components/TiltCard';
import AnimatedCounter from '../components/AnimatedCounter';
import LogoStrip from '../components/LogoStrip';
import ProductShowcase from '../components/ProductShowcase';
import TestimonialCarousel from '../components/TestimonialCarousel';
import FAQAccordion from '../components/FAQAccordion';
import MagneticButton from '../components/MagneticButton';
import ScrollProgress from '../components/ScrollProgress';
import useScrollReveal from '../hooks/useScrollReveal';
import useMousePosition from '../hooks/useMousePosition';

function parseJSON(val, fallback) {
  if (!val) return fallback;
  if (typeof val === 'object') return val;
  try { return JSON.parse(val); } catch { return fallback; }
}

const DEFAULT_FEATURES = [
  { icon: 'M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z', title: 'Smart Attendance', desc: 'GPS, QR codes, and automated tracking.', color: '#6366f1' },
  { icon: 'M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2 M9 7a4 4 0 1 0 0-8 4 4 0 0 0 0 8 M23 21v-2a4 4 0 0 0-3-3.87 M16 3.13a4 4 0 0 1 0 7.75', title: 'Team Management', desc: 'Organize, track, and grow your team.', color: '#22c55e' },
  { icon: 'M18 20V10 M12 20V4 M6 20v-6', title: 'Live Analytics', desc: 'Real-time reports and insights.', color: '#f59e0b' },
  { icon: 'M22 11.08V12a10 10 0 1 1-5.93-9.14 M22 4 12 14.01 9 11.01', title: 'Security & RBAC', desc: 'Granular permissions & audit trails.', color: '#a78bfa' },
  { icon: 'M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z', title: 'Recruitment ATS', desc: 'Pipeline, interviews, offers in one place.', color: '#f472b6' },
  { icon: 'M9 11l3 3L22 4 M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11', title: 'Leave Management', desc: 'Workflows, balances, approvals.', color: '#3b82f6' },
];

const STEPS = [
  { icon: 'M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2', title: 'Register Your Company', desc: 'Create your account and tell us about your team.' },
  { icon: 'M22 11.08V12a10 10 0 1 1-5.93-9.14', title: 'Get Approved', desc: 'Our team reviews and approves your workspace within 24 hours.' },
  { icon: 'M4.5 16.5c-1.5 1.26-2 5-2 5s3.74-.5 5-2c.71-.84.7-1.66.5-3-1.5-1-4-.5-5 1z', title: 'Set Up & Go', desc: 'Add employees, configure settings, and start managing.' },
];

const LOGOS = [
  { name: 'TechCorp', svg: '<svg viewBox="0 0 120 40" fill="currentColor"><text x="0" y="28" font-size="24" font-weight="800">TechCorp</text></svg>' },
  { name: 'InnovateLabs', svg: '<svg viewBox="0 0 120 40" fill="currentColor"><text x="0" y="28" font-size="24" font-weight="800">InnovateLabs</text></svg>' },
  { name: 'DataFlow', svg: '<svg viewBox="0 0 120 40" fill="currentColor"><text x="0" y="28" font-size="24" font-weight="800">DataFlow</text></svg>' },
  { name: 'ScaleUp', svg: '<svg viewBox="0 0 120 40" fill="currentColor"><text x="0" y="28" font-size="24" font-weight="800">ScaleUp</text></svg>' },
  { name: 'NextGen', svg: '<svg viewBox="0 0 120 40" fill="currentColor"><text x="0" y="28" font-size="24" font-weight="800">NextGen</text></svg>' },
  { name: 'CloudNine', svg: '<svg viewBox="0 0 120 40" fill="currentColor"><text x="0" y="28" font-size="24" font-weight="800">CloudNine</text></svg>' },
];

const TESTIMONIALS = [
  { quote: 'WorkTrack transformed how we manage 500+ employees across 3 countries. Attendance tracking is finally accurate and automated.', name: 'Sarah Chen', role: 'VP of People at TechCorp', initials: 'SC', color: '#6366f1' },
  { quote: 'The recruitment ATS saved our hiring team 20+ hours per week. Candidate pipeline visibility is a game changer.', name: 'Marcus Johnson', role: 'Talent Acquisition Lead at ScaleUp', initials: 'MJ', color: '#22c55e' },
  { quote: 'Best HR platform we\'ve used. The analytics dashboards give leadership exactly what they need without the noise.', name: 'Leila Ahmed', role: 'COO at DataFlow', initials: 'LA', color: '#f59e0b' },
  { quote: 'Implementation took 2 days, not months. Support team is incredibly responsive. Highly recommend.', name: 'David Park', role: 'HR Director at InnovateLabs', initials: 'DP', color: '#a78bfa' },
];

const FAQ_ITEMS = [
  { question: 'How long does it take to get started?', answer: 'Most companies are fully set up within 2-3 business days after approval. Our team guides you through employee onboarding, policy configuration, and integrations.' },
  { question: 'Can I customize the platform for my company\'s needs?', answer: 'Yes! WorkTrack supports custom leave policies, approval workflows, geofence zones, branding, and role-based permissions. Enterprise plans include dedicated configuration support.' },
  { question: 'What integrations are available?', answer: 'We integrate with Slack, Microsoft Teams, Google Workspace, Microsoft 365, and major payroll providers. Our API allows custom integrations for enterprise customers.' },
  { question: 'Is my data secure and compliant?', answer: 'Absolutely. We are SOC2 Type II certified, GDPR compliant, and use AES-256 encryption at rest with TLS 1.3 in transit. Data residency options available for EU and MENA regions.' },
  { question: 'How does pricing work for growing teams?', answer: 'Pricing scales per active employee with volume discounts. You only pay for active users — paused or offboarded employees don\'t count. Annual billing saves 20%.' },
  { question: 'What kind of support do you provide?', answer: 'All plans include email and in-app support with <4hr response time. Pro and Enterprise get dedicated Slack channels, phone support, and quarterly business reviews.' },
];

const SHOWCASE_SLIDES = [
  {
    id: 'attendance',
    title: 'Attendance',
    subtitle: 'Real-time tracking with geofence & QR',
    body: (
      <div className="landing-mock-dashboard">
        <div className="landing-mock-header">
          <div className="landing-mock-avatar">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
          </div>
          <span>Ahmed Mohamed</span>
          <span className="landing-mock-badge">Active</span>
        </div>
        <div className="landing-mock-cards">
          <div className="landing-mock-card">
            <div className="landing-mock-card-label">Today</div>
            <div className="landing-mock-card-value">08:42 AM</div>
          </div>
          <div className="landing-mock-card">
            <div className="landing-mock-card-label">Location</div>
            <div className="landing-mock-card-value">HQ - Cairo</div>
          </div>
          <div className="landing-mock-card">
            <div className="landing-mock-card-label">Status</div>
            <div className="landing-mock-card-value" style={{color:'#22c55e'}}>Present</div>
          </div>
        </div>
        <div className="landing-mock-chart" style={{marginTop:'16px'}}>
          {[45,62,38,71,55,83,67,49,76,58,92,74].map((h,i)=>(
            <div key={i} className="landing-mock-bar" style={{height:`${h}%`}} />
          ))}
        </div>
      </div>
    ),
  },
  {
    id: 'team',
    title: 'Team',
    subtitle: 'Org charts, profiles & documents',
    body: (
      <div className="landing-mock-dashboard">
        <div className="landing-mock-avatar-row">
          <div className="landing-mock-avatar">SM</div>
          <div><div className="landing-mock-name">Sarah Mitchell</div><div className="landing-mock-role">Engineering Lead</div></div>
          <span className="landing-mock-status online">Online</span>
        </div>
        <div className="landing-mock-avatar-row">
          <div className="landing-mock-avatar" style={{background:'linear-gradient(135deg,#22c55e,#16a34a)'}}>DJ</div>
          <div><div className="landing-mock-name">David Johnson</div><div className="landing-mock-role">Senior Dev</div></div>
          <span className="landing-mock-status online">Online</span>
        </div>
        <div className="landing-mock-avatar-row">
          <div className="landing-mock-avatar" style={{background:'linear-gradient(135deg,#f59e0b,#d97706)'}}>LA</div>
          <div><div className="landing-mock-name">Leila Ahmed</div><div className="landing-mock-role">HR Manager</div></div>
          <span className="landing-mock-status away">Away</span>
        </div>
        <div className="landing-mock-avatar-row">
          <div className="landing-mock-avatar" style={{background:'linear-gradient(135deg,#a78bfa,#8b5cf6)'}}>DP</div>
          <div><div className="landing-mock-name">David Park</div><div className="landing-mock-role">Product Lead</div></div>
          <span className="landing-mock-status offline">Offline</span>
        </div>
      </div>
    ),
  },
  {
    id: 'analytics',
    title: 'Analytics',
    subtitle: 'Headcount, attendance trends & compliance',
    body: (
      <div className="landing-mock-dashboard">
        <div className="landing-mock-cards">
          <div className="landing-mock-card">
            <div className="landing-mock-card-label">Total Employees</div>
            <div className="landing-mock-card-value">247</div>
          </div>
          <div className="landing-mock-card">
            <div className="landing-mock-card-label">Attendance Rate</div>
            <div className="landing-mock-card-value" style={{color:'#22c55e'}}>96.4%</div>
          </div>
          <div className="landing-mock-card">
            <div className="landing-mock-card-label">Open Positions</div>
            <div className="landing-mock-card-value">12</div>
          </div>
          <div className="landing-mock-card">
            <div className="landing-mock-card-label">Pending Leaves</div>
            <div className="landing-mock-card-value">8</div>
          </div>
        </div>
        <div className="landing-mock-chart" style={{marginTop:'16px'}}>
          {[32,45,38,52,48,65,58,71,62,78,71,85].map((h,i)=>(
            <div key={i} className="landing-mock-bar" style={{height:`${h}%`}} />
          ))}
        </div>
      </div>
    ),
  },
  {
    id: 'recruitment',
    title: 'Recruitment',
    subtitle: 'Pipeline, interviews & offers',
    body: (
      <div className="landing-mock-dashboard">
        <div className="landing-mock-cards" style={{gridTemplateColumns:'repeat(4,1fr)'}}>
          <div className="landing-mock-card"><div className="landing-mock-card-label">Applied</div><div className="landing-mock-card-value">156</div></div>
          <div className="landing-mock-card"><div className="landing-mock-card-label">Screening</div><div className="landing-mock-card-value">23</div></div>
          <div className="landing-mock-card"><div className="landing-mock-card-label">Interviewing</div><div className="landing-mock-card-value">8</div></div>
          <div className="landing-mock-card"><div className="landing-mock-card-label">Offered</div><div className="landing-mock-card-value">3</div></div>
        </div>
        <div style={{marginTop:'16px',display:'flex',gap:'16px',flexWrap:'wrap'}}>
          <div style={{flex:1,minWidth:'200px'}}>
            <div className="landing-mock-card-label" style={{marginBottom:'12px'}}>Pipeline Stages</div>
            <div style={{display:'flex',flexDirection:'column',gap:'8px'}}>
              {[['Applied',156,'#6366f1'],['Screen',23,'#3b82f6'],['Tech',8,'#a78bfa'],['Offer',3,'#22c55e']].map(([label,val,color])=>(
                <div key={label} style={{display:'flex',alignItems:'center',gap:'8px'}}>
                  <span style={{width:'80px',fontSize:'0.75rem',color:'var(--landing-text-secondary)'}}>{label}</span>
                  <div style={{flex:1,height:'8px',background:'var(--landing-card-border)',borderRadius:'4px',overflow:'hidden'}}>
                    <div style={{width:`${val/156*100}%`,height:'100%',background:color,borderRadius:'4px'}} />
                  </div>
                  <span style={{fontSize:'0.8rem',fontWeight:600,width:'35px'}}>{val}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    ),
  },
];

export default function LandingHome() {
  const [s, setS] = useState({});

  useEffect(() => {
    fetch('/api/platform/public/settings')
      .then((res) => res.json())
      .then((data) => setS(data))
      .catch(() => {});
  }, []);

  const g = (key, fallback) => s[key] || fallback;
  const navTitle = g('landing_nav_title', g('company_name', 'WorkTrack'));

  // Scroll reveal for sections
  const heroRef = useScrollReveal({ margin: '-20% 0px' });
  const statsRef = useScrollReveal();
  const previewRef = useScrollReveal();
  const showcaseRef = useScrollReveal();
  const testimonialsRef = useScrollReveal();
  const faqRef = useScrollReveal();
  const ctaRef = useScrollReveal();

  // Mouse tracking for hero orbs
  const { ref: heroMouseRef, x: mx, y: my } = useMousePosition({ smoothing: 0.06 });

  // Magnetic button refs (not strictly needed, component handles internally)

  return (
    <div className="landing-page">
      <ScrollProgress />
      {/* Hero Section */}
      <section
        ref={heroMouseRef}
        className="landing-hero"
      >
        <div className="landing-hero-bg">
          <div className="landing-hero-gradient" />
          <ParticlesBackground count={60} />
          <div
            className="landing-hero-orb landing-hero-orb-1"
            style={{ transform: `translate3d(${mx * 30}px, ${my * 30}px, 0)` }}
          />
          <div
            className="landing-hero-orb landing-hero-orb-2"
            style={{ transform: `translate3d(${mx * -20}px, ${my * -20}px, 0)` }}
          />
          <div
            className="landing-hero-orb landing-hero-orb-3"
            style={{ transform: `translate3d(${mx * 15}px, ${my * 15}px, 0)` }}
          />
          <div className="landing-hero-grid" />
        </div>
        <div ref={heroRef} className="landing-hero-content">
          <img src={s.platform_logo || '/logo.svg'} alt={navTitle} className="landing-hero-logo" />
          {g('landing_hero_badge', '') && (
            <div className="landing-hero-badge">{g('landing_hero_badge', 'HR Management Platform')}</div>
          )}
          <h1>
            {(() => {
              const title = g('landing_hero_title', 'Simplify Your HR Operations in One Place');
              const marker = 'One Place';
              const idx = title.indexOf(marker);
              if (idx === -1) return title;
              return (
                <>
                  {title.slice(0, idx)}
                  <span className="gradient-text">{marker}</span>
                  {title.slice(idx + marker.length)}
                </>
              );
            })()}
          </h1>
          <p className="lead">
            {g('landing_hero_subtitle', 'Track attendance, manage leaves, streamline recruitment, and empower your team.')}
          </p>
          <div className="landing-hero-actions">
            <MagneticButton strength={8}>
              <Link to="/tenant-register" className="landing-btn-primary">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
                {g('landing_cta_text', 'Start Your Company')}
              </Link>
            </MagneticButton>
            <MagneticButton strength={8}>
              <Link to="/login" className="landing-btn-secondary">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg>
                {g('landing_cta_secondary_text', 'Sign In')}
              </Link>
            </MagneticButton>
          </div>
        </div>
        <div className="landing-hero-scroll-cue" aria-hidden="true">
          <span>Scroll to explore</span>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="6 9 12 15 18 9"/></svg>
        </div>
      </section>

      {/* Logo Strip */}
      <section className="landing-logo-strip-section" style={{background: 'var(--landing-bg)'}}>
        <LogoStrip logos={LOGOS} />
      </section>

      {/* Quick Stats - Animated Counters */}
      <section ref={statsRef} className="landing-stats-section">
        <div className="landing-stats-grid">
          <TiltCard maxTilt={6} scale={1.01}>
            <div className="landing-stat-card">
              <AnimatedCounter to={14} suffix="+" className="landing-stat-number" />
              <div className="landing-stat-label">HR Modules</div>
            </div>
          </TiltCard>
          <TiltCard maxTilt={6} scale={1.01}>
            <div className="landing-stat-card">
              <AnimatedCounter to={99.9} decimals={1} suffix="%" className="landing-stat-number" />
              <div className="landing-stat-label">Uptime</div>
            </div>
          </TiltCard>
          <TiltCard maxTilt={6} scale={1.01}>
            <div className="landing-stat-card">
              <div className="landing-stat-number" style={{fontSize:'1.8rem',fontWeight:900,background:'linear-gradient(135deg,var(--landing-accent),var(--landing-accent-light))',webkitBackgroundClip:'text',webkitTextFillColor:'transparent',backgroundClip:'text'}}>24/7</div>
              <div className="landing-stat-label">Support</div>
            </div>
          </TiltCard>
          <TiltCard maxTilt={6} scale={1.01}>
            <div className="landing-stat-card">
              <div className="landing-stat-number" style={{fontSize:'1.8rem',fontWeight:900,background:'linear-gradient(135deg,var(--landing-accent),var(--landing-accent-light))',webkitBackgroundClip:'text',webkitTextFillColor:'transparent',backgroundClip:'text'}}>SOC2</div>
              <div className="landing-stat-label">Compliant</div>
            </div>
          </TiltCard>
        </div>
      </section>

      {/* Product Showcase */}
      <section ref={showcaseRef} className="landing-preview-section" style={{background: 'var(--landing-bg-secondary)'}}>
        <div className="landing-section-header">
          <h2>See WorkTrack in Action</h2>
          <p>Explore the core modules that power modern HR teams</p>
        </div>
        <ProductShowcase slides={SHOWCASE_SLIDES} interval={4500} />
      </section>

      {/* Features Preview */}
      <section ref={previewRef} className="landing-preview-section">
        <div className="landing-section-header">
          <h2>Powerful HR Tools</h2>
          <p>Everything you need to manage your workforce efficiently</p>
        </div>
        <div className="landing-preview-grid">
          {DEFAULT_FEATURES.map((f, i) => (
            <TiltCard key={i} maxTilt={10} scale={1.02} className="landing-preview-card-wrapper">
              <Link to="/features" className="landing-preview-card" style={{textDecoration:'none',color:'inherit',display:'block',height:'100%'}}>
                <div className="landing-preview-icon" style={{ background: `${f.color}15`, color: f.color }}>
                  <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d={f.icon} />
                  </svg>
                </div>
                <h3>{f.title}</h3>
                <p>{f.desc}</p>
                <span className="landing-preview-link">Learn more &rarr;</span>
              </Link>
            </TiltCard>
          ))}
        </div>
      </section>

      {/* Testimonials */}
      <section ref={testimonialsRef} className="landing-preview-section" style={{background: 'var(--landing-bg-secondary)'}}>
        <div className="landing-section-header">
          <h2>Trusted by Modern HR Teams</h2>
          <p>See what our customers have to say about their experience</p>
        </div>
        <TestimonialCarousel items={TESTIMONIALS} interval={5500} />
      </section>

      {/* FAQ */}
      <section ref={faqRef} className="landing-faq">
        <div className="landing-section-header">
          <h2>Frequently Asked Questions</h2>
          <p>Everything you need to know before getting started</p>
        </div>
        <FAQAccordion items={FAQ_ITEMS} defaultOpen={0} />
      </section>

      {/* Final CTA */}
      <section ref={ctaRef} className="landing-home-cta" style={{position:'relative',overflow:'hidden'}}>
        <div className="landing-hero-bg" style={{opacity:0.3}}>
          <ParticlesBackground count={30} />
        </div>
        <div className="landing-home-cta-content" style={{position:'relative',zIndex:1}}>
          <h2>Ready to Transform Your HR?</h2>
          <p>Join teams that use WorkTrack to streamline their operations.</p>
          <div className="landing-hero-actions">
            <MagneticButton strength={8}>
              <Link to="/tenant-register" className="landing-btn-primary">
                Get Started Free
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg>
              </Link>
            </MagneticButton>
            <MagneticButton strength={8}>
              <Link to="/pricing" className="landing-btn-secondary">View Pricing</Link>
            </MagneticButton>
          </div>
        </div>
      </section>
    </div>
  );
}