# REPORT_A_P1-01 — Supabase schema v1

**Агент:** A  
**Task ID:** P1-01  
**Дата:** 2026-02-21  
**Статус:** ✅ Done

---

## Что сделано

| Файл | Действие | Описание |
|------|----------|----------|
| `backend/migrations/001_schema_v1.sql` | Создан | SQL-схема v1: 9 таблиц, индексы, constraints, retention trigger |
| `docs/SUPABASE_SCHEMA_AND_MIGRATION.md` | Обновлён | Этап 0 помечен как выполненный |

### Детали SQL-схемы

9 таблиц согласно спецификации `SUPABASE_SCHEMA_AND_MIGRATION.md §3`:

1. `shifts` — смены
2. `squads` — отряды (CASCADE → shifts)
3. `memberships` — членство (PRIMARY KEY device_id)
4. `squad_corners` — уголок отряда (JSONB)
5. `squad_invite_codes` — инвайт-коды (partial UNIQUE INDEX: один активный на отряд)
6. `squad_messages` — чат (INDEX squad_id + created_at DESC)
7. `badge_requests` — заявки (INDEX по статусу + camp_id + device)
8. `parent_snapshots` — снапшоты (INDEX expires_at)
9. `chat_daily_usage` — квоты (PRIMARY KEY device_id + day)

Дополнительно: функция и триггер `trim_squad_messages()` — retention 1000 сообщений.

---

## Проверки

- [x] SQL синтаксически валиден (проверено pg-синтаксисом)
- [x] Все 9 таблиц присутствуют
- [x] Partial UNIQUE INDEX для инвайт-кодов (один активный на отряд)
- [x] CASCADE DELETE для squads → shifts
- [x] Retention trigger для squad_messages

---

## Применение миграции к Supabase

- Миграция применена к проекту `inkhtjcrzblzsfqvceid.supabase.co` (2026-02-21)
- Все 9 таблиц верифицированы через REST API: HTTP 200 на каждый endpoint
- Migration ID в Supabase: `20260221162114_v1_putevoditel_lager_schema`

## Evidence (для ROADMAP_2026.md)

```
P1-01 | Agent A | 2026-02-21 | backend/migrations/001_schema_v1.sql — 9 таблиц применены к Supabase inkhtjcrzblzsfqvceid
```
