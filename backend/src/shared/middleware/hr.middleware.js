// Copyright (c) 2026 Mohamed Yehia
// SPDX-License-Identifier: AGPL-3.0

const jwt = require('jsonwebtoken');
const pool = require('../config/database');

const requireHR = async (req, res, next) => {
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'No token provided' });
  }

  const token = header.split(' ')[1];

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    if (decoded.type === 'admin') {
      return res.status(403).json({ error: 'Employee token required' });
    }

    const [rows] = await pool.query(
      `SELECT e.id, e.name, e.email, e.department_id, e.role, e.is_active, e.is_verified, e.tenant_id,
              d.name AS department_name
       FROM employees e
       LEFT JOIN departments d ON e.department_id = d.id
       WHERE e.id = ?`,
      [decoded.id]
    );

    if (rows.length === 0) return res.status(401).json({ error: 'Account not found' });
    if (!rows[0].is_active) return res.status(403).json({ error: 'Account is deactivated' });
    if (!rows[0].is_verified) return res.status(403).json({ error: 'Email not verified' });

    const emp = rows[0];
    const dept = (emp.department_name || '').toLowerCase().replace(/\s+/g, ' ');
    const isHR = dept === 'hr' || dept === 'human resources' || emp.role === 'admin';

    if (!isHR) {
      return res.status(403).json({ error: 'HR access required' });
    }

    req.employee = emp;
    req.hr = emp;
    req.tenantId = emp.tenant_id;
    next();
  } catch {
    return res.status(401).json({ error: 'Invalid token' });
  }
};

module.exports = { requireHR };
