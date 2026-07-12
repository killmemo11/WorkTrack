// Copyright (c) 2026 Mohamed Yehia
// SPDX-License-Identifier: AGPL-3.0

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

/**
 * Accessible FAQ accordion with smooth expand/collapse.
 *
 * @param {Object} props
 * @param {Array<{ question: string, answer: string }>} props.items
 * @param {number} props.defaultOpen - Index of item open by default.
 */
export default function FAQAccordion({ items = [], defaultOpen = 0 }) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <div className="landing-faq-accordion">
      {items.map((item, i) => {
        const isOpen = open === i;
        return (
          <div key={i} className={`landing-faq-accordion-item ${isOpen ? 'open' : ''}`}>
            <button
              type="button"
              className="landing-faq-accordion-trigger"
              onClick={() => setOpen(isOpen ? -1 : i)}
              aria-expanded={isOpen}
              aria-controls={`faq-panel-${i}`}
              id={`faq-trigger-${i}`}
            >
              <span>{item.question}</span>
              <motion.span
                className="landing-faq-chevron"
                animate={{ rotate: isOpen ? 180 : 0 }}
                transition={{ duration: 0.25, ease: 'easeOut' }}
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="6 9 12 15 18 9"/></svg>
              </motion.span>
            </button>
            <AnimatePresence initial={false}>
              {isOpen && (
                <motion.div
                  id={`faq-panel-${i}`}
                  role="region"
                  aria-labelledby={`faq-trigger-${i}`}
                  className="landing-faq-accordion-panel"
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.3, ease: 'easeInOut' }}
                >
                  <div className="landing-faq-accordion-content">{item.answer}</div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        );
      })}
    </div>
  );
}
