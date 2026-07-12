// Copyright (c) 2026 Mohamed Yehia
// SPDX-License-Identifier: AGPL-3.0

import { useRef } from 'react';
import { useInView } from 'framer-motion';

/**
 * Hook that returns a ref + inView flag for scroll-triggered reveal animations.
 * Triggers once when element enters viewport (with -100px margin for early trigger).
 *
 * @param {Object} opts - Options forwarded to framer-motion's useInView.
 * @param {boolean} opts.once - Whether to trigger only once (default: true).
 * @param {number} opts.margin - Root margin string (default: '-100px 0px').
 * @returns {{ ref: React.RefObject, inView: boolean }}
 */
export default function useScrollReveal(opts = {}) {
  const { once = true, margin = '-100px 0px', amount = 0.15 } = opts;
  const ref = useRef(null);
  const inView = useInView(ref, { once, margin, amount });
  return { ref, inView };
}
