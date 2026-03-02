# TASK: M12-SHIFT-PLANNER-A — План-сетка смены

**Агент: A (Data/Backend)**  
**Base:** `main @ f43378f`  
**Branch:** `agent-a/m12-shift-planner`

## Контекст

Из видения: «Старший Вожатый создаёт и утверждает план-сетку смены, с возможностью назначения ответственных вожатых за мероприятия. Заполняет сценариями мероприятий/тематических дней/Традиций лагеря. Расписание Мастерской входит в общую план-сетку.»

## Scope

### 1. Migration `010_shift_schedule.sql`

```sql
CREATE TABLE IF NOT EXISTS shift_schedule_events (
  id TEXT PRIMARY KEY,
  shift_id TEXT NOT NULL,
  day_index INTEGER NOT NULL,   -- 0-based день смены
  time_start TEXT NOT NULL,     -- "09:00"
  time_end TEXT,                -- "10:30"
  title TEXT NOT NULL,
  description TEXT DEFAULT '',
  type TEXT NOT NULL DEFAULT 'event' CHECK (type IN ('event','training','workshop','tradition','free_time','meal')),
  responsible_id TEXT,          -- device_id ответственного вожатого
  responsible_name TEXT DEFAULT '',
  workshop_id TEXT,             -- связь с мастерской педагога (если type=workshop)
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_schedule_shift ON shift_schedule_events(shift_id);
CREATE INDEX IF NOT EXISTS idx_schedule_day ON shift_schedule_events(shift_id, day_index);
```

### 2. ShiftScheduleStore

- `base.py`: +ShiftScheduleStore abstract
- `json_provider.py` + `supabase_provider.py`: implementations

### 3. API Endpoints

| Method | Path | RBAC | Description |
|--------|------|------|-------------|
| GET | `/api/shifts/<shiftId>/schedule` | all | План-сетка (все события) |
| GET | `/api/shifts/<shiftId>/schedule/day/<dayIndex>` | all | События одного дня |
| POST | `/api/shifts/<shiftId>/schedule` | shift_leader+ | Добавить событие |
| PATCH | `/api/schedule/<eventId>` | shift_leader+ | Обновить событие |
| DELETE | `/api/schedule/<eventId>` | shift_leader+ | Удалить событие |

### 4. Smoke Flow S (3 checks)
- `S-1`: POST schedule event → 201
- `S-2`: GET schedule → 200 + contains event
- `S-3`: PATCH event → 200

### 5. Docs: `BACKEND_CONTRACT_GUARD.md` §3.13

## DoD
- [ ] Migration 010 + Store + 5 endpoints + Flow S + docs
- [ ] Smoke pass
