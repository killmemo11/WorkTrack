// Copyright (c) 2026 Mohamed Yehia
// SPDX-License-Identifier: AGPL-3.0

const jwt = require('jsonwebtoken');
const pool = require('../config/database');

const requirePlatformAuth = async (req, res, next) => {
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'No platform admin token provided' });
  }

  const token = header.split(' ')[1];

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    if (decoded.type !== 'platform_admin') {
      return res.status(403).json({ error: 'Platform admin token required' });
    }

    const [rows] = await pool.query(
      'SELECT id, username, email, is_active FROM admin_users WHERE id = ? AND is_platform_admin = 1',
      [decoded.id]
    );
    
    if (rows.length === 0) {
      return res.status(401).json({ error: 'Platform admin account not found' });
    }
    
    if (rows[0].is_active === 0) {
      return res.status(403).json({ error: 'Platform admin account is deactivated' });
    }

    req.platformAdmin = decoded;
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Invalid platform admin token' });
  }
};

module.exports = { requirePlatformAuth };