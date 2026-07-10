-- RBAC System Migration
-- Creates roles, permissions, role_permissions, user_roles tables

-- 1. Create permissions table (resource-action based)
CREATE TABLE IF NOT EXISTS permissions (
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
);

-- 2. Create roles table
CREATE TABLE IF NOT EXISTS roles (
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
);

-- 3. Create role_permissions junction table
CREATE TABLE IF NOT EXISTS role_permissions (
  role_id INT NOT NULL,
  permission_id INT NOT NULL,
  granted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  granted_by INT NULL,
  PRIMARY KEY (role_id, permission_id),
  INDEX idx_rp_permission (permission_id),
  FOREIGN KEY (role_id) REFERENCES roles(id) ON DELETE CASCADE,
  FOREIGN KEY (permission_id) REFERENCES permissions(id) ON DELETE CASCADE,
  FOREIGN KEY (granted_by) REFERENCES admin_users(id) ON DELETE SET NULL
);

-- 4. Create user_roles junction table (works for both admin_users and employees)
CREATE TABLE IF NOT EXISTS user_roles (
  user_id INT NOT NULL,
  role_id INT NOT NULL,
  user_type ENUM('admin','employee') NOT NULL DEFAULT 'employee',
  assigned_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  assigned_by INT NULL,
  PRIMARY KEY (user_id, role_id, user_type),
  INDEX idx_ur_role (role_id),
  INDEX idx_ur_assigned_by (assigned_by),
  FOREIGN KEY (role_id) REFERENCES roles(id) ON DELETE CASCADE
  -- Note: No FK on user_id because it can reference either admin_users or employees
);

-- 5. Create service_toggles table (replaces settings service_* keys with proper structure)
CREATE TABLE IF NOT EXISTS service_toggles (
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
);

-- 6. Insert default permissions (system-wide, will be copied per tenant)
-- People module
INSERT IGNORE INTO permissions (module, action, label, description, is_system, tenant_id) VALUES
('people', 'view', 'View People', 'View employee list and profiles', 1, 1),
('people', 'create', 'Create Employee', 'Add new employees', 1, 1),
('people', 'edit', 'Edit Employee', 'Modify employee information', 1, 1),
('people', 'delete', 'Delete Employee', 'Remove employees', 1, 1),
('people', 'export', 'Export People Data', 'Export employee data to Excel', 1, 1),
('people', 'manage_positions', 'Manage Positions', 'Create/edit/delete job positions', 1, 1),
('people', 'manage_grades', 'Manage Grades', 'Create/edit/delete salary grades', 1, 1),
('people', 'manage_departments', 'Manage Departments', 'Create/edit/delete departments', 1, 1),
('people', 'view_documents', 'View Documents', 'View employee documents', 1, 1),
('people', 'manage_documents', 'Manage Documents', 'Upload/verify/reject documents', 1, 1),
('people', 'manage_contracts', 'Manage Contracts', 'Create/manage contract templates and contracts', 1, 1),
('people', 'manage_checklists', 'Manage Checklists', 'Create/manage onboarding/offboarding checklists', 1, 1);

-- Attendance module
INSERT IGNORE INTO permissions (module, action, label, description, is_system, tenant_id) VALUES
('attendance', 'view', 'View Attendance', 'View attendance records and calendar', 1, 1),
('attendance', 'edit', 'Edit Attendance', 'Modify attendance records', 1, 1),
('attendance', 'delete', 'Delete Attendance', 'Delete attendance records', 1, 1),
('attendance', 'export', 'Export Attendance', 'Export attendance reports', 1, 1),
('attendance', 'approve_signout', 'Approve Sign-Out', 'Approve/reject sign-out requests', 1, 1),
('attendance', 'manage_leaves', 'Manage Leaves', 'View/approve/reject leave requests', 1, 1),
('attendance', 'manage_leave_types', 'Manage Leave Types', 'Create/edit/delete leave types', 1, 1),
('attendance', 'manage_holidays', 'Manage Holidays', 'Create/edit/delete holidays', 1, 1),
('attendance', 'view_balances', 'View Leave Balances', 'View employee leave balances', 1, 1),
('attendance', 'adjust_balances', 'Adjust Leave Balances', 'Modify leave balances', 1, 1);

-- Recruitment module
INSERT IGNORE INTO permissions (module, action, label, description, is_system, tenant_id) VALUES
('recruitment', 'view', 'View Recruitment', 'View jobs and candidates', 1, 1),
('recruitment', 'create_job', 'Create Jobs', 'Create new job postings', 1, 1),
('recruitment', 'edit_job', 'Edit Jobs', 'Modify job postings', 1, 1),
('recruitment', 'delete_job', 'Delete Jobs', 'Remove job postings', 1, 1),
('recruitment', 'manage_candidates', 'Manage Candidates', 'Move candidates through pipeline', 1, 1),
('recruitment', 'interview', 'Conduct Interviews', 'Schedule/conduct interviews', 1, 1),
('recruitment', 'make_offers', 'Make Offers', 'Create and send job offers', 1, 1),
('recruitment', 'manage_workflows', 'Manage Workflows', 'Create/edit recruitment workflows', 1, 1),
('recruitment', 'manage_templates', 'Manage Templates', 'Manage message/workflow templates', 1, 1);

-- IT module
INSERT IGNORE INTO permissions (module, action, label, description, is_system, tenant_id) VALUES
('it', 'manage_smtp', 'Manage SMTP', 'Configure email server settings', 1, 1),
('it', 'manage_geofence', 'Manage Geofence', 'Configure office GPS location', 1, 1),
('it', 'manage_branding', 'Manage Branding', 'Configure logo, colors, company info', 1, 1),
('it', 'manage_meetings', 'Manage Meetings', 'Configure Google/Teams integration', 1, 1),
('it', 'view_settings', 'View Settings', 'View all system settings', 1, 1);

-- Audit module
INSERT IGNORE INTO permissions (module, action, label, description, is_system, tenant_id) VALUES
('audit', 'view_activity_log', 'View Activity Log', 'View system activity logs', 1, 1),
('audit', 'view_balance_audit', 'View Balance Audit', 'View leave balance changes', 1, 1),
('audit', 'export_logs', 'Export Audit Logs', 'Export audit logs for compliance', 1, 1);

-- Admin module (RBAC, Service Toggles, User Management)
INSERT IGNORE INTO permissions (module, action, label, description, is_system, tenant_id) VALUES
('admin', 'manage_roles', 'Manage Roles', 'Create/edit/delete roles and permissions', 1, 1),
('admin', 'assign_roles', 'Assign Roles', 'Assign roles to users', 1, 1),
('admin', 'manage_users', 'Manage Users', 'Create/edit/deactivate admin users', 1, 1),
('admin', 'manage_services', 'Manage Services', 'Enable/disable service modules', 1, 1),
('admin', 'view_tenant_info', 'View Tenant Info', 'View tenant subscription and limits', 1, 1);

-- HR module (HR-specific)
INSERT IGNORE INTO permissions (module, action, label, description, is_system, tenant_id) VALUES
('hr', 'manage_settings', 'Manage HR Settings', 'Work week, period days, company info', 1, 1),
('hr', 'manage_master_lists', 'Manage Master Lists', 'Skills, certifications', 1, 1),
('hr', 'view_reports', 'View Reports', 'Access HR reports', 1, 1);

-- 7. Insert default roles (system roles)
-- Platform Super Admin role (tenant_id = 1, but is_system = 1, will be available to platform admins only)
INSERT IGNORE INTO roles (name, display_name, description, is_system, tenant_id) VALUES
('platform_super_admin', 'Platform Super Admin', 'Full access to all tenants and platform management', 1, 1),
('tenant_admin', 'Tenant Administrator', 'Full administrative access within tenant', 1, 1),
('hr_manager', 'HR Manager', 'Full HR module access', 1, 1),
('it_admin', 'IT Administrator', 'Full IT module access', 1, 1),
('audit_officer', 'Audit Officer', 'Full Audit module access', 1, 1),
('manager', 'Department Manager', 'Team management access', 1, 1),
('employee', 'Employee', 'Basic employee self-service', 1, 1);

-- 8. Assign permissions to default roles (tenant_id = 1)
-- Platform Super Admin gets ALL permissions
INSERT IGNORE INTO role_permissions (role_id, permission_id, granted_by)
SELECT r.id, p.id, 1 FROM roles r
CROSS JOIN permissions p
WHERE r.name = 'platform_super_admin' AND p.tenant_id = 1;

-- Tenant Admin gets ALL tenant-level permissions (except platform)
INSERT IGNORE INTO role_permissions (role_id, permission_id, granted_by)
SELECT r.id, p.id, 1 FROM roles r
CROSS JOIN permissions p
WHERE r.name = 'tenant_admin' AND p.tenant_id = 1 AND p.module != 'platform';

-- HR Manager permissions
INSERT IGNORE INTO role_permissions (role_id, permission_id, granted_by)
SELECT r.id, p.id, 1 FROM roles r
JOIN permissions p ON p.module IN ('people','attendance','recruitment','hr') AND p.tenant_id = 1
WHERE r.name = 'hr_manager';

-- IT Admin permissions
INSERT IGNORE INTO role_permissions (role_id, permission_id, granted_by)
SELECT r.id, p.id, 1 FROM roles r
JOIN permissions p ON p.module IN ('it','admin') AND p.tenant_id = 1
WHERE r.name = 'it_admin';

-- Audit Officer permissions
INSERT IGNORE INTO role_permissions (role_id, permission_id, granted_by)
SELECT r.id, p.id, 1 FROM roles r
JOIN permissions p ON p.module IN ('audit') AND p.tenant_id = 1
WHERE r.name = 'audit_officer';

-- Manager permissions
INSERT IGNORE INTO role_permissions (role_id, permission_id, granted_by)
SELECT r.id, p.id, 1 FROM roles r
JOIN permissions p ON p.module IN ('people','attendance','recruitment') 
  AND p.action IN ('view','create','edit') AND p.tenant_id = 1
WHERE r.name = 'manager';

-- Employee permissions (self-service)
INSERT IGNORE INTO role_permissions (role_id, permission_id, granted_by)
SELECT r.id, p.id, 1 FROM roles r
JOIN permissions p ON p.module IN ('people','attendance') 
  AND p.action IN ('view') AND p.tenant_id = 1
WHERE r.name = 'employee';

-- 9. Insert default service toggles
INSERT IGNORE INTO service_toggles (service_key, service_name, description, icon, is_enabled, is_visible, sort_order, tenant_id) VALUES
('wfh', 'Work From Home', 'Enable work-from-home attendance tracking', 'home', 1, 1, 1, 1),
('office_attendance', 'Office Attendance', 'Enable office check-in with geofence', 'map-pin', 1, 1, 2, 1),
('leaves', 'Leave Management', 'Enable leave requests and balances', 'calendar-x', 1, 1, 3, 1),
('recruitment', 'Recruitment', 'Enable hiring pipeline and job postings', 'briefcase', 1, 1, 4, 1),
('people', 'People Management', 'Enable employee directory and profiles', 'users', 1, 1, 5, 1),
('manager_tools', 'Manager Tools', 'Enable team management for managers', 'user-check', 1, 1, 6, 1),
('assets', 'Asset Management', 'Enable asset catalog and assignments', 'laptop', 1, 1, 7, 1),
('documents', 'Document Management', 'Enable employee document storage', 'file-text', 1, 1, 8, 1),
('contracts', 'Contract Management', 'Enable contract templates and signing', 'file-signature', 1, 1, 9, 1),
('checklists', 'Checklists', 'Enable onboarding/offboarding checklists', 'clipboard-check', 1, 1, 10, 1),
('salary', 'Salary Components', 'Enable salary structure management', 'dollar-sign', 1, 1, 11, 1);