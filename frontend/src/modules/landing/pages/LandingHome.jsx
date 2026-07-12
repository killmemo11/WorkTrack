import { useState, useEffect, useRef } from 'react';
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
    subtitle: 'Real-time tracking with GPS geofence, QR codes, and automated alerts.',
    highlights: [
      'GPS & geofence check-in/out',
      'QR code kiosk mode',
      'Missing sign-out reminders',
      'Overtime & late tracking',
    ],
    body: (
      <div className="psc-mock">
        <div className="psc-mock-topbar">
          <span className="psc-mock-title">Attendance Overview</span>
          <span className="psc-mock-date">Jul 12, 2026</span>
        </div>
        <div className="psc-mock-cards" style={{gridTemplateColumns:'repeat(3,1fr)'}}>
          <div className="psc-mock-card">
            <div className="psc-mock-card-label">Checked In</div>
            <div className="psc-mock-card-value" style={{color:'#22c55e'}}>184</div>
            <div className="psc-mock-card-sub">of 247 employees</div>
          </div>
          <div className="psc-mock-card">
            <div className="psc-mock-card-label">Late Arrivals</div>
            <div className="psc-mock-card-value" style={{color:'#f59e0b'}}>12</div>
            <div className="psc-mock-card-sub">avg 14 min late</div>
          </div>
          <div className="psc-mock-card">
            <div className="psc-mock-card-label">Remote</div>
            <div className="psc-mock-card-value" style={{color:'#6366f1'}}>38</div>
            <div className="psc-mock-card-sub">WFH today</div>
          </div>
        </div>
        <div className="psc-mock-chart">
          <div className="psc-mock-chart-header">
            <span className="psc-mock-card-label">Weekly Attendance Rate</span>
            <span className="psc-mock-chart-badge">+2.3%</span>
          </div>
          <div className="psc-mock-bars">
            {[78,85,72,91,88,95,82].map((h,i)=>(
              <div key={i} className="psc-mock-bar-col">
                <div className="psc-mock-bar-track">
                  <div className="psc-mock-bar-fill" style={{height:`${h}%`, animationDelay:`${i*0.08}s`}} />
                </div>
                <span className="psc-mock-bar-label">{['M','T','W','T','F','S','S'][i]}</span>
              </div>
            ))}
          </div>
        </div>
        <div className="psc-mock-live-row">
          <span className="psc-mock-live-dot" />
          <span className="psc-mock-card-label">Live: 3 employees currently checking in</span>
        </div>
      </div>
    ),
  },
  {
    id: 'team',
    title: 'Team',
    subtitle: 'Org charts, profiles, documents, and real-time presence.',
    highlights: [
      'Interactive org chart',
      'Employee document vault',
      'Contract & expiry tracking',
      'Team directory & profiles',
    ],
    body: (
      <div className="psc-mock">
        <div className="psc-mock-topbar">
          <span className="psc-mock-title">Team Directory</span>
          <span className="psc-mock-search">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
            Search employees...
          </span>
        </div>
        {[
          { initials:'SM', name:'Sarah Mitchell', role:'Engineering Lead', dept:'Engineering', status:'online', color:'#6366f1' },
          { initials:'DJ', name:'David Johnson', role:'Senior Developer', dept:'Engineering', status:'online', color:'#22c55e' },
          { initials:'LA', name:'Leila Ahmed', role:'HR Manager', dept:'Human Resources', status:'away', color:'#f59e0b' },
          { initials:'DP', name:'David Park', role:'Product Lead', dept:'Product', status:'offline', color:'#a78bfa' },
          { initials:'NK', name:'Nadia Khaled', role:'Recruiter', dept:'Human Resources', status:'online', color:'#f472b6' },
        ].map((p,i) => (
          <div key={i} className="psc-mock-member">
            <div className="psc-mock-avatar" style={{background:`linear-gradient(135deg,${p.color},${p.color}cc)`}}>{p.initials}</div>
            <div className="psc-mock-member-info">
              <span className="psc-mock-member-name">{p.name}</span>
              <span className="psc-mock-member-role">{p.role}</span>
            </div>
            <span className="psc-mock-member-dept">{p.dept}</span>
            <span className={`psc-mock-presence ${p.status}`}>
              <span className="psc-mock-presence-dot" />
              {p.status}
            </span>
          </div>
        ))}
      </div>
    ),
  },
  {
    id: 'analytics',
    title: 'Analytics',
    subtitle: 'Headcount, attendance trends, compliance, and custom reports.',
    highlights: [
      'Real-time dashboards',
      'Attendance trend analysis',
      'Export to Excel & PDF',
      'Compliance & audit reports',
    ],
    body: (
      <div className="psc-mock">
        <div className="psc-mock-topbar">
          <span className="psc-mock-title">Analytics Dashboard</span>
          <span className="psc-mock-date">Last 30 days</span>
        </div>
        <div className="psc-mock-cards" style={{gridTemplateColumns:'repeat(4,1fr)'}}>
          <div className="psc-mock-card">
            <div className="psc-mock-card-label">Headcount</div>
            <div className="psc-mock-card-value">247</div>
          </div>
          <div className="psc-mock-card">
            <div className="psc-mock-card-label">Attendance</div>
            <div className="psc-mock-card-value" style={{color:'#22c55e'}}>96.4%</div>
          </div>
          <div className="psc-mock-card">
            <div className="psc-mock-card-label">Open Roles</div>
            <div className="psc-mock-card-value" style={{color:'#6366f1'}}>12</div>
          </div>
          <div className="psc-mock-card">
            <div className="psc-mock-card-label">Pending Leaves</div>
            <div className="psc-mock-card-value" style={{color:'#f59e0b'}}>8</div>
          </div>
        </div>
        <div className="psc-mock-chart">
          <div className="psc-mock-chart-header">
            <span className="psc-mock-card-label">Monthly Attendance Trend</span>
            <span className="psc-mock-chart-badge" style={{color:'#22c55e'}}>+4.2%</span>
          </div>
          <div className="psc-mock-bars">
            {[62,71,65,78,72,85,80,88,82,91,86,95].map((h,i)=>(
              <div key={i} className="psc-mock-bar-col">
                <div className="psc-mock-bar-track">
                  <div className="psc-mock-bar-fill" style={{height:`${h}%`, animationDelay:`${i*0.06}s`}} />
                </div>
              </div>
            ))}
          </div>
          <div className="psc-mock-bars-labels">
            {['J','F','M','A','M','J','J','A','S','O','N','D'].map((m,i)=>(
              <span key={i}>{m}</span>
            ))}
          </div>
        </div>
      </div>
    ),
  },
  {
    id: 'recruitment',
    title: 'Recruitment',
    subtitle: 'Full ATS with candidate pipeline, interviews, and offer management.',
    highlights: [
      'Drag & drop pipeline',
      'Automated screening',
      'Interview scheduling',
      'Offer letter generation',
    ],
    body: (
      <div className="psc-mock">
        <div className="psc-mock-topbar">
          <span className="psc-mock-title">Recruitment Pipeline</span>
          <span className="psc-mock-date">12 active jobs</span>
        </div>
        <div className="psc-mock-pipeline">
          {[
            { stage:'Applied', count:156, color:'#6366f1', candidates:['AK','MR','SL','TN'] },
            { stage:'Screen', count:43, color:'#3b82f6', candidates:['JB','LP'] },
            { stage:'Interview', count:18, color:'#a78bfa', candidates:['RH'] },
            { stage:'Offer', count:5, color:'#22c55e', candidates:['KW'] },
          ].map((col,i)=>(
            <div key={i} className="psc-pipeline-col">
              <div className="psc-pipeline-header">
                <span className="psc-pipeline-stage">{col.stage}</span>
                <span className="psc-pipeline-count" style={{color:col.color}}>{col.count}</span>
              </div>
              <div className="psc-pipeline-bar">
                <div className="psc-pipeline-bar-fill" style={{width:`${(col.count/156)*100}%`, background:col.color, animationDelay:`${i*0.15}s`}} />
              </div>
              <div className="psc-pipeline-cards">
                {col.candidates.map((c,j)=>(
                  <div key={j} className="psc-pipeline-card">
                    <div className="psc-mock-avatar" style={{width:24,height:24,fontSize:'0.55rem',background:col.color}}>{c}</div>
                    <span>Candidate</span>
                  </div>
                ))}
              </div>
            </div>
          ))}
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