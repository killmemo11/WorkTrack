// Copyright (c) 2026 Mohamed Yehia
// SPDX-License-Identifier: AGPL-3.0

import { useRef, useCallback } from 'react';
import { motion, useMotionValue, useSpring, useTransform } from 'framer-motion';

/**
 * 3D tilt card that rotates on X/Y based on mouse position + glare reflection.
 * Respects prefers-reduced-motion.
 *
 * @param {Object} props
 * @param {number} props.maxTilt - Max rotation in degrees (default: 12).
 * @param {number} props.glareOpacity - Glare max opacity (default: 0.18).
 * @param {number} props.scale - Hover scale (default: 1.02).
 * @param {string} props.className - Additional class.
 * @param {React.ReactNode} props.children
 * @param {Object} props.style - Inline styles.
 */
export default function TiltCard({
  maxTilt = 12,
  glareOpacity = 0.18,
  scale = 1.02,
  className = '',
  children,
  style,
  ...rest
}) {
  const ref = useRef(null);
  const px = useMotionValue(0.5);
  const py = useMotionValue(0.5);
  const sx = useSpring(px, { stiffness: 220, damping: 18, mass: 0.4 });
  const sy = useSpring(py, { stiffness: 220, damping: 18, mass: 0.4 });

  const rotateX = useTransform(sy, [0, 1], [maxTilt, -maxTilt]);
  const rotateY = useTransform(sx, [0, 1], [-maxTilt, maxTilt]);
  const glareX = useTransform(sx, [0, 1], [0, 100]);
  const glareY = useTransform(sy, [0, 1], [0, 100]);
  const glareBg = useTransform(
    [glareX, glareY],
    ([gx, gy]) =>
      `radial-gradient(circle at ${gx}% ${gy}%, rgba(255,255,255,${glareOpacity}) 0%, transparent 55%)`
  );
  const opacityOnHover = useTransform(sx, [0, 0.5, 1], [0, 1, 0]);

  const prefersReduced = typeof window !== 'undefined'
    && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

  const handleMove = useCallback((e) => {
    if (prefersReduced) return;
    const el = ref.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    px.set((e.clientX - rect.left) / rect.width);
    py.set((e.clientY - rect.top) / rect.height);
  }, [px, py, prefersReduced]);

  const handleLeave = useCallback(() => {
    px.set(0.5);
    py.set(0.5);
  }, [px, py]);

  return (
    <motion.div
      ref={ref}
      onMouseMove={handleMove}
      onMouseLeave={handleLeave}
      className={`landing-tilt-card ${className}`}
      style={{
        rotateX: prefersReduced ? 0 : rotateX,
        rotateY: prefersReduced ? 0 : rotateY,
        transformStyle: 'preserve-3d',
        transformPerspective: 1000,
        ...style,
      }}
      whileHover={prefersReduced ? undefined : { scale }}
      {...rest}
    >
      <div className="landing-tilt-card-inner" style={{ transformStyle: 'preserve-3d', position: 'relative' }}>
        {children}
      </div>
      {!prefersReduced && (
        <motion.div
          className="landing-tilt-glare"
          style={{ background: glareBg, opacity: opacityOnHover }}
          aria-hidden="true"
        />
      )}
    </motion.div>
  );
}
