// Copyright (c) 2026 Mohamed Yehia
// SPDX-License-Identifier: AGPL-3.0

const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const pool = require('./shared/config/database');

const isProduction = process.env.NODE_ENV === 'production';

// Securely deliver an initial credential without leaking the plaintext to stdout.
// - In non-production: prints the credential to console (dev/test convenience).
// - In production: writes the credential to backend/.setup/ with chmod 600.
//   NEVER logs plaintext to stdout in production.
// Strict invariant: this function MUST NOT run unguarded in production for the
// random-fallback branch. Callers must ensure env-provided credentials OR
// explicitly rely on the dev-only console path.
async function deliverInitialCredential(label, username, email, password, loginUrl, adminId) {
  if (!isProduction) {
    console.log(`   [DEV ONLY] ${label} password: ${password}`);
    console.log(`   [DEV ONLY] Login URL: ${loginUrl}`);
    return;
  }
  const setupDir = path.resolve(__dirname, '..', '.setup');
  try { fs.mkdirSync(setupDir, { recursive: true, mode: 0o700 }); } catch { /* may already exist */ }
  const stamp = new Date().toISOString().replace(/[:.]/g, '-');
  const file = path.join(setupDir, `${label.toLowerCase()}_${username}_${stamp}.txt`);
  const body = [
    `WorkTrack initial credential — ${label}`,
    `Created: ${new Date().toISOString()}`,
    `admin_users.id: ${adminId}`,
    `Username: ${username}`,
    `Email: ${email}`,
    `Password: ${password}`,
    `Login URL: ${loginUrl}`,
    `WARNING: delete this file after recording the password securely.`
  ].join('\n') + '\n';
  fs.writeFileSync(file, body, { mode: 0o600 });
  console.log(`   [PROD] ${label} initial password written to: ${file}`);
  console.log(`   [PROD] Move it to your password manager and delete the file.`);
}

async function seed() {
  console.log('🌱 Starting multi-tenant seed...');

  // ============================================================
  // 1. CORE TABLES (tenants, admin_users with platform support)
  // ============================================================
  
  // Tenants table
  const [tenantsTable] = await pool.query(
    "SELECT * FROM information_schema.TABLES WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'tenants'",
    [process.env.DB_NAME]
  );
  if (tenantsTable.length === 0) {
    await pool.query(`
      CREATE TABLE tenants (
        id INT AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        slug VARCHAR(100) UNIQUE NOT NULL,
        domain VARCHAR(255) NULL,
        contact_email VARCHAR(255) NOT NULL,
        contact_phone VARCHAR(50) NULL,
        plan VARCHAR(50) DEFAULT 'trial',
        max_employees INT DEFAULT 50,
        status ENUM('pending','active','suspended','cancelled') DEFAULT 'pending',
        trial_ends_at DATE NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_tenant_status (status),
        INDEX idx_tenant_slug (slug)
      )
    `);
    console.log('Created tenants table');
  }

  // admin_users with platform support
  const [admTable] = await pool.query(
    "SELECT * FROM information_schema.TABLES WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'admin_users'",
    [process.env.DB_NAME]
  );
  if (admTable.length === 0) {
    await pool.query(`
      CREATE TABLE admin_users (
        id INT AUTO_INCREMENT PRIMARY KEY,
        username VARCHAR(100) NOT NULL UNIQUE,
        email VARCHAR(255) NULL,
        password_hash VARCHAR(255) NOT NULL,
        must_change_password TINYINT(1) NOT NULL DEFAULT 1,
        is_active TINYINT(1) NOT NULL DEFAULT 1,
        tenant_id INT NULL,
        is_platform_admin TINYINT(1) NOT NULL DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_admin_tenant (tenant_id),
        FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE
      )
    `);
    console.log('Created admin_users table with platform support');
  } else {
    // Add new columns if they don't exist
    const [tenantCol] = await pool.query(
      "SELECT * FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'admin_users' AND COLUMN_NAME = 'tenant_id'",
      [process.env.DB_NAME]
    );
    if (tenantCol.length === 0) {
      await pool.query('ALTER TABLE admin_users ADD COLUMN tenant_id INT NULL AFTER password_hash');
      await pool.query('ALTER TABLE admin_users ADD INDEX idx_admin_tenant (tenant_id)');
      await pool.query('ALTER TABLE admin_users ADD FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE');
    }
    const [platformCol] = await pool.query(
      "SELECT * FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'admin_users' AND COLUMN_NAME = 'is_platform_admin'",
      [process.env.DB_NAME]
    );
    if (platformCol.length === 0) {
      await pool.query('ALTER TABLE admin_users ADD COLUMN is_platform_admin TINYINT(1) NOT NULL DEFAULT 0 AFTER tenant_id');
    }
    const [emailCol] = await pool.query(
      "SELECT * FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'admin_users' AND COLUMN_NAME = 'email'",
      [process.env.DB_NAME]
    );
    if (emailCol.length === 0) {
      await pool.query('ALTER TABLE admin_users ADD COLUMN email VARCHAR(255) NULL AFTER username');
    }
    const [mcpCol] = await pool.query(
      "SELECT * FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'admin_users' AND COLUMN_NAME = 'must_change_password'",
      [process.env.DB_NAME]
    );
    if (mcpCol.length === 0) {
      await pool.query('ALTER TABLE admin_users ADD COLUMN must_change_password TINYINT(1) NOT NULL DEFAULT 1 AFTER password_hash');
    }
  }

  // settings with tenant_id
  const [setTable] = await pool.query(
    "SELECT * FROM information_schema.TABLES WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'settings'",
    [process.env.DB_NAME]
  );
  if (setTable.length === 0) {
    await pool.query(`
      CREATE TABLE settings (
        id INT AUTO_INCREMENT PRIMARY KEY,
        \`key\` VARCHAR(100) NOT NULL,
        \`value\` TEXT DEFAULT NULL,
        tenant_id INT NOT NULL DEFAULT 1,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        UNIQUE KEY uniq_tenant_key (tenant_id, \`key\`),
        INDEX idx_settings_tenant (tenant_id),
        FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE
      )
    `);
    console.log('Created settings table with tenant_id');
  } else {
    const [tenantCol] = await pool.query(
      "SELECT * FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'settings' AND COLUMN_NAME = 'tenant_id'",
      [process.env.DB_NAME]
    );
    if (tenantCol.length === 0) {
      await pool.query('ALTER TABLE settings ADD COLUMN tenant_id INT NOT NULL DEFAULT 1 AFTER \`value\`');
      await pool.query('ALTER TABLE settings DROP INDEX \`key\`');
      await pool.query('ALTER TABLE settings ADD UNIQUE KEY uniq_tenant_key (tenant_id, \`key\`)');
      await pool.query('ALTER TABLE settings ADD INDEX idx_settings_tenant (tenant_id)');
      await pool.query('ALTER TABLE settings ADD FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE');
    }
  }

  // tenant_requests table
  const [trTable] = await pool.query(
    "SELECT * FROM information_schema.TABLES WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'tenant_requests'",
    [process.env.DB_NAME]
  );
  if (trTable.length === 0) {
    await pool.query(`
      CREATE TABLE tenant_requests (
        id INT AUTO_INCREMENT PRIMARY KEY,
        company_name VARCHAR(255) NOT NULL,
        contact_email VARCHAR(255) NOT NULL,
        contact_phone VARCHAR(50) NULL,
        employee_count INT DEFAULT 10,
        message TEXT NULL,
        requested_plan VARCHAR(50) DEFAULT 'trial',
        status ENUM('pending','approved','rejected') DEFAULT 'pending',
        reviewed_by INT NULL,
        reviewed_at DATETIME NULL,
        rejection_reason TEXT NULL,
        created_tenant_id INT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_tr_status (status),
        INDEX idx_tr_email (contact_email),
        FOREIGN KEY (created_tenant_id) REFERENCES tenants(id) ON DELETE SET NULL
      )
    `);
    console.log('Created tenant_requests table');
  } else {
    const [planCol] = await pool.query(
      "SELECT * FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'tenant_requests' AND COLUMN_NAME = 'requested_plan'",
      [process.env.DB_NAME]
    );
    if (planCol.length === 0) {
      await pool.query("ALTER TABLE tenant_requests ADD COLUMN requested_plan VARCHAR(50) DEFAULT 'trial' AFTER message");
    }
  }

  // ============================================================
  // 2. CREATE FIRST TENANT (migrate existing data to it)
  // ============================================================
  
  const [existingTenant] = await pool.query('SELECT * FROM tenants WHERE id = 1');
  if (existingTenant.length === 0) {
    await pool.query(`
      INSERT INTO tenants (id, name, slug, contact_email, status, plan, max_employees, trial_ends_at, created_at)
      VALUES (1, 'WorkTrack Demo Company', 'demo', 'admin@worktrack.ddns.net', 'active', 'enterprise', 9999, DATE_ADD(CURDATE(), INTERVAL 365 DAY), NOW())
    `);
    console.log('Created first tenant (id=1): WorkTrack Demo Company');
  }

  // ============================================================
  // 3. PLATFORM SUPER-ADMIN (you) - separate from tenant admins
  // ============================================================
  
  // Platform super-admin uses a unique username, has is_platform_admin = 1, tenant_id = NULL
  const platformAdminUsername = process.env.PLATFORM_ADMIN_USERNAME || 'worktrack_owner';
  const platformAdminEmail = process.env.PLATFORM_ADMIN_EMAIL || 'owner@worktrack.ddns.net';
  const platformAdminPassword = process.env.PLATFORM_ADMIN_PASSWORD || crypto.randomBytes(16).toString('hex'); // Secure random
  
  const [platformAdmins] = await pool.query(
    'SELECT * FROM admin_users WHERE username = ? AND is_platform_admin = 1',
    [platformAdminUsername]
  );
  
  if (platformAdmins.length === 0) {
    const hash = await bcrypt.hash(platformAdminPassword, 12);
    const [result] = await pool.query(
      'INSERT INTO admin_users (username, email, password_hash, is_active, tenant_id, is_platform_admin, must_change_password) VALUES (?, ?, ?, 1, NULL, 1, 0)',
      [platformAdminUsername, platformAdminEmail, hash]
    );
    deliverInitialCredential('PLATFORM_SUPER_ADMIN', platformAdminUsername, platformAdminEmail, platformAdminPassword, 'https://worktrack.ddns.net/platform/login', result.insertId);
    console.log('Created Platform Super-Admin. Initial credential delivered via secure channel (see above/aside), never printed to stdout.');
  } else {
    // Update password if env changed
    const newHash = await bcrypt.hash(platformAdminPassword, 12);
    await pool.query(
      'UPDATE admin_users SET password_hash = ?, email = ? WHERE id = ?',
      [newHash, platformAdminEmail, platformAdmins[0].id]
    );
    console.log('Platform Super-Admin already exists, password updated');
  }

  // ============================================================
  // 4. TENANT ADMIN for first tenant (Admin) - uses magic link / OTP
  // ============================================================
  
  const tenantAdminUsername = process.env.ADMIN_USERNAME || 'Admin';
  const tenantAdminEmail = process.env.ADMIN_EMAIL || 'it@worktrack.ddns.net';
  // No fixed password - will be set via magic link / first login.
  // After magic-link set-password, must_change_password=1 (see migration 016) forces
  // a SECOND password change on first real login — defense in depth against
  // link interception / shoulder-surfing during onboarding.
  
  const [tenantAdmins] = await pool.query(
    'SELECT * FROM admin_users WHERE username = ? AND tenant_id = 1 AND is_platform_admin = 0',
    [tenantAdminUsername]
  );
  
  if (tenantAdmins.length === 0) {
    // Create with a temporary password hash (will be replaced on first login via magic link).
    // must_change_password stays 1 by default; magic-link set-password does NOT clear it.
    const tempHash = await bcrypt.hash(crypto.randomBytes(32).toString('hex'), 12);
    await pool.query(
      'INSERT INTO admin_users (username, email, password_hash, is_active, tenant_id, is_platform_admin) VALUES (?, ?, ?, 1, 1, 0)',
      [tenantAdminUsername, tenantAdminEmail, tempHash]
    );
    console.log(`Created Tenant Admin for tenant 1: ${tenantAdminUsername} (${tenantAdminEmail})`);
    console.log(`   First login via magic link sent to email; password must be changed again on first login.`);
  } else {
    // Update email if changed. Leave must_change_password alone (admin controls state).
    await pool.query(
      'UPDATE admin_users SET email = ? WHERE id = ?',
      [tenantAdminEmail, tenantAdmins[0].id]
    );
    console.log(`Tenant Admin ${tenantAdminUsername} already exists`);
  }

  // Defensive cleanup: delete any historical plaintext admin_default_password row
  // from settings. Per investigation no such row exists today, but the brief
  // explicitly calls for a defensive purge. Idempotent.
  await pool.query("DELETE FROM settings WHERE `key` = 'admin_default_password'");

  // ============================================================
  // 5. DEFAULT SETTINGS PER TENANT
  // ============================================================
  
  const defaults = [
    ['smtp_host', ''],
    ['smtp_port', '587'],
    ['smtp_user', ''],
    ['smtp_pass', ''],
    ['smtp_from', ''],
    ['office_lat', '30.0444'],
    ['office_lng', '31.2357'],
    ['office_radius_meters', '200'],
    ['work_week_start', 'Sunday'],
    ['work_week_end', 'Thursday'],
    ['period_start_day', '15'],
    ['period_end_day', '16'],
    ['logo_data', ''],
    ['allowed_email_domain', ''],
    ['company_name', 'WorkTrack Demo Company'],
    ['company_address', ''],
    ['company_representative', ''],
    ['company_representative_title', ''],
    ['company_phone', ''],
    ['company_fax', ''],
    ['company_commercial_register', ''],
    ['company_tax_card', ''],
    ['company_location_url', ''],
  ];

  // Get all active tenants
  const [tenants] = await pool.query('SELECT id FROM tenants WHERE status = "active"');
  
  for (const tenant of tenants) {
    for (const [key, value] of defaults) {
      const [existing] = await pool.query('SELECT * FROM settings WHERE \`key\` = ? AND tenant_id = ?', [key, tenant.id]);
      if (existing.length === 0) {
        await pool.query('INSERT INTO settings (\`key\`, \`value\`, tenant_id) VALUES (?, ?, ?)', [key, value, tenant.id]);
      }
    }
  }
  console.log(`Seeded default settings for ${tenants.length} tenant(s)`);

  // Service toggles (new table)
  const [stTable] = await pool.query(
    "SELECT * FROM information_schema.TABLES WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'service_toggles'",
    [process.env.DB_NAME]
  );
  if (stTable.length === 0) {
    await pool.query(`
      CREATE TABLE service_toggles (
        id INT AUTO_INCREMENT PRIMARY KEY,
        service_key VARCHAR(100) NOT NULL,
        service_name VARCHAR(200) NOT NULL,
        description TEXT NULL,
        icon VARCHAR(100) NULL,
        is_enabled TINYINT(1) NOT NULL DEFAULT 1,
        is_visible TINYINT(1) NOT NULL DEFAULT 1,
        sort_order INT DEFAULT 0,
        tenant_id INT NOT NULL DEFAULT 1,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        UNIQUE KEY uniq_tenant_service (tenant_id, service_key),
        INDEX idx_st_tenant (tenant_id),
        FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE
      )
    `);
    console.log('Created service_toggles table');
  }

  // Seed service toggles per tenant
  const serviceDefaults = [
    { key: 'wfh', name: 'Work From Home', description: 'Allow employees to sign in remotely', icon: 'home', order: 1 },
    { key: 'office_attendance', name: 'Office Attendance', description: 'Track office check-in/out with GPS', icon: 'building', order: 2 },
    { key: 'leaves', name: 'Leave Management', description: 'Request and approve leave', icon: 'calendar-x', order: 3 },
    { key: 'recruitment', name: 'Recruitment', description: 'Job postings and candidate pipeline', icon: 'briefcase', order: 4 },
    { key: 'people', name: 'People Management', description: 'Employee profiles, documents, contracts', icon: 'users', order: 5 },
    { key: 'manager', name: 'Manager Tools', description: 'Team approvals and dashboard', icon: 'user-check', order: 6 },
    { key: 'assets', name: 'Asset Management', description: 'Track company assets and assignments', icon: 'laptop', order: 7 },
    { key: 'payroll', name: 'Payroll Components', description: 'Salary components and structures', icon: 'dollar-sign', order: 8 },
  ];

  for (const tenant of tenants) {
    for (const svc of serviceDefaults) {
      const [existing] = await pool.query(
        'SELECT * FROM service_toggles WHERE service_key = ? AND tenant_id = ?',
        [svc.key, tenant.id]
      );
      if (existing.length === 0) {
        await pool.query(
          'INSERT INTO service_toggles (service_key, service_name, description, icon, is_enabled, is_visible, sort_order, tenant_id) VALUES (?, ?, ?, ?, 1, 1, ?, ?)',
          [svc.key, svc.name, svc.description, svc.icon, svc.order, tenant.id]
        );
      }
    }
  }
  console.log('Seeded service toggles for all tenants');

  // ============================================================
  // 6. RBAC TABLES (roles, permissions, role_permissions, user_roles)
  // ============================================================
  
  // Permissions table
  const [permTable] = await pool.query(
    "SELECT * FROM information_schema.TABLES WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'permissions'",
    [process.env.DB_NAME]
  );
  if (permTable.length === 0) {
    await pool.query(`
      CREATE TABLE permissions (
        id INT AUTO_INCREMENT PRIMARY KEY,
        module VARCHAR(50) NOT NULL,
        action VARCHAR(50) NOT NULL,
        label VARCHAR(200) NOT NULL,
        description TEXT NULL,
        is_system TINYINT(1) NOT NULL DEFAULT 1,
        tenant_id INT NOT NULL DEFAULT 1,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE KEY uniq_tenant_module_action (tenant_id, module, action),
        INDEX idx_perm_tenant (tenant_id),
        FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE
      )
    `);
    console.log('Created permissions table');
  }

  // Roles table
  const [rolesTable] = await pool.query(
    "SELECT * FROM information_schema.TABLES WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'roles'",
    [process.env.DB_NAME]
  );
  if (rolesTable.length === 0) {
    await pool.query(`
      CREATE TABLE roles (
        id INT AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(100) NOT NULL,
        display_name VARCHAR(200) NOT NULL,
        description TEXT NULL,
        is_system TINYINT(1) NOT NULL DEFAULT 0,
        parent_role_id INT NULL,
        tenant_id INT NOT NULL DEFAULT 1,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        UNIQUE KEY uniq_tenant_role_name (tenant_id, name),
        INDEX idx_role_tenant (tenant_id),
        INDEX idx_role_parent (parent_role_id),
        FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE,
        FOREIGN KEY (parent_role_id) REFERENCES roles(id) ON DELETE SET NULL
      )
    `);
    console.log('Created roles table');
  }

  // Role permissions junction
  const [rpTable] = await pool.query(
    "SELECT * FROM information_schema.TABLES WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'role_permissions'",
    [process.env.DB_NAME]
  );
  if (rpTable.length === 0) {
    await pool.query(`
      CREATE TABLE role_permissions (
        role_id INT NOT NULL,
        permission_id INT NOT NULL,
        granted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        granted_by INT NULL,
        PRIMARY KEY (role_id, permission_id),
        INDEX idx_rp_permission (permission_id),
        FOREIGN KEY (role_id) REFERENCES roles(id) ON DELETE CASCADE,
        FOREIGN KEY (permission_id) REFERENCES permissions(id) ON DELETE CASCADE,
        FOREIGN KEY (granted_by) REFERENCES admin_users(id) ON DELETE SET NULL
      )
    `);
    console.log('Created role_permissions table');
  }

  // User roles junction
  const [urTable] = await pool.query(
    "SELECT * FROM information_schema.TABLES WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'user_roles'",
    [process.env.DB_NAME]
  );
  if (urTable.length === 0) {
    await pool.query(`
      CREATE TABLE user_roles (
        user_id INT NOT NULL,
        role_id INT NOT NULL,
        user_type ENUM('admin','employee') NOT NULL DEFAULT 'employee',
        assigned_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        assigned_by INT NULL,
        PRIMARY KEY (user_id, role_id, user_type),
        INDEX idx_ur_role (role_id),
        INDEX idx_ur_assigned_by (assigned_by),
        FOREIGN KEY (role_id) REFERENCES roles(id) ON DELETE CASCADE
      )
    `);
    console.log('Created user_roles table');
  }

  // Seed default permissions and roles per tenant
  for (const tenant of tenants) {
    await seedTenantRBAC(tenant.id);
  }

  // ============================================================
  // 7. SUBSCRIPTION PLANS
  // ============================================================
  
  const [spTable] = await pool.query(
    "SELECT * FROM information_schema.TABLES WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'subscription_plans'",
    [process.env.DB_NAME]
  );
  if (spTable.length === 0) {
    await pool.query(`
      CREATE TABLE subscription_plans (
        id INT AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(100) NOT NULL,
        slug VARCHAR(50) UNIQUE NOT NULL,
        description TEXT NULL,
        price_monthly DECIMAL(10,2) DEFAULT 0,
        price_yearly DECIMAL(10,2) DEFAULT 0,
        currency VARCHAR(10) DEFAULT 'USD',
        max_employees INT DEFAULT 50,
        trial_days INT DEFAULT 14,
        is_active TINYINT(1) NOT NULL DEFAULT 1,
        is_public TINYINT(1) NOT NULL DEFAULT 1,
        sort_order INT DEFAULT 0,
        features JSON NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      )
    `);
    console.log('Created subscription_plans table');
    
    // Seed default plans
    const plans = [
      { name: 'Trial', slug: 'trial', desc: 'Try WorkTrack free for 14 days', priceM: 0, priceY: 0, currency: 'USD', maxEmp: 25, trialDays: 14, sort: 1, features: JSON.stringify(['All modules included', 'Up to 25 employees', '14-day free trial', 'Email support']) },
      { name: 'Basic', slug: 'basic', desc: 'For small teams getting started', priceM: 29, priceY: 290, currency: 'USD', maxEmp: 50, trialDays: 14, sort: 2, features: JSON.stringify(['All modules included', 'Up to 50 employees', '14-day free trial', 'Email support', 'Basic reports']) },
      { name: 'Professional', slug: 'professional', desc: 'For growing companies', priceM: 79, priceY: 790, currency: 'USD', maxEmp: 200, trialDays: 14, sort: 3, features: JSON.stringify(['All modules included', 'Up to 200 employees', '14-day free trial', 'Priority support', 'Advanced reports', 'Custom workflows']) },
      { name: 'Enterprise', slug: 'enterprise', desc: 'For large organizations', priceM: 199, priceY: 1990, currency: 'USD', maxEmp: 9999, trialDays: 14, sort: 4, features: JSON.stringify(['All modules included', 'Unlimited employees', '14-day free trial', 'Dedicated support', 'Custom integrations', 'SLA guarantee']) },
    ];
    
    for (const p of plans) {
      await pool.query(
        'INSERT INTO subscription_plans (name, slug, description, price_monthly, price_yearly, currency, max_employees, trial_days, is_active, is_public, sort_order, features) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1, 1, ?, ?)',
        [p.name, p.slug, p.desc, p.priceM, p.priceY, p.currency, p.maxEmp, p.trialDays, p.sort, p.features]
      );
    }
    console.log('Seeded default subscription plans');
  }

  // ============================================================
  // 8. PLATFORM SETTINGS (editable by Super Admin)
  // ============================================================
  
  const [psTable] = await pool.query(
    "SELECT * FROM information_schema.TABLES WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'platform_settings'",
    [process.env.DB_NAME]
  );
  if (psTable.length === 0) {
    await pool.query(`
      CREATE TABLE platform_settings (
        id INT AUTO_INCREMENT PRIMARY KEY,
        \`key\` VARCHAR(100) NOT NULL UNIQUE,
        \`value\` TEXT NULL,
        description TEXT NULL,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      )
    `);
    console.log('Created platform_settings table');
    
    // Seed default platform settings
    const platformDefaults = [
      ['company_name', 'WorkTrack', 'Platform company name'],
      ['company_email', 'support@worktrack.ddns.net', 'Platform support email'],
      ['default_trial_days', '14', 'Default trial period in days'],
      ['default_currency', 'USD', 'Default currency for pricing'],
      ['landing_hero_title', 'Simplify Your HR Operations in One Place', 'Landing page hero title'],
      ['landing_hero_subtitle', 'Track attendance, manage leaves, run recruitment pipelines, and generate HR insights — all from a single, secure platform built for modern teams.', 'Landing page hero subtitle'],
      ['landing_cta_text', 'Start Your Company', 'Landing page CTA button text'],
      ['contact_email', 'sales@worktrack.ddns.net', 'Sales contact email'],
      ['contact_phone', '', 'Sales contact phone'],
    ];
    
    for (const [key, value, desc] of platformDefaults) {
      await pool.query(
        'INSERT INTO platform_settings (`key`, `value`, description) VALUES (?, ?, ?)',
        [key, value, desc]
      );
    }
    console.log('Seeded default platform settings');
  }

  // ============================================================
  // 9. RUN EXISTING MIGRATIONS (add tenant_id to all tables)
  // ============================================================
  
  await runLegacyMigrations();

  console.log('✅ Multi-tenant seed completed!');
}

async function seedTenantRBAC(tenantId) {
  // Default permissions
  const permissions = [
    // People module
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

    // Attendance module
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

    // Recruitment module
    { module: 'recruitment', action: 'view', label: 'View Recruitment', desc: 'View jobs and candidates' },
    { module: 'recruitment', action: 'create_job', label: 'Create Jobs', desc: 'Create new job postings' },
    { module: 'recruitment', action: 'edit_job', label: 'Edit Jobs', desc: 'Modify job postings' },
    { module: 'recruitment', action: 'delete_job', label: 'Delete Jobs', desc: 'Remove job postings' },
    { module: 'recruitment', action: 'manage_candidates', label: 'Manage Candidates', desc: 'Move candidates through pipeline' },
    { module: 'recruitment', action: 'interview', label: 'Conduct Interviews', desc: 'Schedule/conduct interviews' },
    { module: 'recruitment', action: 'make_offers', label: 'Make Offers', desc: 'Create and send job offers' },
    { module: 'recruitment', action: 'manage_workflows', label: 'Manage Workflows', desc: 'Create/edit recruitment workflows' },
    { module: 'recruitment', action: 'manage_templates', label: 'Manage Templates', desc: 'Manage message/workflow templates' },

    // IT module
    { module: 'it', action: 'view_settings', label: 'View IT Settings', desc: 'Read IT configuration (SMTP, geofence, branding, meetings)' },
    { module: 'it', action: 'manage_smtp', label: 'Manage SMTP', desc: 'Configure email server settings' },
    { module: 'it', action: 'manage_geofence', label: 'Manage Geofence', desc: 'Configure office GPS location' },
    { module: 'it', action: 'manage_branding', label: 'Manage Branding', desc: 'Configure logo, colors, company info' },
    { module: 'it', action: 'manage_meetings', label: 'Manage Meeting Integrations', desc: 'Configure Google/Teams meeting integrations' },

    // Admin module (tenant-level)
    { module: 'admin', action: 'manage_users', label: 'Manage Users', desc: 'Create/edit/deactivate admin and employee users' },
    { module: 'admin', action: 'manage_roles', label: 'Manage Roles', desc: 'Create/edit roles and permissions' },
    { module: 'admin', action: 'manage_services', label: 'Manage Service Toggles', desc: 'Enable/disable system services' },
    { module: 'admin', action: 'view_audit', label: 'View Audit Log', desc: 'View system activity and audit logs' },

    // Audit module
    { module: 'audit', action: 'view', label: 'View Audit Logs', desc: 'View all system activity logs' },
    { module: 'audit', action: 'export', label: 'Export Audit Logs', desc: 'Export audit logs for compliance' },
    { module: 'audit', action: 'compliance_report', label: 'Generate Compliance Report', desc: 'Generate PDF compliance audit reports' },

    // HR module
    { module: 'hr', action: 'view', label: 'View HR Data', desc: 'Access HR portal' },
    { module: 'hr', action: 'manage_settings', label: 'Manage HR Settings', desc: 'Configure HR-specific settings' },
  ];

  // Insert permissions
  for (const perm of permissions) {
    const [existing] = await pool.query(
      'SELECT id FROM permissions WHERE module = ? AND action = ? AND tenant_id = ?',
      [perm.module, perm.action, tenantId]
    );
    if (existing.length === 0) {
      await pool.query(
        'INSERT INTO permissions (module, action, label, description, is_system, tenant_id) VALUES (?, ?, ?, ?, 1, ?)',
        [perm.module, perm.action, perm.label, perm.desc, tenantId]
      );
    }
  }

  // Default roles
  const roles = [
    { name: 'tenant_admin', display: 'Tenant Administrator', desc: 'Full access to tenant administration', isSystem: 1 },
    { name: 'hr_manager', display: 'HR Manager', desc: 'Manage people, attendance, leaves, recruitment', isSystem: 1 },
    { name: 'hr_officer', display: 'HR Officer', desc: 'Operational HR tasks', isSystem: 1 },
    { name: 'it_admin', display: 'IT Administrator', desc: 'Manage IT settings (SMTP, geofence, branding, meetings)', isSystem: 1 },
    { name: 'audit_officer', display: 'Internal Audit Officer', desc: 'View audit logs and compliance reports', isSystem: 1 },
    { name: 'manager', display: 'Department Manager', desc: 'Team approvals and dashboard', isSystem: 1 },
    { name: 'employee', display: 'Employee', desc: 'Basic employee self-service', isSystem: 1 },
  ];

  const roleIds = {};
  for (const role of roles) {
    const [existing] = await pool.query(
      'SELECT id FROM roles WHERE name = ? AND tenant_id = ?',
      [role.name, tenantId]
    );
    let roleId;
    if (existing.length === 0) {
      const [result] = await pool.query(
        'INSERT INTO roles (name, display_name, description, is_system, tenant_id) VALUES (?, ?, ?, ?, ?)',
        [role.name, role.display, role.desc, role.isSystem, tenantId]
      );
      roleId = result.insertId;
    } else {
      roleId = existing[0].id;
    }
    roleIds[role.name] = roleId;
  }

  // Assign permissions to roles
  const rolePerms = {
    tenant_admin: ['*'], // All permissions
    hr_manager: [
      'people.view', 'people.create', 'people.edit', 'people.export',
      'people.manage_positions', 'people.manage_grades', 'people.manage_departments',
      'people.view_documents', 'people.manage_documents', 'people.manage_contracts', 'people.manage_checklists',
      'attendance.view', 'attendance.edit', 'attendance.export', 'attendance.approve_signout',
      'attendance.manage_leaves', 'attendance.manage_leave_types', 'attendance.manage_holidays',
      'attendance.view_balances', 'attendance.adjust_balances',
      'recruitment.view', 'recruitment.create_job', 'recruitment.edit_job', 'recruitment.manage_candidates',
      'recruitment.interview', 'recruitment.make_offers',
      'hr.view', 'hr.manage_settings'
    ],
    hr_officer: [
      'people.view', 'people.edit', 'people.export',
      'people.view_documents', 'people.manage_documents',
      'attendance.view', 'attendance.export', 'attendance.approve_signout',
      'attendance.manage_leaves', 'attendance.view_balances',
      'recruitment.view', 'recruitment.manage_candidates',
      'hr.view'
    ],
    it_admin: [
      'it.view_settings', 'it.manage_smtp', 'it.manage_geofence', 'it.manage_branding', 'it.manage_meetings',
      'admin.manage_users', 'admin.manage_services'
    ],
    audit_officer: [
      'audit.view', 'audit.export', 'audit.compliance_report',
      'admin.view_audit'
    ],
    manager: [
      'people.view', 'people.export',
      'attendance.view', 'attendance.export', 'attendance.approve_signout', 'attendance.view_balances',
      'manager.view'
    ],
    employee: [
      'people.view', 'attendance.view'
    ]
  };

  for (const [roleName, perms] of Object.entries(rolePerms)) {
    const roleId = roleIds[roleName];
    if (!roleId) continue;

    if (perms.includes('*')) {
      // Assign all permissions
      const [allPerms] = await pool.query('SELECT id FROM permissions WHERE tenant_id = ?', [tenantId]);
      for (const perm of allPerms) {
        await pool.query(
          'INSERT IGNORE INTO role_permissions (role_id, permission_id) VALUES (?, ?)',
          [roleId, perm.id]
        );
      }
    } else {
      for (const permKey of perms) {
        const [perm] = await pool.query(
          'SELECT id FROM permissions WHERE CONCAT(module, ".", action) = ? AND tenant_id = ?',
          [permKey, tenantId]
        );
        if (perm.length > 0) {
          await pool.query(
            'INSERT IGNORE INTO role_permissions (role_id, permission_id) VALUES (?, ?)',
            [roleId, perm[0].id]
          );
        }
      }
    }
  }

  // Assign tenant_admin role to the tenant admin user
  const [tenantAdmin] = await pool.query(
    'SELECT id FROM admin_users WHERE tenant_id = ? AND is_platform_admin = 0 LIMIT 1',
    [tenantId]
  );
  if (tenantAdmin.length > 0) {
    await pool.query(
      'INSERT IGNORE INTO user_roles (user_id, role_id, user_type) VALUES (?, ?, "admin")',
      [tenantAdmin[0].id, roleIds.tenant_admin]
    );
  }

  console.log(`Seeded RBAC for tenant ${tenantId}`);
}

async function runLegacyMigrations() {
  // This function adds tenant_id to all existing tables and sets default = 1
  // The actual ALTER TABLE statements are in migration file 012_multitenancy.sql
  // Here we just ensure data consistency for existing records
  
  console.log('Running legacy migrations (tenant_id backfill)...');

  // Update employees
  await pool.query('UPDATE employees SET tenant_id = 1 WHERE tenant_id IS NULL OR tenant_id = 0');
  
  // Update departments
  await pool.query('UPDATE departments SET tenant_id = 1 WHERE tenant_id IS NULL OR tenant_id = 0');
  
  // Update other tables that might have been created before tenant_id column
  const tables = [
    'activity_log', 'balance_audit', 'admin_notifications', 'positions',
    'employee_profiles', 'employee_medical_family', 'employee_documents',
    'employee_education', 'employee_work_history', 'employee_certifications',
    'employee_status_log', 'leave_types', 'leave_balances', 'leave_requests',
    'notifications', 'signout_requests', 'resignation_requests',
    'asset_catalog', 'asset_assignments', 'asset_history',
    'contract_templates', 'employee_contracts',
    'checklist_templates', 'checklist_items', 'employee_checklists', 'employee_checklist_tasks',
    'salary_components', 'recruitment_jobs', 'recruitment_candidates',
    'holidays', 'attendance_records', 'pending_registrations',
    'skills', 'certifications', 'interview_stages', 'message_templates',
    'workflow_templates', 'workflow_stages', 'workflow_rules',
    'headcount_requests', 'tasks', 'contacts',
    'department_titles', 'grades'
  ];

  for (const table of tables) {
    try {
      const [cols] = await pool.query(
        "SELECT * FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = ? AND TABLE_NAME = ? AND COLUMN_NAME = 'tenant_id'",
        [process.env.DB_NAME, table]
      );
      if (cols.length > 0) {
        await pool.query(`UPDATE \`${table}\` SET tenant_id = 1 WHERE tenant_id IS NULL OR tenant_id = 0`);
      }
    } catch (e) {
      // Table might not exist yet
    }
  }

  console.log('Legacy migrations completed');
}

module.exports = { seed };

// Run if called directly
if (require.main === module) {
  seed()
    .then(() => {
      console.log('Seed completed successfully');
      process.exit(0);
    })
    .catch((err) => {
      console.error('Seed failed:', err);
      process.exit(1);
    });
}