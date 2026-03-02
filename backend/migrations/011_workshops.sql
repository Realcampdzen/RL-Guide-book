-- Migration 011: Кабинет Мастерской педагога (M13-EDUCATOR-WORKSHOP-A)

CREATE TABLE IF NOT EXISTS workshops (
  id TEXT PRIMARY KEY,
  educator_id TEXT NOT NULL,
  title TEXT NOT NULL,
  direction TEXT DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS workshop_participants (
  id TEXT PRIMARY KEY,
  workshop_id TEXT NOT NULL REFERENCES workshops(id),
  device_id TEXT NOT NULL,
  nickname TEXT DEFAULT '',
  joined_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS workshop_badges (
  id TEXT PRIMARY KEY,
  workshop_id TEXT NOT NULL REFERENCES workshops(id),
  badge_id TEXT NOT NULL,
  added_by TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS workshop_badge_confirmations (
  id TEXT PRIMARY KEY,
  workshop_badge_id TEXT NOT NULL REFERENCES workshop_badges(id),
  device_id TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','confirmed')),
  confirmed_at TIMESTAMPTZ,
  confirmed_by TEXT
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_workshops_educator ON workshops(educator_id);
CREATE INDEX IF NOT EXISTS idx_wp_workshop ON workshop_participants(workshop_id);
CREATE INDEX IF NOT EXISTS idx_wb_workshop ON workshop_badges(workshop_id);
CREATE INDEX IF NOT EXISTS idx_wbc_badge ON workshop_badge_confirmations(workshop_badge_id);

-- RLS
ALTER TABLE workshops ENABLE ROW LEVEL SECURITY;
CREATE POLICY "workshops_all" ON workshops FOR ALL USING (true);

ALTER TABLE workshop_participants ENABLE ROW LEVEL SECURITY;
CREATE POLICY "workshop_participants_all" ON workshop_participants FOR ALL USING (true);

ALTER TABLE workshop_badges ENABLE ROW LEVEL SECURITY;
CREATE POLICY "workshop_badges_all" ON workshop_badges FOR ALL USING (true);

ALTER TABLE workshop_badge_confirmations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "workshop_badge_confirmations_all" ON workshop_badge_confirmations FOR ALL USING (true);
