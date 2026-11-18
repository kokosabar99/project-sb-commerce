-- Run once in Neon SQL Editor. Never store plaintext passwords.
CREATE EXTENSION IF NOT EXISTS pgcrypto;
CREATE TABLE IF NOT EXISTS sb_users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(100) NOT NULL,
  username VARCHAR(32) NOT NULL UNIQUE,
  email VARCHAR(254) NOT NULL UNIQUE,
  phone VARCHAR(32) NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  role VARCHAR(20) NOT NULL CHECK (role IN ('CUSTOMER','OWNER','SUPER_ADMIN')),
  status VARCHAR(20) NOT NULL CHECK (status IN ('ACTIVE','PENDING','REJECTED','DISABLED')),
  store_name VARCHAR(120),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS sb_users_owner_queue ON sb_users (created_at DESC) WHERE role='OWNER' AND status='PENDING';
-- Bootstrap SUPER_ADMIN using a one-time secure migration or invitation; do not commit credentials.
