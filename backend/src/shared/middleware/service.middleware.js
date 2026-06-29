// Copyright (c) 2026 Mohamed Yehia
// SPDX-License-Identifier: AGPL-3.0

const pool = require('../config/database');

function requireService(serviceKey, errorMsg) {
  return async (req, res, next) => {
    const [rows] = await pool.query('SELECT `value` FROM settings WHERE `key` = ?', [serviceKey]);
    if (rows.length > 0 && rows[0].value === '0') {
      return res.status(403).json({ error: errorMsg || `${serviceKey} is disabled by the administrator` });
    }
    next();
  };
}

module.exports = { requireService };
