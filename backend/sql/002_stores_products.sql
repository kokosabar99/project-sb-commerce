-- PROJECT SB Commerce: tenant-isolated stores and catalog.
-- Run after 001_auth.sql. No sample rows; does not delete existing data.
CREATE TABLE IF NOT EXISTS sb_stores (
 id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
 owner_id UUID NOT NULL UNIQUE REFERENCES sb_users(id) ON DELETE RESTRICT,
 slug VARCHAR(80) NOT NULL UNIQUE,
 name VARCHAR(120) NOT NULL,
 logo_url TEXT,
 theme JSONB NOT NULL DEFAULT '{}'::jsonb,
 navigation JSONB NOT NULL DEFAULT '{}'::jsonb,
 content JSONB NOT NULL DEFAULT '{}'::jsonb,
 chat_settings JSONB NOT NULL DEFAULT '{}'::jsonb,
 created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
 updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS sb_products (
 id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
 store_id UUID NOT NULL REFERENCES sb_stores(id) ON DELETE CASCADE,
 name VARCHAR(180) NOT NULL,
 description TEXT NOT NULL DEFAULT '',
 category VARCHAR(120) NOT NULL DEFAULT '',
 price NUMERIC(14,2) NOT NULL CHECK (price>=0),
 stock INTEGER NOT NULL DEFAULT 0 CHECK(stock>=0),
 images JSONB NOT NULL DEFAULT '[]'::jsonb CHECK(jsonb_typeof(images)='array'),
 discount_type VARCHAR(12) NOT NULL DEFAULT 'NONE' CHECK(discount_type IN ('NONE','PERCENT','AMOUNT')),
 discount_value NUMERIC(14,2) NOT NULL DEFAULT 0 CHECK(discount_value>=0),
 discount_ends_at TIMESTAMPTZ,
 status VARCHAR(12) NOT NULL DEFAULT 'DRAFT' CHECK(status IN ('DRAFT','ACTIVE','ARCHIVED')),
 created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
 updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
 CONSTRAINT sb_products_discount_check CHECK(discount_type<>'PERCENT' OR discount_value<=100)
);
CREATE INDEX IF NOT EXISTS sb_products_store_status ON sb_products(store_id,status,created_at DESC);
CREATE INDEX IF NOT EXISTS sb_products_store_name ON sb_products(store_id,name);
-- Each request MUST derive store_id from the authenticated owner's user id.
-- Never accept arbitrary owner_id/store_id from the browser for mutations.
