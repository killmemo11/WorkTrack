// Copyright (c) 2026 Mohamed Yehia
// SPDX-License-Identifier: AGPL-3.0

const express = require('express');
const router = express.Router();
const pool = require('../../shared/config/database');
const { logActivity } = require('../../shared/services/activity.service');
const { clearPermissionCache } = require('../../shared/middleware/rbac.middleware');

// ============================================================
// ROLES
// ============================================================

// List all roles for tenant
router.get('/roles', async (req, res) => {
  const tenantId = req.tenantId || 1;
  const [rows] = await pool.query(
    `SELECT r.*, 
      (SELECT COUNT(*) FROM role_permissions rp WHERE rp.role_id = r.id) as permission_count,
      (SELECT COUNT(*) FROM user_roles ur WHERE ur.role_id = r.id) as user_count
     FROM roles r WHERE r.tenant_id = ? ORDER BY r.is_system DESC, r.name ASC`,
    [tenantId]
  );
  res.json({ roles: rows });
});

// Create role
router.post('/roles', async (req, res) => {
  const tenantId = req.tenantId || 1;
  const { name, display_name, description, permission_ids } = req.body;

  if (!name || !display_name) {
    return res.status(400).json({ error: 'Name and display_name are required' });
  }

  const [existing] = await pool.query(
    'SELECT id FROM roles WHERE name = ? AND tenant_id = ?',
    [name, tenantId]
  );
  if (existing.length > 0) {
    return res.status(400).json({ error: 'Role name already exists' });
  }

  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    const [result] = await conn.query(
      'INSERT INTO roles (name, display_name, description, is_system, tenant_id) VALUES (?, ?, ?, 0, ?)',
      [name, display_name, description || null, tenantId]
    );
    const roleId = result.insertId;

    if (permission_ids && Array.isArray(permission_ids)) {
      for (const permId of permission_ids) {
        await conn.query(
          'INSERT IGNORE INTO role_permissions (role_id, permission_id, granted_by) VALUES (?, ?, ?)',
          [roleId, permId, req.admin?.id || null]
        );
      }
    }

    await conn.commit();
    await logActivity(null, req.admin?.id, 'role_created', `Created role: ${display_name}`, null, tenantId);
    res.json({ id: roleId, message: 'Role created' });
  } catch (err) {
    await conn.rollback();
    res.status(500).json({ error: err.message });
  } finally {
    conn.release();
  }
});

// Update role
router.put('/roles/:id', async (req, res) => {
  const tenantId = req.tenantId || 1;
  const { id } = req.params;
  const { display_name, description, permission_ids } = req.body;

  const [existing] = await pool.query('SELECT * FROM roles WHERE id = ? AND tenant_id = ?', [id, tenantId]);
  if (existing.length === 0) {
    return res.status(404).json({ error: 'Role not found' });
  }
  if (existing[0].is_system && req.body.name && req.body.name !== existing[0].name) {
    return res.status(400).json({ error: 'Cannot rename system role' });
  }

  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    if (display_name) await conn.query('UPDATE roles SET display_name = ? WHERE id = ?', [display_name, id]);
    if (description !== undefined) await conn.query('UPDATE roles SET description = ? WHERE id = ?', [description, id]);

    if (permission_ids && Array.isArray(permission_ids)) {
      await conn.query('DELETE FROM role_permissions WHERE role_id = ?', [id]);
      for (const permId of permission_ids) {
        await conn.query(
          'INSERT IGNORE INTO role_permissions (role_id, permission_id, granted_by) VALUES (?, ?, ?)',
          [id, permId, req.admin?.id || null]
        );
      }
    }

    await conn.commit();
    clearPermissionCache(null, tenantId);
    await logActivity(null, req.admin?.id, 'role_updated', `Updated role: ${existing[0].display_name}`, null, tenantId);
    res.json({ message: 'Role updated' });
  } catch (err) {
    await conn.rollback();
    res.status(500).json({ error: err.message });
  } finally {
    conn.release();
  }
});

// Delete role (only non-system)
router.delete('/roles/:id', async (req, res) => {
  const tenantId = req.tenantId || 1;
  const { id } = req.params;

  const [existing] = await pool.query('SELECT * FROM roles WHERE id = ? AND tenant_id = ?', [id, tenantId]);
  if (existing.length === 0) {
    return res.status(404).json({ error: 'Role not found' });
  }
  if (existing[0].is_system) {
    return res.status(400).json({ error: 'Cannot delete system role' });
  }

  const [userCount] = await pool.query('SELECT COUNT(*) as count FROM user_roles WHERE role_id = ?', [id]);
  if (userCount[0].count > 0) {
    return res.status(400).json({ error: 'Cannot delete role with active users. Reassign users first.' });
  }

  await pool.query('DELETE FROM roles WHERE id = ? AND tenant_id = ?', [id, tenantId]);
  await logActivity(null, req.admin?.id, 'role_deleted', `Deleted role: ${existing[0].display_name}`, null, tenantId);
  res.json({ message: 'Role deleted' });
});

// Get role permissions
router.get('/roles/:id/permissions', async (req, res) => {
  const tenantId = req.tenantId || 1;
  const { id } = req.params;
  const [rows] = await pool.query(
    `SELECT p.id, p.module, p.action, p.label, p.description
     FROM role_permissions rp
     JOIN permissions p ON rp.permission_id = p.id
     WHERE rp.role_id = ? AND p.tenant_id = ?
     ORDER BY p.module, p.action`,
    [id, tenantId]
  );
  res.json({ permissions: rows });
});

// ============================================================
// PERMISSIONS
// ============================================================

// List all permissions for tenant
router.get('/permissions', async (req, res) => {
  const tenantId = req.tenantId || 1;
  const [rows] = await pool.query(
    'SELECT id, module, action, label, description FROM permissions WHERE tenant_id = ? ORDER BY module, action',
    [tenantId]
  );
  // Group by module
  const grouped = {};
  for (const p of rows) {
    if (!grouped[p.module]) grouped[p.module] = [];
    grouped[p.module].push(p);
  }
  res.json({ permissions: rows, grouped });
});

// ============================================================
// USER ROLE ASSIGNMENTS
// ============================================================

// List users with their roles
router.get('/users', async (req, res) => {
  const tenantId = req.tenantId || 1;
  const [admins] = await pool.query(
    `SELECT au.id, au.username, au.email, au.is_active, 
      JSON_ARRAYAGG(JSON_OBJECT('role_id', r.id, 'role_name', r.name, 'display_name', r.display_name)) as roles
     FROM admin_users au
     LEFT JOIN user_roles ur ON au.id = ur.user_id AND ur.user_type = 'admin'
     LEFT JOIN roles r ON ur.role_id = r.id AND r.tenant_id = ?
     WHERE au.tenant_id = ? AND au.is_platform_admin = 0
     GROUP BY au.id
     ORDER BY au.username`,
    [tenantId, tenantId]
  );

  const [employees] = await pool.query(
    `SELECT e.id, e.name, e.email, e.username, e.role, e.is_active,
      JSON_ARRAYAGG(JSON_OBJECT('role_id', r.id, 'role_name', r.name, 'display_name', r.display_name)) as roles
     FROM employees e
     LEFT JOIN user_roles ur ON e.id = ur.user_id AND ur.user_type = 'employee'
     LEFT JOIN roles r ON ur.role_id = r.id AND r.tenant_id = ?
     WHERE e.tenant_id = ? AND (e.is_system IS NULL OR e.is_system = 0)
     GROUP BY e.id
     ORDER BY e.name
     LIMIT 100`,
    [tenantId, tenantId]
  );

  res.json({ admins, employees });
});

// Assign role to user (auto-derives user_type from user_id)
router.post('/assign-role', async (req, res) => {
  const tenantId = req.tenantId || 1;
  const { user_id, role_id, user_type: forcedType } = req.body;

  if (!user_id || !role_id) {
    return res.status(400).json({ error: 'user_id and role_id are required' });
  }

  // Auto-derive user_type if not provided or invalid
  let user_type = forcedType;
  if (!user_type || (user_type !== 'admin' && user_type !== 'employee')) {
    const [adminCheck] = await pool.query('SELECT id FROM admin_users WHERE id = ?', [user_id]);
    const [empCheck] = await pool.query('SELECT id FROM employees WHERE id = ?', [user_id]);
    if (adminCheck.length > 0 && empCheck.length > 0) {
      return res.status(400).json({ error: 'Ambiguous user_id: exists in both admin_users and employees. Please provide user_type explicitly.' });
    } else if (adminCheck.length > 0) {
      user_type = 'admin';
    } else if (empCheck.length > 0) {
      user_type = 'employee';
    } else {
      return res.status(400).json({ error: 'User not found' });
    }
  }

  // Verify role belongs to tenant
  const [role] = await pool.query('SELECT id FROM roles WHERE id = ? AND tenant_id = ?', [role_id, tenantId]);
  if (role.length === 0) {
    return res.status(400).json({ error: 'Invalid role for this tenant' });
  }

  await pool.query(
    'INSERT IGNORE INTO user_roles (user_id, role_id, user_type, assigned_by) VALUES (?, ?, ?, ?)',
    [user_id, role_id, user_type, req.admin?.id || null]
  );
  clearPermissionCache(user_id, tenantId);

  await logActivity(null, req.admin?.id, 'role_assigned', `Assigned role ${role_id} to user ${user_id} (${user_type})`, null, tenantId);
  res.json({ message: 'Role assigned', user_type });
});

// Remove role from user (auto-derives user_type from user_id)
router.post('/remove-role', async (req, res) => {
  const tenantId = req.tenantId || 1;
  const { user_id, role_id, user_type: forcedType } = req.body;

  if (!user_id || !role_id) {
    return res.status(400).json({ error: 'user_id and role_id are required' });
  }

  // Auto-derive user_type if not provided or invalid
  let user_type = forcedType;
  if (!user_type || (user_type !== 'admin' && user_type !== 'employee')) {
    const [adminCheck] = await pool.query('SELECT id FROM admin_users WHERE id = ?', [user_id]);
    const [empCheck] = await pool.query('SELECT id FROM employees WHERE id = ?', [user_id]);
    if (adminCheck.length > 0 && empCheck.length > 0) {
      return res.status(400).json({ error: 'Ambiguous user_id: exists in both admin_users and employees. Please provide user_type explicitly.' });
    } else if (adminCheck.length > 0) {
      user_type = 'admin';
    } else if (empCheck.length > 0) {
      user_type = 'employee';
    } else {
      return res.status(400).json({ error: 'User not found' });
    }
  }

  await pool.query(
    'DELETE FROM user_roles WHERE user_id = ? AND role_id = ? AND user_type = ?',
    [user_id, role_id, user_type]
  );
  clearPermissionCache(user_id, tenantId);

  await logActivity(null, req.admin?.id, 'role_removed', `Removed role ${role_id} from user ${user_id} (${user_type})`, null, tenantId);
  res.json({ message: 'Role removed' });
});

// ============================================================
// SERVICE TOGGLES
// ============================================================

// List all service toggles
router.get('/services', async (req, res) => {
  const tenantId = req.tenantId || 1;
  const [rows] = await pool.query(
    'SELECT * FROM service_toggles WHERE tenant_id = ? ORDER BY sort_order',
    [tenantId]
  );
  res.json({ services: rows });
});

// Toggle service
router.put('/services/:id', async (req, res) => {
  const tenantId = req.tenantId || 1;
  const { id } = req.params;
  const { is_enabled } = req.body;

  if (is_enabled === undefined) {
    return res.status(400).json({ error: 'is_enabled is required' });
  }

  const [existing] = await pool.query('SELECT * FROM service_toggles WHERE id = ? AND tenant_id = ?', [id, tenantId]);
  if (existing.length === 0) {
    return res.status(404).json({ error: 'Service not found' });
  }

  await pool.query('UPDATE service_toggles SET is_enabled = ? WHERE id = ?', [is_enabled ? 1 : 0, id]);

  await logActivity(null, req.admin?.id, 'service_toggled',
    `${is_enabled ? 'Enabled' : 'Disabled'} service: ${existing[0].service_name}`, null, tenantId);

  res.json({ message: `${existing[0].service_name} ${is_enabled ? 'enabled' : 'disabled'}` });
});

// Bulk update service visibility
router.put('/services', async (req, res) => {
  const tenantId = req.tenantId || 1;
  const { updates } = req.body;

  if (!Array.isArray(updates)) {
    return res.status(400).json({ error: 'updates must be an array' });
  }

  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    for (const u of updates) {
      if (u.id && u.is_enabled !== undefined) {
        await conn.query(
          'UPDATE service_toggles SET is_enabled = ? WHERE id = ? AND tenant_id = ?',
          [u.is_enabled ? 1 : 0, u.id, tenantId]
        );
      }
    }
    await conn.commit();
    res.json({ message: 'Services updated' });
  } catch (err) {
    await conn.rollback();
    res.status(500).json({ error: err.message });
  } finally {
    conn.release();
  }
});

module.exports = router;