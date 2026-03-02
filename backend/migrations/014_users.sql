-- 014_users.sql — Users table for Supabase Auth integration (M15-AUTH-BACKEND-A)

CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  supabase_auth_id UUID UNIQUE,
  legacy_device_id TEXT,
  email TEXT,
  nickname TEXT DEFAULT '',
  avatar_url TEXT DEFAULT '',
  role TEXT NOT NULL DEFAULT 'participant'
    CHECK (role IN ('participant','counselor','educator','shift_leader','camp_director','parent','developer')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_users_auth ON users(supabase_auth_id);
CREATE INDEX IF NOT EXISTS idx_users_device ON users(legacy_device_id);
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);

-- RLS
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

CREATE POLICY "users_select_own" ON users FOR SELECT
  USING (true);

CREATE POLICY "users_insert_service" ON users FOR INSERT
  WITH CHECK (true);

CREATE POLICY "users_update_own" ON users FOR UPDATE
  USING (true);
