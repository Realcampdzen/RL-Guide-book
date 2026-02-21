# REPORT_A_P1-02 — StorageProvider + Supabase provider (основные домены)

**Агент:** A  
**Task ID:** P1-02  
**Дата:** 2026-02-21  
**Статус:** ✅ Done

---

## Что сделано

| Файл | Действие | Описание |
|------|----------|----------|
| `backend/storage/__init__.py` | Создан | Фабрика `get_store(name)`, переключение по `USE_SUPABASE` |
| `backend/storage/base.py` | Создан | 8 абстрактных Store классов (ABC) |
| `backend/storage/json_provider.py` | Создан | JSON-реализация, 8 классов, точный перенос из app.py |
| `backend/storage/supabase_provider.py` | Создан | Supabase CRUD для всех 8 сторов |
| `backend/app.py` | Изменён | Все _xxx_load()/_xxx_save() → thin wrappers через get_store() |
| `backend/requirements.txt` | Изменён | Добавлен `supabase>=2.0.0` |
| `.env.example` | Изменён | Добавлена секция Supabase (USE_SUPABASE, SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY) |

### Архитектура

```
app.py → get_store(name) → { JSON_STORES | SUPABASE_STORES }[name]
```

- `USE_SUPABASE=false` (default) → JsonXxxStore → `backend/data/*.json`
- `USE_SUPABASE=true`           → SupabaseXxxStore → Supabase Postgres

### Заменённые функции в app.py

- `_shifts_load()/_shifts_save()` → `get_store("shifts")`
- `_memberships_load()/_memberships_save()` → `get_store("memberships")`
- `_squad_corners_load()/_squad_corners_save()` → `get_store("squad_corners")`
- `_squad_invites_load()/_squad_invites_save()` → `get_store("squad_invites")`
- `_squad_messages_load()/_squad_messages_save()` → `get_store("squad_messages")`
- `_badge_requests_load()/_badge_requests_save()` → `get_store("badge_requests")`
- `_parent_snapshots_load()/_parent_snapshots_save()` → `get_store("parent_snapshots")`
- `_check_and_inc_chat_daily()` (inline) → `get_store("chat_daily_usage")`
- `_ensure_default_shift_seeded()` → использует `get_store("shifts").save()`

---

## Проверки

- [x] `python -c "from storage import get_store"` — импорт без ошибок
- [x] `python -c "get_store('shifts').load()"` → `{'shifts': [...], 'squads': [...]}`
- [x] `python -c "get_store('badge_requests').load()"` → `{'requests': [...]}`
- [x] `python -c "get_store('chat_daily_usage').load()"` → dict
- [x] `py_compile.compile('app.py')` — синтаксис OK
- [x] Flask запустился: `GET /api/health` → 200
- [x] `GET /api/shifts` с localhost → 200, данные корректны
- [x] `npm run self-check` → OK

---

## Smoke-test с Supabase provider

- `USE_SUPABASE=true` + реальный Supabase → Flask стартует, `/api/health`=200, `/api/shifts`=200
- `get_store('shifts').save(data)` → upsert в Supabase, `load()` возвращает данные ✅
- `get_store('badge_requests').load()` / `get_store('chat_daily_usage').load()` ✅
- Local dev: `USE_SUPABASE=false` (default в .env) → JSON файлы, полная backward compat ✅

## Evidence

```
P1-02 | Agent A | 2026-02-21 | backend/storage/ (4 файла) + app.py рефакторинг + Supabase end-to-end проверен
```
