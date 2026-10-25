// Copyright (c) 2026 Mohamed Yehia
// SPDX-License-Identifier: AGPL-3.0

const rateLimit = require('express-rate-limit');

// XLSX/CSV generation is CPU- and memory-heavy; keep it well below the
// general API budget so a few clicks cannot tie up the event loop.
const exportLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 30,
  message: { error: 'Too many export requests. Please try again later.' },
  standardHeaders: true,
  legacyHeaders: false,
});

module.exports = exportLimiter;
