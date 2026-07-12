// Copyright (c) 2026 Mohamed Yehia
// SPDX-License-Identifier: AGPL-3.0

import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

/**
 * Auto-rotating product preview that cycles through mock dashboard screens.
 *
 * @param {Object} props
 * @param {Array<{ title: string, subtitle: string, body: React.ReactNode }>} props.slides
 * @param {number} props.interval - Auto-rotate ms (default: 4000).
 */
export default function ProductShowcase({ slides = [], interval = 4000 }) {
  const [active, setActive] = useState(0);
  const [paused, setPaused] = useState(false);

  const go = useCallback((dir) => {
    setActive((p) => (p + dir + slides.length) % slides.length);
  }, [slides.length]);

  useEffect(() => {
    if (paused || slides.length <= 1) return;
    const id = setInterval(() => setActive((p) => (p + 1) % slides.length), interval);
    return () => clearInterval(id);
  }, [paused, slides.length, interval]);

  if (!slides.length) return null;
  const current = slides[active];

  return (
    <div
      className="landing-product-showcase"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
    >
      <div className="landing-product-showcase-frame">
        <div className="landing-product-showcase-topbar">
          <span className="landing-product-dot landing-product-dot--red" />
          <span className="landing-product-dot landing-product-dot--yellow" />
          <span className="landing-product-dot landing-product-dot--green" />
          <span className="landing-product-showcase-url">app.worktrack.ddns.net/{current.id || 'dashboard'}</span>
        </div>
        <div className="landing-product-showcase-body">
          <AnimatePresence mode="wait">
            <motion.div
              key={active}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
              transition={{ duration: 0.45, ease: 'easeOut' }}
              className="landing-product-showcase-slide"
            >
              {current.body}
            </motion.div>
          </AnimatePresence>
        </div>
      </div>
      <div className="landing-product-showcase-tabs">
        {slides.map((s, i) => (
          <button
            key={i}
            type="button"
            className={`landing-product-tab ${i === active ? 'active' : ''}`}
            onClick={() => setActive(i)}
            aria-label={`Preview ${s.title}`}
            aria-selected={i === active}
          >
            <span className="landing-product-tab-label">{s.title}</span>
          </button>
        ))}
      </div>
      <div className="landing-product-showcase-dots">
        {slides.map((s, i) => (
          <button
            key={i}
            type="button"
            className={`landing-product-dot-indicator ${i === active ? 'active' : ''}`}
            onClick={() => setActive(i)}
            aria-label={`Go to slide ${i + 1}`}
          />
        ))}
      </div>
    </div>
  );
}
