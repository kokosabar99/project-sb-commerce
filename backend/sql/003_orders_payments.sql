-- Additive checkout schema. No payment credentials or demo orders.
CREATE TABLE IF NOT EXISTS sb_orders (
 id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
 customer_id UUID NOT NULL REFERENCES sb_users(id) ON DELETE RESTRICT,
 store_id UUID NOT NULL REFERENCES sb_stores(id) ON DELETE RESTRICT,
 payment_method VARCHAR(20) NOT NULL CHECK(payment_method IN ('MANUAL_TRANSFER','QRIS_GATEWAY')),
 payment_status VARCHAR(20) NOT NULL DEFAULT 'PENDING' CHECK(payment_status IN ('PENDING','AWAITING_VERIFICATION','PAID','FAILED','CANCELLED','REFUNDED')),
 fulfillment_status VARCHAR(20) NOT NULL DEFAULT 'NEW' CHECK(fulfillment_status IN ('NEW','PROCESSING','SHIPPED','COMPLETED','CANCELLED')),
 total_amount NUMERIC(14,2) NOT NULL CHECK(total_amount>=0),
 items JSONB NOT NULL CHECK(jsonb_typeof(items)='array'),
 payment_reference VARCHAR(180),
 created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
 updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS sb_orders_customer_created ON sb_orders(customer_id,created_at DESC);
CREATE INDEX IF NOT EXISTS sb_orders_store_created ON sb_orders(store_id,created_at DESC);
CREATE TABLE IF NOT EXISTS sb_payment_settings (
 store_id UUID PRIMARY KEY REFERENCES sb_stores(id) ON DELETE CASCADE,
 manual_enabled BOOLEAN NOT NULL DEFAULT false,
 bank_name VARCHAR(100),
 bank_account_name VARCHAR(120),
 bank_account_number VARCHAR(80),
 gateway_enabled BOOLEAN NOT NULL DEFAULT false,
 updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
 CONSTRAINT sb_payment_manual_config CHECK (NOT manual_enabled OR (length(trim(coalesce(bank_name,'')))>1 AND length(trim(coalesce(bank_account_name,'')))>1 AND length(trim(coalesce(bank_account_number,'')))>3))
);
