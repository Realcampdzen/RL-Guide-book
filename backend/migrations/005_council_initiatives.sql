-- Migration 005: Extend council_initiatives table
-- Task: M8-COUNCIL-INITIATIVES-A

-- If table doesn't exist yet, create it
CREATE TABLE IF NOT EXISTS council_initiatives (
  id            TEXT PRIMARY KEY,
  camp_id       TEXT NOT NULL DEFAULT '',
  title         TEXT NOT NULL,
  status        TEXT NOT NULL DEFAULT 'idea',
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by    TEXT NOT NULL DEFAULT '',
  created_by_nickname TEXT NOT NULL DEFAULT ''
);

-- Add new columns (M8)
ALTER TABLE council_initiatives ADD COLUMN IF NOT EXISTS description   TEXT NOT NULL DEFAULT '';
ALTER TABLE council_initiatives ADD COLUMN IF NOT EXISTS team_id       TEXT;
ALTER TABLE council_initiatives ADD COLUMN IF NOT EXISTS squad_id      TEXT;
ALTER TABLE council_initiatives ADD COLUMN IF NOT EXISTS author_nickname TEXT NOT NULL DEFAULT '';
ALTER TABLE council_initiatives ADD COLUMN IF NOT EXISTS votes_up      INTEGER NOT NULL DEFAULT 0;
ALTER TABLE council_initiatives ADD COLUMN IF NOT EXISTS voters        JSONB NOT NULL DEFAULT '[]'::jsonb;
ALTER TABLE council_initiatives ADD COLUMN IF NOT EXISTS updated_at    TIMESTAMPTZ NOT NULL DEFAULT now();

-- RLS
ALTER TABLE council_initiatives ENABLE ROW LEVEL SECURITY;

CREATE POLICY IF NOT EXISTS "council_initiatives_read"
  ON council_initiatives FOR SELECT
  USING (true);

CREATE POLICY IF NOT EXISTS "council_initiatives_insert"
  ON council_initiatives FOR INSERT
  WITH CHECK (true);

CREATE POLICY IF NOT EXISTS "council_initiatives_update"
  ON council_initiatives FOR UPDATE
  USING (true);
