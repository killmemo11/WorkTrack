// Copyright (c) 2026 Mohamed Yehia
// SPDX-License-Identifier: AGPL-3.0

const pool = require('../../shared/config/database');
const { logActivity } = require('../../shared/services/activity.service');

async function getPendingDocuments(req, res) {
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 50;
  const offset = (page - 1) * limit;

  const [rows] = await pool.query(
    `SELECT ed.*, e.name AS employee_name, e.employee_id, au.username AS uploaded_by_name
     FROM employee_documents ed
     JOIN employees e ON ed.employee_id = e.id
     LEFT JOIN admin_users au ON ed.uploaded_by = au.id
     WHERE ed.status = 'pending'
     ORDER BY ed.created_at ASC
     LIMIT ? OFFSET ?`, [limit, offset]
  );

  const [countRows] = await pool.query(
    "SELECT COUNT(*) as total FROM employee_documents WHERE status = 'pending'"
  );

  res.json({
    documents: rows,
    total: countRows[0].total,
    page,
    totalPages: Math.ceil(countRows[0].total / limit),
  });
}

async function getAllDocuments(req, res) {
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 50;
  const offset = (page - 1) * limit;
  const { status, employee_id } = req.query;

  let where = ['1=1'];
  let params = [];
  if (status) { where.push('ed.status = ?'); params.push(status); }
  if (employee_id) { where.push('ed.employee_id = ?'); params.push(employee_id); }

  const [rows] = await pool.query(
    `SELECT ed.*, e.name AS employee_name, e.employee_id, au.username AS uploaded_by_name, rv.username AS reviewed_by_name
     FROM employee_documents ed
     JOIN employees e ON ed.employee_id = e.id
     LEFT JOIN admin_users au ON ed.uploaded_by = au.id
     LEFT JOIN admin_users rv ON ed.reviewed_by = rv.id
     WHERE ${where.join(' AND ')}
     ORDER BY ed.created_at DESC
     LIMIT ? OFFSET ?`, [...params, limit, offset]
  );

  const [countRows] = await pool.query(
    `SELECT COUNT(*) as total FROM employee_documents ed WHERE ${where.join(' AND ')}`, params
  );

  res.json({
    documents: rows,
    total: countRows[0].total,
    page,
    totalPages: Math.ceil(countRows[0].total / limit),
  });
}

async function verifyDocument(req, res) {
  const { id } = req.params;
  const adminId = req.admin?.id || req.hr?.id || null;
  const [doc] = await pool.query('SELECT * FROM employee_documents WHERE id = ?', [id]);
  if (doc.length === 0) return res.status(404).json({ error: 'Document not found' });
  await pool.query(
    "UPDATE employee_documents SET status = 'verified', reviewed_by = ?, reviewed_at = NOW() WHERE id = ?",
    [adminId, id]
  );
  logActivity(doc[0].employee_id, adminId, 'document_verified', `Verified document: ${doc[0].doc_name}`);
  res.json({ message: 'Document verified' });
}

async function rejectDocument(req, res) {
  const { id } = req.params;
  const adminId = req.admin?.id || req.hr?.id || null;
  const { rejection_reason } = req.body;
  const [doc] = await pool.query('SELECT * FROM employee_documents WHERE id = ?', [id]);
  if (doc.length === 0) return res.status(404).json({ error: 'Document not found' });
  await pool.query(
  "UPDATE employee_documents SET status = 'rejected', reviewed_by = ?, reviewed_at = NOW(), rejection_reason = ? WHERE id = ?",
    [adminId, rejection_reason || null, id]
  );
  logActivity(doc[0].employee_id, adminId, 'document_rejected', `Rejected document: ${doc[0].doc_name}${rejection_reason ? ': ' + rejection_reason : ''}`);
  res.json({ message: 'Document rejected' });
}

module.exports = { getPendingDocuments, getAllDocuments, verifyDocument, rejectDocument };
