// Copyright (c) 2026 Mohamed Yehia
// SPDX-License-Identifier: AGPL-3.0

const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const pool = require('../../shared/config/database');
const { logActivity } = require('../../shared/services/activity.service');
const { 
  sendPlatformEmail, 
  sendTenantAdminMagicLink,
  sendTenantRequestNotification,
  sendTenantApprovedEmail,
  sendTenantRejectedEmail,
  sendPlatformAlert
} = require('../../shared/services/platform-email.service');

// In-memory failed login attempts tracker (resets on server restart)
const failedAttempts = new Map();
const LOCKOUT_THRESHOLD = 5;
const LOCKOUT_DURATION_MS = 15 * 60 * 1000; // 15 minutes

function isLockedOut(username) {
  const record = failedAttempts.get(username);
  if (!record) return false;
  if (record.count >= LOCKOUT_THRESHOLD) {
    if (Date.now() - record.lastAttempt < LOCKOUT_DURATION_MS) {
      return true;
    }
    failedAttempts.delete(username);
    return false;
  }
  return false;
}

function recordFailedAttempt(username) {
  const record = failedAttempts.get(username) || { count: 0, lastAttempt: 0 };
  record.count++;
  record.lastAttempt = Date.now();
  failedAttempts.set(username, record);
}

function clearFailedAttempts(username) {
  failedAttempts.delete(username);
}

async function platformLogin(req, res) {
  const { username, password } = req.body;
  
  // Custom header check - must come from the platform login page
  const platformHeader = req.headers['x-platform-access'];
  if (platformHeader !== 'worktrack-platform-2026') {
    return res.status(403).json({ error: 'Access denied' });
  }
  
  if (!username || !password) {
    return res.status(400).json({ error: 'Username and password are required' });
  }

  // Check account lockout
  if (isLockedOut(username)) {
    return res.status(429).json({ error: 'Account temporarily locked due to too many failed attempts. Try again in 15 minutes.' });
  }

  const [rows] = await pool.query(
    'SELECT * FROM admin_users WHERE username = ? AND is_active = 1 AND is_platform_admin = 1',
    [username]
  );
  
  if (rows.length === 0) {
    recordFailedAttempt(username);
    return res.status(401).json({ error: 'Invalid credentials' });
  }

  const admin = rows[0];
  const valid = await bcrypt.compare(password, admin.password_hash);
  
  if (!valid) {
    recordFailedAttempt(username);
    await logActivity(null, admin.id, 'platform_login_failed', `Failed login attempt for platform admin: ${username}`);
    return res.status(401).json({ error: 'Invalid credentials' });
  }

  // Clear failed attempts on successful login
  clearFailedAttempts(username);

  const token = jwt.sign(
    { id: admin.id, username: admin.username, email: admin.email, type: 'platform_admin', is_platform_admin: true },
    process.env.JWT_SECRET,
    { expiresIn: '12h' }
  );

  await logActivity(null, admin.id, 'platform_admin_login', `Platform admin logged in: ${admin.username}`);
  
  res.json({ 
    token, 
    platformAdmin: { 
      id: admin.id, 
      username: admin.username, 
      email: admin.email 
    } 
  });
}

async function platformMe(req, res) {
  res.json({ 
    id: req.platformAdmin.id, 
    username: req.platformAdmin.username, 
    email: req.platformAdmin.email 
  });
}

// ============================================================
// TENANT REQUESTS MANAGEMENT
// ============================================================

async function listTenantRequests(req, res) {
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 20;
  const offset = (page - 1) * limit;
  const { status } = req.query;

  let where = [];
  let params = [];

  if (status) {
    where.push('status = ?');
    params.push(status);
  }

  const whereClause = where.length ? 'WHERE ' + where.join(' AND ') : '';

  const [rows] = await pool.query(
    `SELECT tr.*, t.name as created_tenant_name 
     FROM tenant_requests tr
     LEFT JOIN tenants t ON tr.created_tenant_id = t.id
     ${whereClause}
     ORDER BY tr.created_at DESC
     LIMIT ? OFFSET ?`,
    [...params, limit, offset]
  );

  const [countRows] = await pool.query(
    `SELECT COUNT(*) as total FROM tenant_requests ${whereClause}`,
    params
  );

  res.json({
    requests: rows,
    total: countRows[0].total,
    page,
    totalPages: Math.ceil(countRows[0].total / limit),
  });
}

async function getTenantRequest(req, res) {
  const { id } = req.params;
  const [rows] = await pool.query('SELECT * FROM tenant_requests WHERE id = ?', [id]);
  
  if (rows.length === 0) {
    return res.status(404).json({ error: 'Tenant request not found' });
  }

  res.json(rows[0]);
}

async function approveTenantRequest(req, res) {
  const { id } = req.params;
  const { plan: overridePlan, max_employees: overrideMaxEmp, trial_days: overrideTrialDays } = req.body;

  const [requests] = await pool.query('SELECT * FROM tenant_requests WHERE id = ? AND status = "pending"', [id]);
  
  if (requests.length === 0) {
    return res.status(400).json({ error: 'Request not found or already processed' });
  }

  const request = requests[0];
  
  // Resolve plan: use override from body, or the requested_plan from the request, fallback to trial
  const planSlug = overridePlan || request.requested_plan || 'trial';
  
  // Look up plan details from subscription_plans
  const [planRows] = await pool.query('SELECT * FROM subscription_plans WHERE slug = ?', [planSlug]);
  const planDetails = planRows.length > 0 ? planRows[0] : null;
  
  const maxEmployees = overrideMaxEmp || (planDetails ? planDetails.max_employees : 50);
  const trialDays = overrideTrialDays || (planDetails ? planDetails.trial_days : 14);
  
  const slug = request.company_name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
    .substring(0, 100) + '-' + Date.now().toString(36);

  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    // Create tenant
    const [tenantResult] = await conn.query(
      `INSERT INTO tenants (name, slug, contact_email, contact_phone, plan, max_employees, status, trial_ends_at)
       VALUES (?, ?, ?, ?, ?, ?, 'active', DATE_ADD(CURDATE(), INTERVAL ? DAY))`,
      [request.company_name, slug, request.contact_email, request.contact_phone, planSlug, maxEmployees, trialDays]
    );
    const tenantId = tenantResult.insertId;

    // Create tenant admin user (will set password via magic link)
    const tempHash = await bcrypt.hash(crypto.randomBytes(32).toString('hex'), 12);
    await conn.query(
      'INSERT INTO admin_users (username, email, password_hash, is_active, tenant_id, is_platform_admin) VALUES (?, ?, ?, 1, ?, 0)',
      [request.contact_email.split('@')[0], request.contact_email, tempHash, tenantId]
    );

    // Seed default settings for new tenant
    const defaults = [
      ['smtp_host', ''], ['smtp_port', '587'], ['smtp_user', ''], ['smtp_pass', ''], ['smtp_from', ''],
      ['office_lat', '30.0444'], ['office_lng', '31.2357'], ['office_radius_meters', '200'],
      ['work_week_start', 'Sunday'], ['work_week_end', 'Thursday'],
      ['period_start_day', '15'], ['period_end_day', '16'],
      ['logo_data', ''], ['allowed_email_domain', ''],
      ['company_name', request.company_name], ['company_address', ''],
      ['company_representative', ''], ['company_representative_title', ''],
      ['company_phone', ''], ['company_fax', ''], ['company_commercial_register', ''],
      ['company_tax_card', ''], ['company_location_url', ''],
    ];
    
    for (const [key, value] of defaults) {
      await conn.query('INSERT INTO settings (\`key\`, \`value\`, tenant_id) VALUES (?, ?, ?)', [key, value, tenantId]);
    }

    // Seed service toggles
    const serviceDefaults = [
      { key: 'wfh', name: 'Work From Home', desc: 'Allow employees to sign in remotely', icon: 'home', order: 1 },
      { key: 'office_attendance', name: 'Office Attendance', desc: 'Track office check-in/out with GPS', icon: 'building', order: 2 },
      { key: 'leaves', name: 'Leave Management', desc: 'Request and approve leave', icon: 'calendar-x', order: 3 },
      { key: 'recruitment', name: 'Recruitment', desc: 'Job postings and candidate pipeline', icon: 'briefcase', order: 4 },
      { key: 'people', name: 'People Management', desc: 'Employee profiles, documents, contracts', icon: 'users', order: 5 },
      { key: 'manager', name: 'Manager Tools', desc: 'Team approvals and dashboard', icon: 'user-check', order: 6 },
      { key: 'assets', name: 'Asset Management', desc: 'Track company assets and assignments', icon: 'laptop', order: 7 },
      { key: 'payroll', name: 'Payroll Components', desc: 'Salary components and structures', icon: 'dollar-sign', order: 8 },
    ];

    for (const svc of serviceDefaults) {
      await conn.query(
        'INSERT INTO service_toggles (service_key, service_name, description, icon, is_enabled, is_visible, sort_order, tenant_id) VALUES (?, ?, ?, ?, 1, 1, ?, ?)',
        [svc.key, svc.name, svc.desc, svc.icon, svc.order, tenantId]
      );
    }

    // Seed default permissions and roles
    await seedTenantRBAC(conn, tenantId);

    // Update request
    await conn.query(
      'UPDATE tenant_requests SET status = "approved", reviewed_by = ?, reviewed_at = NOW(), created_tenant_id = ? WHERE id = ?',
      [req.platformAdmin.id, tenantId, id]
    );

    await conn.commit();

    // Send magic link to tenant admin
    await sendTenantAdminMagicLink(request.contact_email, request.company_name, tenantId);

    // Notify platform admin
    await sendPlatformEmail(
      req.platformAdmin.email,
      `Tenant Approved: ${request.company_name}`,
      `Tenant "${request.company_name}" has been approved and created (ID: ${tenantId}). Magic link sent to ${request.contact_email}.`
    );

    await logActivity(null, req.platformAdmin.id, 'tenant_approved', `Approved tenant request: ${request.company_name} (ID: ${tenantId})`);

    res.json({ 
      message: 'Tenant request approved', 
      tenantId,
      tenantName: request.company_name 
    });
  } catch (err) {
    await conn.rollback();
    console.error('Approve tenant error:', err);
    res.status(500).json({ error: err.message || 'Failed to approve tenant request' });
  } finally {
    conn.release();
  }
}

async function rejectTenantRequest(req, res) {
  const { id } = req.params;
  const { rejection_reason } = req.body;

  const [requests] = await pool.query('SELECT * FROM tenant_requests WHERE id = ? AND status = "pending"', [id]);
  
  if (requests.length === 0) {
    return res.status(400).json({ error: 'Request not found or already processed' });
  }

  const request = requests[0];

  await pool.query(
    'UPDATE tenant_requests SET status = "rejected", reviewed_by = ?, reviewed_at = NOW(), rejection_reason = ? WHERE id = ?',
    [req.platformAdmin.id, rejection_reason || null, id]
  );

  // Send rejection email
  await sendTenantRejectedEmail(request.contact_email, request.company_name, rejection_reason);

  await logActivity(null, req.platformAdmin.id, 'tenant_rejected', `Rejected tenant request: ${request.company_name} - ${rejection_reason || 'No reason'}`);

  res.json({ message: 'Tenant request rejected' });
}

// ============================================================
// TENANTS MANAGEMENT
// ============================================================

async function listTenants(req, res) {
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 20;
  const offset = (page - 1) * limit;
  const { status } = req.query;

  let where = [];
  let params = [];

  if (status) {
    where.push('status = ?');
    params.push(status);
  }

  const whereClause = where.length ? 'WHERE ' + where.join(' AND ') : '';

  const [rows] = await pool.query(
    `SELECT t.*, 
      (SELECT COUNT(*) FROM employees WHERE tenant_id = t.id AND (is_system IS NULL OR is_system = 0)) as employee_count,
      (SELECT COUNT(*) FROM admin_users WHERE tenant_id = t.id AND is_platform_admin = 0) as admin_count
     FROM tenants t
     ${whereClause}
     ORDER BY t.created_at DESC
     LIMIT ? OFFSET ?`,
    [...params, limit, offset]
  );

  const [countRows] = await pool.query(
    `SELECT COUNT(*) as total FROM tenants ${whereClause}`,
    params
  );

  res.json({
    tenants: rows,
    total: countRows[0].total,
    page,
    totalPages: Math.ceil(countRows[0].total / limit),
  });
}

async function getTenant(req, res) {
  const { id } = req.params;
  
  const [rows] = await pool.query(
    `SELECT t.*, 
      (SELECT COUNT(*) FROM employees WHERE tenant_id = t.id AND (is_system IS NULL OR is_system = 0)) as employee_count,
      (SELECT COUNT(*) FROM admin_users WHERE tenant_id = t.id AND is_platform_admin = 0) as admin_count
     FROM tenants t WHERE t.id = ?`,
    [id]
  );
  
  if (rows.length === 0) {
    return res.status(404).json({ error: 'Tenant not found' });
  }

  res.json(rows[0]);
}

async function updateTenant(req, res) {
  const { id } = req.params;
  const { name, contact_email, contact_phone, plan, max_employees, status, trial_ends_at } = req.body;

  const [rows] = await pool.query('SELECT * FROM tenants WHERE id = ?', [id]);
  if (rows.length === 0) {
    return res.status(404).json({ error: 'Tenant not found' });
  }

  const updates = [];
  const values = [];

  if (name !== undefined) { updates.push('name = ?'); values.push(name); }
  if (contact_email !== undefined) { updates.push('contact_email = ?'); values.push(contact_email); }
  if (contact_phone !== undefined) { updates.push('contact_phone = ?'); values.push(contact_phone); }
  if (plan !== undefined) { updates.push('plan = ?'); values.push(plan); }
  if (max_employees !== undefined) { updates.push('max_employees = ?'); values.push(max_employees); }
  if (status !== undefined) { updates.push('status = ?'); values.push(status); }
  if (trial_ends_at !== undefined) { updates.push('trial_ends_at = ?'); values.push(trial_ends_at); }

  if (updates.length === 0) {
    return res.status(400).json({ error: 'No fields to update' });
  }

  values.push(id);
  await pool.query(`UPDATE tenants SET ${updates.join(', ')} WHERE id = ?`, values);

  await logActivity(null, req.platformAdmin.id, 'tenant_updated', `Updated tenant ${id}: ${updates.join(', ')}`);

  const [updated] = await pool.query('SELECT * FROM tenants WHERE id = ?', [id]);
  res.json(updated[0]);
}

async function suspendTenant(req, res) {
  const { id } = req.params;
  const { reason } = req.body;

  await pool.query('UPDATE tenants SET status = "suspended" WHERE id = ?', [id]);
  await logActivity(null, req.platformAdmin.id, 'tenant_suspended', `Suspended tenant ${id}: ${reason || 'No reason provided'}`);

  // Notify tenant admins
  const [admins] = await pool.query('SELECT email FROM admin_users WHERE tenant_id = ? AND is_platform_admin = 0 AND is_active = 1', [id]);
  for (const admin of admins) {
    await sendPlatformEmail(admin.email, 'Your WorkTrack Account Has Been Suspended', 
      `Your tenant account has been suspended. Reason: ${reason || 'Not specified'}. Please contact WorkTrack support.`
    );
  }

  res.json({ message: 'Tenant suspended' });
}

async function activateTenant(req, res) {
  const { id } = req.params;

  await pool.query('UPDATE tenants SET status = "active" WHERE id = ?', [id]);
  await logActivity(null, req.platformAdmin.id, 'tenant_activated', `Activated tenant ${id}`);

  const [admins] = await pool.query('SELECT email FROM admin_users WHERE tenant_id = ? AND is_platform_admin = 0 AND is_active = 1', [id]);
  for (const admin of admins) {
    await sendPlatformEmail(admin.email, 'Your WorkTrack Account Has Been Reactivated', 
      'Your tenant account has been reactivated. You can now log in normally.'
    );
  }

  res.json({ message: 'Tenant activated' });
}

// ============================================================
// PLATFORM STATS
// ============================================================

async function getPlatformStats(req, res) {
  const [tenantStats] = await pool.query(`
    SELECT 
      COUNT(*) as total_tenants,
      SUM(CASE WHEN status = 'active' THEN 1 ELSE 0 END) as active_tenants,
      SUM(CASE WHEN status = 'trial' THEN 1 ELSE 0 END) as trial_tenants,
      SUM(CASE WHEN status = 'suspended' THEN 1 ELSE 0 END) as suspended_tenants,
      SUM(CASE WHEN status = 'cancelled' THEN 1 ELSE 0 END) as cancelled_tenants
    FROM tenants
  `);

  const [employeeStats] = await pool.query(`
    SELECT COUNT(*) as total_employees 
    FROM employees 
    WHERE is_system IS NULL OR is_system = 0
  `);

  const [requestStats] = await pool.query(`
    SELECT 
      COUNT(*) as total_requests,
      SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END) as pending_requests,
      SUM(CASE WHEN status = 'approved' THEN 1 ELSE 0 END) as approved_requests,
      SUM(CASE WHEN status = 'rejected' THEN 1 ELSE 0 END) as rejected_requests
    FROM tenant_requests
  `);

  const [recentActivity] = await pool.query(`
    SELECT al.*, au.username as admin_username 
    FROM activity_log al
    LEFT JOIN admin_users au ON al.admin_id = au.id
    WHERE al.tenant_id IS NULL
    ORDER BY al.created_at DESC
    LIMIT 20
  `);

  res.json({
    tenants: tenantStats[0],
    employees: employeeStats[0],
    requests: requestStats[0],
    recentActivity,
  });
}

// ============================================================
// HELPER: Seed RBAC for new tenant
// ============================================================

async function seedTenantRBAC(conn, tenantId) {
  // Insert permissions (same as in seed.js)
  const permissions = [
    { module: 'people', action: 'view', label: 'View People', desc: 'View employee list and profiles' },
    { module: 'people', action: 'create', label: 'Create Employee', desc: 'Add new employees' },
    { module: 'people', action: 'edit', label: 'Edit Employee', desc: 'Modify employee information' },
    { module: 'people', action: 'delete', label: 'Delete Employee', desc: 'Remove employees' },
    { module: 'people', action: 'export', label: 'Export People Data', desc: 'Export employee data to Excel' },
    { module: 'people', action: 'manage_positions', label: 'Manage Positions', desc: 'Create/edit/delete job positions' },
    { module: 'people', action: 'manage_grades', label: 'Manage Grades', desc: 'Create/edit/delete salary grades' },
    { module: 'people', action: 'manage_departments', label: 'Manage Departments', desc: 'Create/edit/delete departments' },
    { module: 'people', action: 'view_documents', label: 'View Documents', desc: 'View employee documents' },
    { module: 'people', action: 'manage_documents', label: 'Manage Documents', desc: 'Upload/verify/reject documents' },
    { module: 'people', action: 'manage_contracts', label: 'Manage Contracts', desc: 'Create/manage contract templates and contracts' },
    { module: 'people', action: 'manage_checklists', label: 'Manage Checklists', desc: 'Create/manage onboarding/offboarding checklists' },
    { module: 'attendance', action: 'view', label: 'View Attendance', desc: 'View attendance records and calendar' },
    { module: 'attendance', action: 'edit', label: 'Edit Attendance', desc: 'Modify attendance records' },
    { module: 'attendance', action: 'delete', label: 'Delete Attendance', desc: 'Delete attendance records' },
    { module: 'attendance', action: 'export', label: 'Export Attendance', desc: 'Export attendance reports' },
    { module: 'attendance', action: 'approve_signout', label: 'Approve Sign-Out', desc: 'Approve/reject sign-out requests' },
    { module: 'attendance', action: 'manage_leaves', label: 'Manage Leaves', desc: 'View/approve/reject leave requests' },
    { module: 'attendance', action: 'manage_leave_types', label: 'Manage Leave Types', desc: 'Create/edit/delete leave types' },
    { module: 'attendance', action: 'manage_holidays', label: 'Manage Holidays', desc: 'Create/edit/delete holidays' },
    { module: 'attendance', action: 'view_balances', label: 'View Leave Balances', desc: 'View employee leave balances' },
    { module: 'attendance', action: 'adjust_balances', label: 'Adjust Leave Balances', desc: 'Modify leave balances' },
    { module: 'recruitment', action: 'view', label: 'View Recruitment', desc: 'View jobs and candidates' },
    { module: 'recruitment', action: 'create_job', label: 'Create Jobs', desc: 'Create new job postings' },
    { module: 'recruitment', action: 'edit_job', label: 'Edit Jobs', desc: 'Modify job postings' },
    { module: 'recruitment', action: 'delete_job', label: 'Delete Jobs', desc: 'Remove job postings' },
    { module: 'recruitment', action: 'manage_candidates', label: 'Manage Candidates', desc: 'Move candidates through pipeline' },
    { module: 'recruitment', action: 'interview', label: 'Conduct Interviews', desc: 'Schedule/conduct interviews' },
    { module: 'recruitment', action: 'make_offers', label: 'Make Offers', desc: 'Create and send job offers' },
    { module: 'recruitment', action: 'manage_workflows', label: 'Manage Workflows', desc: 'Create/edit recruitment workflows' },
    { module: 'recruitment', action: 'manage_templates', label: 'Manage Templates', desc: 'Manage message/workflow templates' },
    { module: 'it', action: 'manage_smtp', label: 'Manage SMTP', desc: 'Configure email server settings' },
    { module: 'it', action: 'manage_geofence', label: 'Manage Geofence', desc: 'Configure office GPS location' },
    { module: 'it', action: 'manage_branding', label: 'Manage Branding', desc: 'Configure logo, colors, company info' },
    { module: 'it', action: 'manage_meetings', label: 'Manage Meeting Integrations', desc: 'Configure Google/Teams meeting integrations' },
    { module: 'admin', action: 'manage_users', label: 'Manage Users', desc: 'Create/edit/deactivate admin and employee users' },
    { module: 'admin', action: 'manage_roles', label: 'Manage Roles', desc: 'Create/edit roles and permissions' },
    { module: 'admin', action: 'manage_services', label: 'Manage Service Toggles', desc: 'Enable/disable system services' },
    { module: 'admin', action: 'view_audit', label: 'View Audit Log', desc: 'View system activity and audit logs' },
    { module: 'audit', action: 'view', label: 'View Audit Logs', desc: 'View all system activity logs' },
    { module: 'audit', action: 'export', label: 'Export Audit Logs', desc: 'Export audit logs for compliance' },
    { module: 'hr', action: 'view', label: 'View HR Data', desc: 'Access HR portal' },
    { module: 'hr', action: 'manage_settings', label: 'Manage HR Settings', desc: 'Configure HR-specific settings' },
  ];

  for (const perm of permissions) {
    await conn.query(
      'INSERT IGNORE INTO permissions (module, action, label, description, is_system, tenant_id) VALUES (?, ?, ?, ?, 1, ?)',
      [perm.module, perm.action, perm.label, perm.desc, tenantId]
    );
  }

  // Default roles
  const roles = [
    { name: 'tenant_admin', display: 'Tenant Administrator', desc: 'Full access to tenant administration', isSystem: 1 },
    { name: 'hr_manager', display: 'HR Manager', desc: 'Manage people, attendance, leaves, recruitment', isSystem: 1 },
    { name: 'hr_officer', display: 'HR Officer', desc: 'Operational HR tasks', isSystem: 1 },
    { name: 'it_admin', display: 'IT Administrator', desc: 'Full IT module access', isSystem: 1 },
    { name: 'audit_officer', display: 'Audit Officer', desc: 'Full Audit module access', isSystem: 1 },
    { name: 'manager', display: 'Department Manager', desc: 'Team management access', isSystem: 1 },
    { name: 'employee', display: 'Employee', desc: 'Basic employee self-service', isSystem: 1 },
  ];

  for (const role of roles) {
    await conn.query(
      'INSERT IGNORE INTO roles (name, display_name, description, is_system, tenant_id) VALUES (?, ?, ?, ?, ?)',
      [role.name, role.display, role.desc, role.isSystem, tenantId]
    );
  }

  // Get permission IDs for this tenant
  const [perms] = await conn.query('SELECT id, module, action FROM permissions WHERE tenant_id = ?', [tenantId]);
  const permMap = {};
  perms.forEach(p => { permMap[`${p.module}.${p.action}`] = p.id; });

  // Get role IDs
  const [roleRows] = await conn.query('SELECT id, name FROM roles WHERE tenant_id = ?', [tenantId]);
  const roleMap = {};
  roleRows.forEach(r => { roleMap[r.name] = r.id; });

  // Assign permissions to roles
  const rolePerms = {
    tenant_admin: Object.keys(permMap).filter(k => !k.startsWith('platform')),
    hr_manager: Object.keys(permMap).filter(k => ['people','attendance','recruitment','hr'].includes(k.split('.')[0])),
    hr_officer: Object.keys(permMap).filter(k => ['people','attendance'].includes(k.split('.')[0]) && ['view','create','edit'].includes(k.split('.')[1])),
    it_admin: Object.keys(permMap).filter(k => ['it','admin'].includes(k.split('.')[0])),
    audit_officer: Object.keys(permMap).filter(k => k.startsWith('audit')),
    manager: Object.keys(permMap).filter(k => ['people','attendance','recruitment'].includes(k.split('.')[0]) && ['view','create','edit'].includes(k.split('.')[1])),
    employee: Object.keys(permMap).filter(k => ['people','attendance'].includes(k.split('.')[0]) && k.split('.')[1] === 'view'),
  };

  for (const [roleName, permKeys] of Object.entries(rolePerms)) {
    const roleId = roleMap[roleName];
    if (!roleId) continue;
    
    for (const permKey of permKeys) {
      const permId = permMap[permKey];
      if (permId) {
        await conn.query(
          'INSERT IGNORE INTO role_permissions (role_id, permission_id) VALUES (?, ?)',
          [roleId, permId]
        );
      }
    }
  }
}

module.exports = {
  platformLogin,
  platformMe,
  listTenantRequests,
  getTenantRequest,
  approveTenantRequest,
  rejectTenantRequest,
  listTenants,
  getTenant,
  updateTenant,
  suspendTenant,
  activateTenant,
  getPlatformStats,
};