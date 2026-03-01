# TASK: M7-PLAN-WORKFLOW-A — План значка: серверный workflow

**Агент: A (Data/Backend)**  
**Base:** `main @ 00d320a`  
**Branch:** `agent-a/m7-plan-workflow`

## Контекст

Сейчас план получения значка (`IBadgePlan`) хранится только в `localStorage` на клиенте. Нет серверного workflow для подтверждения плана вожатым. Нужно добавить серверную сторону — по аналогии с тем, как работают `badge_requests` (заявки на значки).

## Что читать

- `docs/PROD_ROADMAP_IMPL/AGENT_INSTRUCTIONS.md` — правила работы
- `docs/CYCLE_CONTROL_BOARD.md` — текущий статус
- `docs/BACKEND_CONTRACT_GUARD.md` — контракты API
- `backend/app.py` — текущий backend (особенно `/api/badges/requests*` как образец)
- `backend/storage/` — паттерн StorageProvider (base → json → supabase)
- `src/types/userProgress.ts` — модель `IBadgePlan`

## Scope

### 1. BadgePlansStore (backend/storage/)

Создать по паттерну `BadgeRequestsStore`:
- `base_badge_plans_store.py` — абстрактный интерфейс
- `json_badge_plans_store.py` — JSON-файл (`backend/data/badge_plans.json`)
- `supabase_badge_plans_store.py` — Supabase provider

Модель плана:
```python
{
  "id": "uuid",
  "device_id": "string",
  "camp_id": "string",
  "badge_id": "string (X.Y)",
  "level_id": "string (X.Y.Z)",
  "plan_text": "string",
  "checklist": [{"text": "string", "done": bool}],
  "status": "draft | submitted | approved | rejected",
  "counselor_note": "string | null",
  "created_at": "ISO datetime",
  "updated_at": "ISO datetime"
}
```

### 2. Supabase Migration

Файл: `backend/migrations/003_badge_plans.sql`

```sql
CREATE TABLE IF NOT EXISTS badge_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  device_id TEXT NOT NULL,
  camp_id TEXT,
  badge_id TEXT NOT NULL,
  level_id TEXT,
  plan_text TEXT NOT NULL DEFAULT '',
  checklist JSONB NOT NULL DEFAULT '[]',
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','submitted','approved','rejected')),
  counselor_note TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_badge_plans_device ON badge_plans(device_id);
CREATE INDEX IF NOT EXISTS idx_badge_plans_status ON badge_plans(status);
CREATE INDEX IF NOT EXISTS idx_badge_plans_camp ON badge_plans(camp_id);
```

### 3. API Endpoints в `backend/app.py`

| Method | Path | RBAC | Описание |
|--------|------|------|----------|
| POST | `/api/badges/plans` | participant, parent, developer | Создать/обновить план (upsert по device_id + badge_id) |
| GET | `/api/badges/plans/mine` | participant, parent, developer | Мои планы (фильтр по status) |
| GET | `/api/badges/plans/inbox` | counselor, educator, shift_leader, camp_director, developer | Планы на review (status=submitted, фильтр по camp_id из JWT) |
| PATCH | `/api/badges/plans/<id>/review` | counselor, educator, shift_leader, camp_director, developer | Approve/reject с counselor_note |

RBAC — по аналогии с `/api/badges/requests/*`. Rate limits — по аналогии с существующими.

### 4. Smoke Flow J

Добавить в `backend/scripts/smoke_backend_critical.py` Flow J (4 проверки):
1. `J-1`: POST plan → 201 (created)
2. `J-2`: GET inbox → содержит созданный plan
3. `J-3`: PATCH review (approve) → 200
4. `J-4`: GET mine → plan status=approved

### 5. Документация

Обновить `docs/BACKEND_CONTRACT_GUARD.md` — добавить §3.7 Badge Plans API.

## DoD

- [ ] Все 4 файла storage созданы и подключены в `app.py`
- [ ] Миграция `003_badge_plans.sql` готова
- [ ] 4 endpoint работают (JSON provider для local dev)
- [ ] Smoke ≥ **56/56** (52 текущих + 4 новых Flow J)
- [ ] `BACKEND_CONTRACT_GUARD.md` обновлён
- [ ] Коммит на ветку `agent-a/m7-plan-workflow`

## Формат отчёта

```
Агент: A (Data/Backend)
Task: M7-PLAN-WORKFLOW-A
Branch: agent-a/m7-plan-workflow
Base: main @ 00d320a
Commit: <hash>

Файлы:
- [NEW] backend/storage/base_badge_plans_store.py
- [NEW] backend/storage/json_badge_plans_store.py
- [NEW] backend/storage/supabase_badge_plans_store.py
- [NEW] backend/migrations/003_badge_plans.sql
- [NEW] backend/data/badge_plans.json
- [MOD] backend/app.py (4 endpoints)
- [MOD] backend/scripts/smoke_backend_critical.py (Flow J, 4 checks)
- [MOD] docs/BACKEND_CONTRACT_GUARD.md (§3.7)

Smoke: XX/56
Evidence: <скриншот или лог smoke>
```
