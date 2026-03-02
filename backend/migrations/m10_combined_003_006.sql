-- ============================================================
-- M10 Combined Migration: 003 → 006
-- Apply in Supabase SQL Editor in ONE go
-- Date: 2026-03-02
-- ============================================================

-- ============ 003: Badge Plans ============
CREATE TABLE IF NOT EXISTS badge_plans (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  device_id      TEXT NOT NULL,
  camp_id        TEXT,
  badge_id       TEXT NOT NULL,
  level_id       TEXT,
  plan_text      TEXT NOT NULL DEFAULT '',
  checklist      JSONB NOT NULL DEFAULT '[]',
  status         TEXT NOT NULL DEFAULT 'draft'
                   CHECK (status IN ('draft','submitted','approved','rejected')),
  counselor_note TEXT,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_badge_plans_device ON badge_plans(device_id);
CREATE INDEX IF NOT EXISTS idx_badge_plans_status ON badge_plans(status);
CREATE INDEX IF NOT EXISTS idx_badge_plans_camp   ON badge_plans(camp_id);
ALTER TABLE badge_plans ENABLE ROW LEVEL SECURITY;

-- ============ 004: Council Initiatives (extend) ============
CREATE TABLE IF NOT EXISTS council_initiatives (
  id            TEXT PRIMARY KEY,
  camp_id       TEXT NOT NULL DEFAULT '',
  title         TEXT NOT NULL,
  status        TEXT NOT NULL DEFAULT 'idea',
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by    TEXT NOT NULL DEFAULT '',
  created_by_nickname TEXT NOT NULL DEFAULT ''
);

ALTER TABLE council_initiatives ADD COLUMN IF NOT EXISTS description   TEXT NOT NULL DEFAULT '';
ALTER TABLE council_initiatives ADD COLUMN IF NOT EXISTS team_id       TEXT;
ALTER TABLE council_initiatives ADD COLUMN IF NOT EXISTS squad_id      TEXT;
ALTER TABLE council_initiatives ADD COLUMN IF NOT EXISTS author_nickname TEXT NOT NULL DEFAULT '';
ALTER TABLE council_initiatives ADD COLUMN IF NOT EXISTS votes_up      INTEGER NOT NULL DEFAULT 0;
ALTER TABLE council_initiatives ADD COLUMN IF NOT EXISTS voters        JSONB NOT NULL DEFAULT '[]'::jsonb;
ALTER TABLE council_initiatives ADD COLUMN IF NOT EXISTS updated_at    TIMESTAMPTZ NOT NULL DEFAULT now();

ALTER TABLE council_initiatives ENABLE ROW LEVEL SECURITY;

CREATE POLICY IF NOT EXISTS "council_initiatives_read"
  ON council_initiatives FOR SELECT USING (true);
CREATE POLICY IF NOT EXISTS "council_initiatives_insert"
  ON council_initiatives FOR INSERT WITH CHECK (true);
CREATE POLICY IF NOT EXISTS "council_initiatives_update"
  ON council_initiatives FOR UPDATE USING (true);

-- ============ 005: Squad Kind ============
ALTER TABLE squads ADD COLUMN IF NOT EXISTS kind TEXT NOT NULL DEFAULT 'participant'
  CHECK (kind IN ('participant', 'staff'));

-- ============ 006: Badge Arts ============
CREATE TABLE IF NOT EXISTS badge_arts (
  id              TEXT PRIMARY KEY,
  device_id       TEXT NOT NULL,
  badge_id        TEXT NOT NULL,
  image_url       TEXT NOT NULL DEFAULT '',
  source          TEXT NOT NULL DEFAULT 'uploaded' CHECK (source IN ('ai_generated', 'hand_drawn', 'uploaded')),
  status          TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'canon')),
  moderator_note  TEXT,
  author_nickname TEXT NOT NULL DEFAULT '',
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE badge_arts ENABLE ROW LEVEL SECURITY;

CREATE POLICY IF NOT EXISTS "badge_arts_read"
  ON badge_arts FOR SELECT USING (true);
CREATE POLICY IF NOT EXISTS "badge_arts_insert"
  ON badge_arts FOR INSERT WITH CHECK (true);
CREATE POLICY IF NOT EXISTS "badge_arts_update"
  ON badge_arts FOR UPDATE USING (true);

-- ============ VERIFICATION ============
-- Run these after to confirm:
SELECT 'badge_plans' AS tbl, count(*) FROM badge_plans;
SELECT 'council_initiatives' AS tbl, count(*) FROM council_initiatives;
SELECT 'squads.kind' AS tbl, count(*) FROM squads;
SELECT 'badge_arts' AS tbl, count(*) FROM badge_arts;
