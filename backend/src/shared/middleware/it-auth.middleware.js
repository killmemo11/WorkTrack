const jwt = require('jsonwebtoken');
const pool = require('../config/database');

// Strict IT-admin gate — accepts admin_users tokens ("type":"admin") OR
// employees tokens where employees.role === 'admin'. This is the LEGACY
// "IT Admin employee" semantics retained by all callers that rely on
// role='admin' employees being authorized here.
const requireITAuth = async (req, res, next) => {
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'No admin token provided' });
  }

  const token = header.split(' ')[1];

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    if (decoded.type === 'admin') {
      const [rows] = await pool.query('SELECT id, tenant_id, is_active, must_change_password FROM admin_users WHERE id = ?', [decoded.id]);
      if (rows.length === 0) return res.status(401).json({ error: 'IT admin account not found' });
      if (rows[0].is_active === 0) return res.status(403).json({ error: 'IT admin account is deactivated' });
      req.admin = { ...decoded, tenant_id: rows[0].tenant_id, must_change_password: rows[0].must_change_password === 1 };
      return next();
    }

    const [rows] = await pool.query(
      `SELECT e.id, e.name, e.email, e.username, e.role, e.is_active, e.tenant_id
       FROM employees e
       WHERE e.id = ?`,
      [decoded.id]
    );

    if (rows.length === 0) return res.status(401).json({ error: 'Account not found' });
    if (!rows[0].is_active) return res.status(403).json({ error: 'Account is deactivated' });
    if (rows[0].role !== 'admin') return res.status(403).json({ error: 'Admin access required' });

    req.admin = { id: rows[0].id, name: rows[0].name, username: rows[0].username, role: rows[0].role, type: 'employee_admin', tenant_id: rows[0].tenant_id, must_change_password: false };
    next();
  } catch {
    return res.status(401).json({ error: 'Invalid admin token' });
  }
};

// Looser variant: same authN + is_active + tenant resolution as requireITAuth,
// but DROPS the hardcoded `role !== 'admin'` check on the employee branch.
// Fine-grained authorization moves to requirePermission() per route.
// Used by /api/it and /api/audit (Phase 3 + 4). Legacy callers keep strict requireITAuth.
const requireAnyActiveToken = async (req, res, next) => {
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'No admin token provided' });
  }

  const token = header.split(' ')[1];

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    if (decoded.type === 'admin') {
      const [rows] = await pool.query('SELECT id, tenant_id, is_active, must_change_password FROM admin_users WHERE id = ?', [decoded.id]);
      if (rows.length === 0) return res.status(401).json({ error: 'Account not found' });
      if (rows[0].is_active === 0) return res.status(403).json({ error: 'Account is deactivated' });
      req.admin = { ...decoded, tenant_id: rows[0].tenant_id, must_change_password: rows[0].must_change_password === 1 };
      return next();
    }

    const [rows] = await pool.query(
      `SELECT e.id, e.name, e.email, e.username, e.role, e.is_active, e.tenant_id
       FROM employees e
       WHERE e.id = ?`,
      [decoded.id]
    );

    if (rows.length === 0) return res.status(401).json({ error: 'Account not found' });
    if (!rows[0].is_active) return res.status(403).json({ error: 'Account is deactivated' });
    // NOTE: no role gate. Authorization deferred to per-route requirePermission().

    req.admin = { id: rows[0].id, name: rows[0].name, username: rows[0].username, role: rows[0].role, type: 'employee_admin', tenant_id: rows[0].tenant_id, must_change_password: false };
    next();
  } catch {
    return res.status(401).json({ error: 'Invalid admin token' });
  }
};

module.exports = { requireITAuth, requireAnyActiveToken };
