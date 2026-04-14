-- Migration 004: Teams scoped engines (camp | shift | squad)
-- Adds teams table (if missing) and scope fields for context-aware engine visibility.

CREATE TABLE IF NOT EXISTS teams (
  id                  text PRIMARY KEY,
  name                text NOT NULL,
  motto               text,
  logo                text,
  leader_id           text NOT NULL,
  members_json        jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_at          timestamptz NOT NULL DEFAULT now(),
  achievements_json   jsonb NOT NULL DEFAULT '[]'::jsonb,
  goals_json          jsonb NOT NULL DEFAULT '[]'::jsonb,
  plan_grid_a         jsonb,
  plan_grid_b         jsonb,
  flag_image          text,
  gerb_image          text,
  scope               text NOT NULL DEFAULT 'camp',
  shift_id            text,
  squad_id            text
);

ALTER TABLE teams
  ADD CONSTRAINT IF NOT EXISTS teams_scope_check
  CHECK (scope IN ('camp', 'shift', 'squad'));

ALTER TABLE teams
  ADD CONSTRAINT IF NOT EXISTS teams_scope_context_check
  CHECK (
    (scope = 'camp' AND shift_id IS NULL AND squad_id IS NULL)
    OR
    (scope = 'shift' AND shift_id IS NOT NULL AND squad_id IS NULL)
    OR
    (scope = 'squad' AND shift_id IS NOT NULL AND squad_id IS NOT NULL)
  );

CREATE INDEX IF NOT EXISTS idx_teams_scope ON teams(scope);
CREATE INDEX IF NOT EXISTS idx_teams_shift_id ON teams(shift_id);
CREATE INDEX IF NOT EXISTS idx_teams_squad_id ON teams(squad_id);
CREATE INDEX IF NOT EXISTS idx_teams_leader_scope ON teams(leader_id, scope);
