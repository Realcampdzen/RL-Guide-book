# REPORT_M1_Q1_SCOPE_SLICE_2026-02-25

## Что сделано

Реализован первый vertical slice для M1 (Q1 scoped engines) на backend (JSON flow):

- Добавлена нормализация и совместимость legacy team-документов:
  - `_normalize_team_scope()`
  - `_normalize_team_doc()`
  - `_team_matches_context()`
  - `_is_scope_slot_equal()`
  - `_find_member_teams()`

- Обновлён `POST /api/teams`:
  - поддержка `scope`, `shiftId`, `squadId`
  - валидация контекста:
    - `scope=shift` требует `shiftId`
    - `scope=squad` требует `shiftId` + `squadId`
  - конфликт членства проверяется по scope-slot, а не глобально.

- Обновлён `GET /api/teams`:
  - добавлена фильтрация query-параметрами `scope`, `shiftId`, `squadId`.

- Обновлён `GET /api/teams/mine`:
  - поддержка фильтров по контексту,
  - сохранена backward-совместимость (возвращается 1 объект команды).

- Обновлён `POST /api/teams/<id>/join`:
  - конфликт проверяется по scope-slot,
  - join в тот же team id возвращает существующий doc.

- Обновлён `PATCH /api/teams/<id>`:
  - разрешён patch полей `scope/shiftId/squadId`,
  - валидация и нормализация при сохранении.

## Файлы

- `backend/app.py`

## Проверки

- `python -m py_compile backend/app.py` — passed.

## Что ещё не закрыто в M1

- Supabase migration + provider mapping для scope-полей.
- Фронтенд UI/TypeContext обновления (scope selector, контекстные списки).
- Smoke-тесты end-to-end по сценариям camp/shift/squad.

## Следующий шаг

- M1 slice-2: Supabase schema + provider + e2e smoke.
