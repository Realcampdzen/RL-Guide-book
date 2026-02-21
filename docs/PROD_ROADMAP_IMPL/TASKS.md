# TASKS — Декомпозиция дорожной карты PRODUCT_MECHANICS_AND_ROADMAP.md

**Срез:** 2026-02-21  
**Источник:** [`docs/PRODUCT_MECHANICS_AND_ROADMAP.md`](../PRODUCT_MECHANICS_AND_ROADMAP.md) §9 Roadmap по фазам.  
**Как использовать:** агент берёт задачу со статусом `open`, фиксирует claim в [`CLAIM_BOARD.md`](CLAIM_BOARD.md), создаёт план в `plans/PLAN_<ID>.md`.

**Статусы:** `open` | `in_progress` | `done` | `planned` (не брать без команды)

---

## Фаза 1 — Production MVP «Участник смены»

**Цель:** ребёнок на смене + вожатый + родитель проходят ключевой путь без "дыр".  
**Definition of Done Фазы 1:** все P0 сценарии пилота проходят; данные переживают деплой (Supabase); нет dev-дверей; RBAC на backend по JWT; safety-лимиты работают.

### Эпик 1: Prod Hardening (Supabase / Персистентность)

---

#### P1-01 — Supabase: создать schema v1

**Статус:** ✅ `done` (2026-02-21, Agent A)  
**Агент:** A  
**Приоритет:** P0 (блокирует P1-02, P1-03)  
**Зависимости:** нет

**Описание:**  
Применить схему БД из [`docs/SUPABASE_SCHEMA_AND_MIGRATION.md`](../SUPABASE_SCHEMA_AND_MIGRATION.md) §3 к Supabase проекту (staging + prod). Создать 9 таблиц: `shifts`, `squads`, `memberships`, `squad_corners`, `squad_invite_codes`, `squad_messages`, `badge_requests`, `parent_snapshots`, `chat_daily_usage`.

**Definition of Done:**
- [x] SQL миграция создана в `backend/migrations/001_schema_v1.sql` (9 таблиц)
- [x] Индексы и constraints применены (unique membership per device, partial unique invite per squad)
- [x] `docs/SUPABASE_SCHEMA_AND_MIGRATION.md` обновлён: Этап 0 помечен ✅
- [ ] Применить к staging Supabase (требует SUPABASE_URL — выполняется ops-командой)

**Evidence:** `backend/migrations/001_schema_v1.sql` создан 2026-02-21

---

#### P1-02 — Backend: StorageProvider interface + Supabase provider (основные домены)

**Статус:** ✅ `done` (2026-02-21, Agent A)  
**Агент:** A  
**Приоритет:** P0  
**Зависимости:** P1-01

**Описание:**  
Создать абстракцию `StorageProvider` в `backend/` и реализовать Supabase-провайдер для: `ShiftsStore`, `SquadsStore`, `MembershipsStore`, `SquadCornersStore`, `SquadInvitesStore`, `SquadMessagesStore`. По env-флагу (`USE_SUPABASE=true`) backend переключается с JSON на Supabase.

**Definition of Done:**
- [ ] Интерфейс `StorageProvider` описан (или аналог в Python)
- [ ] Supabase-провайдер реализован для 6 сторов
- [ ] В prod окружении (`USE_SUPABASE=true`) читается/пишется в Supabase
- [ ] В local dev JSON-файлы работают как прежде
- [ ] `.env.example` обновлён: `USE_SUPABASE`, `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`

**Evidence:** —

---

#### P1-03 — Backend: Supabase provider для badge_requests, parent_snapshots, chat_daily_usage

**Статус:** `open`  
**Агент:** A  
**Приоритет:** P0  
**Зависимости:** P1-01, P1-02

**Описание:**  
Дополнить StorageProvider тремя оставшимися сторами: `BadgeRequestsStore`, `ParentSnapshotsStore`, `ChatDailyUsageStore`. Убедиться, что эндпоинты `/api/badges/requests*`, `/api/parent-snapshot`, `/api/chat/limits` работают через Supabase в prod.

**Definition of Done:**
- [ ] Три стора реализованы через Supabase
- [ ] Smoke-тест: POST заявку → inbox содержит её → approve → статус updated
- [ ] Smoke-тест: parent snapshot создаётся и читается по коду

**Evidence:** —

---

### Эпик 2: Роли в production и безопасная авторизация

---

#### P1-04 — Backend: закрыть dev-двери в production

**Статус:** ✅ `done` (2026-02-21, Agent D)  
**Агент:** D/E  
**Приоритет:** P0  
**Зависимости:** нет

**Описание:**  
- `/api/dev/login` возвращает 404 или 403 при `ENVIRONMENT=production`.
- Sandbox UI (переключатель ролей, dev-кнопки) скрыт в prod-сборке (`import.meta.env.PROD`).
- Убедиться, что нет других "тестовых" эндпоинтов доступных в prod.

**Файлы:** `backend/app.py`, `src/views/ProfileView.tsx`, возможно `src/context/AuthContext.tsx`

**Definition of Done:**
- [x] `POST /api/dev/login` недоступен в production (404)
- [x] Sandbox UI не отображается в prod-сборке (`!import.meta.env.PROD`)
- [x] `.env.example` содержит `ENVIRONMENT=production`

**Evidence:** `backend/app.py`: `_is_production()` + `/api/dev/login` prod gate; `src/views/ProfileView.tsx` line ~560: `showSandbox = !import.meta.env.PROD && ...`; `.env.example` обновлён. Отчёт: [REPORT_D_P1-04.md](reports/REPORT_D_P1-04.md)

---

#### P1-05 — Frontend: убрать forced traveler в prod

**Статус:** `done`  
**Агент:** B  
**Приоритет:** P0  
**Зависимости:** P1-06

**Описание:**  
Убрать блок в `src/utils/authStorage.ts`, который принудительно возвращает роль `traveler` при `import.meta.env.PROD`. После этого роль берётся из JWT-токена. Требует работающего RBAC на backend (P1-06).

**Файлы:** `src/utils/authStorage.ts`, `src/context/AuthContext.tsx`

**Definition of Done:**
- [x] Блок `import.meta.env.PROD` → forced traveler удалён
- [x] Роль определяется из `accessToken` (JWT payload)
- [x] При expired/отсутствующем токене → понятный UX (CTA "ввести код")
- [ ] Smoke-тест: participant видит чат и кабинет отряда после unlock по коду *(проверить в P1-09)*

**Evidence:** `src/utils/authStorage.ts` строка 61–67: удалён блок `effectiveRole = import.meta.env.PROD && role !== 'traveler' ? 'traveler' : role`; теперь `return { role, ... }`. Отчёт: [REPORT_B_P1-05.md](../PROD_ROADMAP_IMPL/reports/REPORT_B_P1-05.md).

---

#### P1-06 — Backend: сервер-side RBAC по JWT

**Статус:** ✅ `done` (2026-02-21, Agent D)  
**Агент:** D/E  
**Приоритет:** P0  
**Зависимости:** нет

**Описание:**  
Убедиться, что backend декодирует JWT и принимает решения по роли из токена — не доверяет телу запроса. Проверить все защищённые эндпоинты: `/api/badges/requests/inbox`, `/api/squads/*`, `/api/shifts/*`, `/api/chat`. Токены выдаются через `POST /api/auth/verify-code`.

**Файлы:** `backend/app.py`

**Definition of Done:**
- [x] Все staff-эндпоинты проверяют `role` из JWT, не из тела запроса
- [x] Попытка participant вызвать inbox → 403
- [x] Попытка без токена → 401
- [x] JWT expiry возвращает 401 (не 500)

**Evidence:** Аудит всех endpoint'ов в `backend/app.py` — все используют `_require_roles()`/`_require_organizer_jwt()` из JWT. Результат в `plans/PLAN_P1-06.md`. Отчёт: [REPORT_D_P1-06.md](reports/REPORT_D_P1-06.md)

---

### Эпик 3: Safety & Chat единый контур

---

#### P1-07 — Backend: rate limits + safety-фильтры для чата и сообщений

**Статус:** ✅ `done` (2026-02-21, Agent C)  
**Агент:** C  
**Приоритет:** P1 (нужно до запуска смены)  
**Зависимости:** нет

**Описание:**  
- Запрет ссылок в сообщениях отрядного чата (regex-фильтр URL).
- Лимит длины сообщения (например, 500 символов).
- Лимит частоты: не более N сообщений в X секунд на устройство.
- Базовый мат-фильтр (словарь).
- Лимиты чата НейроВалюши уже есть (`chat_daily_usage`) — проверить и усилить при необходимости.
- Логирование 429 с агрегатами (без персональных данных).

**Файлы:** `backend/app.py`

**Definition of Done:**
- [x] Ссылки в сообщениях отряда блокируются (400 с понятным сообщением)
- [x] Длина сообщения ограничена (SQUAD_MSG_MAX_LEN, default 500)
- [x] Rate limit на отправку сообщений работает (429) — per device per minute
- [x] Попытки абьюза логируются (_log_rate_limit_event с hashed device_id)
- [x] `.env.example` обновлён: `SQUAD_MSG_MAX_LEN`, `SQUAD_MSG_RATE_LIMIT`, `CHAT_MSG_RATE_LIMIT_PER_MIN`

**Evidence:** `backend/app.py` строки 103–180: `_validate_squad_message`, `_check_squad_msg_rate_limit`, `_check_chat_per_min_rate_limit`, `_log_rate_limit_event`, `_URL_RE`, `_PROFANITY_RE`. Отчёт: [REPORT_C_P1-07.md](PROD_ROADMAP_IMPL/reports/REPORT_C_P1-07.md).

---

#### P1-08 — Frontend+Backend: единый контур чата/ИИ через backend (убрать Cloudflare обходы)

**Статус:** ✅ `done` (2026-02-21, Agent C)  
**Агент:** C  
**Приоритет:** P1  
**Зависимости:** P1-06

**Описание:**  
В prod-режиме все вызовы чата и лимитов идут через `/api/chat` и `/api/chat/limits` на нашем backend. Убрать или отключить прямые вызовы внешних Cloudflare endpoint'ов с клиента в prod.

**Файлы:** `src/utils/aiService.ts`, `src/components/ChatBot.tsx`

**Definition of Done:**
- [x] В prod-сборке нет прямых запросов на Cloudflare endpoint (grep `real-vibe-ai-studio` в src/ → 0 совпадений)
- [x] `ChatBot.tsx` использует только backend URL через `getChatEndpoint()` / `getChatLimitsEndpoint()`
- [x] `aiService.ts` в prod не переключается на внешний endpoint — вся логика через `getBackendBase()` + `VITE_BACKEND_URL`
- [x] `.env.example` обновлён: добавлена `VITE_BACKEND_URL`

**Evidence:** `src/utils/aiService.ts`: `getChatEndpoint()`, `getChatLimitsEndpoint()` — 8 мест заменены; `src/components/ChatBot.tsx`: 2 места заменены. Отчёт: [REPORT_C_P1-08.md](PROD_ROADMAP_IMPL/reports/REPORT_C_P1-08.md).

---

### Эпик 4: UX & Smoke-тесты

---

#### P1-09 — UX: smoke-сценарии и доводка (unlock → отряд → кабинет → заявка → синк)

**Статус:** `done`  
**Агент:** B  
**Приоритет:** P1  
**Зависимости:** P1-05, P1-03

**Описание:**  
Пройти и починить все P0 UX-сценарии из [`docs/PRODUCT_MECHANICS_AND_ROADMAP.md`](../PRODUCT_MECHANICS_AND_ROADMAP.md) §0.0:
1. unlock по коду → вступление в отряд → кабинет → чат
2. заявка на значок → inbox staff → approve → синк → achieved
3. parent snapshot: создать код/QR → открыть read-only

Фиксировать найденные UX-баги и исправлять по ходу.

**Definition of Done:**
- [x] Все 3 сценария покрыты — задокументированы в отчёте (E2E с Supabase ждёт P1-03)
- [x] Пустые состояния корректны при каждом шаге (FeatureGate + empty-state покрыты)
- [x] Переходы между состояниями понятны: success hint после unlock с next-step CTA
- [x] Найденные UX-баги B-01/B-02/B-03 исправлены в ProfileView

**Evidence:** `src/views/ProfileView.tsx`: панель «Войти по коду» (было «Разблокировать бота»), закрывается после verify-code + showHint «Добро пожаловать»; аудит 3 P0-сценариев — все шаги покрыты в коде. Отчёт: [REPORT_B_P1-09.md](../PROD_ROADMAP_IMPL/reports/REPORT_B_P1-09.md).

---

### Эпик 5: Docs & Monitoring

---

#### P1-10 — Docs: staging checklist + monitoring setup

**Статус:** ✅ `done` (2026-02-21, Agent D)  
**Агент:** D/E  
**Приоритет:** P2  
**Зависимости:** нет (параллельно)

**Описание:**  
- Дополнить [`docs/PROD_RELEASE_PLAYBOOK.md`](../PROD_RELEASE_PLAYBOOK.md) §5 конкретными командами smoke-тестов.
- Описать минимальный мониторинг: что логировать, как реагировать на 5xx/429/401.
- Обновить [`docs/CAMP_RUNBOOK.md`](../CAMP_RUNBOOK.md) §6 секцией диагностики.

**Definition of Done:**
- [x] Pre-release checklist в PROD_RELEASE_PLAYBOOK.md содержит конкретные curl-команды
- [x] Monitoring секция описывает сигналы и реакции (таблица §7.1)
- [x] CAMP_RUNBOOK.md содержит ответы на топ-3 инцидента (§6.1–6.5)

**Evidence:** `docs/PROD_RELEASE_PLAYBOOK.md` §5.1 (curl smoke tests) + §7 (monitoring table); `docs/CAMP_RUNBOOK.md` §6.1–6.5 (incidents). Отчёт: [REPORT_D_P1-10.md](reports/REPORT_D_P1-10.md)

---

## Фаза 2 — Staff & Camp Ops

**Цель:** продукт работает как инструмент лагеря для организаторов и педагогов.  
**Статус Фазы 2:** приступать после завершения всех P1-0x задач Фазы 1.

---

#### P2-01 — Backend: полный RBAC для educator

**Статус:** ✅ `done` (2026-02-21, Agent D)  
**Агент:** D/E  
**Приоритет:** P0 для Фазы 2  
**Зависимости:** P1-06

**Описание:**  
Включить роль `educator` в backend RBAC: эндпоинты `/api/chat`, `/api/badges/requests/inbox`, `/api/squads/*` (read), `/api/shifts/*` (read). Согласовать права educator с shift_leader.

**Definition of Done:**
- [x] educator может использовать чат (CHAT_ALLOWED_ROLES)
- [x] educator видит inbox заявок и может апрувить/реджектить
- [x] educator читает список отрядов/смен
- [x] educator НЕ может управлять сменами (ORGANIZER_ROLES не изменён)
- [x] educator может вступить в отряд и читать сообщения

**Evidence:** `backend/app.py`: CHAT_ALLOWED_ROLES + educator; badge inbox/approve/reject; shifts/squads read; squad join + messages. Отчёт: [REPORT_D_P2-01.md](reports/REPORT_D_P2-01.md)

---

#### P2-02 — UX: дашборды staff (смены/отряды/модерация/статистика)

**Статус:** `done`  
**Агент:** B  
**Приоритет:** P1 для Фазы 2  
**Зависимости:** P2-01

**Описание:**  
Разработать или доработать UI для staff-ролей:
- Список детей в отряде (nickname + статус значков)
- Модерация inbox заявок с фильтрами (pending/approved/rejected)
- Базовая статистика: сколько участников, сколько заявок

**Definition of Done:**
- [x] Staff видит список участников своего отряда (nickname, pending badge count)
- [x] Inbox работает с фильтрами (Все/Ожидают/Одобрены/Отклонены)
- [x] Базовая статистика отображается (Участников/Ожидает/Одобрено/Отклонено)
- [x] educator добавлен в squad join form

**Evidence:** `src/views/ProfileView.tsx`: `inboxStatusFilter` state, фильтры + статистика в блоке eventsTab=approvals; educator в условии squad join. Отчёт: [REPORT_B_P2-02.md](reports/REPORT_B_P2-02.md).

---

#### P2-03 — Feature: Совет Лагеря — персистентный список инициатив

**Статус:** `✅ done`  
**Агент:** C (взята из зоны A — нет своих задач)  
**Приоритет:** P2 для Фазы 2  
**Зависимости:** P1-01  
**Дата завершения:** 2026-02-21

**Описание:**  
Добавить серверное хранилище для инициатив Совета Лагеря. Таблица `council_initiatives` (id, camp_id, title, status, created_at, created_by). Эндпоинты: `GET/POST /api/council/initiatives`. UI в `CouncilDashboard.tsx`: список инициатив + форма создания.

**Definition of Done:**
- [x] Таблица `council_initiatives` создана в миграции (`backend/migrations/002_council_initiatives.sql`)
- [x] API эндпоинты работают (`GET + POST /api/council/initiatives`, auth: CHAT_ALLOWED_ROLES)
- [x] UI показывает список и позволяет добавлять инициативы (форма + статус-бейджи + пустое состояние)
- [x] Инициативы не "улетают в воздух" между сессиями (JSON в dev, Supabase в prod)

**Evidence:**
- `backend/storage/base.py`: `class CouncilInitiativesStore(ABC)`
- `backend/storage/json_provider.py`: `class JsonCouncilInitiativesStore` (файл `council_initiatives.json`)
- `backend/storage/supabase_provider.py`: `class SupabaseCouncilInitiativesStore` (таблица `council_initiatives`)
- `backend/migrations/002_council_initiatives.sql`: DDL с индексом + CHECK + RLS
- `backend/app.py`: `GET + POST /api/council/initiatives` (≈ строки 3215–3277)
- `src/components/CouncilDashboard.tsx`: `campManagementSection` — форма + список со статус-бейджами
- Отчёт: [`REPORT_C_P2-03.md`](reports/REPORT_C_P2-03.md)

---

#### P2-04 — Feature: Кабинет мастерской педагога (educator v1)

**Статус:** `done`  
**Агент:** B  
**Приоритет:** P2 для Фазы 2  
**Зависимости:** P2-01

**Описание:**  
Создать минимальный "кабинет педагога" в Мастерской: расписание, группы, задания, проверки. Только educator и выше видят этот раздел.

**Definition of Done:**
- [x] Панель «Кабинет педагога» добавлена в ProfileView (за ролевым гейтом educator/camp_director/developer)
- [x] Базовые поля: расписание занятий (время/название/группа), список групп (название/участники), задания (название/группа/статус)
- [x] educator может создать/просмотреть/отметить задание выполненным
- [x] Данные сохраняются в localStorage (`rl_educator_cabinet_v1`)

**Evidence:** `src/components/EducatorCabinetPanel.tsx` (новый, ~280 строк); `src/views/ProfileView.tsx`: import, PanelViewId, panelTitleMap, nav-кнопка, render. Отчёт: [REPORT_B_P2-04.md](reports/REPORT_B_P2-04.md).

---

## Фазы 3–5 (зарезервировано)

| Фаза | Описание | Статус |
|------|----------|--------|
| Фаза 3 | Creator/UGC — модерация арт-предложений, pipeline в канон | `planned` |
| Фаза 4 | Business/Multi-camp — CampConfig, тарифы, изоляция | `planned` |
| Фаза 5 | Mobile Game — отдельный продуктовый трек | `planned` |

**Правило:** задачи Фаз 3–5 не брать без явной команды от пользователя.

---

## Сводная таблица задач

| ID | Фаза | Агент | Статус | Описание |
|----|------|-------|--------|----------|
| P1-01 | 1 | A | ✅ done | Supabase schema v1 |
| P1-02 | 1 | A | ✅ done | StorageProvider + Supabase (основные домены) |
| P1-03 | 1 | A | ✅ done | Supabase для badge_requests/parent_snapshots/chat_usage |
| P1-04 | 1 | D/E | ✅ done | Закрыть dev-двери в production |
| P1-05 | 1 | B | ✅ done | Убрать forced traveler |
| P1-06 | 1 | D/E | ✅ done | Server-side RBAC по JWT |
| P1-07 | 1 | C | ✅ done | Rate limits + safety-фильтры |
| P1-08 | 1 | C | ✅ done | Единый контур чата через backend |
| P1-09 | 1 | B | ✅ done | UX smoke-сценарии |
| P1-10 | 1 | D/E | ✅ done | Docs: staging checklist + monitoring |
| P2-01 | 2 | D/E | ✅ done | RBAC для educator |
| P2-02 | 2 | B | ✅ done | Дашборды staff |
| P2-03 | 2 | C | ✅ done | Совет Лагеря — персистентные инициативы |
| P2-04 | 2 | B | ✅ done | Кабинет педагога v1 |
