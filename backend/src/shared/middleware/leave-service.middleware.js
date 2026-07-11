// Copyright (c) 2026 Mohamed Yehia
// SPDX-License-Identifier: AGPL-3.0

const pool = require('../config/database');

const requireLeaveService = async (req, res, next) => {
  const tenantId = req.employee?.tenant_id || req.hr?.tenant_id || 1;
  const [rows] = await pool.query(
    'SELECT is_enabled FROM service_toggles WHERE service_key = ? AND tenant_id = ?',
    ['leaves', tenantId]
  );
  if (rows.length > 0 && rows[0].is_enabled === 0) {
    return res.status(403).json({ error: 'Leave system is disabled by the administrator' });
  }
  next();
};

module.exports = { requireLeaveService };
