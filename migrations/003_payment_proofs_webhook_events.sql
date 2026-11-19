-- Applied to project-sb-commerce/neondb on 2026-11-19.
-- Existing sb_payment_settings already contains qris_enabled and qris_image_data.
-- Prefer migrating image storage to private R2 before production.
CREATE TABLE IF NOT EXISTS sb_payment_proofs (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 order_id uuid NOT NULL REFERENCES sb_orders(id),
 store_id uuid NOT NULL REFERENCES sb_stores(id),
 object_key text NOT NULL,
 mime_type text NOT NULL CHECK (mime_type IN ('image/png','image/jpeg','image/webp')),
 status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','approved','rejected')),
 reviewed_by uuid REFERENCES sb_users(id),
 reviewed_at timestamptz,
 created_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS sb_payment_proofs_one_approved_per_order ON sb_payment_proofs(order_id) WHERE status='approved';
CREATE INDEX IF NOT EXISTS sb_payment_proofs_store_status ON sb_payment_proofs(store_id,status,created_at DESC);
CREATE TABLE IF NOT EXISTS sb_payment_webhook_events (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 provider text NOT NULL,
 event_id text NOT NULL,
 order_id uuid REFERENCES sb_orders(id),
 event_status text NOT NULL,
 received_at timestamptz NOT NULL DEFAULT now(),
 UNIQUE(provider,event_id)
);
