-- Migration 008: Badge Arts table
-- Task: M9-ART-MODERATION-A

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

-- RLS
ALTER TABLE badge_arts ENABLE ROW LEVEL SECURITY;

CREATE POLICY IF NOT EXISTS "badge_arts_read"
  ON badge_arts FOR SELECT USING (true);

CREATE POLICY IF NOT EXISTS "badge_arts_insert"
  ON badge_arts FOR INSERT WITH CHECK (true);

CREATE POLICY IF NOT EXISTS "badge_arts_update"
  ON badge_arts FOR UPDATE USING (true);
