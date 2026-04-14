-- 010_inspector.sql — Inspector Progress (M11-INSPECTOR-C)
-- Tracks mission task completion and counselor approvals.

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

-- Index for per-user progress queries
CREATE INDEX IF NOT EXISTS idx_inspector_progress_device
  ON inspector_progress (device_id);

-- RLS
ALTER TABLE inspector_progress ENABLE ROW LEVEL SECURITY;

CREATE POLICY "inspector_progress_anon_insert"
  ON inspector_progress FOR INSERT
  TO anon
  WITH CHECK (true);

CREATE POLICY "inspector_progress_anon_select"
  ON inspector_progress FOR SELECT
  TO anon
  USING (true);

CREATE POLICY "inspector_progress_anon_update"
  ON inspector_progress FOR UPDATE
  TO anon
  USING (true)
  WITH CHECK (true);

CREATE POLICY "inspector_progress_service_all"
  ON inspector_progress FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);
