// Copyright (c) 2026 Mohamed Yehia
// SPDX-License-Identifier: AGPL-3.0

import { useRef, useCallback } from 'react';
import { motion, useMotionValue, useSpring } from 'framer-motion';

/**
 * Button/Link wrapper that subtly follows the cursor (magnetic effect).
 * Returns a render prop (function-as-child) so caller controls inner content.
 *
 * @param {Object} props
 * @param {number} props.strength - Max px displacement (default: 8).
 * @param {string} props.className - Class for the wrapper.
 * @param {React.ReactNode} props.children
 * @param {Object} props.style - Inline styles.
 */
export default function MagneticButton({
  strength = 8,
  className = '',
  children,
  style,
  ...rest
}) {
  const ref = useRef(null);
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const sx = useSpring(x, { stiffness: 260, damping: 16, mass: 0.3 });
  const sy = useSpring(y, { stiffness: 260, damping: 16, mass: 0.3 });

  const prefersReduced = typeof window !== 'undefined'
    && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

  const handleMove = useCallback((e) => {
    if (prefersReduced) return;
    const el = ref.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const relX = e.clientX - (rect.left + rect.width / 2);
    const relY = e.clientY - (rect.top + rect.height / 2);
    const factor = (strength * 2) / Math.max(rect.width, rect.height, 1);
    x.set(relX * factor);
    y.set(relY * factor);
  }, [x, y, strength, prefersReduced]);

  const handleLeave = useCallback(() => {
    x.set(0);
    y.set(0);
  }, [x, y]);

  return (
    <motion.div
      ref={ref}
      onMouseMove={handleMove}
      onMouseLeave={handleLeave}
      className={`landing-magnetic-button ${className}`}
      style={{ x: prefersReduced ? 0 : sx, y: prefersReduced ? 0 : sy, display: 'inline-block', ...style }}
      {...rest}
    >
      {children}
    </motion.div>
  );
}
