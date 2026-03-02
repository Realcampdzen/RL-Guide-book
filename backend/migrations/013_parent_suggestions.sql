-- Migration 013: Parent Suggestions (M14-PARENT-AUTH-A)

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
CREATE POLICY "parent_suggestions_all" ON parent_suggestions FOR ALL USING (true);
