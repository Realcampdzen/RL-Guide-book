-- Migration 007: Engines (Движки) tables
-- Task: M11-DVIZHKI-BACKEND-A

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

-- RLS
ALTER TABLE engines ENABLE ROW LEVEL SECURITY;
ALTER TABLE engine_members ENABLE ROW LEVEL SECURITY;

CREATE POLICY IF NOT EXISTS "engines_read" ON engines FOR SELECT USING (true);
CREATE POLICY IF NOT EXISTS "engines_insert" ON engines FOR INSERT WITH CHECK (true);
CREATE POLICY IF NOT EXISTS "engines_update" ON engines FOR UPDATE USING (true);

CREATE POLICY IF NOT EXISTS "engine_members_read" ON engine_members FOR SELECT USING (true);
CREATE POLICY IF NOT EXISTS "engine_members_insert" ON engine_members FOR INSERT WITH CHECK (true);
CREATE POLICY IF NOT EXISTS "engine_members_delete" ON engine_members FOR DELETE USING (true);
