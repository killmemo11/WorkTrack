// Copyright (c) 2026 Mohamed Yehia
// SPDX-License-Identifier: AGPL-3.0

const express = require('express');
const router = express.Router();
const pool = require('../../shared/config/database');

// Action categories for filtering
const ACTION_CATEGORIES = {
  'Authentication': ['admin_login', 'password_set_via_magic_link', 'magic_link_requested'],
  'User Management': ['employee_deleted', 'profile_updated', 'department_created', 'department_updated'],
  'Settings': ['settings_updated', 'it_settings_updated', 'service_toggled', 'test_email_sent'],
  'Access Control': ['role_created', 'role_updated', 'role_assigned', 'role_removed', 'role_deleted'],
  'Leave Management': ['leave_submitted', 'leave_approved', 'leave_rejected', 'leave_cancelled', 'leave_balance_adjusted'],
  'Attendance': ['signout_approved', 'signout_rejected', 'signout_direct_update', 'missing_signout_check'],
  'Recruitment': ['job_created', 'candidate_created', 'offer_created', 'hired_from_recruitment'],
  'Assets': ['asset_assigned', 'asset_returned'],
  'Documents': ['document_verified', 'document_rejected'],
  'Compliance': ['report_exported', 'record_deleted'],
  'Contracts': ['contract_template_created'],
  'Resignations': ['resignation_approved', 'resignation_rejected'],
  'Departments': ['department_created', 'department_updated'],
  'Reports': ['report_exported'],
};

function getCategoryForAction(action) {
  for (const [cat, actions] of Object.entries(ACTION_CATEGORIES)) {
    if (actions.includes(action)) return cat;
  }
  return 'Other';
}

// Get activity log for audit
router.get('/activity-log', async (req, res) => {
  const tenantId = req.tenantId || 1;
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 50;
  const offset = (page - 1) * limit;
  const { employee_id, admin_id, action, category, date_from, date_to, search } = req.query;

  let where = ['al.tenant_id = ?'];
  let params = [tenantId];

  if (employee_id) { where.push('al.employee_id = ?'); params.push(employee_id); }
  if (admin_id) { where.push('al.admin_id = ?'); params.push(admin_id); }
  if (action) { where.push('al.action = ?'); params.push(action); }
  if (category) { 
    const actions = ACTION_CATEGORIES[category] || [];
    if (actions.length > 0) {
      where.push(`al.action IN (${actions.map(() => '?').join(',')})`);
      params.push(...actions);
    }
  }
  if (date_from) { where.push('al.created_at >= ?'); params.push(date_from); }
  if (date_to) { where.push('al.created_at <= ?'); params.push(date_to + ' 23:59:59'); }
  if (search) {
    where.push('(al.description LIKE ? OR e.name LIKE ? OR au.username LIKE ?)');
    const searchTerm = `%${search}%`;
    params.push(searchTerm, searchTerm, searchTerm);
  }

  const whereClause = 'WHERE ' + where.join(' AND ');

  const [rows] = await pool.query(
    `SELECT al.*, e.name as employee_name, e.email as employee_email, au.username as admin_username, au.email as admin_email
     FROM activity_log al
     LEFT JOIN employees e ON al.employee_id = e.id
     LEFT JOIN admin_users au ON al.admin_id = au.id
     ${whereClause}
     ORDER BY al.created_at DESC
     LIMIT ? OFFSET ?`,
    [...params, limit, offset]
  );

  // Add category to each entry
  const entriesWithCategory = rows.map(r => ({
    ...r,
    category: getCategoryForAction(r.action),
  }));

  const [countRows] = await pool.query(
    `SELECT COUNT(*) as total FROM activity_log al
     LEFT JOIN employees e ON al.employee_id = e.id
     LEFT JOIN admin_users au ON al.admin_id = au.id
     ${whereClause}`,
    params
  );

  res.json({
    entries: entriesWithCategory,
    total: countRows[0].total,
    page,
    totalPages: Math.ceil(countRows[0].total / limit),
  });
});

// Get balance audit for audit
router.get('/balance-audit', async (req, res) => {
  const tenantId = req.tenantId || 1;
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 50;
  const offset = (page - 1) * limit;
  const { employee_id, action, date_from, date_to } = req.query;

  let where = ['ba.tenant_id = ?'];
  let params = [tenantId];

  if (employee_id) { where.push('ba.employee_id = ?'); params.push(employee_id); }
  if (action) { where.push('ba.action = ?'); params.push(action); }
  if (date_from) { where.push('ba.created_at >= ?'); params.push(date_from); }
  if (date_to) { where.push('ba.created_at <= ?'); params.push(date_to + ' 23:59:59'); }

  const whereClause = 'WHERE ' + where.join(' AND ');

  const [rows] = await pool.query(
    `SELECT ba.*, e.name as employee_name, e.email as employee_email, au.username as performed_by_name
     FROM balance_audit ba
     LEFT JOIN employees e ON ba.employee_id = e.id
     LEFT JOIN admin_users au ON ba.performed_by = au.id
     ${whereClause}
     ORDER BY ba.created_at DESC
     LIMIT ? OFFSET ?`,
    [...params, limit, offset]
  );

  const [countRows] = await pool.query(
    `SELECT COUNT(*) as total FROM balance_audit ba ${whereClause}`,
    params
  );

  res.json({
    entries: rows,
    total: countRows[0].total,
    page,
    totalPages: Math.ceil(countRows[0].total / limit),
  });
});

// Export balance audit
router.get('/export-balance', async (req, res) => {
  const tenantId = req.tenantId || 1;
  const XLSX = require('xlsx');
  const { employee_id, action, date_from, date_to } = req.query;

  let where = ['ba.tenant_id = ?'];
  let params = [tenantId];

  if (employee_id) { where.push('ba.employee_id = ?'); params.push(employee_id); }
  if (action) { where.push('ba.action = ?'); params.push(action); }
  if (date_from) { where.push('ba.created_at >= ?'); params.push(date_from); }
  if (date_to) { where.push('ba.created_at <= ?'); params.push(date_to + ' 23:59:59'); }

  const whereClause = 'WHERE ' + where.join(' AND ');

  const [rows] = await pool.query(
    `SELECT ba.*, e.name as employee_name, e.email as employee_email, au.username as performed_by_name
     FROM balance_audit ba
     LEFT JOIN employees e ON ba.employee_id = e.id
     LEFT JOIN admin_users au ON ba.performed_by = au.id
     ${whereClause}
     ORDER BY ba.created_at DESC LIMIT 10000`,
    params
  );

  const data = rows.map((r) => ({
    Date: new Date(r.created_at).toLocaleString(),
    Employee: r.employee_name || '',
    'Leave Type': r.leave_type,
    Action: r.action,
    'Old Balance': r.old_balance,
    'New Balance': r.new_balance,
    Change: r.change_amount,
    'Performed By': r.performed_by_name || '',
  }));

  const ws = XLSX.utils.json_to_sheet(data);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Balance Audit');
  const buf = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });

  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  res.setHeader('Content-Disposition', 'attachment; filename=balance_audit.xlsx');
  res.send(buf);
});

// Export audit log (activity log)
router.get('/export', async (req, res) => {
  const tenantId = req.tenantId || 1;
  const XLSX = require('xlsx');
  const { employee_id, admin_id, action, category, date_from, date_to, search } = req.query;

  let where = ['al.tenant_id = ?'];
  let params = [tenantId];

  if (employee_id) { where.push('al.employee_id = ?'); params.push(employee_id); }
  if (admin_id) { where.push('al.admin_id = ?'); params.push(admin_id); }
  if (action) { where.push('al.action = ?'); params.push(action); }
  if (category) { 
    const actions = ACTION_CATEGORIES[category] || [];
    if (actions.length > 0) {
      where.push(`al.action IN (${actions.map(() => '?').join(',')})`);
      params.push(...actions);
    }
  }
  if (date_from) { where.push('al.created_at >= ?'); params.push(date_from); }
  if (date_to) { where.push('al.created_at <= ?'); params.push(date_to + ' 23:59:59'); }
  if (search) {
    where.push('(al.description LIKE ? OR e.name LIKE ? OR au.username LIKE ?)');
    const searchTerm = `%${search}%`;
    params.push(searchTerm, searchTerm, searchTerm);
  }

  const whereClause = 'WHERE ' + where.join(' AND ');

  const [rows] = await pool.query(
    `SELECT al.*, e.name as employee_name, au.username as admin_username
     FROM activity_log al
     LEFT JOIN employees e ON al.employee_id = e.id
     LEFT JOIN admin_users au ON al.admin_id = au.id
     ${whereClause}
     ORDER BY al.created_at DESC LIMIT 10000`,
    params
  );

  const data = rows.map((r) => ({
    Date: new Date(r.created_at).toLocaleString(),
    Action: r.action,
    Category: getCategoryForAction(r.action),
    Description: r.description,
    Employee: r.employee_name || '',
    Admin: r.admin_username || '',
  }));

  const ws = XLSX.utils.json_to_sheet(data);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Audit Log');
  const buf = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });

  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  res.setHeader('Content-Disposition', 'attachment; filename=audit_log.xlsx');
  res.send(buf);
});

// Compliance report generation
router.post('/compliance-report', async (req, res) => {
  const tenantId = req.tenantId || 1;
  const { date_from, date_to } = req.body;
  const PDFDocument = require('pdfkit');

  let where = ['al.tenant_id = ?'];
  let params = [tenantId];

  if (date_from) { where.push('al.created_at >= ?'); params.push(date_from); }
  if (date_to) { where.push('al.created_at <= ?'); params.push(date_to + ' 23:59:59'); }

  const whereClause = 'WHERE ' + where.join(' AND ');

  const [activityRows] = await pool.query(
    `SELECT al.*, e.name as employee_name, au.username as admin_username
     FROM activity_log al
     LEFT JOIN employees e ON al.employee_id = e.id
     LEFT JOIN admin_users au ON al.admin_id = au.id
     ${whereClause}
     ORDER BY al.created_at DESC`,
    params
  );

  const [balanceRows] = await pool.query(
    `SELECT ba.*, e.name as employee_name, au.username as performed_by_name
     FROM balance_audit ba
     LEFT JOIN employees e ON ba.employee_id = e.id
     LEFT JOIN admin_users au ON ba.performed_by = au.id
     ${whereClause.replace('al.', 'ba.')}`,
    params
  );

  // Generate PDF
  const doc = new PDFDocument({ margin: 40, size: 'A4' });
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `attachment; filename=compliance_report_${new Date().toISOString().split('T')[0]}.pdf`);
  doc.pipe(res);

  // Title
  doc.fontSize(24).font('Helvetica-Bold').text('Compliance Audit Report', { align: 'center' });
  doc.moveDown();
  doc.fontSize(12).font('Helvetica').text(`Generated: ${new Date().toLocaleString()}`, { align: 'center' });
  doc.text(`Period: ${date_from || 'All time'} to ${date_to || 'Present'}`, { align: 'center' });
  doc.moveDown(2);

  // Summary
  doc.fontSize(16).font('Helvetica-Bold').text('Executive Summary');
  doc.moveDown();
  doc.fontSize(11).font('Helvetica')
    .text(`Total Activity Events: ${activityRows.length}`)
    .text(`Balance Changes: ${balanceRows.length}`)
    .text(`Unique Employees Involved: ${new Set(activityRows.map(r => r.employee_id).filter(Boolean)).size}`)
    .text(`Unique Admins Involved: ${new Set(activityRows.map(r => r.admin_id).filter(Boolean)).size}`);
  doc.moveDown(2);

  // Activity by Category
  doc.fontSize(16).font('Helvetica-Bold').text('Activity by Category');
  doc.moveDown();
  const categoryCounts = {};
  activityRows.forEach(r => {
    const cat = getCategoryForAction(r.action);
    categoryCounts[cat] = (categoryCounts[cat] || 0) + 1;
  });
  Object.entries(categoryCounts).sort((a,b) => b[1] - a[1]).forEach(([cat, count]) => {
    doc.fontSize(11).font('Helvetica').text(`${cat}: ${count} events`);
  });
  doc.moveDown(2);

  // Recent Critical Events
  doc.fontSize(16).font('Helvetica-Bold').text('Critical Events (Last 50)');
  doc.moveDown();
  const criticalActions = ['employee_deleted', 'role_deleted', 'service_toggled', 'settings_updated', 'it_settings_updated', 'record_deleted'];
  const criticalEvents = activityRows.filter(r => criticalActions.includes(r.action)).slice(0, 50);
  
  if (criticalEvents.length > 0) {
    const table = {
      headers: ['Date', 'Action', 'Employee', 'Admin', 'Description'],
      rows: criticalEvents.map(r => [
        new Date(r.created_at).toLocaleDateString(),
        r.action,
        r.employee_name || '—',
        r.admin_username || '—',
        r.description?.substring(0, 80) || ''
      ])
    };
    // Simple table
    criticalEvents.forEach((r, i) => {
      doc.fontSize(9).font('Helvetica-Bold').text(`${i+1}. ${r.action} — ${new Date(r.created_at).toLocaleString()}`);
      doc.font('Helvetica').text(`   Employee: ${r.employee_name || '—'} | Admin: ${r.admin_username || '—'}`);
      doc.text(`   ${r.description?.substring(0, 100) || ''}`);
      doc.moveDown(0.5);
    });
  } else {
    doc.fontSize(11).font('Helvetica').text('No critical events in this period.');
  }
  doc.moveDown(2);

  // Balance Audit Summary
  doc.fontSize(16).font('Helvetica-Bold').text('Leave Balance Changes');
  doc.moveDown();
  const balanceActions = balanceRows.reduce((acc, r) => {
    acc[r.action] = (acc[r.action] || 0) + 1;
    return acc;
  }, {});
  Object.entries(balanceActions).forEach(([action, count]) => {
    doc.fontSize(11).font('Helvetica').text(`${action}: ${count} changes`);
  });
  doc.moveDown(2);

  // Footer
  doc.fontSize(8).font('Helvetica-Oblique').text('This report is generated automatically by WorkTrack Platform. For official compliance purposes, please verify with your legal department.', { align: 'center' });

  doc.end();
});

module.exports = router;