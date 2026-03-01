-- Migration 005: Add kind column to squads
-- Task: M8-COUNSELOR-SQUAD-A

ALTER TABLE squads ADD COLUMN IF NOT EXISTS kind TEXT NOT NULL DEFAULT 'participant'
  CHECK (kind IN ('participant', 'staff'));
