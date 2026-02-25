# REPORT_M1_Q1_STAGING_VALIDATION_PREP_2026-02-26

## Что сделано

Подготовлен staging validation flow для M1:

1. Унифицирован migration-runner:
- `backend/migrations/apply_migration.py`
  - теперь поддерживает `--file <migration.sql>`
  - пример для M1:
    - `python backend/migrations/apply_migration.py --file 003_teams_scope.sql`

2. Проверен запуск миграции в текущем окружении:
- скрипт стартует корректно,
- применение не выполнено из-за отсутствия staging credentials (`SUPABASE_ACCESS_TOKEN` / `DATABASE_URL`).

## Что блокирует полный staging validation

- Нет доступных переменных окружения для staging Supabase в текущем рантайме:
  - `SUPABASE_URL`
  - `SUPABASE_ACCESS_TOKEN` (или `DATABASE_URL`/`SUPABASE_DB_PASSWORD`)

## Как закрыть блокер (операционно)

1. Добавить в `.env` (root или backend/.env) staging ключи.
2. Выполнить:
   - `python backend/migrations/apply_migration.py --file 003_teams_scope.sql`
3. После миграции запустить smoke:
   - `python backend/scripts/smoke_m1_scoped_teams.py`
4. UI smoke (ручной):
   - создать camp/shift/squad движки в интерфейсе,
   - проверить фильтрацию и корректность `teams/mine` по context query.

## Следующий шаг

После добавления staging env — выполнить пп.2-4 и зафиксировать финальный evidence report M1.
