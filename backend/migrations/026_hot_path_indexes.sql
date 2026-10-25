-- Copyright (c) 2026 Mohamed Yehia
-- SPDX-License-Identifier: AGPL-3.0

-- Migration 026: composite indexes for tenant-scoped hot paths.
-- Lists, reports and exports filter by tenant_id first and then by date or
-- employee, so single-column tenant indexes force large scans per tenant.
--
-- Idempotent: safe to re-run. Apply with:
--   mysql -u worktrack -p work_track_db < backend/migrations/026_hot_path_indexes.sql

-- attendance_records (tenant_id, date)
SET @t = (SELECT COUNT(*) FROM information_schema.TABLES WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='attendance_records');
SET @c = (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='attendance_records' AND COLUMN_NAME='tenant_id');
SET @i = (SELECT COUNT(*) FROM information_schema.STATISTICS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='attendance_records' AND INDEX_NAME='idx_att_tenant_date');
SET @sql = IF(@t=1 AND @c=1 AND @i=0, 'ALTER TABLE attendance_records ADD INDEX idx_att_tenant_date (tenant_id, date)', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- leave_requests (tenant_id, start_date, end_date)
SET @t = (SELECT COUNT(*) FROM information_schema.TABLES WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='leave_requests');
SET @c = (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='leave_requests' AND COLUMN_NAME='tenant_id');
SET @i = (SELECT COUNT(*) FROM information_schema.STATISTICS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='leave_requests' AND INDEX_NAME='idx_lr_tenant_dates');
SET @sql = IF(@t=1 AND @c=1 AND @i=0, 'ALTER TABLE leave_requests ADD INDEX idx_lr_tenant_dates (tenant_id, start_date, end_date)', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- activity_log (tenant_id, created_at)
SET @t = (SELECT COUNT(*) FROM information_schema.TABLES WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='activity_log');
SET @c = (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='activity_log' AND COLUMN_NAME='tenant_id');
SET @i = (SELECT COUNT(*) FROM information_schema.STATISTICS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='activity_log' AND INDEX_NAME='idx_al_tenant_created');
SET @sql = IF(@t=1 AND @c=1 AND @i=0, 'ALTER TABLE activity_log ADD INDEX idx_al_tenant_created (tenant_id, created_at)', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- balance_audit (tenant_id, created_at)
SET @t = (SELECT COUNT(*) FROM information_schema.TABLES WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='balance_audit');
SET @c = (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='balance_audit' AND COLUMN_NAME='tenant_id');
SET @i = (SELECT COUNT(*) FROM information_schema.STATISTICS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='balance_audit' AND INDEX_NAME='idx_ba_tenant_created');
SET @sql = IF(@t=1 AND @c=1 AND @i=0, 'ALTER TABLE balance_audit ADD INDEX idx_ba_tenant_created (tenant_id, created_at)', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- notifications (tenant_id, employee_id, is_read)
SET @t = (SELECT COUNT(*) FROM information_schema.TABLES WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='notifications');
SET @c = (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='notifications' AND COLUMN_NAME='tenant_id');
SET @i = (SELECT COUNT(*) FROM information_schema.STATISTICS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='notifications' AND INDEX_NAME='idx_notif_tenant_employee_read');
SET @sql = IF(@t=1 AND @c=1 AND @i=0, 'ALTER TABLE notifications ADD INDEX idx_notif_tenant_employee_read (tenant_id, employee_id, is_read)', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- signout_requests (tenant_id, status)
SET @t = (SELECT COUNT(*) FROM information_schema.TABLES WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='signout_requests');
SET @c = (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='signout_requests' AND COLUMN_NAME='tenant_id');
SET @i = (SELECT COUNT(*) FROM information_schema.STATISTICS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='signout_requests' AND INDEX_NAME='idx_sr_tenant_status');
SET @sql = IF(@t=1 AND @c=1 AND @i=0, 'ALTER TABLE signout_requests ADD INDEX idx_sr_tenant_status (tenant_id, status)', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- recruitment_candidates (tenant_id, created_at)
SET @t = (SELECT COUNT(*) FROM information_schema.TABLES WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='recruitment_candidates');
SET @c = (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='recruitment_candidates' AND COLUMN_NAME='tenant_id');
SET @i = (SELECT COUNT(*) FROM information_schema.STATISTICS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='recruitment_candidates' AND INDEX_NAME='idx_rc_tenant_created');
SET @sql = IF(@t=1 AND @c=1 AND @i=0, 'ALTER TABLE recruitment_candidates ADD INDEX idx_rc_tenant_created (tenant_id, created_at)', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- employees (tenant_id, department_id, is_active) for team/member lists
SET @t = (SELECT COUNT(*) FROM information_schema.TABLES WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='employees');
SET @c = (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='employees' AND COLUMN_NAME='tenant_id');
SET @i = (SELECT COUNT(*) FROM information_schema.STATISTICS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='employees' AND INDEX_NAME='idx_emp_tenant_dept');
SET @sql = IF(@t=1 AND @c=1 AND @i=0, 'ALTER TABLE employees ADD INDEX idx_emp_tenant_dept (tenant_id, department_id, is_active)', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- leave_balances (tenant_id, employee_id)
SET @t = (SELECT COUNT(*) FROM information_schema.TABLES WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='leave_balances');
SET @c = (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='leave_balances' AND COLUMN_NAME='tenant_id');
SET @i = (SELECT COUNT(*) FROM information_schema.STATISTICS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='leave_balances' AND INDEX_NAME='idx_lb_tenant_employee');
SET @sql = IF(@t=1 AND @c=1 AND @i=0, 'ALTER TABLE leave_balances ADD INDEX idx_lb_tenant_employee (tenant_id, employee_id)', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;
