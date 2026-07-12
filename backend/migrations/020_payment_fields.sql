-- Migration 020: Payment proof fields for manual InstaPay payments
-- Adds payment tracking columns to tenant_requests
-- Adds bank account settings to platform_settings

-- 1. Add payment fields to tenant_requests
ALTER TABLE tenant_requests
  ADD COLUMN payment_amount DECIMAL(10,2) DEFAULT NULL,
  ADD COLUMN payment_currency VARCHAR(10) DEFAULT 'EGP',
  ADD COLUMN payment_method VARCHAR(50) DEFAULT 'instapay',
  ADD COLUMN payment_proof_url VARCHAR(500) DEFAULT NULL,
  ADD COLUMN payment_status ENUM('pending','verified','rejected') DEFAULT NULL,
  ADD COLUMN payment_verified_by INT DEFAULT NULL,
  ADD COLUMN payment_verified_at DATETIME DEFAULT NULL,
  ADD COLUMN payment_rejection_reason TEXT DEFAULT NULL;

-- 2. Seed platform_settings for bank account info
-- (Only if not already present — idempotent)
INSERT IGNORE INTO platform_settings (`key`, `value`) VALUES
  ('payment_bank_name', 'CIB'),
  ('payment_account_name', ''),
  ('payment_account_number', ''),
  ('payment_iban', ''),
  ('payment_instapay_id', ''),
  ('payment_notes', 'Please include your company name in the transfer notes.');
