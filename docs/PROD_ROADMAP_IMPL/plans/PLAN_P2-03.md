# PLAN_P2-03 — Совет Лагеря: персистентный список инициатив

**Агент:** C (взята из зоны A — нет своих open-задач)  
**Task ID:** P2-03  
**Дата создания плана:** 2026-02-21  
**Статус:** in_progress

---

## 1. Цель задачи

Добавить серверное хранилище для инициатив Совета Лагеря (`council_initiatives`), REST API (`GET/POST /api/council/initiatives`) и обновить `CouncilDashboard.tsx`, чтобы инициативы не «улетали в воздух» между сессиями — они живут на backend (JSON в dev, Supabase в prod).

Ссылка на описание задачи в [`TASKS.md`](../TASKS.md#p2-03).

---

## 2. Контекст (что уже есть)

- `backend/storage/` — абстракция StorageProvider (base.py + json_provider.py + supabase_provider.py + __init__.py), все 8 сторов уже там по тому же pattern
- `backend/app.py` — содержит все эндпоинты; pattern `_require_roles()` + `get_store()` устоявшийся
- `src/components/CouncilDashboard.tsx` — таб `camp-management` есть, но инициативы статические; таб `engines` уже делает `fetch('/api/teams')` — тот же pattern для нового useEffect

**Invariants:**
- local dev (USE_SUPABASE=false) работает через JSON-файлы
- prod (USE_SUPABASE=true) — Supabase

---

## 3. Файлы для изменения

| Файл | Тип | Описание |
|------|-----|----------|
| `backend/storage/base.py` | modify | Добавить `CouncilInitiativesStore` |
| `backend/storage/json_provider.py` | modify | Добавить `JsonCouncilInitiativesStore` + реестр |
| `backend/storage/supabase_provider.py` | modify | Добавить `SupabaseCouncilInitiativesStore` + реестр |
| `backend/storage/__init__.py` | modify | Зарегистрировать `"council_initiatives"` |
| `backend/migrations/002_council_initiatives.sql` | create | SQL DDL для Supabase |
| `backend/app.py` | modify | GET + POST `/api/council/initiatives` |
| `src/components/CouncilDashboard.tsx` | modify | Живой список + форма добавления |

---

## 4. Шаги реализации

1. **base.py** — абстрактный класс `CouncilInitiativesStore(load→dict, save(dict))`
2. **json_provider.py** — `JsonCouncilInitiativesStore` (`council_initiatives.json`, `{"initiatives": [...]}`), добавить в `JSON_STORES`
3. **supabase_provider.py** — `SupabaseCouncilInitiativesStore` (таблица `council_initiatives`), добавить в `SUPABASE_STORES`
4. **__init__.py** — добавить ключ в docstring и `get_store()`
5. **002_council_initiatives.sql** — DDL: таблица + индекс
6. **app.py** — 2 эндпоинта: GET (фильтр по camp_id, 100 записей desc) + POST (валидация title, create)
7. **CouncilDashboard.tsx** — state + useEffect + форма + список в `campManagementSection`

---

## 5. Зависимости

- **Зависит от:** P1-01 (schema done) — наша таблица отдельная, не блокирует
- **Блокирует:** —
- **Параллельно:** —

---

## 6. Риски

| Риск | Вероятность | Митигация |
|------|-------------|-----------|
| Supabase таблица не создана до деплоя | Средняя | Миграция в 002_council_initiatives.sql, ops применяют вручную |
| Frontend не знает текущего camp_id | Низкая | Не передаём camp_id при fetch — показываем все инициативы |

---

## 7. Definition of Done

- [ ] Таблица `council_initiatives` создана в SQL-миграции
- [ ] API эндпоинты работают
- [ ] UI показывает список и позволяет добавлять инициативы
- [ ] Инициативы не «улетают в воздух» между сессиями
- [ ] Отчёт создан в `reports/REPORT_C_P2-03.md`
- [ ] `CLAIM_BOARD.md` обновлён (статус done)
- [ ] `TASKS.md` обновлён (статус done + Evidence)

---

## 8. Отклонения от плана

*Пусто.*
