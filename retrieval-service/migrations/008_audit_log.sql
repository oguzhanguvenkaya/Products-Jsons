-- ============================================================
-- 008 — audit_log
--
-- Captures every /admin/staging/commit step so the Catalog Atelier
-- history timeline, per-SKU audit, and global activity feed have a
-- source of truth. Keep it narrow — one row per applied change.
--
-- Idempotent: IF NOT EXISTS everywhere.
-- ============================================================

CREATE TABLE IF NOT EXISTS audit_log (
  id           BIGSERIAL PRIMARY KEY,
  happened_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  actor        TEXT NOT NULL DEFAULT 'catalog-atelier',
  sku          TEXT,                          -- null for non-product actions
  scope        TEXT NOT NULL,                 -- 'product' | 'product.specs' | ...
  field        TEXT NOT NULL,                 -- 'price' | 'specs.ph_level' | ...
  before_value JSONB,
  after_value  JSONB,
  change_id    TEXT,                          -- staging change id for dedup
  request_id   TEXT,                          -- middleware.logger request id
  note         TEXT
);

CREATE INDEX IF NOT EXISTS idx_audit_log_sku
  ON audit_log (sku, happened_at DESC)
  WHERE sku IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_audit_log_recent
  ON audit_log (happened_at DESC);

CREATE INDEX IF NOT EXISTS idx_audit_log_scope
  ON audit_log (scope, happened_at DESC);
