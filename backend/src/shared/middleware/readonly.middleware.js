// Copyright (c) 2026 Mohamed Yehia
// SPDX-License-Identifier: AGPL-3.0

const requireReadWrite = (req, res, next) => {
  if (req.readOnly) {
    return res.status(403).json({ error: 'Account is resigned. Read-only mode.' });
  }
  next();
};

module.exports = { requireReadWrite };