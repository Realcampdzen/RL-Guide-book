# TASK: M10-SUPABASE-MIGRATIONS-D — Применить миграции 003→006 на prod

**Агент: D (DevOps)**  
**Base:** `main @ 73c0531`  
**Branch:** `agent-d/m10-migrations`

## Scope

### 1. Применить миграции в Supabase prod

Через SQL Editor или `apply_migration.py`:
- `003_badge_plans.sql` — таблица badge_plans
- `004_council_initiatives.sql` — таблица council_initiatives  
- `005_squad_kind.sql` — ALTER squads ADD kind
- `006_badge_arts.sql` — таблица badge_arts

**Порядок:** строго 003 → 004 → 005 → 006 (зависимости нет, но порядковый номер).

### 2. Верификация

После каждой миграции:
- `SELECT count(*) FROM <table>` — таблица существует
- Проверить indexes: `\di` или Supabase Dashboard → Table Editor

### 3. Обновить OPS_SNAPSHOT

В `docs/OPS_SNAPSHOT_M5_GO.md` (или новый `OPS_SNAPSHOT_M10.md`):
- Список применённых миграций
- Статус каждой таблицы

## DoD
- [ ] 4 миграции применены
- [ ] Все таблицы существуют в Supabase Dashboard
- [ ] OPS_SNAPSHOT обновлён
