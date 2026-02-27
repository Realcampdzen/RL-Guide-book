# REPORT_M1_Q1_STAGING_VALIDATION_DONE_2026-02-26

## Результат

Staging validation для M1 выполнен успешно.

## Что подтверждено

1. Миграция `003_teams_scope.sql` применена в Supabase (ручной запуск через SQL Editor).
2. Runtime teams path при `USE_SUPABASE=true` работает.
3. Smoke сценарий scoped teams прошёл успешно:

```text
OK: M1 scoped teams smoke passed
```

## Проверенный сценарий smoke

- create `camp` team;
- duplicate в том же scope-slot -> 409;
- create `shift` team;
- create `squad` team;
- фильтр `/api/teams` по `scope/shiftId/squadId`;
- `/api/teams/mine` с scope-фильтром.

## Вывод

M1 scoped engines технически валиден на staging по backend/runtime пути.
Остаётся UX/UI ручной проход в интерфейсе как финальный контроль перед закрытием пункта в roadmap.
