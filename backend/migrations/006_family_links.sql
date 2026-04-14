-- Migration 006: family_links — parent-child relationship links
-- Apply with: python backend/migrations/apply_migration.py 006_family_links.sql

CREATE TABLE IF NOT EXISTS family_links (
    id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    parent_device_id TEXT NOT NULL,
    child_device_id  TEXT NOT NULL,
    label            TEXT,          -- e.g. "Мой ребёнок", "Дочь Аня"
    created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (parent_device_id, child_device_id)
);

CREATE INDEX IF NOT EXISTS idx_family_links_parent ON family_links(parent_device_id);
CREATE INDEX IF NOT EXISTS idx_family_links_child  ON family_links(child_device_id);
