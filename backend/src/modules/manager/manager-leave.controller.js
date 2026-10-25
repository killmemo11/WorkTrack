// Copyright (c) 2026 Mohamed Yehia
// SPDX-License-Identifier: AGPL-3.0

const pool = require('../../shared/config/database');
const emailService = require('../../shared/services/email.service');
const { createNotification } = require('../../shared/services/notification.service');
const { logBalanceChange } = require('../../shared/services/audit.service');
const { logActivity } = require('../../shared/services/activity.service');
const logger = require('../../shared/utils/logger');

async function isGlobalCeo(email, tenantId) {
  const [ceoSetting] = await pool.query(
    "SELECT `value` FROM settings WHERE `key` = 'ceo_email' AND tenant_id = ?",
    [tenantId]
  );
  const ceoEmail = ceoSetting.length > 0 ? ceoSetting[0].value.trim().toLowerCase() : '';
  return ceoEmail.length > 0 && email.toLowerCase() === ceoEmail;
}

async function getManagerPendingLeaves(req, res) {
  const userId = req.employee.id;
  const userRole = req.employee.role;
  const userEmail = req.employee.email;
  const isCEO = await isGlobalCeo(userEmail, req.tenantId);

  if (isCEO) return res.json([]);
  if (userRole !== 'manager' && userRole !== 'ceo') return res.json([]);

  let whereClause = "lr.status = 'pending' AND lr.tenant_id = ? AND lr.type IN (SELECT name FROM leave_types WHERE routed_to = 'manager' AND is_active = 1 AND tenant_id = ?) AND e.id != ? AND e.tenant_id = ?";
  const params = [req.tenantId, req.tenantId, userId, req.tenantId];

  const [mgrRows] = await pool.query(
    'SELECT department_id FROM employees WHERE id = ? AND tenant_id = ?',
    [userId, req.tenantId]
  );
  if (!mgrRows[0].department_id) return res.json([]);
  whereClause += ' AND e.department_id = ?';
  params.push(mgrRows[0].department_id);
  if (userRole === 'manager') {
    whereClause += " AND e.role != 'manager'";
  }

  const [rows] = await pool.query(
    `SELECT lr.*, e.name as employee_name, e.email as employee_email, e.employee_id as emp_number,
            e.role as employee_role, d.name as department_name
     FROM leave_requests lr
     JOIN employees e ON lr.employee_id = e.id
     LEFT JOIN departments d ON e.department_id = d.id
      WHERE ${whereClause}
      ORDER BY lr.created_at ASC`,
    params
  );
  res.json(rows);
}

async function managerApproveLeave(req, res) {
  try {
    const userId = req.employee.id;
    const userRole = req.employee.role;
    const userEmail = req.employee.email;
    const { id } = req.params;
    const isCEO = await isGlobalCeo(userEmail, req.tenantId);

    if (isCEO) return res.status(400).json({ error: 'Leave request not found or not eligible for approval' });
    if (userRole !== 'manager' && userRole !== 'ceo') return res.status(400).json({ error: 'Leave request not found or not eligible for approval' });

    let whereClause = "lr.id = ? AND lr.status = 'pending' AND lr.tenant_id = ? AND lr.type IN (SELECT name FROM leave_types WHERE routed_to = 'manager' AND is_active = 1 AND tenant_id = ?) AND e.id != ? AND e.tenant_id = ?";
    const params = [id, req.tenantId, req.tenantId, userId, req.tenantId];

    const [mgrRows] = await pool.query(
      'SELECT department_id FROM employees WHERE id = ? AND tenant_id = ?',
      [userId, req.tenantId]
    );
    whereClause += ' AND e.department_id = ?';
    params.push(mgrRows[0].department_id);
    if (userRole === 'manager') {
      whereClause += " AND e.role != 'manager'";
    }

    const [rows] = await pool.query(
      `SELECT lr.*, e.department_id as emp_dept_id, e.role as emp_role
       FROM leave_requests lr
       JOIN employees e ON lr.employee_id = e.id
       WHERE ${whereClause}`,
      params
    );

    if (rows.length === 0) {
      return res.status(400).json({ error: 'Leave request not found or not eligible for approval' });
    }

    let leave;
    const conn = await pool.getConnection();
    try {
      await conn.beginTransaction();
      const [locked] = await conn.query(
        "SELECT * FROM leave_requests WHERE id = ? AND status = 'pending' AND tenant_id = ? FOR UPDATE",
        [id, req.tenantId]
      );
      if (locked.length === 0) {
        await conn.rollback();
        return res.status(400).json({ error: 'Leave request not found or not eligible for approval' });
      }
      leave = locked[0];

      const [ltRows] = await conn.query(
        'SELECT default_balance FROM leave_types WHERE name = ? AND tenant_id = ?',
        [leave.type, req.tenantId]
      );
      if (ltRows.length > 0 && ltRows[0].default_balance !== null) {
        const [balRows] = await conn.query(
          'SELECT balance FROM leave_balances WHERE employee_id = ? AND leave_type = ? AND tenant_id = ? FOR UPDATE',
          [leave.employee_id, leave.type, req.tenantId]
        );
        if (balRows.length > 0) {
          const oldBal = parseFloat(balRows[0].balance);
          const newBalance = Math.max(0, oldBal - parseFloat(leave.days_count));
          await conn.query(
            'UPDATE leave_balances SET balance = ? WHERE employee_id = ? AND leave_type = ? AND tenant_id = ?',
            [newBalance, leave.employee_id, leave.type, req.tenantId]
          );
          await logBalanceChange(leave.employee_id, leave.type, oldBal, newBalance, 'deduct', id, userId, conn);
        }
      }

      await conn.query(
        'UPDATE leave_requests SET status = ?, reviewed_by_manager_id = ?, reviewed_at = NOW() WHERE id = ? AND tenant_id = ?',
        ['approved', userId, id, req.tenantId]
      );
      await conn.commit();
    } catch (err) {
      await conn.rollback();
      throw err;
    } finally {
      conn.release();
    }

    const approverLabel = userRole === 'ceo' ? 'C-Level' : 'Manager';

    try {
      await createNotification(
        leave.employee_id,
        'Leave Approved',
        `Your ${leave.type} leave for ${leave.days_count} day(s) (${leave.start_date} → ${leave.end_date}) has been approved by your ${approverLabel}.`,
        'success',
        '/leaves'
      );
    } catch (e) { logger.error('Leave approved notification error:', e); }

    try {
      const [empRows] = await pool.query(
        'SELECT name, email FROM employees WHERE id = ? AND tenant_id = ?',
        [leave.employee_id, req.tenantId]
      );
      await emailService.sendLeaveApprovedEmail(empRows[0], leave);
    } catch (e) { logger.error('Leave approved email error:', e); }

    try {
      await logActivity(leave.employee_id, userId, 'leave_approved', `${approverLabel} approved ${leave.type} leave (${leave.start_date} → ${leave.end_date}, ${leave.days_count} day(s))`);
    } catch (e) { logger.error('Leave approved activity log error:', e); }

    res.json({ message: 'Leave approved' });
  } catch (err) {
    logger.error('managerApproveLeave error:', err);
    res.status(500).json({ error: 'Failed to approve leave request' });
  }
}

async function managerRejectLeave(req, res) {
  try {
    const userId = req.employee.id;
    const userRole = req.employee.role;
    const userEmail = req.employee.email;
    const { id } = req.params;
    const { rejection_reason } = req.body;
    const isCEO = await isGlobalCeo(userEmail, req.tenantId);

    if (!rejection_reason || !rejection_reason.trim()) {
      return res.status(400).json({ error: 'Rejection reason is required' });
    }

    if (isCEO) return res.status(400).json({ error: 'Leave request not found or not eligible for rejection' });
    if (userRole !== 'manager' && userRole !== 'ceo') return res.status(400).json({ error: 'Leave request not found or not eligible for rejection' });

    let whereClause = "lr.id = ? AND lr.status = 'pending' AND lr.tenant_id = ? AND lr.type IN (SELECT name FROM leave_types WHERE routed_to = 'manager' AND is_active = 1 AND tenant_id = ?) AND e.id != ? AND e.tenant_id = ?";
    const params = [id, req.tenantId, req.tenantId, userId, req.tenantId];

    const [mgrRows] = await pool.query(
      'SELECT department_id FROM employees WHERE id = ? AND tenant_id = ?',
      [userId, req.tenantId]
    );
    whereClause += ' AND e.department_id = ?';
    params.push(mgrRows[0].department_id);
    if (userRole === 'manager') {
      whereClause += " AND e.role != 'manager'";
    }

    const [rows] = await pool.query(
      `SELECT lr.*, e.department_id as emp_dept_id, e.role as emp_role
       FROM leave_requests lr
       JOIN employees e ON lr.employee_id = e.id
       WHERE ${whereClause}`,
      params
    );

    if (rows.length === 0) {
      return res.status(400).json({ error: 'Leave request not found or not eligible for rejection' });
    }

    const leave = rows[0];
    await pool.query(
      'UPDATE leave_requests SET status = ?, reviewed_by_manager_id = ?, reviewed_at = NOW(), rejection_reason = ? WHERE id = ? AND tenant_id = ?',
      ['rejected', userId, rejection_reason, id, req.tenantId]
    );

    const approverLabel = userRole === 'ceo' ? 'C-Level' : 'Manager';

    try {
      await createNotification(
        leave.employee_id,
        'Leave Rejected',
        `Your ${leave.type} leave request was rejected by your ${approverLabel}: ${rejection_reason}`,
        'error',
        '/leaves'
      );
    } catch (e) { logger.error('Leave rejected notification error:', e); }

    try {
      const [empRows] = await pool.query(
        'SELECT name, email FROM employees WHERE id = ? AND tenant_id = ?',
        [leave.employee_id, req.tenantId]
      );
      await emailService.sendLeaveRejectedEmail(empRows[0], leave, rejection_reason);
    } catch (e) { logger.error('Leave rejected email error:', e); }

    try {
      await logActivity(leave.employee_id, userId, 'leave_rejected', `${approverLabel} rejected ${leave.type} leave (${leave.start_date} → ${leave.end_date}): ${rejection_reason}`);
    } catch (e) { logger.error('Leave rejected activity log error:', e); }

    res.json({ message: 'Leave rejected' });
  } catch (err) {
    logger.error('managerRejectLeave error:', err);
    res.status(500).json({ error: 'Failed to reject leave request' });
  }
}

async function getManagerPendingSignoutRequests(req, res) {
  const userId = req.employee.id;
  const userRole = req.employee.role;
  const userEmail = req.employee.email;
  const isCEO = await isGlobalCeo(userEmail, req.tenantId);

  if (isCEO) return res.json([]);
  if (userRole !== 'manager' && userRole !== 'ceo') return res.json([]);

  const [mgrRows] = await pool.query(
    'SELECT department_id FROM employees WHERE id = ? AND tenant_id = ?',
    [userId, req.tenantId]
  );
  if (!mgrRows[0].department_id) return res.json([]);

  const [rows] = await pool.query(
    `SELECT sr.*, a.date, a.sign_in_time, e.name as employee_name, e.employee_id as emp_number,
            d.name as department_name
     FROM signout_requests sr
     JOIN attendance_records a ON sr.attendance_record_id = a.id AND a.tenant_id = sr.tenant_id
     JOIN employees e ON sr.employee_id = e.id
     LEFT JOIN departments d ON e.department_id = d.id
     WHERE sr.status = 'pending' AND sr.tenant_id = ? AND e.tenant_id = ?
       AND e.department_id = ? AND e.id != ?
     ORDER BY sr.created_at ASC`,
    [req.tenantId, req.tenantId, mgrRows[0].department_id, userId]
  );

  res.json(rows);
}

async function managerApproveSignoutRequest(req, res) {
  try {
    const userId = req.employee.id;
    const userRole = req.employee.role;
    const userEmail = req.employee.email;
    const { id } = req.params;
    const isCEO = await isGlobalCeo(userEmail, req.tenantId);

    if (isCEO) return res.status(400).json({ error: 'Sign-out request not found or not eligible for approval' });
    if (userRole !== 'manager' && userRole !== 'ceo') return res.status(400).json({ error: 'Sign-out request not found or not eligible for approval' });

    const [mgrRows] = await pool.query(
      'SELECT department_id FROM employees WHERE id = ? AND tenant_id = ?',
      [userId, req.tenantId]
    );
    if (!mgrRows[0].department_id) return res.status(400).json({ error: 'No department found' });

    const [rows] = await pool.query(
      `SELECT sr.*, e.department_id as emp_dept_id, e.name as employee_name
       FROM signout_requests sr
       JOIN employees e ON sr.employee_id = e.id
       WHERE sr.id = ? AND sr.status = 'pending'
         AND sr.tenant_id = ? AND e.tenant_id = ?
         AND e.department_id = ? AND e.id != ?`,
      [id, req.tenantId, req.tenantId, mgrRows[0].department_id, userId]
    );

    if (rows.length === 0) {
      return res.status(400).json({ error: 'Sign-out request not found or not eligible for approval' });
    }

    let sr;
    const conn = await pool.getConnection();
    try {
      await conn.beginTransaction();
      const [locked] = await conn.query(
        "SELECT * FROM signout_requests WHERE id = ? AND status = 'pending' AND tenant_id = ? FOR UPDATE",
        [id, req.tenantId]
      );
      if (locked.length === 0) {
        await conn.rollback();
        return res.status(400).json({ error: 'Sign-out request not found or not eligible for approval' });
      }
      sr = locked[0];

      await conn.query(
        'UPDATE signout_requests SET status = ?, reviewed_by = ?, reviewed_at = NOW() WHERE id = ? AND tenant_id = ?',
        ['approved', userId, id, req.tenantId]
      );

      await conn.query(
        'UPDATE attendance_records SET sign_out_time = ?, is_manual_sign_out = 1 WHERE id = ? AND tenant_id = ?',
        [sr.sign_out_time, sr.attendance_record_id, req.tenantId]
      );
      await conn.commit();
    } catch (err) {
      await conn.rollback();
      throw err;
    } finally {
      conn.release();
    }

    const approverLabel = userRole === 'ceo' ? 'C-Level' : 'Manager';
    try {
      await createNotification(
        sr.employee_id,
        'Sign-Out Request Approved',
        `Your sign-out request has been approved by your ${approverLabel}.`,
        'success',
        '/missing-signout'
      );
    } catch (e) { logger.error('Sign-out approved notification error:', e); }

    try {
      const [empRows] = await pool.query(
        'SELECT name, email FROM employees WHERE id = ? AND tenant_id = ?',
        [sr.employee_id, req.tenantId]
      );
      const [recRows] = await pool.query(
        'SELECT date FROM attendance_records WHERE id = ? AND tenant_id = ?',
        [sr.attendance_record_id, req.tenantId]
      );
      await emailService.sendSignOutRequestApprovedEmail(empRows[0], {
        date: recRows[0].date,
        signOutTime: new Date(sr.sign_out_time).toLocaleTimeString(),
      });
    } catch (e) { logger.error('Sign-out approved email error:', e); }

    try {
      await logActivity(sr.employee_id, userId, 'signout_approved', `${approverLabel} approved sign-out request (record #${sr.attendance_record_id})`);
    } catch (e) { logger.error('Sign-out approved activity log error:', e); }

    res.json({ message: 'Sign-out request approved' });
  } catch (err) {
    logger.error('managerApproveSignoutRequest error:', err);
    res.status(500).json({ error: 'Failed to approve sign-out request' });
  }
}

async function managerRejectSignoutRequest(req, res) {
  try {
    const userId = req.employee.id;
    const userRole = req.employee.role;
    const userEmail = req.employee.email;
    const { id } = req.params;
    const { rejection_reason } = req.body;
    const isCEO = await isGlobalCeo(userEmail, req.tenantId);

    if (!rejection_reason || !rejection_reason.trim()) {
      return res.status(400).json({ error: 'Rejection reason is required' });
    }

    if (isCEO) return res.status(400).json({ error: 'Sign-out request not found or not eligible for rejection' });
    if (userRole !== 'manager' && userRole !== 'ceo') return res.status(400).json({ error: 'Sign-out request not found or not eligible for rejection' });

    const [mgrRows] = await pool.query(
      'SELECT department_id FROM employees WHERE id = ? AND tenant_id = ?',
      [userId, req.tenantId]
    );
    if (!mgrRows[0].department_id) return res.status(400).json({ error: 'No department found' });

    const [rows] = await pool.query(
      `SELECT sr.*, e.department_id as emp_dept_id, e.name as employee_name
       FROM signout_requests sr
       JOIN employees e ON sr.employee_id = e.id
       WHERE sr.id = ? AND sr.status = 'pending'
         AND sr.tenant_id = ? AND e.tenant_id = ?
         AND e.department_id = ? AND e.id != ?`,
      [id, req.tenantId, req.tenantId, mgrRows[0].department_id, userId]
    );

    if (rows.length === 0) {
      return res.status(400).json({ error: 'Sign-out request not found or not eligible for rejection' });
    }

    let sr;
    const conn = await pool.getConnection();
    try {
      await conn.beginTransaction();
      const [locked] = await conn.query(
        "SELECT * FROM signout_requests WHERE id = ? AND status = 'pending' AND tenant_id = ? FOR UPDATE",
        [id, req.tenantId]
      );
      if (locked.length === 0) {
        await conn.rollback();
        return res.status(400).json({ error: 'Sign-out request not found or not eligible for rejection' });
      }
      sr = locked[0];

      await conn.query(
        'UPDATE signout_requests SET status = ?, reviewed_by = ?, reviewed_at = NOW(), rejection_reason = ? WHERE id = ? AND tenant_id = ?',
        ['rejected', userId, rejection_reason, id, req.tenantId]
      );
      await conn.commit();
    } catch (err) {
      await conn.rollback();
      throw err;
    } finally {
      conn.release();
    }

    const approverLabel = userRole === 'ceo' ? 'C-Level' : 'Manager';

    try {
      await createNotification(
        sr.employee_id,
        'Sign-Out Request Rejected',
        `Your sign-out request was rejected by your ${approverLabel}: ${rejection_reason}`,
        'error',
        '/missing-signout'
      );
    } catch (e) { logger.error('Sign-out rejected notification error:', e); }

    try {
      const [empRows] = await pool.query(
        'SELECT name, email FROM employees WHERE id = ? AND tenant_id = ?',
        [sr.employee_id, req.tenantId]
      );
      const [recRows] = await pool.query(
        'SELECT date FROM attendance_records WHERE id = ? AND tenant_id = ?',
        [sr.attendance_record_id, req.tenantId]
      );
      await emailService.sendSignOutRequestRejectedEmail(empRows[0], { date: recRows[0].date, signOutTime: '' }, rejection_reason);
    } catch (e) { logger.error('Sign-out rejected email error:', e); }

    try {
      await logActivity(sr.employee_id, userId, 'signout_rejected', `${approverLabel} rejected sign-out request (record #${sr.attendance_record_id}): ${rejection_reason}`);
    } catch (e) { logger.error('Sign-out rejected activity log error:', e); }

    res.json({ message: 'Sign-out request rejected' });
  } catch (err) {
    logger.error('managerRejectSignoutRequest error:', err);
    res.status(500).json({ error: 'Failed to reject sign-out request' });
  }
}

async function getManagerApprovalsCount(req, res) {
  try {
    const userId = req.employee.id;
    const userRole = req.employee.role;
    const userEmail = req.employee.email;
    const isCEO = await isGlobalCeo(userEmail, req.tenantId);

    if (isCEO) return res.json({ total: 0, leaves: 0, signouts: 0, resignations: 0 });
    if (userRole !== 'manager' && userRole !== 'ceo') return res.json({ total: 0, leaves: 0, signouts: 0, resignations: 0 });

    const [mgrRows] = await pool.query(
      'SELECT department_id FROM employees WHERE id = ? AND tenant_id = ?',
      [userId, req.tenantId]
    );
    if (!mgrRows[0].department_id) return res.json({ total: 0, leaves: 0, signouts: 0, resignations: 0 });
    const deptId = mgrRows[0].department_id;

    let leaveParams = [req.tenantId, req.tenantId, userId, req.tenantId, deptId];
    let leaveWhere = "lr.status = 'pending' AND lr.tenant_id = ? AND lr.type IN (SELECT name FROM leave_types WHERE routed_to = 'manager' AND is_active = 1 AND tenant_id = ?) AND e.id != ? AND e.tenant_id = ? AND e.department_id = ?";
    if (userRole === 'manager') {
      leaveWhere += " AND e.role != 'manager'";
    }

    const [leaveRows] = await pool.query(
      `SELECT COUNT(*) AS cnt FROM leave_requests lr JOIN employees e ON lr.employee_id = e.id WHERE ${leaveWhere}`,
      leaveParams
    );

    const [[{ cnt: signoutCnt }], [{ cnt: resignationCnt }]] = await Promise.all([
      pool.query(
        `SELECT COUNT(*) AS cnt FROM signout_requests sr
         JOIN attendance_records a ON sr.attendance_record_id = a.id
         JOIN employees e ON sr.employee_id = e.id
         WHERE sr.status = 'pending' AND sr.tenant_id = ? AND a.tenant_id = ?
           AND e.tenant_id = ? AND e.department_id = ? AND e.id != ?`,
        [req.tenantId, req.tenantId, req.tenantId, deptId, userId]
      ),
      pool.query(
        `SELECT COUNT(*) AS cnt FROM resignation_requests rr
         JOIN employees e ON rr.employee_id = e.id
         WHERE rr.status = 'pending' AND rr.tenant_id = ?
           AND e.tenant_id = ? AND e.department_id = ? AND e.id != ?`,
        [req.tenantId, req.tenantId, deptId, userId]
      ),
    ]);

    const leaves = leaveRows[0].cnt;
    const signouts = signoutCnt;
    const resignations = resignationCnt;

    res.json({ total: leaves + signouts + resignations, leaves, signouts, resignations });
  } catch (err) {
    logger.error('getManagerApprovalsCount error:', err);
    res.status(500).json({ error: 'Failed to get approvals count' });
  }
}

module.exports = { getManagerPendingLeaves, managerApproveLeave, managerRejectLeave, getManagerPendingSignoutRequests, managerApproveSignoutRequest, managerRejectSignoutRequest, getManagerApprovalsCount };
