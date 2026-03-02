# TASK: M14-CAMP-DIRECTOR-A — Начальник Лагеря: Кабинет

**Агент: A (Data/Backend)**  
**Base:** `main @ ff4878e`  
**Branch:** `agent-a/m14-camp-director`

## Контекст

Из видения: «Начальник Лагеря создаёт Кабинет Лагеря, в котором отображается динамическая информация о деятельности всех подразделений, с возможностью выносить предложения в Совет Лагеря, помеченные как Предложение Начальника.»

Роль `camp_director` уже существует в RBAC (= shift_leader по правам).

## Scope

### 1. API Endpoints — обзорная панель

| Method | Path | RBAC | Description |
|--------|------|------|-------------|
| GET | `/api/camp/overview` | camp_director+ | Aggregated stats |

Response:
```json
{
  "shifts": { "total": 1, "active": 1 },
  "squads": { "total": 3, "members_total": 25 },
  "engines": { "total": 5, "approved": 3, "pending": 2 },
  "workshops": { "total": 2, "participants_total": 15 },
  "council_initiatives": { "total": 8, "approved": 3, "in_progress": 2 },
  "badge_requests": { "total": 12, "approved": 8, "pending": 4 },
  "inspector_progress": { "active_users": 10, "completed_checklists": 15 },
  "bro_events": { "total": 1, "passports_completed": 3 }
}
```

Логика: агрегация из всех существующих stores.

### 2. «Предложение Начальника» в Совете

Добавить поле `proposal_type` в council_initiatives:
```sql
ALTER TABLE council_initiatives ADD COLUMN IF NOT EXISTS proposal_type TEXT DEFAULT 'regular'
  CHECK (proposal_type IN ('regular', 'director_proposal'));
```

При создании initiative от camp_director → auto-tag `director_proposal`.

### 3. Smoke Flow V (2 checks)
- `V-1`: GET /api/camp/overview → 200 + has all keys
- `V-2`: POST council initiative with director → has proposal_type

### 4. Docs: `BACKEND_CONTRACT_GUARD.md` §3.15

## DoD
- [ ] `/api/camp/overview` + director_proposal tag + Flow V + docs
