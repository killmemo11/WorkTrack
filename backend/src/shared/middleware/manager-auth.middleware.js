// Copyright (c) 2026 Mohamed Yehia
// SPDX-License-Identifier: AGPL-3.0

const pool = require('../config/database');

const requireManager = async (req, res, next) => {
  const role = req.employee?.role;
  const email = req.employee?.email;
  if (role === 'ceo') {
    const [ceoSetting] = await pool.query("SELECT `value` FROM settings WHERE `key` = 'ceo_email'");
    const ceoEmail = ceoSetting.length > 0 ? ceoSetting[0].value.trim().toLowerCase() : '';
    if (ceoEmail.length > 0 && email && email.toLowerCase() === ceoEmail) {
      return res.status(403).json({ error: 'Access denied. CEO is read-only.' });
    }
  }
  if (role !== 'manager' && role !== 'admin' && role !== 'ceo') {
    return res.status(403).json({ error: 'Access denied. Manager role required.' });
  }
  next();
};

module.exports = { requireManager };
