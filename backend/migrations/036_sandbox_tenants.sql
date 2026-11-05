-- Phase 5: developer sandboxes
-- A sandbox is a real tenant row so it exercises the same code paths, but it is
-- excluded from billing, trial expiry and outbound email, and can be reset.

ALTER TABLE tenants
  ADD COLUMN IF NOT EXISTS is_sandbox TINYINT(1) NOT NULL DEFAULT 0;

ALTER TABLE tenants
  ADD COLUMN IF NOT EXISTS sandbox_of_tenant_id INT NULL;

ALTER TABLE tenants
  ADD INDEX IF NOT EXISTS idx_tenant_sandbox (is_sandbox);

ALTER TABLE tenants
  ADD FOREIGN KEY IF NOT EXISTS fk_tenant_sandbox_source (sandbox_of_tenant_id)
    REFERENCES tenants(id) ON DELETE SET NULL;
