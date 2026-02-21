-- =============================================================================
-- Supabase schema v1 — Путеводитель «Реальный Лагерь» (pilot)
-- Источник: docs/SUPABASE_SCHEMA_AND_MIGRATION.md §3
-- Дата: 2026-02-21
-- =============================================================================

-- Применять: один раз к staging и prod Supabase проектам.
-- Идентификаторы: текущие short-id (12 символов) совместимы с TEXT pk.


-- -----------------------------------------------------------------------------
-- 3.1. shifts — Смены
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS shifts (
    id                   TEXT PRIMARY KEY,
    name                 TEXT NOT NULL,
    start_date           DATE,
    end_date             DATE,
    created_at           TIMESTAMPTZ NOT NULL DEFAULT now(),
    created_by_device_id TEXT
);

-- -----------------------------------------------------------------------------
-- 3.2. squads — Отряды (привязаны к смене)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS squads (
    id                   TEXT PRIMARY KEY,
    shift_id             TEXT NOT NULL REFERENCES shifts(id) ON DELETE CASCADE,
    name                 TEXT NOT NULL,
    created_at           TIMESTAMPTZ NOT NULL DEFAULT now(),
    created_by_device_id TEXT
);

CREATE INDEX IF NOT EXISTS idx_squads_shift_id ON squads(shift_id);

-- -----------------------------------------------------------------------------
-- 3.3. memberships — Членство устройства (одно на устройство глобально)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS memberships (
    device_id  TEXT PRIMARY KEY,
    camp_id    TEXT,                                        -- shift id, nullable
    squad_id   TEXT REFERENCES squads(id) ON DELETE SET NULL,
    role       TEXT NOT NULL CHECK (role IN (
                   'participant','counselor','shift_leader',
                   'camp_director','developer','parent','educator'
               )),
    nickname   TEXT,
    joined_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_memberships_squad_id ON memberships(squad_id);

-- -----------------------------------------------------------------------------
-- 3.4. squad_corners — Общий контент уголка отряда
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS squad_corners (
    squad_id              TEXT PRIMARY KEY REFERENCES squads(id) ON DELETE CASCADE,
    corner_json           JSONB NOT NULL DEFAULT '{}'::jsonb,
    updated_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_by_device_id  TEXT
);

-- -----------------------------------------------------------------------------
-- 3.5. squad_invite_codes — Инвайт-коды (один активный на отряд)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS squad_invite_codes (
    code                 TEXT PRIMARY KEY,
    squad_id             TEXT NOT NULL REFERENCES squads(id) ON DELETE CASCADE,
    created_at           TIMESTAMPTZ NOT NULL DEFAULT now(),
    expires_at           TIMESTAMPTZ,
    created_by_device_id TEXT,
    is_active            BOOLEAN NOT NULL DEFAULT true
);

-- Partial unique index: только один активный код на отряд
CREATE UNIQUE INDEX IF NOT EXISTS idx_squad_invite_codes_active
    ON squad_invite_codes(squad_id)
    WHERE is_active = true;

-- -----------------------------------------------------------------------------
-- 3.6. squad_messages — Чат отряда (retention: последние 1000 сообщений)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS squad_messages (
    id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    squad_id   TEXT NOT NULL REFERENCES squads(id) ON DELETE CASCADE,
    device_id  TEXT NOT NULL,
    nickname   TEXT,
    role       TEXT NOT NULL,
    text       TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_squad_messages_squad_created
    ON squad_messages(squad_id, created_at DESC);

-- -----------------------------------------------------------------------------
-- 3.7. badge_requests — Заявки на подтверждение уровней
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS badge_requests (
    id                      TEXT PRIMARY KEY,
    camp_id                 TEXT,           -- shift id, nullable
    squad_id                TEXT,           -- squad id, nullable
    level_id                TEXT NOT NULL,
    badge_title             TEXT,
    evidence                JSONB NOT NULL DEFAULT '{}'::jsonb,
    status                  TEXT NOT NULL DEFAULT 'pending'
                                CHECK (status IN ('pending','approved','rejected')),
    created_at              TIMESTAMPTZ NOT NULL DEFAULT now(),
    requested_by_device_id  TEXT NOT NULL,
    requested_by_nickname   TEXT,
    resolved_at             TIMESTAMPTZ,
    resolved_by_device_id   TEXT,
    resolved_by_role        TEXT,
    resolution_note         TEXT
);

CREATE INDEX IF NOT EXISTS idx_badge_requests_status_created
    ON badge_requests(status, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_badge_requests_camp_status_created
    ON badge_requests(camp_id, status, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_badge_requests_squad_status_created
    ON badge_requests(squad_id, status, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_badge_requests_device
    ON badge_requests(requested_by_device_id, created_at DESC);

-- -----------------------------------------------------------------------------
-- 3.8. parent_snapshots — Коды/QR для read-only витрины прогресса
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS parent_snapshots (
    code                 TEXT PRIMARY KEY,
    payload              JSONB NOT NULL,
    created_at           TIMESTAMPTZ NOT NULL DEFAULT now(),
    expires_at           TIMESTAMPTZ NOT NULL,
    created_by_device_id TEXT
);

CREATE INDEX IF NOT EXISTS idx_parent_snapshots_expires
    ON parent_snapshots(expires_at);

-- -----------------------------------------------------------------------------
-- 3.9. chat_daily_usage — Квоты чата (анти-абьюз / расходы)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS chat_daily_usage (
    device_id  TEXT NOT NULL,
    day        DATE NOT NULL,
    count      INTEGER NOT NULL DEFAULT 0,
    PRIMARY KEY (device_id, day)
);

-- =============================================================================
-- Вспомогательные функции
-- =============================================================================

-- Функция для retention squad_messages: удаляет сообщения сверх 1000 на отряд.
-- Вызывается триггером после INSERT.
CREATE OR REPLACE FUNCTION trim_squad_messages()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
    DELETE FROM squad_messages
    WHERE id IN (
        SELECT id FROM squad_messages
        WHERE squad_id = NEW.squad_id
        ORDER BY created_at DESC
        OFFSET 1000
    );
    RETURN NEW;
END;
$$;

CREATE OR REPLACE TRIGGER trg_trim_squad_messages
AFTER INSERT ON squad_messages
FOR EACH ROW EXECUTE FUNCTION trim_squad_messages();

-- =============================================================================
-- Комментарии к таблицам (документация в БД)
-- =============================================================================
COMMENT ON TABLE shifts              IS 'Смены лагеря';
COMMENT ON TABLE squads              IS 'Отряды — дочерние к смене';
COMMENT ON TABLE memberships         IS 'Членство устройства: одно на deviceId глобально';
COMMENT ON TABLE squad_corners       IS 'Shared-контент отрядного уголка';
COMMENT ON TABLE squad_invite_codes  IS 'Инвайт-коды вступления в отряд (один активный)';
COMMENT ON TABLE squad_messages      IS 'Чат отряда, retention 1000 сообщений';
COMMENT ON TABLE badge_requests      IS 'Заявки на подтверждение уровней значков';
COMMENT ON TABLE parent_snapshots    IS 'Снапшоты прогресса для родителей (TTL 7 дней)';
COMMENT ON TABLE chat_daily_usage    IS 'Дневные квоты чата НейроВалюши на устройство';
