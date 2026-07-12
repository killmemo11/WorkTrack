// Copyright (c) 2026 Mohamed Yehia
// SPDX-License-Identifier: AGPL-3.0

import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

/**
 * Testimonial carousel that auto-rotates and supports prev/next + dots.
 *
 * @param {Object} props
 * @param {Array<{ quote: string, name: string, role: string, initials: string, color: string }>} props.items
 * @param {number} props.interval - Auto-rotate ms (default: 5000).
 */
export default function TestimonialCarousel({ items = [], interval = 5000 }) {
  const [active, setActive] = useState(0);
  const [direction, setDirection] = useState(1);
  const [paused, setPaused] = useState(false);

  const go = useCallback((dir) => {
    setDirection(dir);
    setActive((p) => (p + dir + items.length) % items.length);
  }, [items.length]);

  useEffect(() => {
    if (paused || items.length <= 1) return;
    const id = setInterval(() => go(1), interval);
    return () => clearInterval(id);
  }, [paused, items.length, interval, go]);

  if (!items.length) return null;
  const t = items[active];

  return (
    <div
      className="landing-testimonials"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
    >
      <div className="landing-testimonials-viewport">
        <AnimatePresence mode="wait" custom={direction}>
          <motion.div
            key={active}
            custom={direction}
            initial={{ opacity: 0, x: direction * 40 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: direction * -40 }}
            transition={{ duration: 0.4, ease: 'easeOut' }}
            className="landing-testimonial-card"
          >
            <div className="landing-testimonial-stars">
              {[0, 1, 2, 3, 4].map((i) => (
                <svg key={i} width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01z" />
                </svg>
              ))}
            </div>
            <p className="landing-testimonial-quote">&ldquo;{t.quote}&rdquo;</p>
            <div className="landing-testimonial-author">
              <div className="landing-testimonial-avatar" style={{ background: t.color || '#6366f1' }}>
                {t.initials}
              </div>
              <div>
                <div className="landing-testimonial-name">{t.name}</div>
                <div className="landing-testimonial-role">{t.role}</div>
              </div>
            </div>
          </motion.div>
        </AnimatePresence>
      </div>
      {items.length > 1 && (
        <>
          <div className="landing-testimonials-controls">
            <button type="button" onClick={() => go(-1)} aria-label="Previous testimonial" className="landing-testimonial-arrow">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="15 18 9 12 15 6"/></svg>
            </button>
            <button type="button" onClick={() => go(1)} aria-label="Next testimonial" className="landing-testimonial-arrow">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="9 18 15 12 9 6"/></svg>
            </button>
          </div>
          <div className="landing-testimonials-dots">
            {items.map((_, i) => (
              <button
                key={i}
                type="button"
                className={`landing-testimonial-dot ${i === active ? 'active' : ''}`}
                onClick={() => { setDirection(i > active ? 1 : -1); setActive(i); }}
                aria-label={`Go to testimonial ${i + 1}`}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
}
