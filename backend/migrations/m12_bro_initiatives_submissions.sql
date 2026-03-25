-- Migration: bro_initiatives + bro_submissions tables
-- Apply via Supabase SQL Editor

-- ═══════════════════════════════════════════════════════════════
-- bro_initiatives — ОДэ / Бродела initiatives
-- ═══════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS bro_initiatives (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL DEFAULT '',
    description TEXT NOT NULL DEFAULT '',
    created_by TEXT NOT NULL DEFAULT '',
    status TEXT NOT NULL DEFAULT 'voting',
    votes_json JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ═══════════════════════════════════════════════════════════════
-- bro_submissions — BRO task proof submissions
-- ═══════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS bro_submissions (
    id TEXT PRIMARY KEY,
    passport_id TEXT NOT NULL DEFAULT '',
    task_id TEXT NOT NULL DEFAULT '',
    task_title TEXT NOT NULL DEFAULT '',
    device_id TEXT NOT NULL DEFAULT '',
    squad_id TEXT NOT NULL DEFAULT '',
    text TEXT NOT NULL DEFAULT '',
    photo_url TEXT,
    nickname TEXT,
    user_role TEXT,
    status TEXT NOT NULL DEFAULT 'pending',
    comment TEXT,
    submitted_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    reviewed_at TIMESTAMPTZ,
    reviewed_by TEXT
);
