-- Migration 003: Badge Plans
-- Creates the badge_plans table for persisting badge achievement plans.
-- Workflow: participant creates plan → submits → counselor approves/rejects.
-- Apply this migration to Supabase via the apply_migration.py script or directly in the SQL editor.

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

-- Indexes for efficient filtering
CREATE INDEX IF NOT EXISTS idx_badge_plans_device ON badge_plans(device_id);
CREATE INDEX IF NOT EXISTS idx_badge_plans_status ON badge_plans(status);
CREATE INDEX IF NOT EXISTS idx_badge_plans_camp   ON badge_plans(camp_id);

-- RLS: Enable Row Level Security (policies to be configured in Supabase dashboard)
-- Service role key bypasses RLS, so backend operations are unaffected.
ALTER TABLE badge_plans ENABLE ROW LEVEL SECURITY;
