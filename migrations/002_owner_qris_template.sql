-- Owner-managed static QRIS; does not imply automatic payment confirmation.
-- Apply after sb_stores and sb_users exist. IDs deliberately use matching BIGINT
-- only if existing schema uses BIGINT; inspect schema before running.
-- This migration is a template and is NOT applied automatically.
CREATE TABLE IF NOT EXISTS sb_store_payment_qris (
  store_id TEXT PRIMARY KEY,
  object_key TEXT NOT NULL,
  mime_type TEXT NOT NULL CHECK (mime_type IN ('image/png','image/jpeg','image/webp')),
  enabled BOOLEAN NOT NULL DEFAULT FALSE,
  updated_by TEXT NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS sb_payment_proofs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id TEXT NOT NULL,
  store_id TEXT NOT NULL,
  object_key TEXT NOT NULL,
  mime_type TEXT NOT NULL CHECK (mime_type IN ('image/png','image/jpeg','image/webp')),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','approved','rejected')),
  reviewed_by TEXT,
  reviewed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS sb_payment_proofs_store_status_idx ON sb_payment_proofs(store_id,status,created_at DESC);
-- NOTE: add FK constraints to the actual sb_stores and order ID types after
-- inspecting production schema; never trust store_id supplied by browser.
