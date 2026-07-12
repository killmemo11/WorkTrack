-- Migration 021: Tenant soft-delete + payments tracking view
-- Adds deleted_at column for soft-delete and a view for payment analytics

-- 1. Add deleted_at column to tenants
ALTER TABLE `tenants` ADD COLUMN `deleted_at` DATETIME DEFAULT NULL AFTER `updated_at`;

-- 2. Create a comprehensive payment transactions view
CREATE OR REPLACE VIEW `payment_transactions` AS
SELECT
  tr.id,
  tr.company_name,
  tr.contact_email,
  tr.requested_plan,
  tr.payment_amount,
  tr.payment_currency,
  tr.payment_method,
  tr.payment_proof_url,
  tr.payment_status,
  tr.payment_verified_by,
  tr.payment_verified_at,
  tr.payment_rejection_reason,
  tr.status AS request_status,
  tr.created_at AS submitted_at,
  sp.name AS plan_name,
  sp.price_monthly,
  sp.price_yearly
FROM tenant_requests tr
LEFT JOIN subscription_plans sp ON tr.requested_plan = sp.slug
WHERE tr.payment_amount IS NOT NULL AND tr.payment_amount > 0;

-- 3. Add a payment_history table for tracking ALL payments (not just registration)
CREATE TABLE IF NOT EXISTS `payment_history` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `tenant_id` INT DEFAULT NULL,
  `tenant_request_id` INT DEFAULT NULL,
  `amount` DECIMAL(10,2) NOT NULL,
  `currency` VARCHAR(10) DEFAULT 'EGP',
  `payment_method` VARCHAR(50) DEFAULT 'instapay',
  `payment_proof_url` VARCHAR(500) DEFAULT NULL,
  `status` ENUM('pending','verified','rejected') DEFAULT 'pending',
  `verified_by` INT DEFAULT NULL,
  `verified_at` DATETIME DEFAULT NULL,
  `rejection_reason` TEXT DEFAULT NULL,
  `notes` TEXT DEFAULT NULL,
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX `idx_tenant_id` (`tenant_id`),
  INDEX `idx_status` (`status`),
  INDEX `idx_created_at` (`created_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 4. Seed payment_history from existing verified payments in tenant_requests
INSERT IGNORE INTO payment_history (tenant_request_id, amount, currency, payment_method, payment_proof_url, status, verified_by, verified_at, rejection_reason, created_at)
SELECT id, payment_amount, payment_currency, payment_method, payment_proof_url, payment_status, payment_verified_by, payment_verified_at, payment_rejection_reason, created_at
FROM tenant_requests
WHERE payment_amount IS NOT NULL AND payment_amount > 0;
