// Copyright (c) 2026 Mohamed Yehia
// SPDX-License-Identifier: AGPL-3.0

const crypto = require('crypto');
const path = require('path');
const express = require('express');
const multer = require('multer');
const router = express.Router();
const pool = require('../../shared/config/database');
const { getPaymentsDir } = require('../../shared/config/storage');
const { sendPlatformEmail } = require('../../shared/services/platform-email.service');
const logger = require('../../shared/utils/logger');
const { sendVerificationCodeBody, verifyEmailCodeBody, tenantSignupBody, trackRequestQuery } = require('../../shared/validations/schemas');

// Free/personal email domains that are NOT allowed for company registration
const PERSONAL_DOMAINS = new Set([
  'gmail.com', 'googlemail.com', 'yahoo.com', 'yahoo.co.uk', 'yahoo.co.in',
  'yahoo.ca', 'yahoo.com.au', 'yahoo.com.br', 'yahoo.fr', 'yahoo.de',
  'hotmail.com', 'hotmail.co.uk', 'outlook.com', 'outlook.co.uk',
  'live.com', 'live.co.uk', 'live.fr', 'live.de', 'live.nl',
  'msn.com', 'aol.com', 'aim.com',
  'icloud.com', 'me.com', 'mac.com',
  'protonmail.com', 'proton.me', 'pm.me',
  'zoho.com', 'zohomail.com',
  'yandex.com', 'yandex.ru', 'yandex.ua',
  'mail.com', 'email.com', 'gmx.com', 'gmx.de',
  'rocketmail.com', 'ymail.com',
  'fastmail.com', 'hushmail.com',
  'tutanota.com', 'tutanota.de', ' tutamail.com',
  '163.com', '126.com', 'qq.com',
  'naver.com', 'daum.net', 'hanmail.net',
  'rediffmail.com', 'sify.com',
  'juno.com', 'netzero.com',
  'att.net', 'sbcglobal.net', 'verizon.net',
  'cox.net', 'charter.net', 'comcast.net',
  'inbox.com', 'mail.ru', 'bk.ru', 'list.ru',
  'terra.com.br', 'bol.com.br',
]);

function isPersonalDomain(email) {
  const domain = email.split('@')[1]?.toLowerCase();
  return PERSONAL_DOMAINS.has(domain);
}

function generateCode() {
  return crypto.randomInt(100000, 999999).toString();
}

// Multer config for payment proof uploads
const storage = multer.diskStorage({
  destination: () => getPaymentsDir(),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname) || '.jpg';
    cb(null, `proof-${Date.now()}-${crypto.randomBytes(4).toString('hex')}${ext}`);
  },
});
const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
  fileFilter: (req, file, cb) => {
    const allowed = /jpeg|jpg|png|gif|webp|pdf/;
    const extOk = allowed.test(path.extname(file.originalname).toLowerCase());
    const mimeOk = allowed.test(file.mimetype) || file.mimetype === 'application/pdf';
    cb(null, extOk && mimeOk);
  },
});

// ─────────────────────────────────────────────────────
// GET /api/public/payment-info
// Returns bank account details for InstaPay transfers
// ─────────────────────────────────────────────────────
router.get('/payment-info', async (req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT \`key\`, \`value\` FROM platform_settings
       WHERE \`key\` IN ('payment_bank_name','payment_account_name','payment_account_number','payment_iban','payment_instapay_id','payment_notes')`
    );
    const settings = {};
    rows.forEach(r => { settings[r.key] = r.value; });

    // Get plan prices from subscription_plans
    const [plans] = await pool.query(
      `SELECT name, slug, price_monthly, price_yearly, currency FROM subscription_plans WHERE is_active = 1 ORDER BY sort_order ASC`
    );

    res.json({
      bank_name: settings.payment_bank_name || '',
      account_name: settings.payment_account_name || '',
      account_number: settings.payment_account_number || '',
      iban: settings.payment_iban || '',
      instapay_id: settings.payment_instapay_id || '',
      notes: settings.payment_notes || '',
      plans: plans.map(p => ({
        name: p.name,
        slug: p.slug,
        price_monthly: p.price_monthly,
        price_yearly: p.price_yearly,
        currency: p.currency || 'EGP',
      })),
    });
  } catch (err) {
    logger.error('Get payment info error:', err);
    res.status(500).json({ error: 'Failed to load payment info' });
  }
});

// ─────────────────────────────────────────────────────
// GET /api/public/track-request?email=...
// Public status tracking for tenant signup requests
// ─────────────────────────────────────────────────────
router.get('/track-request', async (req, res) => {
  try {
    const { error } = trackRequestQuery.validate(req.query);
    if (error) return res.status(400).json({ error: error.details[0].message });
    const { email } = req.query;
    if (!email || !email.trim()) {
      return res.status(400).json({ error: 'Email is required' });
    }

    const trimmed = email.trim().toLowerCase();
    const [rows] = await pool.query(
      `SELECT id, company_name, contact_email, requested_plan, status, payment_status,
              payment_amount, payment_currency, payment_method,
              payment_proof_url, payment_rejection_reason,
              created_at, reviewed_at, rejection_reason
       FROM tenant_requests
       WHERE contact_email = ? ORDER BY created_at DESC LIMIT 1`,
      [trimmed]
    );

    if (rows.length === 0) {
      return res.json({ found: false });
    }

    const r = rows[0];

    // Build timeline
    const timeline = [];
    timeline.push({ status: 'submitted', label: 'Registration Submitted', date: r.created_at });

    if (r.payment_proof_url) {
      timeline.push({ status: 'payment_uploaded', label: 'Payment Proof Uploaded', date: r.created_at });
    }
    if (r.payment_status === 'verified') {
      timeline.push({ status: 'payment_verified', label: 'Payment Verified', date: r.reviewed_at });
    }
    if (r.payment_status === 'rejected') {
      timeline.push({ status: 'payment_rejected', label: 'Payment Rejected', date: r.reviewed_at, reason: r.payment_rejection_reason });
    }

    if (r.status === 'approved') {
      timeline.push({ status: 'approved', label: 'Request Approved', date: r.reviewed_at });
    } else if (r.status === 'rejected') {
      timeline.push({ status: 'rejected', label: 'Request Rejected', date: r.reviewed_at, reason: r.rejection_reason });
    } else {
      timeline.push({ status: 'pending', label: 'Under Review', date: null });
    }

    res.json({
      found: true,
      status: r.status,
      company_name: r.company_name,
      requested_plan: r.requested_plan,
      payment_status: r.payment_status,
      payment_amount: r.payment_amount,
      payment_currency: r.payment_currency,
      payment_method: r.payment_method,
      created_at: r.created_at,
      timeline,
    });
  } catch (err) {
    logger.error('Track request error:', err);
    res.status(500).json({ error: 'Failed to track request' });
  }
});

// ─────────────────────────────────────────────────────
// POST /api/public/send-verification-code
// Sends a 6-digit code to the company email
// ─────────────────────────────────────────────────────
router.post('/send-verification-code', async (req, res) => {
  try {
    const { error } = sendVerificationCodeBody.validate(req.body);
    if (error) return res.status(400).json({ error: error.details[0].message });
    const { email, company_name } = req.body;

    if (!email || !email.trim()) {
      return res.status(400).json({ error: 'Email is required' });
    }

    const trimmed = email.trim().toLowerCase();
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(trimmed)) {
      return res.status(400).json({ error: 'Please enter a valid email address' });
    }

    if (isPersonalDomain(trimmed)) {
      return res.status(400).json({
        error: 'Please use your company email address. Personal email providers (Gmail, Yahoo, Outlook, etc.) are not accepted.',
      });
    }

    // Rate limit: max 3 codes per email per 15 minutes
    const [recent] = await pool.query(
      `SELECT COUNT(*) as cnt FROM email_verifications
       WHERE email = ? AND purpose = 'tenant_signup' AND created_at > DATE_SUB(NOW(), INTERVAL 15 MINUTE)`,
      [trimmed]
    );
    if (recent[0].cnt >= 3) {
      return res.status(429).json({ error: 'Too many attempts. Please wait 15 minutes before trying again.' });
    }

    const code = generateCode();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    // Invalidate any previous codes for this email
    await pool.query(
      `UPDATE email_verifications SET verified = 1 WHERE email = ? AND purpose = 'tenant_signup' AND verified = 0`,
      [trimmed]
    );

    // Insert new code
    await pool.query(
      `INSERT INTO email_verifications (email, code, purpose, expires_at) VALUES (?, ?, 'tenant_signup', ?)`,
      [trimmed, code, expiresAt]
    );

    // Send email
    const company = company_name || 'Your company';
    const html = `
      <div style="text-align: center; padding: 20px 0;">
        <div style="font-size: 48px; font-weight: 800; color: #22c55e; letter-spacing: 8px; margin: 20px 0;">
          ${code}
        </div>
        <p style="color: #71717a; font-size: 14px; margin: 10px 0 0;">
          This code expires in <strong>10 minutes</strong>.
        </p>
      </div>
      <p style="color: #52525b; font-size: 14px; margin-top: 20px;">
        You requested an email verification code for <strong>${company}</strong> registration on WorkTrack.
        If you did not request this, please ignore this email.
      </p>
    `;

    const result = await sendPlatformEmail(trimmed, `WorkTrack — Your Verification Code: ${code}`, html);

    if (!result.success && result.reason === 'SMTP not configured') {
      // In dev mode, return the code in response
      if (process.env.NODE_ENV !== 'production') {
        return res.json({ message: 'Verification code sent (dev mode)', dev_code: code });
      }
      return res.status(500).json({ error: 'Email service not configured. Please contact support.' });
    }

    res.json({ message: 'Verification code sent to your email' });
  } catch (err) {
    logger.error('Send verification code error:', err);
    res.status(500).json({ error: 'Failed to send verification code. Please try again.' });
  }
});

// ─────────────────────────────────────────────────────
// POST /api/public/verify-email-code
// Verifies the 6-digit code
// ─────────────────────────────────────────────────────
router.post('/verify-email-code', async (req, res) => {
  try {
    const { error } = verifyEmailCodeBody.validate(req.body);
    if (error) return res.status(400).json({ error: error.details[0].message });
    const { email, code } = req.body;

    if (!email || !code) {
      return res.status(400).json({ error: 'Email and code are required' });
    }

    const trimmed = email.trim().toLowerCase();
    const codeStr = code.toString().trim();

    const [rows] = await pool.query(
      `SELECT id, attempts FROM email_verifications
       WHERE email = ? AND purpose = 'tenant_signup' AND verified = 0 AND expires_at > NOW()
       ORDER BY id DESC LIMIT 1`,
      [trimmed]
    );

    if (rows.length === 0) {
      return res.status(400).json({ error: 'Invalid or expired code. Please request a new one.' });
    }

    const record = rows[0];

    if (record.attempts >= 5) {
      return res.status(429).json({ error: 'Too many failed attempts. Please request a new code.' });
    }

    // Increment attempts
    await pool.query('UPDATE email_verifications SET attempts = attempts + 1 WHERE id = ?', [record.id]);

    // Check code
    const [match] = await pool.query(
      'SELECT id FROM email_verifications WHERE id = ? AND code = ?',
      [record.id, codeStr]
    );

    if (match.length === 0) {
      return res.status(400).json({ error: 'Incorrect code. Please try again.' });
    }

    // Mark as verified
    await pool.query('UPDATE email_verifications SET verified = 1 WHERE id = ?', [record.id]);

    res.json({ message: 'Email verified successfully', verified: true });
  } catch (err) {
    logger.error('Verify email code error:', err);
    res.status(500).json({ error: 'Verification failed. Please try again.' });
  }
});

// ─────────────────────────────────────────────────────
// POST /api/public/tenant-signup
// Submit a complete tenant signup request (with optional payment proof)
// ─────────────────────────────────────────────────────
router.post('/tenant-signup', upload.single('payment_proof'), async (req, res) => {
  try {
    const { error } = tenantSignupBody.validate(req.body);
    if (error) return res.status(400).json({ error: error.details[0].message });
    const {
      company_name, contact_email, contact_phone,
      industry, website, contact_person_name, contact_person_title,
      employee_count, message, plan, email_verified,
      payment_amount, payment_currency, payment_method,
    } = req.body;

    if (!company_name || !contact_email) {
      return res.status(400).json({ error: 'Company name and contact email are required' });
    }

    const trimmedEmail = contact_email.trim().toLowerCase();

    // Domain check
    if (isPersonalDomain(trimmedEmail)) {
      return res.status(400).json({ error: 'Please use your company email address. Personal email providers are not accepted.' });
    }

    // Email verification check
    if (!email_verified) {
      return res.status(400).json({ error: 'Please verify your email address before submitting' });
    }

    const [verified] = await pool.query(
      `SELECT id FROM email_verifications
       WHERE email = ? AND purpose = 'tenant_signup' AND verified = 1 AND expires_at > NOW()
       ORDER BY id DESC LIMIT 1`,
      [trimmedEmail]
    );

    if (verified.length === 0) {
      return res.status(400).json({ error: 'Email verification expired. Please verify your email again.' });
    }

    // Paid plans require payment proof
    const paidPlans = ['basic', 'professional', 'enterprise'];
    if (paidPlans.includes(plan) && !req.file) {
      return res.status(400).json({ error: 'Payment proof is required for paid plans. Please upload your payment screenshot.' });
    }

    // Check for duplicate pending request
    const [existing] = await pool.query(
      `SELECT tr.status FROM tenant_requests tr WHERE tr.contact_email = ? AND tr.status = 'pending' LIMIT 1`,
      [trimmedEmail]
    );
    if (existing.length > 0) {
      return res.status(400).json({ error: 'You already have a pending request. We will contact you soon.' });
    }

    // Check for existing tenant
    const [existingTenant] = await pool.query(
      `SELECT id FROM tenants WHERE contact_email = ? LIMIT 1`,
      [trimmedEmail]
    );
    if (existingTenant.length > 0) {
      return res.status(400).json({ error: 'An account with this email already exists. Please contact support.' });
    }

    const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress || '';
    const userAgent = req.headers['user-agent'] || '';

    // Payment proof file path
    const paymentProofUrl = req.file ? `/uploads/payments/${req.file.filename}` : null;
    const hasPayment = paymentProofUrl && payment_amount;

    const conn = await pool.getConnection();
    try {
      await conn.beginTransaction();

      await conn.query(
        `INSERT INTO tenant_signups
         (company_name, contact_email, contact_phone, industry, website,
          contact_person_name, contact_person_title,
          employee_count, message, ip_address, user_agent)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          company_name.trim(), trimmedEmail, contact_phone || null,
          industry || null, website || null,
          contact_person_name || null, contact_person_title || null,
          employee_count || 10, message || null,
          ip.split(',')[0].trim(), (userAgent || '').slice(0, 500),
        ]
      );

      await conn.query(
        `INSERT INTO tenant_requests
         (company_name, contact_email, contact_phone, industry, website,
          contact_person_name, contact_person_title,
          employee_count, message, requested_plan, status,
          payment_amount, payment_currency, payment_method, payment_proof_url, payment_status)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending', ?, ?, ?, ?, ?)`,
        [
          company_name.trim(), trimmedEmail, contact_phone || null,
          industry || null, website || null,
          contact_person_name || null, contact_person_title || null,
          employee_count || 10, message || null, plan || 'trial',
          hasPayment ? parseFloat(payment_amount) : null,
          payment_currency || 'EGP',
          payment_method || 'instapay',
          paymentProofUrl,
          hasPayment ? 'pending' : null,
        ]
      );

      await conn.commit();

      // Notify platform admin
      const platformAdminEmail = process.env.PLATFORM_ADMIN_ALERT_EMAIL || process.env.PLATFORM_SMTP_USER;
      if (platformAdminEmail) {
        const request = { company_name, contact_email: trimmedEmail, contact_phone, industry, website, contact_person_name, contact_person_title, employee_count, message };
        const { sendTenantRequestNotification } = require('../../shared/services/platform-email.service');
        await sendTenantRequestNotification(platformAdminEmail, request).catch(() => {});
      }

      res.status(201).json({
        message: hasPayment
          ? 'Thank you! Your registration and payment proof have been received. We will verify your payment and contact you within 24 hours.'
          : 'Thank you! Your request has been received. We will review it and contact you within 24 hours.',
        has_payment: hasPayment,
      });
    } catch (err) {
      await conn.rollback();
      logger.error('Tenant signup error:', err);
      res.status(500).json({ error: 'Failed to submit request. Please try again.' });
    } finally {
      conn.release();
    }
  } catch (err) {
    logger.error('Tenant signup error:', err);
    res.status(500).json({ error: 'Failed to submit request. Please try again.' });
  }
});

module.exports = router;
