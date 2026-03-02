# TASK: M13-EDUCATOR-WORKSHOP-A — Кабинет Мастерской педагога (backend)

**Агент: A (Data/Backend)**  
**Base:** `main @ 0bc6fb9`  
**Branch:** `agent-a/m13-educator-workshop`

## Контекст

Педагог ведёт Кабинет Мастерской (аналог Кабинета Отряда): расписание занятий, участники, привязанные значки, подтверждение получения значков. Роль `educator` уже в RBAC.

## Scope

### 1. Migration `011_workshops.sql`

```sql
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
```

### 2. WorkshopStore

Abstract + JSON + Supabase implementations.

### 3. API Endpoints

| Method | Path | RBAC | Description |
|--------|------|------|-------------|
| POST | `/api/workshops` | educator+ | Создать мастерскую |
| GET | `/api/workshops` | all | Список мастерских |
| GET | `/api/workshops/<id>` | all | Детали мастерской |
| PATCH | `/api/workshops/<id>` | educator(owner) | Обновить title/direction |
| POST | `/api/workshops/<id>/participants` | educator(owner) | Добавить участника |
| POST | `/api/workshops/<id>/badges` | educator(owner) | Привязать значок |
| DELETE | `/api/workshops/<id>/badges/<badgeId>` | educator(owner) | Отвязать значок |
| POST | `/api/workshops/<id>/badges/<badgeId>/confirm/<deviceId>` | educator(owner) | Подтвердить значок участнику |

### 4. Smoke Flow T (3 checks)
- `T-1`: POST workshop → 201
- `T-2`: POST badge link → 200
- `T-3`: POST confirm badge → 200

### 5. Docs: `BACKEND_CONTRACT_GUARD.md` §3.14

## DoD
- [ ] Migration 011 + Store + 8 endpoints + Flow T + docs
