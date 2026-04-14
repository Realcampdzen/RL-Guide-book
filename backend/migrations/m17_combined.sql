-- ============================================================
-- COMBINED MIGRATION: 007-014 (fixed for Supabase)
-- Apply in Supabase SQL Editor (one shot)
-- ============================================================

-- 007: Engines (Движки) — M11
CREATE TABLE IF NOT EXISTS engines (
  id            TEXT PRIMARY KEY,
  squad_id      TEXT NOT NULL,
  title         TEXT NOT NULL,
  avatar_url    TEXT DEFAULT '',
  goal          TEXT DEFAULT '',
  goal_status   TEXT NOT NULL DEFAULT 'draft' CHECK (goal_status IN ('draft','submitted','approved')),
  created_by    TEXT NOT NULL,
  status        TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','approved','rejected','archived')),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS engine_members (
  id            TEXT PRIMARY KEY,
  engine_id     TEXT NOT NULL REFERENCES engines(id),
  device_id     TEXT NOT NULL,
  nickname      TEXT DEFAULT '',
  role          TEXT NOT NULL DEFAULT 'member' CHECK (role IN ('creator','member')),
  joined_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE engines ENABLE ROW LEVEL SECURITY;
ALTER TABLE engine_members ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "engines_read" ON engines;
CREATE POLICY "engines_read" ON engines FOR SELECT USING (true);
DROP POLICY IF EXISTS "engines_insert" ON engines;
CREATE POLICY "engines_insert" ON engines FOR INSERT WITH CHECK (true);
DROP POLICY IF EXISTS "engines_update" ON engines;
CREATE POLICY "engines_update" ON engines FOR UPDATE USING (true);
DROP POLICY IF EXISTS "engine_members_read" ON engine_members;
CREATE POLICY "engine_members_read" ON engine_members FOR SELECT USING (true);
DROP POLICY IF EXISTS "engine_members_insert" ON engine_members;
CREATE POLICY "engine_members_insert" ON engine_members FOR INSERT WITH CHECK (true);
DROP POLICY IF EXISTS "engine_members_delete" ON engine_members;
CREATE POLICY "engine_members_delete" ON engine_members FOR DELETE USING (true);

-- 008: Inspector Progress — M11
CREATE TABLE IF NOT EXISTS inspector_progress (
  id            TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  device_id     TEXT NOT NULL,
  checklist_id  TEXT NOT NULL,
  task_id       TEXT NOT NULL,
  status        TEXT NOT NULL DEFAULT 'completed'
                  CHECK (status IN ('completed', 'approved')),
  completed_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  approved_by   TEXT,
  approved_at   TIMESTAMPTZ,
  UNIQUE(device_id, checklist_id, task_id)
);

CREATE INDEX IF NOT EXISTS idx_inspector_progress_device
  ON inspector_progress (device_id);

ALTER TABLE inspector_progress ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "inspector_progress_anon_insert" ON inspector_progress;
CREATE POLICY "inspector_progress_anon_insert" ON inspector_progress FOR INSERT TO anon WITH CHECK (true);
DROP POLICY IF EXISTS "inspector_progress_anon_select" ON inspector_progress;
CREATE POLICY "inspector_progress_anon_select" ON inspector_progress FOR SELECT TO anon USING (true);
DROP POLICY IF EXISTS "inspector_progress_anon_update" ON inspector_progress;
CREATE POLICY "inspector_progress_anon_update" ON inspector_progress FOR UPDATE TO anon USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "inspector_progress_service_all" ON inspector_progress;
CREATE POLICY "inspector_progress_service_all" ON inspector_progress FOR ALL TO service_role USING (true) WITH CHECK (true);

-- 009: БРО — M12
CREATE TABLE IF NOT EXISTS bro_events (
  id TEXT PRIMARY KEY,
  squad_id TEXT NOT NULL,
  initiated_by TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active','completed','cancelled')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS bro_passports (
  id TEXT PRIMARY KEY,
  device_id TEXT NOT NULL,
  bro_event_id TEXT NOT NULL REFERENCES bro_events(id),
  tasks JSONB NOT NULL DEFAULT '[]',
  status TEXT NOT NULL DEFAULT 'in_progress' CHECK (status IN ('in_progress','completed')),
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE engines ADD COLUMN IF NOT EXISTS type TEXT NOT NULL DEFAULT 'regular';

ALTER TABLE bro_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE bro_passports ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "bro_events_all" ON bro_events;
CREATE POLICY "bro_events_all" ON bro_events FOR ALL USING (true);
DROP POLICY IF EXISTS "bro_passports_all" ON bro_passports;
CREATE POLICY "bro_passports_all" ON bro_passports FOR ALL USING (true);

-- 010: План-сетка смены — M12
CREATE TABLE IF NOT EXISTS shift_schedule_events (
  id TEXT PRIMARY KEY,
  shift_id TEXT NOT NULL,
  day_index INTEGER NOT NULL,
  time_start TEXT NOT NULL,
  time_end TEXT,
  title TEXT NOT NULL,
  description TEXT DEFAULT '',
  type TEXT NOT NULL DEFAULT 'event' CHECK (type IN ('event','training','workshop','tradition','free_time','meal')),
  responsible_id TEXT,
  responsible_name TEXT DEFAULT '',
  workshop_id TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_schedule_shift ON shift_schedule_events(shift_id);
CREATE INDEX IF NOT EXISTS idx_schedule_day ON shift_schedule_events(shift_id, day_index);

ALTER TABLE shift_schedule_events ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "shift_schedule_all" ON shift_schedule_events;
CREATE POLICY "shift_schedule_all" ON shift_schedule_events FOR ALL USING (true);

-- 011: Мастерские — M13
CREATE TABLE IF NOT EXISTS workshops (
  id TEXT PRIMARY KEY,
  educator_id TEXT NOT NULL,
  title TEXT NOT NULL,
  direction TEXT DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS workshop_participants (
  id TEXT PRIMARY KEY,
  workshop_id TEXT NOT NULL REFERENCES workshops(id),
  device_id TEXT NOT NULL,
  nickname TEXT DEFAULT '',
  joined_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS workshop_badges (
  id TEXT PRIMARY KEY,
  workshop_id TEXT NOT NULL REFERENCES workshops(id),
  badge_id TEXT NOT NULL,
  added_by TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS workshop_badge_confirmations (
  id TEXT PRIMARY KEY,
  workshop_badge_id TEXT NOT NULL REFERENCES workshop_badges(id),
  device_id TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','confirmed')),
  confirmed_at TIMESTAMPTZ,
  confirmed_by TEXT
);

CREATE INDEX IF NOT EXISTS idx_workshops_educator ON workshops(educator_id);
CREATE INDEX IF NOT EXISTS idx_wp_workshop ON workshop_participants(workshop_id);
CREATE INDEX IF NOT EXISTS idx_wb_workshop ON workshop_badges(workshop_id);
CREATE INDEX IF NOT EXISTS idx_wbc_badge ON workshop_badge_confirmations(workshop_badge_id);

ALTER TABLE workshops ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "workshops_all" ON workshops;
CREATE POLICY "workshops_all" ON workshops FOR ALL USING (true);
ALTER TABLE workshop_participants ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "workshop_participants_all" ON workshop_participants;
CREATE POLICY "workshop_participants_all" ON workshop_participants FOR ALL USING (true);
ALTER TABLE workshop_badges ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "workshop_badges_all" ON workshop_badges;
CREATE POLICY "workshop_badges_all" ON workshop_badges FOR ALL USING (true);
ALTER TABLE workshop_badge_confirmations ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "workshop_badge_confirmations_all" ON workshop_badge_confirmations;
CREATE POLICY "workshop_badge_confirmations_all" ON workshop_badge_confirmations FOR ALL USING (true);

-- 012: Director Proposal — M14
ALTER TABLE council_initiatives ADD COLUMN IF NOT EXISTS proposal_type TEXT DEFAULT 'regular';

-- 013: Parent Suggestions — M14
CREATE TABLE IF NOT EXISTS parent_suggestions (
  id TEXT PRIMARY KEY,
  parent_id TEXT NOT NULL,
  child_device_id TEXT NOT NULL,
  badges JSONB NOT NULL DEFAULT '[]',
  note TEXT DEFAULT '',
  status TEXT NOT NULL DEFAULT 'suggested' CHECK (status IN ('suggested','reviewed')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_ps_parent ON parent_suggestions(parent_id);
CREATE INDEX IF NOT EXISTS idx_ps_child ON parent_suggestions(child_device_id);

ALTER TABLE parent_suggestions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "parent_suggestions_all" ON parent_suggestions;
CREATE POLICY "parent_suggestions_all" ON parent_suggestions FOR ALL USING (true);

-- 014: Users — M15
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

ALTER TABLE users ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "users_select_own" ON users;
CREATE POLICY "users_select_own" ON users FOR SELECT USING (true);
DROP POLICY IF EXISTS "users_insert_service" ON users;
CREATE POLICY "users_insert_service" ON users FOR INSERT WITH CHECK (true);
DROP POLICY IF EXISTS "users_update_own" ON users;
CREATE POLICY "users_update_own" ON users FOR UPDATE USING (true);

-- ============================================================
-- DONE! Verify with:
-- SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' ORDER BY table_name;
-- ============================================================
