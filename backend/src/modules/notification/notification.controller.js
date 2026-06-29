// Copyright (c) 2026 Mohamed Yehia
// SPDX-License-Identifier: AGPL-3.0

const pool = require('../../shared/config/database');

async function getNotifications(req, res) {
  const employeeId = req.employee.id;
  const page = Math.max(1, parseInt(req.query.page) || 1);
  const limit = Math.min(100, Math.max(1, parseInt(req.query.limit) || 50));
  const offset = (page - 1) * limit;
  const filter = req.query.filter || '';

  let where = 'WHERE employee_id = ?';
  const params = [employeeId];

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
    'SELECT COUNT(*) as count FROM notifications WHERE employee_id = ? AND is_read = 0',
    [employeeId]
  );
  res.json({ count: rows[0].count });
}

async function markAsRead(req, res) {
  const employeeId = req.employee.id;
  const { id } = req.params;
  await pool.query(
    'UPDATE notifications SET is_read = 1 WHERE id = ? AND employee_id = ?',
    [id, employeeId]
  );
  res.json({ message: 'Marked as read' });
}

async function markAllAsRead(req, res) {
  const employeeId = req.employee.id;
  await pool.query(
    'UPDATE notifications SET is_read = 1 WHERE employee_id = ?',
    [employeeId]
  );
  res.json({ message: 'All marked as read' });
}

// --- Admin notifications ---

async function getAdminNotifications(req, res) {
  const adminId = req.admin?.id || req.hr?.id || null;
  const page = Math.max(1, parseInt(req.query.page) || 1);
  const limit = Math.min(100, Math.max(1, parseInt(req.query.limit) || 50));
  const offset = (page - 1) * limit;
  const filter = req.query.filter || '';

  let where = 'WHERE admin_id = ?';
  const params = [adminId];

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
  const adminId = req.admin?.id || req.hr?.id || null;
  const [rows] = await pool.query(
    'SELECT COUNT(*) as count FROM admin_notifications WHERE admin_id = ? AND is_read = 0',
    [adminId]
  );
  res.json({ count: rows[0].count });
}

async function markAdminAsRead(req, res) {
  const adminId = req.admin?.id || req.hr?.id || null;
  const { id } = req.params;
  await pool.query(
    'UPDATE admin_notifications SET is_read = 1 WHERE id = ? AND admin_id = ?',
    [id, adminId]
  );
  res.json({ message: 'Marked as read' });
}

async function markAllAdminAsRead(req, res) {
  const adminId = req.admin?.id || req.hr?.id || null;
  await pool.query(
    'UPDATE admin_notifications SET is_read = 1 WHERE admin_id = ?',
    [adminId]
  );
  res.json({ message: 'All marked as read' });
}

module.exports = {
  getNotifications, getUnreadCount, markAsRead, markAllAsRead,
  getAdminNotifications, getAdminUnreadCount, markAdminAsRead, markAllAdminAsRead,
};
