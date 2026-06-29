// Copyright (c) 2026 Mohamed Yehia
// SPDX-License-Identifier: AGPL-3.0

const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const pool = require('../../shared/config/database');
const { logActivity } = require('../../shared/services/activity.service');

async function login(req, res) {
  const { username, password } = req.body;
  if (!username || !password) {
    return res.status(400).json({ error: 'Username and password are required' });
  }

  const [adminRows] = await pool.query('SELECT * FROM admin_users WHERE username = ?', [username]);
  if (adminRows.length > 0) {
    const valid = await bcrypt.compare(password, adminRows[0].password_hash);
    if (valid) {
      const token = jwt.sign(
        { id: adminRows[0].id, username: adminRows[0].username, type: 'admin' },
        process.env.JWT_SECRET,
        { expiresIn: '24h' }
      );
      await logActivity(null, adminRows[0].id, 'admin_login', `Admin logged in: ${adminRows[0].username}`);
      return res.json({ token, admin: { id: adminRows[0].id, username: adminRows[0].username } });
    }
  }

  const [empRows] = await pool.query(
    `SELECT e.* FROM employees e WHERE e.username = ? AND e.role = 'admin'`,
    [username]
  );
  if (empRows.length === 0) {
    return res.status(401).json({ error: 'Invalid credentials' });
  }

  const valid = await bcrypt.compare(password, empRows[0].password_hash);
  if (!valid) {
    return res.status(401).json({ error: 'Invalid credentials' });
  }

  const token = jwt.sign(
    { id: empRows[0].id, email: empRows[0].email, role: empRows[0].role },
    process.env.JWT_SECRET,
    { expiresIn: '12h' }
  );

  await logActivity(null, empRows[0].id, 'admin_login', `Admin logged in: ${empRows[0].name}`);

  res.json({ token, admin: { id: empRows[0].id, username: empRows[0].username, name: empRows[0].name } });
}

async function me(req, res) {
  if (req.admin.type === 'admin') {
    return res.json({ id: req.admin.id, username: req.admin.username });
  }
  res.json({ id: req.admin.id, username: req.admin.username, name: req.admin.name });
}

module.exports = { login, me };
