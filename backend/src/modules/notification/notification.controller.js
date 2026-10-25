// Copyright (c) 2026 Mohamed Yehia
// SPDX-License-Identifier: AGPL-3.0

const pool = require('../../shared/config/database');

async function getNotifications(req, res) {
  const employeeId = req.employee.id;
  const page = Math.max(1, parseInt(req.query.page) || 1);
  const limit = Math.min(100, Math.max(1, parseInt(req.query.limit) || 50));
  const offset = (page - 1) * limit;
  const filter = req.query.filter || '';

  let where = 'WHERE employee_id = ? AND tenant_id = ?';
  const params = [employeeId, req.tenantId];

  if (filter === 'unread') {
    where += ' AND is_read = 0';
  } else if (filter === 'read') {
    where += ' AND is_read = 1';
  }

  const [[{ total }]] = await pool.query(
    `SELECT COUNT(*) as total FROM notifications ${where}`, params
  );

  const [rows] = await pool.query(
    `SELECT * FROM notifications ${where} ORDER BY created_at DESC LIMIT ? OFFSET ?`,
    [...params, limit, offset]
  );

  res.json({ notifications: rows, total, page, totalPages: Math.ceil(total / limit) });
}

async function getUnreadCount(req, res) {
  const employeeId = req.employee.id;
  const [rows] = await pool.query(
    'SELECT COUNT(*) as count FROM notifications WHERE employee_id = ? AND tenant_id = ? AND is_read = 0',
    [employeeId, req.tenantId]
  );
  res.json({ count: rows[0].count });
}

async function markAsRead(req, res) {
  const employeeId = req.employee.id;
  const { id } = req.params;
  await pool.query(
    'UPDATE notifications SET is_read = 1 WHERE id = ? AND employee_id = ? AND tenant_id = ?',
    [id, employeeId, req.tenantId]
  );
  res.json({ message: 'Marked as read' });
}

async function markAllAsRead(req, res) {
  const employeeId = req.employee.id;
  await pool.query(
    'UPDATE notifications SET is_read = 1 WHERE employee_id = ? AND tenant_id = ?',
    [employeeId, req.tenantId]
  );
  res.json({ message: 'All marked as read' });
}

// --- Admin notifications ---

// admin_notifications.admin_id references admin_users.id. Employee principals must never be
// treated as recipients, even when their employees.id collides with an admin_users.id.
function getAdminActorId(req) {
  if (req.admin && req.admin.type !== 'employee_admin') return req.admin.id;
  return null;
}

async function getAdminNotifications(req, res) {
  const adminId = getAdminActorId(req);
  const page = Math.max(1, parseInt(req.query.page) || 1);
  const limit = Math.min(100, Math.max(1, parseInt(req.query.limit) || 50));
  const offset = (page - 1) * limit;
  const filter = req.query.filter || '';

  if (!adminId || !req.tenantId) {
    return res.json({ notifications: [], total: 0, page, totalPages: 0 });
  }

  let where = 'WHERE admin_id = ? AND tenant_id = ?';
  const params = [adminId, req.tenantId];

  if (filter === 'unread') {
    where += ' AND is_read = 0';
  } else if (filter === 'read') {
    where += ' AND is_read = 1';
  }

  const [[{ total }]] = await pool.query(
    `SELECT COUNT(*) as total FROM admin_notifications ${where}`, params
  );

  const [rows] = await pool.query(
    `SELECT * FROM admin_notifications ${where} ORDER BY created_at DESC LIMIT ? OFFSET ?`,
    [...params, limit, offset]
  );

  res.json({ notifications: rows, total, page, totalPages: Math.ceil(total / limit) });
}

async function getAdminUnreadCount(req, res) {
  const adminId = getAdminActorId(req);
  if (!adminId || !req.tenantId) return res.json({ count: 0 });
  const [rows] = await pool.query(
    'SELECT COUNT(*) as count FROM admin_notifications WHERE admin_id = ? AND tenant_id = ? AND is_read = 0',
    [adminId, req.tenantId]
  );
  res.json({ count: rows[0].count });
}

async function markAdminAsRead(req, res) {
  const adminId = getAdminActorId(req);
  if (!adminId || !req.tenantId) {
    return res.status(404).json({ error: 'Notification not found' });
  }
  const { id } = req.params;
  const [result] = await pool.query(
    'UPDATE admin_notifications SET is_read = 1 WHERE id = ? AND admin_id = ? AND tenant_id = ?',
    [id, adminId, req.tenantId]
  );
  if (result.affectedRows === 0) return res.status(404).json({ error: 'Notification not found' });
  res.json({ message: 'Marked as read' });
}

async function markAllAdminAsRead(req, res) {
  const adminId = getAdminActorId(req);
  if (!adminId || !req.tenantId) return res.json({ message: 'All marked as read' });
  await pool.query(
    'UPDATE admin_notifications SET is_read = 1 WHERE admin_id = ? AND tenant_id = ?',
    [adminId, req.tenantId]
  );
  res.json({ message: 'All marked as read' });
}

module.exports = {
  getNotifications, getUnreadCount, markAsRead, markAllAsRead,
  getAdminNotifications, getAdminUnreadCount, markAdminAsRead, markAllAdminAsRead,
};
