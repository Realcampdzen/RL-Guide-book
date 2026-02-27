# REPORT_M1_Q1_SCOPE_SLICE2_2026-02-25

## Что сделано

Реализован slice-2 по M1: Supabase schema + frontend context (scope-aware).

### 1) Supabase migration

Добавлена миграция:
- `backend/migrations/003_teams_scope.sql`

Содержимое:
- создаёт таблицу `teams` (если отсутствует),
- добавляет/фиксирует поля `scope`, `shift_id`, `squad_id`,
- CHECK constraints:
  - scope in (`camp`, `shift`, `squad`),
  - согласованность контекста по scope,
- индексы по scope/shift/squad.

### 2) Frontend: scope-aware Team flow

Обновлены типы:
- `src/types/teams.ts`
  - добавлены `TeamScope`, `scope`, `shiftId`, `squadId`.

Обновлён контекст:
- `src/context/TeamContext.tsx`
  - добавлен `getScopeContextFromUrl()` (query-подсказки scope),
  - `GET /api/teams/mine` теперь поддерживает query фильтры (`scope`, `shiftId`, `squadId`),
  - `createTeam()` отправляет scope-поля на backend,
  - обработка 409-конфликтов адаптирована под scope-aware сообщения.

Обновлён UI создания Движка:
- `src/components/TeamDashboard.tsx`
  - в форме создания: выбор `scope` + поля `shiftId`/`squadId` (по необходимости),
  - валидация на клиенте,
  - в карточке Движка отображается текущий scope-контекст.

## Проверки

- Backend compile-check:
  - `python -m py_compile backend/app.py` — passed.

- Frontend build check:
  - `npm run build` — failed из-за отсутствия `tsc` в окружении запуска (локальная среда не видит TypeScript binary).
  - Требуется `npm install` / корректный PATH node_modules/.bin в CI/локали.

## Что осталось до полного закрытия M1

1. Реальный runtime-переход `/api/teams*` на Supabase provider (сейчас teams flow в `backend/app.py` остаётся file-backed).
2. E2E smoke сценарии camp/shift/squad (автотест/чеклист с фактическими прогонами).
3. Обновить ROADMAP evidence после прогона smoke.

## Следующий шаг

- M1 slice-3: подключить Supabase-backed teams storage path и прогнать smoke e2e.
