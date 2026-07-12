// Copyright (c) 2026 Mohamed Yehia
// SPDX-License-Identifier: AGPL-3.0

import { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

const MODULES = [
  { id: 'attendance', label: 'Attendance', color: '#6366f1', icon: 'M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z' },
  { id: 'team', label: 'Team', color: '#22c55e', icon: 'M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2 M9 7a4 4 0 1 0 0-8 4 4 0 0 0 0 8 M23 21v-2a4 4 0 0 0-3-3.87 M16 3.13a4 4 0 0 1 0 7.75' },
  { id: 'analytics', label: 'Analytics', color: '#f59e0b', icon: 'M18 20V10 M12 20V4 M6 20v-6' },
  { id: 'recruitment', label: 'Recruitment', color: '#a78bfa', icon: 'M2 7 20 7 20 21 2 21z M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16' },
];

export default function ProductShowcase({ slides = [], interval = 4000 }) {
  const [active, setActive] = useState(0);
  const [paused, setPaused] = useState(false);
  const [progress, setProgress] = useState(0);
  const progressRef = useRef(null);
  const startTimeRef = useRef(null);

  const go = useCallback((dir) => {
    setActive((p) => (p + dir + slides.length) % slides.length);
    setProgress(0);
  }, [slides.length]);

  const goTo = useCallback((i) => {
    setActive(i);
    setProgress(0);
  }, []);

  // Auto-advance with progress
  useEffect(() => {
    if (paused || slides.length <= 1) return;
    startTimeRef.current = Date.now();
    const tick = () => {
      const elapsed = Date.now() - startTimeRef.current;
      const pct = Math.min((elapsed / interval) * 100, 100);
      setProgress(pct);
      if (pct >= 100) {
        setActive((p) => (p + 1) % slides.length);
        startTimeRef.current = Date.now();
        setProgress(0);
      }
      progressRef.current = requestAnimationFrame(tick);
    };
    progressRef.current = requestAnimationFrame(tick);
    return () => {
      if (progressRef.current) cancelAnimationFrame(progressRef.current);
    };
  }, [paused, slides.length, interval, active]);

  // Keyboard nav
  const handleKeyDown = useCallback((e) => {
    if (e.key === 'ArrowLeft') go(-1);
    else if (e.key === 'ArrowRight') go(1);
  }, [go]);

  if (!slides.length) return null;
  const current = slides[active];
  const mod = MODULES[active] || MODULES[0];

  return (
    <div
      className="psc-root"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onKeyDown={handleKeyDown}
      tabIndex={0}
      role="region"
      aria-label="Product showcase"
    >
      {/* Side-by-side layout */}
      <div className="psc-layout">
        {/* Left: Module info */}
        <div className="psc-info">
          <AnimatePresence mode="wait">
            <motion.div
              key={active}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              transition={{ duration: 0.35 }}
              className="psc-info-inner"
            >
              <div className="psc-module-badge" style={{ color: mod.color, borderColor: `${mod.color}33`, background: `${mod.color}10` }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d={mod.icon} />
                </svg>
                Module {active + 1} of {slides.length}
              </div>
              <h3 className="psc-title">{current.title}</h3>
              <p className="psc-subtitle">{current.subtitle}</p>
              {current.highlights && (
                <ul className="psc-highlights">
                  {current.highlights.map((h, i) => (
                    <li key={i}>
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={mod.color} strokeWidth="2.5">
                        <polyline points="20 6 9 17 4 12" />
                      </svg>
                      {h}
                    </li>
                  ))}
                </ul>
              )}
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Right: Live preview */}
        <div className="psc-preview">
          <div className="psc-frame">
            {/* Browser chrome */}
            <div className="psc-chrome">
              <div className="psc-chrome-dots">
                <span className="psc-dot psc-dot--r" />
                <span className="psc-dot psc-dot--y" />
                <span className="psc-dot psc-dot--g" />
              </div>
              <div className="psc-chrome-url">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
                app.worktrack.ddns.net/{current.id}
              </div>
            </div>

            {/* App shell with sidebar */}
            <div className="psc-app">
              <div className="psc-sidebar">
                {MODULES.map((m, i) => (
                  <button
                    key={m.id}
                    type="button"
                    className={`psc-sidebar-item ${i === active ? 'active' : ''}`}
                    onClick={() => goTo(i)}
                    style={i === active ? { color: m.color } : undefined}
                    aria-label={m.label}
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                      <path d={m.icon} />
                    </svg>
                    <span>{m.label}</span>
                  </button>
                ))}
                <div className="psc-sidebar-divider" />
                <div className="psc-sidebar-item" style={{ opacity: 0.4 }}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>
                </div>
              </div>

              <div className="psc-content">
                <AnimatePresence mode="wait">
                  <motion.div
                    key={active}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -8 }}
                    transition={{ duration: 0.35, ease: 'easeOut' }}
                    className="psc-slide"
                  >
                    {current.body}
                  </motion.div>
                </AnimatePresence>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom: tabs + progress */}
      <div className="psc-bottom">
        <div className="psc-tabs">
          {slides.map((s, i) => {
            const m = MODULES[i] || MODULES[0];
            return (
              <button
                key={i}
                type="button"
                className={`psc-tab ${i === active ? 'active' : ''}`}
                onClick={() => goTo(i)}
                aria-label={s.title}
                aria-selected={i === active}
                style={i === active ? { '--tab-color': m.color } : undefined}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d={m.icon} />
                </svg>
                <span>{s.title}</span>
                {i === active && (
                  <motion.div
                    className="psc-tab-progress"
                    style={{ background: m.color }}
                    initial={{ scaleX: 0 }}
                    animate={{ scaleX: progress / 100 }}
                    transition={{ duration: 0.05, ease: 'linear' }}
                  />
                )}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
