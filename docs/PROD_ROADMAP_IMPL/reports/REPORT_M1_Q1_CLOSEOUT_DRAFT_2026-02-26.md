# REPORT_M1_Q1_CLOSEOUT_DRAFT_2026-02-26

## M1 (Q1 Scoped Engines) — closeout draft

## Scope

Внедрить scoped engines для Team:
- `scope: camp | shift | squad`
- `shiftId`, `squadId`
- корректная фильтрация/доступ/совместимость legacy.

## Выполнено

### Backend
- Scope-aware нормализация и валидация в `backend/app.py`.
- Обновлены endpoints:
  - `POST /api/teams`
  - `GET /api/teams`
  - `GET /api/teams/mine`
  - `POST /api/teams/:id/join`
  - `PATCH /api/teams/:id`
- Legacy fallback: команды без scope читаются как `camp`.

### Storage providers
- Добавлен `TeamsStore` abstraction.
- JSON provider: `JsonTeamsStore` (legacy path `backend/teams.json` сохранён).
- Supabase provider: `SupabaseTeamsStore` (table `teams`).
- Runtime switch через `USE_SUPABASE` подтверждён.

### Schema / migration
- Добавлена миграция `backend/migrations/003_teams_scope.sql`.
- На staging применена вручную через SQL Editor (подтверждено).

### Frontend
- Типы `TeamScope`, `scope`, `shiftId`, `squadId`.
- `TeamContext` умеет query-context (`scope/shiftId/squadId`) и передаёт scope-поля при create.
- `TeamDashboard`:
  - selector scope,
  - условные поля `shiftId/squadId`,
  - базовая валидация,
  - отображение scope-контекста в карточке.

### Tests / evidence
- Backend smoke: `backend/scripts/smoke_m1_scoped_teams.py` — passed.
- Staging backend validation — passed.
- Manual UI smoke (минимальный) — confirmed.

## Остаточные задачи (не блокируют M1)

1. Полный UI walkthrough по расширенному чеклисту (optional hardening).
2. Прогон Playwright smoke в окружении с установленным playwright runtime.
3. Финальная синхронизация статуса в `ROADMAP_2026.md`.

## Рекомендация по статусу

M1 можно переводить в **Done** после короткой формальной синхронизации записи в roadmap.
