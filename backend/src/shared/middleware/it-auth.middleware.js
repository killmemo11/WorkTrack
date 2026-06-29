const jwt = require('jsonwebtoken');
const pool = require('../config/database');

const requireITAuth = async (req, res, next) => {
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'No admin token provided' });
  }

  const token = header.split(' ')[1];

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    if (decoded.type === 'admin') {
      const [rows] = await pool.query('SELECT id, is_active FROM admin_users WHERE id = ?', [decoded.id]);
      if (rows.length === 0) return res.status(401).json({ error: 'IT admin account not found' });
      if (rows[0].is_active === 0) return res.status(403).json({ error: 'IT admin account is deactivated' });
      req.admin = decoded;
      return next();
    }

    const [rows] = await pool.query(
      `SELECT e.id, e.name, e.email, e.username, e.role, e.is_active
       FROM employees e
       WHERE e.id = ?`,
      [decoded.id]
    );

    if (rows.length === 0) return res.status(401).json({ error: 'Account not found' });
    if (!rows[0].is_active) return res.status(403).json({ error: 'Account is deactivated' });
    if (rows[0].role !== 'admin') return res.status(403).json({ error: 'Admin access required' });

    req.admin = { id: rows[0].id, name: rows[0].name, username: rows[0].username, role: rows[0].role, type: 'employee_admin' };
    next();
  } catch {
    return res.status(401).json({ error: 'Invalid admin token' });
  }
};

module.exports = { requireITAuth };
