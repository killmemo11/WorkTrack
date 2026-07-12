// Copyright (c) 2026 Mohamed Yehia
// SPDX-License-Identifier: AGPL-3.0

import { useRef, useEffect } from 'react';

/**
 * Lightweight canvas particle network background.
 * Particles drift slowly and connect with lines when close.
 * Interacts with mouse (subtle attraction).
 * Respects prefers-reduced-motion (renders static particles or nothing).
 *
 * @param {Object} props
 * @param {number} props.count - Particle count (default scales with viewport).
 * @param {string} props.className - Additional class on canvas.
 */
export default function ParticlesBackground({ count, className = '' }) {
  const canvasRef = useRef(null);
  const rafRef = useRef(null);
  const particlesRef = useRef([]);
  const mouseRef = useRef({ x: -9999, y: -9999, active: false });

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const parent = canvas.parentElement;

    const prefersReduced = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);

    function getCss(name, fallback) {
      const v = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
      return v || fallback;
    }
    function parseRGB(v) {
      const m = v.match(/(\d+)\s*,\s*(\d+)\s*,\s*(\d+)/);
      if (m) return [parseInt(m[1], 10), parseInt(m[2], 10), parseInt(m[3], 10)];
      return [129, 140, 248];
    }
    function readApolloColors() {
      particleRGB.current = parseRGB(getCss('--landing-particle-color', '129, 140, 248'));
      linkRGB.current = parseRGB(getCss('--landing-particle-link', '99, 102, 241'));
      opacity.current = parseFloat(getCss('--landing-particle-opacity', '0.5')) || 0.5;
    }

    const particleRGB = { current: [129, 140, 248] };
    const linkRGB = { current: [99, 102, 241] };
    const opacity = { current: 0.5 };
    readApolloColors();

    let width = 0, height = 0;

    function computeCount() {
      if (count) return count;
      const area = width * height;
      const isMobile = width < 640;
      const base = isMobile ? 16000 : 9000;
      return Math.max(20, Math.min(isMobile ? 40 : 90, Math.floor(area / base)));
    }

    function resize() {
      const rect = parent.getBoundingClientRect();
      width = rect.width;
      height = rect.height;
      canvas.width = width * dpr;
      canvas.height = height * dpr;
      canvas.style.width = width + 'px';
      canvas.style.height = height + 'px';
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      seedParticles();
    }

    function seedParticles() {
      const n = computeCount();
      const arr = [];
      for (let i = 0; i < n; i++) {
        arr.push({
          x: Math.random() * width,
          y: Math.random() * height,
          vx: (Math.random() - 0.5) * 0.35,
          vy: (Math.random() - 0.5) * 0.35,
          r: Math.random() * 1.8 + 0.6,
        });
      }
      particlesRef.current = arr;
    }

    function draw() {
      ctx.clearRect(0, 0, width, height);
      const ps = particlesRef.current;
      const [pr, pg, pb] = particleRGB.current;
      const [lr, lg, lb] = linkRGB.current;
      const op = opacity.current;
      const linkDist = 130;
      const mouseRadius = 160;

      for (let i = 0; i < ps.length; i++) {
        const p = ps[i];
        if (!prefersReduced) {
          p.x += p.vx;
          p.y += p.vy;
          if (p.x < 0 || p.x > width) p.vx *= -1;
          if (p.y < 0 || p.y > height) p.vy *= -1;
        }

        if (mouseRef.current.active) {
          const dx = p.x - mouseRef.current.x;
          const dy = p.y - mouseRef.current.y;
          const d = Math.sqrt(dx * dx + dy * dy);
          if (d < mouseRadius && d > 0.001) {
            const force = (mouseRadius - d) / mouseRadius * 0.6;
            p.x += (dx / d) * force;
            p.y += (dy / d) * force;
          }
        }

        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(${pr}, ${pg}, ${pb}, ${op})`;
        ctx.fill();
      }

      for (let i = 0; i < ps.length; i++) {
        for (let j = i + 1; j < ps.length; j++) {
          const a = ps[i], b = ps[j];
          const dx = a.x - b.x, dy = a.y - b.y;
          const d = Math.sqrt(dx * dx + dy * dy);
          if (d < linkDist) {
            const alpha = (1 - d / linkDist) * 0.18 * (op / 0.5);
            ctx.beginPath();
            ctx.moveTo(a.x, a.y);
            ctx.lineTo(b.x, b.y);
            ctx.strokeStyle = `rgba(${lr}, ${lg}, ${lb}, ${alpha})`;
            ctx.lineWidth = 0.7;
            ctx.stroke();
          }
        }
      }

      if (!prefersReduced) rafRef.current = requestAnimationFrame(draw);
    }

    function onMouseMove(e) {
      const rect = canvas.getBoundingClientRect();
      mouseRef.current = {
        x: e.clientX - rect.left,
        y: e.clientY - rect.top,
        active: true,
      };
    }
    function onMouseLeave() {
      mouseRef.current.active = false;
    }

    function onThemeChange() {
      readApolloColors();
      if (prefersReduced) draw();
    }

    const ro = new ResizeObserver(resize);
    ro.observe(parent);

    window.addEventListener('mousemove', onMouseMove);
    canvas.addEventListener('mouseleave', onMouseLeave);
    const observer = new MutationObserver(onThemeChange);
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });

    resize();
    draw();

    return () => {
      ro.disconnect();
      window.removeEventListener('mousemove', onMouseMove);
      canvas.removeEventListener('mouseleave', onMouseLeave);
      observer.disconnect();
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [count]);

  return (
    <canvas
      ref={canvasRef}
      className={`landing-particles-canvas ${className}`}
      aria-hidden="true"
    />
  );
}
