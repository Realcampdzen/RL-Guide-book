-- Migration 002: Council Initiatives
-- Creates the council_initiatives table for persisting Camp Council initiative proposals.
-- Apply this migration to Supabase via the apply_migration.py script or directly in the SQL editor.

CREATE TABLE IF NOT EXISTS council_initiatives (
  id                  text PRIMARY KEY,
  camp_id             text,
  title               text NOT NULL,
  status              text NOT NULL DEFAULT 'idea',
  created_at          timestamptz NOT NULL DEFAULT now(),
  created_by          text,
  created_by_nickname text
);

-- Index for efficient filtering by camp and chronological ordering
CREATE INDEX IF NOT EXISTS idx_council_initiatives_camp
  ON council_initiatives (camp_id, created_at DESC);

-- Status check constraint: idea | discussion | decided | done
ALTER TABLE council_initiatives
  ADD CONSTRAINT IF NOT EXISTS council_initiatives_status_check
  CHECK (status IN ('idea', 'discussion', 'decided', 'done'));

-- RLS: Enable Row Level Security (policies to be configured in Supabase dashboard)
-- Service role key bypasses RLS, so backend operations are unaffected.
ALTER TABLE council_initiatives ENABLE ROW LEVEL SECURITY;
