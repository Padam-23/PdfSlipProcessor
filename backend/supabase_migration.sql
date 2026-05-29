-- Run this SQL in your Supabase SQL Editor (https://supabase.com/dashboard/project/cigdhnctnfrxforbphtk/sql/new)
-- This adds the columns needed for Google OAuth integration

-- Add new columns to users table (if they don't already exist)
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS supabase_user_id TEXT UNIQUE,
ADD COLUMN IF NOT EXISTS display_name TEXT,
ADD COLUMN IF NOT EXISTS avatar_url TEXT,
ADD COLUMN IF NOT EXISTS last_login TIMESTAMPTZ DEFAULT NOW();

-- Drop password_hash since Google auth users won't have one
ALTER TABLE users 
DROP COLUMN IF EXISTS password_hash;

-- Create an index on supabase_user_id for faster lookups
CREATE INDEX IF NOT EXISTS idx_users_supabase_user_id ON users(supabase_user_id);