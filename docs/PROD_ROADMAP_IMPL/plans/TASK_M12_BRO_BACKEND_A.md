# TASK: M12-BRO-BACKEND-A — БРО: Бросвящение + Крыло

**Агент: A (Data/Backend)**  
**Base:** `main @ f43378f`  
**Branch:** `agent-a/m12-bro`

## Контекст

БРО — движение будущих вожатых. Механика: вожатый объявляет Бросвящение → участники получают доступ к BroPassport (чек-лист заданий) → по завершении BroPassport участник может создать Крыло (= engine с type=bro_wing). Крыло — мини-отряд для прошедших Бросвящение, который в будущем может стать полноценным отрядом.

Существующее: БРО-секция есть в UI, BroPassport частично начат, категория «БРО значки» существует.

## Scope

### 1. Migration `009_bro.sql`

```sql
CREATE TABLE IF NOT EXISTS bro_events (
  id TEXT PRIMARY KEY,
  squad_id TEXT NOT NULL,
  initiated_by TEXT NOT NULL,    -- device_id вожатого
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active','completed','cancelled')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS bro_passports (
  id TEXT PRIMARY KEY,
  device_id TEXT NOT NULL,
  bro_event_id TEXT NOT NULL REFERENCES bro_events(id),
  tasks JSONB NOT NULL DEFAULT '[]',
  status TEXT NOT NULL DEFAULT 'in_progress' CHECK (status IN ('in_progress','completed')),
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

### 2. BroStore (по паттерну EnginesStore)

- `BroEventsStore`: CRUD for bro_events
- `BroPassportsStore`: CRUD for bro_passports

### 3. API Endpoints

| Method | Path | RBAC | Description |
|--------|------|------|-------------|
| POST | `/api/squads/<squadId>/bro/initiate` | counselor+ | Объявить Бросвящение |
| GET | `/api/squads/<squadId>/bro/events` | all | Список Бросвящений |
| GET | `/api/bro/passport/<deviceId>` | owner+staff | Мой BroPassport |
| POST | `/api/bro/passport` | participant+ | Начать BroPassport |
| PATCH | `/api/bro/passport/<id>/task` | owner | Отметить задание |
| PATCH | `/api/bro/passport/<id>/complete` | auto | Завершить (когда все задания done) |

Крыло = engine с `type=bro_wing`, создаётся через существующий engines API (POST с полем `type`).

Добавить поле `type` в engines table (migration ALTER):
```sql
ALTER TABLE engines ADD COLUMN IF NOT EXISTS type TEXT NOT NULL DEFAULT 'regular'
  CHECK (type IN ('regular', 'bro_wing'));
```

### 4. Smoke Flow Q (3 checks)
- `Q-1`: POST bro/initiate → 201
- `Q-2`: POST bro/passport → 201
- `Q-3`: PATCH task done → 200

### 5. Docs: `BACKEND_CONTRACT_GUARD.md` §3.12

## DoD
- [ ] Migration 009 + Store + 6 endpoints + Flow Q + docs
- [ ] Smoke pass
