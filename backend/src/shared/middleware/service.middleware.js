// Copyright (c) 2026 Mohamed Yehia
// SPDX-License-Identifier: AGPL-3.0

const pool = require('../config/database');

// Check whether a service is enabled via the canonical service_toggles table.
// serviceKey uses the callers' convention: 'service_recruitment', 'service_manager', etc.
// The service_toggles table stores keys as 'recruitment', 'manager' (no prefix).
function requireService(serviceKey, errorMsg) {
  return async (req, res, next) => {
    const toggleKey = serviceKey.replace(/^service_/, '');
    const tenantId = req.tenantId || 1;
    const [rows] = await pool.query(
      'SELECT is_enabled FROM service_toggles WHERE service_key = ? AND tenant_id = ?',
      [toggleKey, tenantId]
    );
    // Missing row → service enabled by default (same legacy semantics)
    if (rows.length > 0 && rows[0].is_enabled === 0) {
      return res.status(403).json({ error: errorMsg || `${serviceKey} is disabled by the administrator` });
    }
    next();
  };
}

module.exports = { requireService };
