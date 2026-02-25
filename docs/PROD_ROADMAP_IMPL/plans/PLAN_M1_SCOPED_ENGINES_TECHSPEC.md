# PLAN_M1_SCOPED_ENGINES_TECHSPEC.md

Детальный техсрез M1 (Q1): Scoped Engines (`camp | shift | squad`).

## 1) Цель M1

Устранить архитектурный разрыв между `Team (Engine)` и `Squad`:
- сейчас движки глобальные,
- целевое поведение — движки могут жить в контексте лагеря/смены/отряда.

Результат: предсказуемая видимость и управление движками по контексту.

---

## 2) Domain Contract (To-be)

## 2.1 Новые поля сущности Team

- `scope`: `camp | shift | squad` (обязательное)
- `shiftId`: `string | null`
- `squadId`: `string | null`

## 2.2 Правила валидности

- `scope=camp`:
  - `shiftId = null`
  - `squadId = null`

- `scope=shift`:
  - `shiftId != null`
  - `squadId = null`

- `scope=squad`:
  - `shiftId != null` (если отряд принадлежит смене)
  - `squadId != null`

## 2.3 Совместимость

Старые Team без scope трактуются как `scope=camp` до миграции.

---

## 3) Backend changes

## 3.1 Storage / schema

### Supabase
- Обновить таблицу `teams`:
  - `scope text not null default 'camp'`
  - `shift_id text null`
  - `squad_id text null`
  - CHECK constraints на согласованность полей
  - индексы:
    - `(scope)`
    - `(shift_id)`
    - `(squad_id)`
    - `(owner_device_id, scope)` (по необходимости)

### JSON provider (local dev)
- Расширить shape Team объекта новыми полями.
- При чтении legacy-данных подставлять `scope='camp'`.

## 3.2 API

### Existing endpoints (расширить)
- `POST /api/teams`
  - принять `scope`, `shiftId`, `squadId`
  - валидация по rules

- `GET /api/teams/mine`
  - возвращать только релевантные team по membership + контексту
  - поддержать query-параметры:
    - `scope?`
    - `shiftId?`
    - `squadId?`

- `GET /api/teams/:id`
  - проверка доступа с учётом scope

- `POST /api/teams/:id/join`
  - валидировать допустимость join для контекста пользователя/смены/отряда

### Optional new endpoint (если упростит фронт)
- `GET /api/squads/:id/teams`
  - возвращает scoped team для конкретного отряда

## 3.3 RBAC

- `participant`: join/view в рамках своего контекста.
- `counselor/shift_leader/camp_director/developer`: расширенный просмотр/управление по роли.
- Запрет cross-scope изменений без прав.

---

## 4) Frontend changes

## 4.1 Types / context

- `src/types/teams.ts`
  - добавить `scope`, `shiftId`, `squadId`.

- `src/context/TeamContext.tsx`
  - поддержка create/update/join с scope.
  - фильтрация видимости по текущему контексту.

## 4.2 UI

- `src/components/TeamDashboard.tsx`
  - при создании движка: выбор scope (минимум через простой selector).
  - если пользователь внутри отряда — дефолт `scope=squad` + prefill `squadId`.

- `src/views/ProfileView.tsx`
  - в отрядных панелях показывать релевантные scoped движки.
  - убрать эффект «глобальная команда везде». 

## 4.3 UX guardrails

- Ясные пустые состояния («в этом отряде пока нет движков»).
- Ошибки в стиле profile-error + кнопка «Повторить».

---

## 5) Migration plan

## Шаг 1 — schema forward
- Добавить поля и defaults (без удаления старого поведения).

## Шаг 2 — read compatibility
- Бэкенд принимает legacy объекты и нормализует их к `scope=camp`.

## Шаг 3 — write new shape
- Все новые create/update пишут scope-поля.

## Шаг 4 — UI rollout
- Включить scope-selection и контекстное отображение.

## Шаг 5 — cleanup (после стабилизации)
- Убрать временные fallback ветки, если не нужны.

---

## 6) Smoke tests (обязательные)

1. Создать `camp`-движок, проверить видимость owner и участников.
2. Создать `shift`-движок, проверить ограничение по смене.
3. Создать `squad`-движок из контекста отряда, проверить видимость в отряде.
4. Попробовать join из чужого scope — получить корректный отказ.
5. Проверить `GET /api/teams/mine` с фильтрами scope/shift/squad.
6. Проверить, что legacy-движки не ломаются (читаются как camp).

---

## 7) Evidence checklist (для ROADMAP/Claim)

- migration файл (DDL)
- backend API diff
- frontend types/context/UI diff
- результаты smoke (в отчёте)
- обновление docs (`ROADMAP_2026.md`, `CLAIM_BOARD.md`, при необходимости `tech_context.md`)

---

## 8) Риски и снижение

- Риск: сломать текущий team flow.
  - Мера: backward compatibility + staged rollout.

- Риск: путаница в UX выбора scope.
  - Мера: умные дефолты от контекста, минимум ручного выбора.

- Риск: рассинхрон ролей и доступа.
  - Мера: отдельные RBAC проверки на backend, не только UI.
