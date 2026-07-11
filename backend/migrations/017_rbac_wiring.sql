-- Phase 2: RBAC wiring — retire hr_permissions, add missing permissions, seed service toggles
-- Run: mysql -u root work_track_db < 017_rbac_wiring.sql

-- 1. Drop legacy hr_permissions table (dead code — never populated, never consumed)
DROP TABLE IF EXISTS hr_permissions;

-- 2. Seed missing RBAC permission: it.view_settings (for GET /api/it/settings)
INSERT IGNORE INTO permissions (module, action, label, description, is_system, tenant_id)
VALUES ('it', 'view_settings', 'View IT Settings', 'Read IT configuration (SMTP, geofence, branding, meetings)', 1, 1);

-- 3. Seed missing RBAC permission: audit.compliance_report (for POST /api/audit/compliance-report)
INSERT IGNORE INTO permissions (module, action, label, description, is_system, tenant_id)
VALUES ('audit', 'compliance_report', 'Generate Compliance Report', 'Generate PDF compliance audit reports', 1, 1);

-- 4. Assign it.view_settings to it_admin role (so GET /api/it/settings passes requirePermission)
INSERT IGNORE INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r, permissions p
WHERE r.name = 'it_admin' AND r.tenant_id = 1
  AND p.module = 'it' AND p.action = 'view_settings' AND p.tenant_id = 1;

-- 5. Assign audit.compliance_report to audit_officer role
INSERT IGNORE INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r, permissions p
WHERE r.name = 'audit_officer' AND r.tenant_id = 1
  AND p.module = 'audit' AND p.action = 'compliance_report' AND p.tenant_id = 1;

-- 6. Seed service_toggles for IT and Audit (canonical source — replaces settings.service_* keys)
INSERT IGNORE INTO service_toggles (service_key, service_name, description, is_enabled, tenant_id, sort_order)
VALUES
  ('service_it', 'IT Portal', 'IT settings: SMTP, geofence, branding, meeting integrations', 1, 1, 7),
  ('service_audit', 'Internal Audit', 'Activity logs, balance audit, compliance reports', 1, 1, 8);
