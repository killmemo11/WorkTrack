// Copyright (c) 2026 Mohamed Yehia
// SPDX-License-Identifier: AGPL-3.0

import { useEffect, useRef, useState } from 'react';
import { useInView } from 'framer-motion';

/**
 * Animated counter that eases from 0 to target when scrolled into view.
 * Skips animation entirely when prefers-reduced-motion is set.
 *
 * @param {Object} props
 * @param {number} props.to - Target value.
 * @param {number} props.duration - Animation duration in ms (default: 2000).
 * @param {number} props.decimals - Decimal places to display (default: 0).
 * @param {string} props.prefix - Optional prefix (e.g. "$").
 * @param {string} props.suffix - Optional suffix (e.g. "+", "%").
 * @param {string} props.className - Class on the span.
 */
export default function AnimatedCounter({
  to = 0,
  duration = 2000,
  decimals = 0,
  prefix = '',
  suffix = '',
  className = '',
}) {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: '-60px 0px' });
  const [display, setDisplay] = useState(0);
  const prefersReduced = typeof window !== 'undefined'
    && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

  useEffect(() => {
    if (!inView) return;
    if (prefersReduced) { setDisplay(to); return; }
    let raf;
    const start = performance.now();
    const easeOutExpo = (t) => (t === 1 ? 1 : 1 - Math.pow(2, -10 * t));
    function tick(now) {
      const p = Math.min((now - start) / duration, 1);
      setDisplay(to * easeOutExpo(p));
      if (p < 1) raf = requestAnimationFrame(tick);
      else setDisplay(to);
    }
    raf = requestAnimationFrame(tick);
    return () => { if (raf) cancelAnimationFrame(raf); };
  }, [inView, to, duration, prefersReduced]);

  const formatted = display.toLocaleString(undefined, {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });

  return (
    <span ref={ref} className={className}>
      {prefix}{formatted}{suffix}
    </span>
  );
}
