-- ============================================================
-- LICENSE KEY SYSTEM — Supabase Migration
-- Run this in: https://supabase.com/dashboard/project/cigdhnctnfrxforbphtk/sql/new
-- ============================================================

-- 1. Create the license_keys table
CREATE TABLE IF NOT EXISTS license_keys (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key TEXT UNIQUE NOT NULL,
  status TEXT NOT NULL DEFAULT 'unused',  -- unused | active | expired | revoked
  created_at TIMESTAMPTZ DEFAULT NOW(),
  activated_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ,
  assigned_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  assigned_email TEXT
);

-- 2. Add license reference column to users table
ALTER TABLE users
  ADD COLUMN IF NOT EXISTS license_key_id UUID REFERENCES license_keys(id);

-- 3. Indexes for fast lookups
CREATE INDEX IF NOT EXISTS idx_license_keys_key ON license_keys(key);
CREATE INDEX IF NOT EXISTS idx_license_keys_status ON license_keys(status);
CREATE INDEX IF NOT EXISTS idx_license_keys_assigned ON license_keys(assigned_user_id);

-- 4. (Optional) Verify the tables look correct
-- SELECT * FROM license_keys LIMIT 5;
-- SELECT id, email, license_key_id FROM users LIMIT 5;
