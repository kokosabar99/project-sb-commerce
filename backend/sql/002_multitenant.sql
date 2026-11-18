-- PROJECT SB Commerce — Multi-tenant stores (Neon PostgreSQL)
-- Run after backend/sql/001_auth.sql; review on staging before production.
CREATE TABLE IF NOT EXISTS sb_stores (
 id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
 slug VARCHAR(64) NOT NULL UNIQUE CHECK (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
 owner_user_id UUID NOT NULL REFERENCES sb_users(id) ON DELETE RESTRICT,
 name VARCHAR(120) NOT NULL,
 description TEXT NOT NULL DEFAULT '',
 logo_url TEXT,
 hero_image_url TEXT,
 accent_color VARCHAR(7) NOT NULL DEFAULT '#C6A06B',
 theme VARCHAR(12) NOT NULL DEFAULT 'dark' CHECK(theme IN ('dark','light')),
 font_style VARCHAR(24) NOT NULL DEFAULT 'editorial',
 layout_style VARCHAR(24) NOT NULL DEFAULT 'boutique',
 whatsapp VARCHAR(24),
 contact_email VARCHAR(254),
 published BOOLEAN NOT NULL DEFAULT false,
 created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
 updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS sb_stores_owner_idx ON sb_stores(owner_user_id);
CREATE TABLE IF NOT EXISTS sb_store_staff (
 store_id UUID NOT NULL REFERENCES sb_stores(id) ON DELETE CASCADE,
 user_id UUID NOT NULL REFERENCES sb_users(id) ON DELETE CASCADE,
 role VARCHAR(12) NOT NULL CHECK(role IN ('MANAGER','EDITOR')),
 PRIMARY KEY(store_id,user_id)
);
CREATE TABLE IF NOT EXISTS sb_store_categories (
 id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
 store_id UUID NOT NULL REFERENCES sb_stores(id) ON DELETE CASCADE,
 name VARCHAR(100) NOT NULL,
 sort_order INTEGER NOT NULL DEFAULT 0,
 UNIQUE(id,store_id)
);
CREATE TABLE IF NOT EXISTS sb_store_products (
 id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
 store_id UUID NOT NULL REFERENCES sb_stores(id) ON DELETE CASCADE,
 category_id UUID,
 name VARCHAR(180) NOT NULL,
 description TEXT NOT NULL DEFAULT '',
 image_url TEXT,
 price_idr BIGINT NOT NULL CHECK(price_idr>=0),
 stock INTEGER NOT NULL DEFAULT 0 CHECK(stock>=0),
 published BOOLEAN NOT NULL DEFAULT false,
 created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
 FOREIGN KEY(category_id,store_id) REFERENCES sb_store_categories(id,store_id)
);
CREATE INDEX IF NOT EXISTS sb_products_store_idx ON sb_store_products(store_id);
CREATE TABLE IF NOT EXISTS sb_store_pages (
 id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
 store_id UUID NOT NULL REFERENCES sb_stores(id) ON DELETE CASCADE,
 slug VARCHAR(64) NOT NULL,
 title VARCHAR(180) NOT NULL,
 body TEXT NOT NULL DEFAULT '',
 published BOOLEAN NOT NULL DEFAULT false,
 UNIQUE(store_id,slug)
);
-- Every UPDATE/DELETE/INSERT for a store MUST verify owner_user_id = authenticated user ID
-- or membership in sb_store_staff with the necessary permission. Never trust store_id from UI alone.
-- Never grant SUPER_ADMIN to public registrations.
