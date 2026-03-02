# TASK: M11-DVIZHKI-BACKEND-A — Движки: серверная логика

**Агент: A (Data/Backend)**  
**Base:** `main @ e910330`  
**Branch:** `agent-a/m11-dvizhki`

## Контекст

Движки (Engines) — отряд внутри отряда. Участники смен создают Движки, их одобряют вожатые. У Движка есть кабинет (аналог отрядного уголка), цель, участники. Движки могут предлагать инициативы в Совет Лагеря.

Существующая архитектура: squads (отряды) уже имеют CRUD API + memberships + messages. Движки = вложенные squads с parent_squad_id.

## Scope

### 1. Migration `007_engines.sql`

```sql
CREATE TABLE IF NOT EXISTS engines (
  id TEXT PRIMARY KEY,
  squad_id TEXT NOT NULL,          -- родительский отряд
  title TEXT NOT NULL,
  avatar_url TEXT DEFAULT '',
  goal TEXT DEFAULT '',
  goal_status TEXT NOT NULL DEFAULT 'draft' CHECK (goal_status IN ('draft','submitted','approved')),
  created_by TEXT NOT NULL,        -- device_id создателя
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','approved','rejected','archived')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS engine_members (
  id TEXT PRIMARY KEY,
  engine_id TEXT NOT NULL REFERENCES engines(id),
  device_id TEXT NOT NULL,
  nickname TEXT DEFAULT '',
  role TEXT NOT NULL DEFAULT 'member' CHECK (role IN ('creator','member')),
  joined_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

### 2. EnginesStore (по паттерну BadgePlansStore)

В `backend/storage/`:
- `base.py`: +EnginesStore, EngineMembersStore abstract
- `json_provider.py`: +JSON implementation
- `supabase_provider.py`: +Supabase implementation
- `__init__.py`: +registration

### 3. API Endpoints

| Method | Path | RBAC | Description |
|--------|------|------|-------------|
| POST | `/api/squads/<squadId>/engines` | participant+ | Создать Движок (status=pending) |
| GET | `/api/squads/<squadId>/engines` | all | Список Движков отряда |
| PATCH | `/api/engines/<id>` | creator+staff | Обновить title/goal |
| PATCH | `/api/engines/<id>/approve` | counselor+ | Одобрить/отклонить Движок |
| PATCH | `/api/engines/<id>/goal/approve` | counselor+ | Одобрить цель Движка |
| POST | `/api/engines/<id>/join` | participant+ | Вступить |
| POST | `/api/engines/<id>/leave` | participant+ | Выйти |
| GET | `/api/engines/<id>/members` | all | Участники Движка |

### 4. Smoke Flow P (4 checks)
- `P-1`: POST engine → 201 (pending)
- `P-2`: PATCH approve → 200 (approved)
- `P-3`: POST join → 200
- `P-4`: PATCH goal submit + approve → 200

### 5. Docs: `BACKEND_CONTRACT_GUARD.md` §3.11

## DoD
- [ ] Migration 007 + Store (JSON + Supabase) + 8 endpoints + Flow P + docs
- [ ] Smoke ≥ 81/82
