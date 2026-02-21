# REPORT_C_P2-03 — Совет Лагеря: персистентный список инициатив

**Агент:** C  
**Task ID:** P2-03  
**Дата завершения:** 2026-02-21  
**Статус:** ✅ Done

---

## 1. Что сделано

Реализована полная цепочка персистентности инициатив Совета Лагеря:

1. **Слой хранилища (storage layer)**
   - `backend/storage/base.py` — добавлен абстрактный класс `CouncilInitiativesStore` (`load() → dict`, `save(dict)`)
   - `backend/storage/json_provider.py` — добавлен `JsonCouncilInitiativesStore` (файл `backend/data/council_initiatives.json`), зарегистрирован в `JSON_STORES`
   - `backend/storage/supabase_provider.py` — добавлен `SupabaseCouncilInitiativesStore` (таблица `council_initiatives`), зарегистрирован в `SUPABASE_STORES`. Включены маппер-функции `_row_to_initiative` и `_initiative_to_row`.
   - `backend/storage/__init__.py` — ключ `"council_initiatives"` добавлен в docstring и в сообщение об ошибке `get_store()`

2. **Миграция SQL**
   - `backend/migrations/002_council_initiatives.sql` — DDL: таблица `council_initiatives` с полями `id, camp_id, title, status, created_at, created_by, created_by_nickname`, индекс `idx_council_initiatives_camp`, CHECK-constraint на статусы, RLS enabled.

3. **Backend API (`backend/app.py`)**
   - `GET /api/council/initiatives` — возвращает до 100 инициатив в обратном хронологическом порядке, поддерживает фильтрацию по `?camp_id=`. Auth: `CHAT_ALLOWED_ROLES`, `allow_localhost_dev=True`.
   - `POST /api/council/initiatives` — создаёт инициативу. Body: `{"title": "...", "camp_id": "..."}`. Валидация: title обязателен, ≤ 200 символов. Возвращает 201 + новый объект.

4. **Frontend (`src/components/CouncilDashboard.tsx`)**
   - Импортирован `loadAuthStorage` для получения JWT токена.
   - Добавлены типы: `Initiative`, `INITIATIVE_STATUS_LABELS`, `INITIATIVE_STATUS_COLORS`.
   - Новое состояние: `initiatives`, `initiativesLoading`, `initiativesError`, `initiativeInput`, `initiativeSubmitting`, `initiativeSubmitError`, `initiativeInputRef`.
   - `useEffect` — при активации таба `camp-management` запрашивает `GET /api/council/initiatives` с авторизационным заголовком.
   - `handleSubmitInitiative` — `POST /api/council/initiatives` с авторизацией, оптимистично добавляет новый элемент в список.
   - `campManagementSection` полностью переработан: форма добавления (input + кнопка «💡 Предложить»), отображение ошибок, список инициатив со статус-бейджем (цветной), никнеймом и датой, пустое состояние.

---

## 2. Затронутые файлы

| Файл | Изменение |
|------|-----------|
| `backend/storage/base.py` | + `CouncilInitiativesStore` (абстрактный класс) |
| `backend/storage/json_provider.py` | + `JsonCouncilInitiativesStore` + реестр |
| `backend/storage/supabase_provider.py` | + `SupabaseCouncilInitiativesStore` + маперы + реестр |
| `backend/storage/__init__.py` | + ключ `council_initiatives` |
| `backend/migrations/002_council_initiatives.sql` | СОЗДАН — DDL + индекс + CHECK + RLS |
| `backend/app.py` | + GET + POST `/api/council/initiatives` |
| `src/components/CouncilDashboard.tsx` | campManagementSection: живой список + форма |
| `docs/PROD_ROADMAP_IMPL/plans/PLAN_P2-03.md` | СОЗДАН |
| `docs/PROD_ROADMAP_IMPL/CLAIM_BOARD.md` | статус → done |

---

## 3. Evidence для ROADMAP_2026.md

```
P2-03 | Совет Лагеря — персистентный список инициатив | Done | 2026-02-21
  - backend/storage/base.py: class CouncilInitiativesStore(ABC)
  - backend/storage/json_provider.py: class JsonCouncilInitiativesStore (council_initiatives.json)
  - backend/storage/supabase_provider.py: class SupabaseCouncilInitiativesStore (table council_initiatives)
  - backend/migrations/002_council_initiatives.sql: DDL с индексом и CHECK-constraint
  - backend/app.py: GET + POST /api/council/initiatives (auth: CHAT_ALLOWED_ROLES)
  - src/components/CouncilDashboard.tsx: форма добавления + живой список со статус-бейджами
```

---

## 4. DoD-чеклист

- [x] Таблица `council_initiatives` создана в SQL-миграции `002_council_initiatives.sql`
- [x] `GET /api/council/initiatives` возвращает список (до 100, desc)
- [x] `POST /api/council/initiatives` создаёт инициативу (валидация title, auth)
- [x] Frontend показывает список с live-данными с backend
- [x] Frontend имеет форму добавления (input + кнопка «Предложить»)
- [x] Инициативы не «улетают в воздух» — хранятся в JSON (dev) / Supabase (prod)
- [x] Статус-бейджи и пустое состояние реализованы
- [x] TypeScript `tsc --noEmit` проходит без ошибок
- [x] Linter: нет ошибок (ReadLints)

---

## 5. Следующие шаги (out of scope данной задачи)

- Изменение статуса инициативы через `PATCH /api/council/initiatives/<id>/status` (только staff)
- Фильтрация по текущей смене (`camp_id` из профиля пользователя)
- Пагинация / infinite scroll при большом количестве инициатив
