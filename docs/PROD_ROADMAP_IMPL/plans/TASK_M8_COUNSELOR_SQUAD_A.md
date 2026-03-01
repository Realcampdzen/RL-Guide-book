# TASK: M8-COUNSELOR-SQUAD-A — Отряд вожатых: серверная синхронизация

**Агент: A (Data/Backend)**  
**Base:** `main @ c9458b4`  
**Branch:** `agent-a/m8-counselor-squad`

## Контекст

«Отряд вожатых» — важная механика staff-коллектива, но сейчас это локальный прототип (`CounselorSquadContext`, localStorage). Нет серверной синхронизации, участников и чата. Нет UX-входа в ЛК.

**Решение по доменной модели:** расширяем `Squad` с `kind: participant | staff` вместо отдельной сущности.

## Что читать

- `docs/PRODUCT_MECHANICS_AND_ROADMAP.md` §7.7.1 — Отряд вожатых
- `src/context/CounselorSquadContext.tsx` — текущий локальный контур
- `backend/app.py` — squad endpoints

## Scope

### 1. Расширить Squad модель полем `kind`

В `shifts.json` и Supabase squads:
- Добавить поле `kind: "participant" | "staff"` (default: `"participant"`)
- Staff-squad видим только staff-ролям

### 2. API: создание staff-squad

- `POST /api/shifts/<shiftId>/squads` — добавить `kind` в тело запроса
- Валидация: `kind=staff` может создать только shift_leader/camp_director/developer
- RBAC: counselor/educator могут `join` в staff-squad (по инвайту)

### 3. Фильтрация в API

- `GET /api/shifts/<shiftId>/squads` — добавить `?kind=participant|staff` фильтр
- По умолчанию без фильтра → все (для обратной совместимости)

### 4. Smoke Flow M (2 checks)

- `M-1`: создать staff-squad → 201 с `kind: staff`
- `M-2`: GET squads?kind=staff → содержит только staff-squad

### 5. Migration `005_squad_kind.sql`

```sql
ALTER TABLE squads ADD COLUMN IF NOT EXISTS kind TEXT NOT NULL DEFAULT 'participant' CHECK (kind IN ('participant','staff'));
```

## DoD

- [ ] Squad модель расширена полем `kind`
- [ ] Staff-squad создаётся и фильтруется
- [ ] Smoke ≥ 63/63
- [ ] Migration готова
