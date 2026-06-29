// Copyright (c) 2026 Mohamed Yehia
// SPDX-License-Identifier: AGPL-3.0

const pool = require('../config/database');

const requireLeaveService = async (req, res, next) => {
  const [rows] = await pool.query("SELECT `value` FROM settings WHERE `key` = 'service_leaves'");
  if (rows.length > 0 && rows[0].value === '0') {
    return res.status(403).json({ error: 'Leave system is disabled by the administrator' });
  }
  next();
};

module.exports = { requireLeaveService };
