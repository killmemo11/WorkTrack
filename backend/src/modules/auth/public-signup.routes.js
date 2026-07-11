// Copyright (c) 2026 Mohamed Yehia
// SPDX-License-Identifier: AGPL-3.0

const express = require('express');
const router = express.Router();
const pool = require('../../shared/config/database');
const { sendTenantRequestNotification } = require('../../shared/services/platform-email.service');

// Public endpoint — submit a tenant signup request
router.post('/tenant-signup', async (req, res) => {
  const { company_name, contact_email, contact_phone, employee_count, message, plan } = req.body;

  if (!company_name || !contact_email) {
    return res.status(400).json({ error: 'Company name and contact email are required' });
  }

  // Check if email already has a pending request or existing tenant
  const [existing] = await pool.query(
    `SELECT tr.status FROM tenant_requests tr WHERE tr.contact_email = ? AND tr.status = 'pending' LIMIT 1`,
    [contact_email.toLowerCase().trim()]
  );

  if (existing.length > 0) {
    return res.status(400).json({ error: 'You already have a pending request. We will contact you soon.' });
  }

  // Check for duplicate with existing tenant
  const [existingTenant] = await pool.query(
    `SELECT id FROM tenants WHERE contact_email = ? LIMIT 1`,
    [contact_email.toLowerCase().trim()]
  );

  if (existingTenant.length > 0) {
    return res.status(400).json({ error: 'An account with this email already exists. Please contact support.' });
  }

  const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress || '';
  const userAgent = req.headers['user-agent'] || '';

  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    // Insert into both tenant_signups (public log) and tenant_requests (for platform admin review)
    await conn.query(
      'INSERT INTO tenant_signups (company_name, contact_email, contact_phone, employee_count, message, ip_address, user_agent) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [company_name.trim(), contact_email.toLowerCase().trim(), contact_phone, employee_count || 10, message || null, ip.split(',')[0].trim(), userAgent.slice(0, 500)]
    );

    const [reqResult] = await conn.query(
      'INSERT INTO tenant_requests (company_name, contact_email, contact_phone, employee_count, message, requested_plan, status) VALUES (?, ?, ?, ?, ?, ?, "pending")',
      [company_name.trim(), contact_email.toLowerCase().trim(), contact_phone, employee_count || 10, message || null, plan || 'trial']
    );

    await conn.commit();

    // Notify platform admin about the new request
    const platformAdminEmail = process.env.PLATFORM_ADMIN_ALERT_EMAIL || process.env.PLATFORM_SMTP_USER;
    if (platformAdminEmail) {
      const request = { company_name, contact_email, contact_phone, employee_count, message };
      await sendTenantRequestNotification(platformAdminEmail, request).catch(() => {});
    }

    res.status(201).json({
      message: 'Thank you! Your request has been received. We will review it and contact you within 24 hours.'
    });
  } catch (err) {
    await conn.rollback();
    console.error('Tenant signup error:', err);
    res.status(500).json({ error: 'Failed to submit request. Please try again.' });
  } finally {
    conn.release();
  }
});

module.exports = router;