// Copyright (c) 2026 Mohamed Yehia
// SPDX-License-Identifier: AGPL-3.0

import { useState, useEffect } from 'react';
import { Link, NavLink, useLocation, Outlet } from 'react-router-dom';
import './../styles/landing.css';

function parseJSON(val, fallback) {
  if (!val) return fallback;
  if (typeof val === 'object') return val;
  try { return JSON.parse(val); } catch { return fallback; }
}

export default function LandingLayout() {
  const [s, setS] = useState({});
  const location = useLocation();

  useEffect(() => {
    fetch('/api/platform/public/settings')
      .then((res) => res.json())
      .then((data) => setS(data))
      .catch(() => {});
  }, []);

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [location.pathname]);

  const g = (key, fallback) => s[key] || fallback;
  const navTitle = g('landing_nav_title', g('company_name', 'WorkTrack'));
  const footerLinks = (parseJSON(g('landing_footer_links', null), { links: [] }).links) || [];
  const logo = s.platform_logo || '/logo.svg';

  return (
    <div className="landing-page">
      <nav className="landing-nav">
        <Link to="/" className="landing-nav-brand">
          <img src={logo} alt={navTitle} className="landing-nav-logo" />
          <span className="landing-nav-name">{navTitle}</span>
        </Link>
        <div className="landing-nav-links">
          <NavLink to="/features" className={({isActive}) => `landing-nav-link ${isActive ? 'active' : ''}`}>Features</NavLink>
          <NavLink to="/how-it-works" className={({isActive}) => `landing-nav-link ${isActive ? 'active' : ''}`}>How It Works</NavLink>
          <NavLink to="/pricing" className={({isActive}) => `landing-nav-link ${isActive ? 'active' : ''}`}>Pricing</NavLink>
          <NavLink to="/contact" className={({isActive}) => `landing-nav-link ${isActive ? 'active' : ''}`}>Contact</NavLink>
          <Link to="/login" className="landing-nav-link">Sign In</Link>
          <Link to="/tenant-register" className="landing-nav-cta">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
            {g('landing_cta_text', 'Get Started')}
          </Link>
        </div>
      </nav>

      <Outlet />

      <footer className="landing-footer">
        <div className="landing-footer-content">
          <div className="landing-footer-brand">
            <img src={logo} alt={navTitle} className="landing-footer-logo" />
            <span>{navTitle}</span>
          </div>
          <div className="landing-footer-links">
            {footerLinks.map((l, i) => (
              <Link key={i} to={l.url}>{l.label}</Link>
            ))}
          </div>
        </div>
        <div className="landing-footer-bottom">
          {g('landing_footer_text', 'Empowering teams with modern HR tools.')} &copy; {new Date().getFullYear()} {navTitle}. All rights reserved.
        </div>
      </footer>
    </div>
  );
}
