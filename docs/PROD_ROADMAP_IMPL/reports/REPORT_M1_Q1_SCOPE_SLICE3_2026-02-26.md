# REPORT_M1_Q1_SCOPE_SLICE3_2026-02-26

## Что сделано

M1 slice-3: подключен runtime path для teams через StorageProvider + добавлен smoke e2e (backend).

### 1) Runtime storage path для teams

Обновлён storage-слой:
- `backend/storage/base.py`
  - добавлен интерфейс `TeamsStore`.

- `backend/storage/json_provider.py`
  - добавлен `JsonTeamsStore` (с сохранением legacy расположения `backend/teams.json`).
  - добавлен ключ `teams` в `JSON_STORES`.

- `backend/storage/supabase_provider.py`
  - добавлен `SupabaseTeamsStore` для таблицы `teams`.
  - добавлен ключ `teams` в `SUPABASE_STORES`.

- `backend/storage/__init__.py`
  - `get_store()` теперь поддерживает `teams`.

Обновлён backend teams flow:
- `backend/app.py`
  - `_teams_load()` и `_teams_save()` переключены на `get_store('teams')`.

Итог: при `USE_SUPABASE=true` teams flow автоматически идёт через Supabase provider, при `false` остаётся JSON.

### 2) Smoke e2e (backend)

Добавлен smoke-скрипт:
- `backend/scripts/smoke_m1_scoped_teams.py`

Сценарии:
1. create camp team,
2. duplicate in same scope-slot -> 409,
3. create shift team,
4. create squad team,
5. filter `/api/teams` по scope/shift/squad,
6. `GET /api/teams/mine` с scope-фильтром.

Результат выполнения:
- `OK: M1 scoped teams smoke passed`

## Что осталось до полного закрытия M1

- Полный frontend smoke (UI-level) на реальном стенде.
- Проверка Supabase migration `003_teams_scope.sql` на staging/prod и фиксация evidence.
- Финальное обновление статуса roadmap item по M1 после стендовых прогонов.
