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

### Этап 0: подготовка ✅ Done (2026-02-21, Agent A)
- Создать Supabase проект для staging и prod.
- Применить schema v1.
- SQL миграция: [`backend/migrations/001_schema_v1.sql`](../backend/migrations/001_schema_v1.sql) — 9 таблиц, индексы, constraints, retention trigger.

### Этапы 1–4: ✅ Completed
StorageProvider полностью реализован. JSON provider для local dev, Supabase provider для prod. 25 сторов зарегистрированы (см. `backend/storage/__init__.py`). `USE_SUPABASE=true` активен на prod.

---

## 6) Полный реестр SQL миграций

| Файл | Создаёт/Изменяет | Примечания |
|------|-------------------|------------|
| `001_schema_v1.sql` | shifts, squads, memberships, squad_corners, squad_invite_codes, squad_messages, badge_requests, parent_snapshots, chat_daily_usage | Базовый schema (9 таблиц), retention trigger |
| `002_council_initiatives.sql` | council_initiatives | Инициативы Совета |
| `003_badge_plans.sql` | badge_plans | Планы получения значков |
| `003_teams_scope.sql` | teams | ⚠️ Дублирующийся номер 003 |
| `004_council_initiatives.sql` | council_initiatives (ALTER) | ⚠️ Дублирующийся номер 004 |
| `004_family_links.sql` | family_links | ⚠️ Дублирующийся номер 004 |
| `005_squad_kind.sql` | squads (ALTER) | Добавление kind колонки |
| `006_badge_arts.sql` | badge_arts | Арты на значки |
| `007_engines.sql` | engines, engine_members | Движки + RLS |
| `008_inspector.sql` | inspector_progress | Инспектор Пользы |
| `009_bro.sql` | bro_events, bro_passports | БРО Движение |
| `010_shift_schedule.sql` | shift_schedule | Расписание смены |
| `011_workshops.sql` | workshops | Мастерская |
| `012_director_proposal.sql` | (ALTER?) | Директорские предложения |
| `013_parent_suggestions.sql` | parent_suggestions | Рекомендации родителям |
| `014_users.sql` | users | Пользователи |
| `015_workshop_proposals_and_council.sql` | workshop_proposals, council_members, council_protocols | 3 таблицы одним файлом |
| `m10_combined_003_006.sql` | — | Объединённая миграция (003–006) для batch apply |
| `m12_bro_initiatives_submissions.sql` | bro_initiatives, bro_submissions | БРО инициативы |
| `m17_combined_007_014.sql` | — | Объединённая миграция (007–014) для batch apply |
| `m18_shift_avatar.sql` | shifts (ALTER ADD avatar_url) | Аватарки смен |

> **⚠️ Проблемы нумерации:** Два файла с номером 003 и два файла с номером 004. Файлы `m10_*`, `m12_*`, `m17_*`, `m18_*` используют альтернативную нумерацию по спринтам (M10, M12 и т.д.). Рекомендуется привести к единой схеме при следующей ревизии.

---

## 7) Backups / retention / удаление смен

Backups:
- использовать Supabase backups (план по тарифу) + экспорт ключевых таблиц перед сменой.

Retention:
- messages: последние 1000 на отряд (по SSOT).
- parent snapshots: TTL (например, 7 дней).

Удаление смены:
- только admin/staff действие с подтверждением.
- удаление смены каскадно удаляет squads, corners, messages, invites, memberships (связанные), badge_requests (по camp/squad).
