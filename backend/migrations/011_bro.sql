-- Migration 011: БРО — Бросвящение + Крыло (M12-BRO-BACKEND-A)

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

-- Extend engines with type field
ALTER TABLE engines ADD COLUMN IF NOT EXISTS type TEXT NOT NULL DEFAULT 'regular'
  CHECK (type IN ('regular', 'bro_wing'));

-- RLS
ALTER TABLE bro_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE bro_passports ENABLE ROW LEVEL SECURITY;

CREATE POLICY "bro_events_all" ON bro_events FOR ALL USING (true);
CREATE POLICY "bro_passports_all" ON bro_passports FOR ALL USING (true);
