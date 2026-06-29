// Copyright (c) 2026 Mohamed Yehia
// SPDX-License-Identifier: AGPL-3.0

const requireCeo = async (req, res, next) => {
  const role = req.employee?.role;
  if (role !== 'ceo' && role !== 'admin') {
    return res.status(403).json({ error: 'Access denied. CEO role required.' });
  }
  next();
};

module.exports = { requireCeo };
