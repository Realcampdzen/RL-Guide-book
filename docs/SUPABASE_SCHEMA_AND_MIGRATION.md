# SUPABASE_SCHEMA_AND_MIGRATION — переход с `backend/data/*.json` на Supabase (pilot)

**Срез:** 2026‑02‑21  
**Назначение:** чтобы hosted‑prod (Vercel) был реальным сервисом: персистентность + транзакционность + конкуренция записей без порчи данных.

Связанные документы:
- SSOT: [`docs/PRODUCT_MECHANICS_AND_ROADMAP.md`](PRODUCT_MECHANICS_AND_ROADMAP.md)
- Release playbook: [`docs/PROD_RELEASE_PLAYBOOK.md`](PROD_RELEASE_PLAYBOOK.md)

---

## 1) Почему JSON нельзя в hosted‑prod

Текущий backend хранит state в `backend/data/*.json` (shifts, memberships, squad corners, инвайты, сообщения и т.п.). Это ок для local dev, но ломается в hosted‑prod:
- **Vercel serverless FS ephemeral**: запись на диск не гарантирована между инстансами и рестартами.
- **Конкурентные записи**: два запроса в один файл = гонки, потеря/порча данных без транзакций.
- **Скалирование**: несколько инстансов backend → нет общего lock’а.
- **Наблюдаемость и бэкапы**: сложно администрировать.

Вывод: для пилота на смене критичные домены переводим в Supabase Postgres.

---

## 2) Область миграции (pilot scope)

**Pilot = must‑persist:**
- shifts / squads (организация смены)
- memberships (одно членство на устройство)
- squad corner (общий контент отряда)
- invite codes (вступление)
- squad messages (чат отряда, retention 1000)
- badge requests (inbox approve/reject)
- parent snapshots (parent_code/QR)
- chat usage limits (квоты)

**Dev‑only может остаться локальным:**
- локальный прогресс `rl_guide_progress_v1` (пока без server‑sync)
- кэши ai‑data / SW caches

---

## 3) Сущности и таблицы (предлагаемый schema v1)

Нотация: `id` можно оставлять как текущие short‑id (12 символов) или перейти на UUID; важно сохранить стабильность ссылок в API.

### 3.1. `shifts`
- `id` (pk)
- `name` (text, not null)
- `start_date` (date, null)
- `end_date` (date, null)
- `created_at` (timestamptz, default now())
- `created_by_device_id` (text, null)

### 3.2. `squads`
- `id` (pk)
- `shift_id` (fk → `shifts.id`, not null, on delete cascade)
- `name` (text, not null)
- `created_at` (timestamptz, default now())
- `created_by_device_id` (text, null)

### 3.3. `memberships`
Правило SSOT: **одно активное membership на устройство** (global).
- `device_id` (pk or unique)
- `camp_id` (shift id; nullable)
- `squad_id` (fk → `squads.id`; nullable)
- `role` (text, not null) (`participant|counselor|shift_leader|camp_director|developer|parent|educator`)
- `nickname` (text, null)
- `joined_at` (timestamptz, default now())

Ограничения:
- `unique(device_id)` (или pk)
- `squad_id` nullable, но если задан, должен ссылаться на существующий отряд

### 3.4. `squad_corners`
Общий контент уголка (server shared).
- `squad_id` (pk, fk → `squads.id`, on delete cascade)
- `corner_json` (jsonb, not null, default '{}'::jsonb)
- `updated_at` (timestamptz, default now())
- `updated_by_device_id` (text, null)

Примечание по фото:
- В prod не хранить base64 в `corner_json`.
- Фото/флаг выносить в object storage и хранить в `corner_json` URL + metadata (size, mime, updatedAt).

### 3.5. `squad_invite_codes`
Политика: **один активный код на отряд**.
- `code` (pk, text; 8 символов A‑Z2‑9)
- `squad_id` (fk → `squads.id`, on delete cascade)
- `created_at` (timestamptz, default now())
- `expires_at` (timestamptz, null)
- `created_by_device_id` (text, null)
- `is_active` (bool, default true)

Ограничения:
- partial unique index: `unique (squad_id) where is_active = true`

### 3.6. `squad_messages`
Чат отряда (retention: последние 1000 сообщений).
- `id` (pk; uuid или sortable id)
- `squad_id` (fk → `squads.id`, on delete cascade)
- `device_id` (text, not null)
- `nickname` (text, null)
- `role` (text, not null)
- `text` (text, not null)
- `created_at` (timestamptz, default now())

Индексы:
- `(squad_id, created_at desc)`

Retention:
- на запись: после insert удалять “хвост” сверх 1000 (или делать periodic job).

### 3.7. `badge_requests`
Заявки на подтверждение уровней.
- `id` (pk)
- `camp_id` (shift id, null)
- `squad_id` (squad id, null)
- `level_id` (text, not null)
- `badge_title` (text, null)
- `evidence` (jsonb, not null, default '{}'::jsonb)
- `status` (text, not null) (`pending|approved|rejected`)
- `created_at` (timestamptz, default now())
- `requested_by_device_id` (text, not null)
- `requested_by_nickname` (text, null)
- `resolved_at` (timestamptz, null)
- `resolved_by_device_id` (text, null)
- `resolved_by_role` (text, null)
- `resolution_note` (text, null)

Индексы:
- `(status, created_at desc)`
- `(camp_id, status, created_at desc)`
- `(squad_id, status, created_at desc)`

### 3.8. `parent_snapshots`
Коды/QR для read‑only витрины.
- `code` (pk)
- `payload` (jsonb, not null)
- `created_at` (timestamptz, default now())
- `expires_at` (timestamptz, not null)
- `created_by_device_id` (text, null)

### 3.9. `chat_daily_usage`
Квоты чата (анти‑абьюз/расходы).
- `device_id` (text, not null)
- `day` (date, not null)
- `count` (int, not null, default 0)

Ограничения:
- `primary key (device_id, day)`

---

## 4) RBAC / RLS стратегия

Для пилота:
- backend использует `SUPABASE_SERVICE_ROLE_KEY` и сам реализует RBAC по JWT (SSOT).
- RLS можно включить позже как defense‑in‑depth, но это отдельная работа (не блокирует пилот).

Ключевой принцип:
- **никогда** не отдавать service‑role ключ на клиент.
- клиент общается только с backend (и получает только то, что ему разрешено).

---

## 5) Migration strategy (по шагам)

### Этап 0: подготовка
- Создать Supabase проект для staging и prod.
- Применить schema v1.

### Этап 1: Storage adapter в backend
Добавить интерфейс `StorageProvider` (или аналог) и инкапсулировать доступы к данным:
- `ShiftsStore`
- `SquadsStore`
- `MembershipsStore`
- `SquadCornersStore`
- `SquadInvitesStore`
- `SquadMessagesStore`
- `BadgeRequestsStore`
- `ParentSnapshotsStore`

### Этап 2: Supabase provider (read/write)
- Реализовать провайдер, который делает CRUD через Supabase PostgREST или direct SQL.
- В prod окружении включить Supabase provider по env‑флагу.

### Этап 3: Dual‑read + backfill (опционально)
Если нужно перенести данные из JSON:
- один раз прочитать `backend/data/*.json` и залить в Supabase
- временно читать “Supabase если есть, иначе JSON”

### Этап 4: Cutover
- В prod писать/читать только Supabase.
- JSON остаётся для local dev и тестов.

---

## 6) Backups / retention / удаление смен

Backups:
- использовать Supabase backups (план по тарифу) + экспорт ключевых таблиц перед сменой.

Retention:
- messages: последние 1000 на отряд (по SSOT).
- parent snapshots: TTL (например, 7 дней).

Удаление смены:
- только admin/staff действие с подтверждением.
- удаление смены каскадно удаляет squads, corners, messages, invites, memberships (связанные), badge_requests (по camp/squad).

