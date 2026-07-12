// Copyright (c) 2026 Mohamed Yehia
// SPDX-License-Identifier: AGPL-3.0

import { useEffect, useRef, useState } from 'react';

/**
 * Tracks normalized mouse position relative to a target element.
 * Returns values in range [-1, 1] on each axis, centered at the element's midpoint.
 * Uses requestAnimationFrame throttling for performance.
 *
 * @param {Object} opts
 * @param {number} opts.smoothing - Lerp factor 0..1 (default: 0.08).
 * @returns {{ ref, x, y }} ref to attach to target element; x,y smoothed normalized coords.
 */
export default function useMousePosition({ smoothing = 0.08 } = {}) {
  const ref = useRef(null);
  const [pos, setPos] = useState({ x: 0, y: 0 });
  const targetRef = useRef({ x: 0, y: 0 });
  const currentRef = useRef({ x: 0, y: 0 });
  const rafRef = useRef(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const prefersReduced = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    if (prefersReduced) return;

    function handleMove(e) {
      const rect = el.getBoundingClientRect();
      const cx = rect.left + rect.width / 2;
      const cy = rect.top + rect.height / 2;
      targetRef.current = {
        x: (e.clientX - cx) / (rect.width / 2),
        y: (e.clientY - cy) / (rect.height / 2),
      };
    }

    function handleLeave() {
      targetRef.current = { x: 0, y: 0 };
    }

    function tick() {
      const t = targetRef.current;
      const c = currentRef.current;
      const nx = c.x + (t.x - c.x) * smoothing;
      const ny = c.y + (t.y - c.y) * smoothing;
      if (Math.abs(nx - c.x) > 0.001 || Math.abs(ny - c.y) > 0.001) {
        currentRef.current = { x: nx, y: ny };
        setPos({ x: nx, y: ny });
      }
      rafRef.current = requestAnimationFrame(tick);
    }

    el.addEventListener('mousemove', handleMove);
    el.addEventListener('mouseleave', handleLeave);
    rafRef.current = requestAnimationFrame(tick);

    return () => {
      el.removeEventListener('mousemove', handleMove);
      el.removeEventListener('mouseleave', handleLeave);
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [smoothing]);

  return { ref, x: pos.x, y: pos.y };
}
