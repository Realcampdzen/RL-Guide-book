-- Migration 017: Workshop proposals + Council members/protocols (Supabase parity)
-- Fixes missing tables that caused HTTP 500 in Supabase mode.

-- ---------------------------------------------------------------------------
-- Workshop proposals
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS workshop_proposals (
  id TEXT PRIMARY KEY,
  type TEXT NOT NULL DEFAULT 'badge'
    CHECK (type IN ('badge', 'category', 'version', 'art')),
  title TEXT NOT NULL,
  description TEXT DEFAULT '',
  emoji TEXT,
  badge_id TEXT,
  image TEXT,
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'approved', 'rejected')),
  created_by_device_id TEXT NOT NULL DEFAULT '',
  created_by_nickname TEXT NOT NULL DEFAULT '',
  camp_id TEXT NOT NULL DEFAULT '',
  squad_id TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  resolved_at TIMESTAMPTZ,
  resolved_by_device_id TEXT,
  resolved_by_role TEXT,
  resolution_note TEXT
);

CREATE INDEX IF NOT EXISTS idx_workshop_proposals_created_by
  ON workshop_proposals(created_by_device_id);
CREATE INDEX IF NOT EXISTS idx_workshop_proposals_created_at
  ON workshop_proposals(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_workshop_proposals_status_camp
  ON workshop_proposals(status, camp_id);

ALTER TABLE workshop_proposals ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "workshop_proposals_all" ON workshop_proposals;
CREATE POLICY "workshop_proposals_all" ON workshop_proposals FOR ALL USING (true);

-- ---------------------------------------------------------------------------
-- Council members
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS council_members (
  id TEXT PRIMARY KEY,
  nickname TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'member'
    CHECK (role IN ('member', 'chair', 'secretary')),
  device_id TEXT DEFAULT '',
  joined_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  added_by TEXT DEFAULT ''
);

CREATE INDEX IF NOT EXISTS idx_council_members_joined_at
  ON council_members(joined_at DESC);
CREATE INDEX IF NOT EXISTS idx_council_members_device
  ON council_members(device_id);

ALTER TABLE council_members ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "council_members_all" ON council_members;
CREATE POLICY "council_members_all" ON council_members FOR ALL USING (true);

-- ---------------------------------------------------------------------------
-- Council protocols
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS council_protocols (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  date TEXT NOT NULL,
  summary TEXT DEFAULT '',
  decisions JSONB NOT NULL DEFAULT '[]'::jsonb,
  participants JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_by TEXT DEFAULT '',
  created_by_nickname TEXT DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_council_protocols_date
  ON council_protocols(date DESC);
CREATE INDEX IF NOT EXISTS idx_council_protocols_created_at
  ON council_protocols(created_at DESC);

ALTER TABLE council_protocols ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "council_protocols_all" ON council_protocols;
CREATE POLICY "council_protocols_all" ON council_protocols FOR ALL USING (true);
