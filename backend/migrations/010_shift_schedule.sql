-- Migration 010: План-сетка смены (M12-SHIFT-PLANNER-A)

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

-- RLS
ALTER TABLE shift_schedule_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "shift_schedule_all" ON shift_schedule_events FOR ALL USING (true);
