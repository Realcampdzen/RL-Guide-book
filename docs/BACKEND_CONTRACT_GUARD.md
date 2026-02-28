# Backend Contract Guard — Critical API Endpoints

**Срез:** 2026-02-28  
**Автор:** Agent A (Data/Backend contracts)  
**Tasks:** M5-R2-A, M5-R2-B, M5-R3-A, M5-R4-A, M5-R5-C  
**Источник истины:** `backend/app.py`, `backend/storage/supabase_provider.py`

Этот документ фиксирует API-контракты для трёх критических endpoint-групп постпилотного контура. Цель — не допустить breaking-регрессий при будущих доработках backend'а.

---

## 1. Scope

Документ покрывает следующие endpoint-группы:

| Группа | Endpoints |
|--------|-----------|
| **Badge Requests** | `POST /api/badges/requests`, `GET /api/badges/requests/mine`, `GET /api/badges/requests/inbox`, `POST /api/badges/requests/{id}/approve`, `POST /api/badges/requests/{id}/reject`, `POST /api/badges/requests/cleanup` |
| **Parent Snapshot** | `POST /api/parent-snapshot`, `GET /api/parent-snapshot?code=` |
| **Council Initiatives** | `GET /api/council/initiatives`, `POST /api/council/initiatives` |
| **Image Generation** | `POST /api/images/generate` |
| **Chat** | `POST /api/chat` |

---

## 2. Additive-Only Policy

> **Правило:** Изменения API считаются безопасными (non-breaking), если они **только добавляют** новые поля. Удаление, переименование или изменение типа любого **обязательного** поля — это breaking change.

**Принципы:**
- Новые поля в ответе — **всегда допустимо** (фронт игнорирует неизвестные поля).
- Новые **опциональные** параметры в body запроса — допустимо при наличии разумного default'а.
- Любое поле, присутствующее в разделе «Mandatory» ниже, **не должно** убираться, переименовываться или менять тип без координации с фронтендом.
- HTTP-статус успешного ответа не должен меняться без обоснования.

---

## 3. Endpoint Contracts

### 3.1 Badge Requests

#### `POST /api/badges/requests`

**Auth:** `participant | developer` (Bearer JWT)  
**Body:**
```json
{
  "levelId":    "string (required, формат '1.1.1')",
  "badgeTitle": "string (optional, max 180 chars)",
  "nickname":   "string (optional, max 120 chars)",
  "evidence": {
    "reflection": "string (optional, max 1200 chars)",
    "impact":     "string (optional, max 1200 chars)",
    "link":       "string (optional, max 2000 chars)"
  }
}
```

**Response 201:**
```json
{
  "request": {
    "id":         "string (mandatory) — формат BR-XXXXXXXXXX",
    "status":     "string (mandatory) — всегда 'pending' при создании",
    "levelId":    "string (mandatory)",
    "createdAt":  "string ISO8601 (mandatory)",
    "requestedBy": {
      "deviceId": "string (mandatory)",
      "nickname": "string | null (optional)"
    },
    "campId":     "string | null (optional)",
    "squadId":    "string | null (optional)",
    "badgeTitle": "string | null (optional)",
    "evidence":   "object | null (optional)",
    "resolvedAt": "null (mandatory at create — always null)",
    "resolvedBy": "null (mandatory at create — always null)"
  }
}
```

**Mandatory fields:** `request.id`, `request.status`, `request.levelId`, `request.createdAt`, `request.requestedBy.deviceId`

**Breaking changes:**
- Переименование `request` → что-то другое
- Удаление или переименование `id`, `status`, `levelId`, `createdAt`
- Изменение формата `id` (BR-prefixed) без миграции
- Смена HTTP-статуса с 201

---

#### `GET /api/badges/requests/mine`

**Auth:** `participant | parent | educator | counselor | shift_leader | developer` (Bearer JWT)  
**Response 200:**
```json
{
  "requests": [
    {
      "id":         "string (mandatory)",
      "status":     "'pending' | 'approved' | 'rejected' (mandatory)",
      "levelId":    "string (mandatory)",
      "createdAt":  "string ISO8601 (mandatory)",
      "requestedBy": {
        "nickname": "string | null (optional)"
      },
      "resolvedAt": "string ISO8601 | null (optional)",
      "resolvedBy": "object | null (optional)"
    }
  ]
}
```

> **Privacy (M5-R2-B):** `requestedBy.deviceId` **не возвращается** в ответе /mine. Фильтрация происходит по `deviceId` из JWT, но идентификатор устройства не попадает в response.

**Mandatory fields:** `requests` (array, may be empty), каждый объект: `id`, `status`, `levelId`, `createdAt`  
**Sort:** newest-first (descending createdAt)

**Breaking changes:**
- Переименование `requests` → другое
- Удаление статусного поля или изменение набора допустимых значений статуса (`pending|approved|rejected`)
- Добавление `requestedBy.deviceId` в ответ (privacy regression)

---

#### `GET /api/badges/requests/inbox`

**Auth:** `counselor | educator | shift_leader | camp_director | developer`  
**Query params:**
- `campId` (optional)
- `squadId` (optional)
- `status` (optional: `pending|approved|rejected`)
- `includeResolved` (optional, M5-R3-A): `true|1|yes` — включить все resolved записи независимо от TTL. Default: `false` — resolved записи старше `BADGE_REQUESTS_RESOLVED_TTL_DAYS` (env, default 30 дней) не возвращаются.

**Response 200:**
```json
{
  "requests": [ /* same shape as POST /api/badges/requests response */ ]
}
```

> **Auto-scope (M5-R2-B):** При отсутствии явных query-param `campId`/`squadId` роли `counselor` и `educator` автоматически ограничивают выдачу своим отрядом (через `_resolve_membership_context`). Роли `shift_leader`, `camp_director`, `developer` возвращают все заявки по умолчанию.

> **TTL-фильтр (M5-R3-A):** По умолчанию (`includeResolved=false`) resolved заявки старше `BADGE_REQUESTS_RESOLVED_TTL_DAYS` дней из ответа исключаются. Pending-заявки не подпадают под TTL и всегда возвращаются. Существующие клиенты, не передающие `includeResolved`, получают pending + свежие resolved — **обратно совместимо**.

**Mandatory fields:** `requests` (array)  
**Sort:** pending-first, then newest-first within group

**Breaking changes:**
- Удаление фильтра `status`
- Смена порядка сортировки без уведомления
- Отключение auto-scope для counselor/educator без явного opt-out механизма
- Изменение поведения дефолта `includeResolved` — должен оставаться `false`

---

#### `POST /api/badges/requests/cleanup` *(M5-R3-A, M5-R5-A, M6-HARDENING-A)*

**Auth:** `shift_leader | developer` (Bearer JWT)  
**Body:**
```json
{
  "olderThanDays": 30
}
```
`olderThanDays` (optional, int ≥ 0): число дней. Default: значение env `BADGE_REQUESTS_RESOLVED_TTL_DAYS` (30).

**Response 200:**
```json
{
  "deleted": 5
}
```

**Response 429:**
```json
{
  "error": "Rate limit: try again in 58s"
}
```

**Поведение:** Удаляет записи со статусом `approved` или `rejected`, у которых `resolvedAt` старше `olderThanDays` дней.

- `USE_SUPABASE=true`: выполняется SQL `DELETE` напрямую в Supabase (эффективно, без загрузки всей таблицы).
- `USE_SUPABASE=false` (JSON-режим): загрузка всего файла в память, фильтрация в Python, перезапись.

**Rate limit:** не более 1 вызова в `CLEANUP_COOLDOWN_SEC` секунд (env, default 60) per-camp (`campId` из JWT; fallback — `deviceId` или `"global"`). При превышении — `429` с сообщением `"Rate limit: try again in Xs"`. Счётчик in-memory, сбрасывается при перезапуске сервера.

**Лог:** `[BADGE_CLEANUP] deleted=N camp_id=<campId> actor=<sha256[:12]> ts=<ISO>`

**Errors:**
- `400` — `olderThanDays` не является числом или < 0
- `401/403` — неавторизован или недостаточно прав
- `429` — rate limit: повторный вызов раньше `CLEANUP_COOLDOWN_SEC` секунд (default 60)

**Mandatory response fields:** `deleted` (int ≥ 0)

**Breaking changes:**
- Удаление поля `deleted` из ответа
- Изменение набора разрешённых ролей (расширение на `participant` — security regression)
- Смена семантики (например, начать удалять pending-заявки)
- Снижение `CLEANUP_COOLDOWN_SEC` до 0 без согласования

---

#### `POST /api/badges/requests/{id}/approve` и `/reject`

**Auth:** `counselor | educator | shift_leader | camp_director | developer`  
**Body:** `{ "note": "string (optional)" }`  
**Response 200:**
```json
{
  "request": {
    "id":            "string (mandatory)",
    "status":        "'approved' | 'rejected' (mandatory)",
    "resolvedAt":    "string ISO8601 (mandatory — присутствует после резолюции)",
    "resolvedBy":    {
      "deviceId": "string (mandatory)",
      "role":     "string (mandatory)"
    },
    "resolutionNote": "string | null (optional)"
  }
}
```

**HTTP 409** если запрос уже был resolved (идемпотентная защита).

**Mandatory fields:** `request.id`, `request.status`, `request.resolvedAt`, `request.resolvedBy.deviceId`, `request.resolvedBy.role`

**Breaking changes:**
- Удаление `resolvedAt` или `resolvedBy`
- Удаление HTTP 409 на повторный approve

---

### 3.2 Parent Snapshot

#### `POST /api/parent-snapshot`

**Auth:** `participant | developer` (Bearer JWT)  
**Body:**
```json
{
  "progress": {
    "levelId": { "achieved": "bool", "achievedAt": "string ISO8601 (optional)" }
  },
  "profile": {
    "nickname":            "string (optional)",
    "totalLevelsAchieved": "int (optional)"
  },
  "exportedAt": "string ISO8601 (optional)"
}
```

**Response 200:**
```json
{
  "parentLinkCode": "string (mandatory) — 8-char urlsafe token",
  "expiresAt":      "int (mandatory) — unix timestamp"
}
```

**Mandatory fields:** `parentLinkCode`, `expiresAt`  
**TTL:** 7 дней (PARENT_SNAPSHOT_TTL_DAYS)

**Breaking changes:**
- Переименование `parentLinkCode`
- Удаление `expiresAt`

---

#### `GET /api/parent-snapshot?code={code}`

**Auth:** Не требуется (публичный read-only по временному коду)  
**Query params:** `code` (required)

**Response 200:**
```json
{
  "progress":   "object (mandatory) — map levelId → {achieved, achievedAt}",
  "exportedAt": "string ISO8601 | '' (mandatory)",
  "profile":    "object (optional) — {nickname, totalLevelsAchieved}"
}
```

**Response 404** — code не найден  
**Response 410** — code истёк

**Mandatory fields:** `progress` (object), `exportedAt`

**Breaking changes:**
- Удаление `progress` из ответа
- Замена 404/410 на другой статус для expired/missing кодов

---

### 3.3 Council Initiatives

#### `POST /api/council/initiatives`

**Auth:** `CHAT_ALLOWED_ROLES` (participant, counselor, educator, shift_leader, camp_director, developer)  
**Body:**
```json
{
  "title":   "string (required, max 200 chars)",
  "camp_id": "string (optional)"
}
```

**Response 201:**
```json
{
  "id":                "string (mandatory) — формат CI-<hex>",
  "title":             "string (mandatory)",
  "status":            "'idea' (mandatory — всегда 'idea' при создании)",
  "createdAt":         "string ISO8601 (mandatory)",
  "created_at":        "string ISO8601 (mandatory — legacy alias)",
  "campId":            "string | '' (optional)",
  "createdBy":         "string deviceId (optional)",
  "createdByNickname": "string (optional)"
}
```

**Mandatory fields:** `id`, `title`, `status`, `createdAt`

**Breaking changes:**
- Удаление `id` или изменение его формата
- Изменение `status` при создании с `"idea"` на что-то другое

---

#### `GET /api/council/initiatives`

**Auth:** `CHAT_ALLOWED_ROLES`  
**Query params:** `camp_id` (optional)  
**Response 200:**
```json
{
  "initiatives": [
    {
      "id":         "string (mandatory)",
      "title":      "string (mandatory)",
      "status":     "string (mandatory)",
      "createdAt":  "string ISO8601 (mandatory)"
    }
  ]
}
```

**Mandatory fields:** `initiatives` (array), каждый объект: `id`, `title`, `status`, `createdAt`  
**Limit:** последние 100, descending по `createdAt`

**Breaking changes:**
- Переименование `initiatives`
- Удаление `id`, `title`, `status`, `createdAt` из элементов

---

### 3.4 Image Generation

#### `POST /api/images/generate`

**Auth:** Bearer JWT — роли `participant | counselor | educator | shift_leader | camp_director | developer` (same as teams auth, `traveler` excluded)

**Body:**
```json
{
  "mode":         "string (required) — 'generate' | 'process'",
  "context":      "string (required) — e.g. 'passport', 'gerb', 'squad_corner', 'badge_skins', ...",
  "prompt":       "string (optional, max 300 chars after sanitization)",
  "imageBase64":  "string (required if mode='process')",
  "teamId":       "string (optional)",
  "style":        "string (optional) — 'cosmos' | 'cyberpunk' | 'realism' (default: 'cosmos')",
  "teamName":     "string (optional, hint for gerb context)",
  "captainName":  "string (optional, hint for gerb context)"
}
```

**Response 200:**
```json
{
  "imageBase64": "string (mandatory) — base64-encoded image"
}
```

**Response 4xx/5xx:**
```json
{ "error": "string (mandatory)" }
```

**HTTP-статусы:**

| Код | Условие |
|-----|---------|
| 200 | Успех — изображение сгенерировано / обработано |
| 400 | Отсутствует обязательный параметр (`mode`, `context`) или `imageBase64` для process mode |
| 401 | Нет JWT или токен невалиден |
| 403 | Роль не разрешена (`traveler`) |
| 429 | Превышен per-device rate limit (10/мин) ИЛИ per-camp daily quota (200/день) |
| 501 | process mode не поддерживается текущим провайдером |
| 503 | OpenAI API не настроен или недоступен |

**Mandatory request fields:** `mode`, `context`  
**Mandatory response fields (200):** `imageBase64`

**Rate limits:**
- Per-device: `IMAGES_GENERATE_RATE_LIMIT` (default 10) запросов за 60 сек, ключ = `deviceId` из JWT или IP
- Per-camp daily: `IMAGES_CAMP_DAILY_LIMIT` (default 200) генераций в сутки (UTC), ключ = `campId` из JWT, fallback = `deviceId`
- При превышении per-camp: `{"error": "Лимит генерации изображений для смены исчерпан", "retryAfter": "tomorrow"}`

**Safety (prompt sanitization, M5-R2-C):**
- HTML/script-теги удаляются из `prompt` до передачи в OpenAI
- При обнаружении injection-паттернов (`ignore previous`, `forget instructions`, `jailbreak`, `disregard`, `override prompt`) — `prompt` отбрасывается полностью, используется только базовый контекстный промпт
- `prompt` обрезается до `IMAGES_USER_PROMPT_MAX_LEN` символов (default 300) — non-breaking, т.к. лишние символы молча обрезаются
- Все события логируются: `[IMAGES_SAFETY]`, `[IMAGES_SANITIZE]`, `[IMAGES_QUOTA]`

**Breaking changes:**
- Изменение набора допустимых значений `mode` (`generate | process`)
- Удаление `imageBase64` из 200-ответа
- Изменение HTTP-статуса 200 на успехе
- Добавление обязательного поля в body без default

**Non-breaking changes:**
- Добавление нового опционального поля в body (с разумным default)
- Добавление нового поля в 200-ответ
- Расширение `IMAGES_CAMP_DAILY_LIMIT` или `IMAGES_GENERATE_RATE_LIMIT`
- Расширение `IMAGES_USER_PROMPT_MAX_LEN`
- Добавление новых значений `context`

### 3.5 Chat Endpoint

#### `POST /api/chat`

**Auth:** `participant | counselor | shift_leader | organizer | developer` (Bearer JWT)  
**Body:**
```json
{
  "message":  "string (required, max length: CHAT_MAX_MESSAGE_LEN chars, default 2000)",
  "user_id":  "string (required)",
  "context":  {
    "current_view":            "string (optional)",
    "current_category":        "object (optional)",
    "current_badge":           "object (optional)",
    "current_level":           "string (optional)",
    "current_level_badge_title": "string (optional)"
  }
}
```

**Context fields enriched server-side (M5-R3-C, не передаются клиентом):**
| Поле | Источник | Описание |
|------|----------|----------|
| `nickname` | JWT payload `nickname` | Никнейм участника |
| `squad_name` | membership lookup → squads doc | Название отряда |
| `shift_name` | membership lookup → shifts doc | Название смены |
| `pending_badge_count` | badge_requests lookup (M5-R4-C) | Количество pending заявок участника |
| `pending_badge_titles` | badge_requests lookup (M5-R4-C) | Названия значков из pending заявок (max 3) |

Клиент **не обязан** передавать эти поля — они обогащаются автоматически на сервере из JWT и данных membership. Lookup выполняется только при наличии `deviceId` и memberships; любая ошибка lookup не блокирует ответ (try/except).

**Response (200):**
```json
{
  "response":        "string (mandatory)",
  "suggestions":     ["string"] ,
  "context_updates": { ... },
  "metadata":        { ... }
}
```

**HTTP Statuses:**
| Статус | Условие |
|--------|---------|
| `200` | Успешный ответ бота |
| `400` | Сообщение превышает `CHAT_MAX_MESSAGE_LEN` символов |
| `401` | JWT отсутствует, невалиден или истёк |
| `403` | Роль не в `CHAT_ALLOWED_ROLES` |
| `429` | Превышен per-minute или daily лимит |
| `500` | Внутренняя ошибка (не должна утекать в прод) |
| `503` | chatbot не инициализирован (OpenAI key absent) |

**Rate Limits:**
- Per-minute: `CHAT_MSG_RATE_LIMIT_PER_MIN` (default 15), per `deviceId`
- Daily: `CHAT_DAILY_LIMIT` (default env-configured), per `deviceId`

**Breaking changes:**
- Удаление поля `response` из 200-ответа
- Изменение HTTP-статуса 200 на успехе
- Добавление обязательного поля в body без default

**Non-breaking changes:**
- Добавление новых опциональных полей в context body
- Добавление новых полей в 200-ответ (`context_updates`, `metadata`)
- Расширение `CHAT_ALLOWED_ROLES`

---

### 3.6 Telegram Agent-Post Endpoint

#### `POST /api/telegram/agent-post`

**Auth:** `developer | shift_leader` (Bearer JWT)  
**Body (required fields):** `agent`, `text`, `root_message_id`  
**Body (optional):** `chat_id` (fallback to `TELEGRAM_CHANNEL_ID` env var)

```json
{
  "agent":           "neuro_stepa | cat_bro | dev_bro_1",
  "text":            "string (required)",
  "root_message_id": 123,
  "chat_id":         -100123456789
}
```

**Responses:**

| Status | Meaning |
|--------|---------|
| 200 | `{ "ok": true, "message_id": N }` — message sent |
| 400 | Missing `agent`, `text`, or `root_message_id` |
| 401 | No/invalid JWT |
| 403 | Insufficient role |
| 404 | Unknown `agent` value |
| 409 | Duplicate message blocked (dedup within 60 s) |
| 502 | Telegram API returned error |
| 500 | Internal server error |

**Agent→Token mapping** (read from env at startup):

| Agent key | Env variable |
|-----------|-------------|
| `neuro_stepa` | `NEURO_STEPA_BOT_TOKEN` |
| `cat_bro` | `CAT_BRO_BOT_TOKEN` |
| `dev_bro_1` | `DEV_BRO_1_BOT_TOKEN` |

**Breaking changes:**
- Renaming the `agent` field to a different name
- Removing this endpoint
- Changing auth roles to something more restrictive

**Non-breaking changes:**
- Adding new agent names (extending `AGENT_BOT_TOKENS`)
- Adding new optional body fields
- Adding new response fields to the 200 response

**Known gap:** `blind-post` without `root_message_id` is explicitly rejected (400) per policy.

---

## 4. Breaking vs Non-Breaking — Классификация

| Тип изменения | Breaking? | Комментарий |
|---------------|-----------|-------------|
| Добавить новое поле в response | **Нет** | Additive-only, фронт игнорирует |
| Удалить обязательное поле | **Да** | Фронт сломается |
| Переименовать обязательное поле | **Да** | Фронт сломается |
| Изменить тип обязательного поля (`string` → `int`) | **Да** | Фронт сломается |
| Добавить новый опциональный параметр в body | **Нет** | С разумным default |
| Добавить новый обязательный параметр в body | **Да** | Существующие клиенты не передают |
| Изменить HTTP-статус успешного ответа | **Да** | Клиент проверяет статус |
| Добавить новый статус ошибки (4xx) | **Условно** | Только если не меняет существующий путь |
| Изменить набор допустимых значений enum | **Да** | Нарушает switch-logic |
| Сузить лимиты (max length, rate limits) | **Условно** | Breaking для клиентов на границе |
| Расширить лимиты | **Нет** | Обратно совместимо |
| Изменить сортировку ответа | **Условно** | Если клиент зависит от порядка |
| Убрать опциональное поле | **Условно** | Зависит от наличия null-guard на фронте |

---

## 5. Smoke Verification

Контракты автоматически проверяются скриптом:

```bash
# С AUTH_SECRET — полный прогон (52 checks):
# Windows (cp1251): запускать с -X utf8 для корректного вывода
AUTH_SECRET=<secret> python -X utf8 backend/scripts/smoke_backend_critical.py --base-url http://localhost:4000

# Linux/Mac:
AUTH_SECRET=<secret> python backend/scripts/smoke_backend_critical.py --base-url http://localhost:4000

# Без секрета — только /api/health:
python backend/scripts/smoke_backend_critical.py --base-url http://localhost:4000
```

Скрипт проверяет:

| Flow | Endpoint-группа | Checks |
|------|----------------|--------|
| Health | `/api/health` | 1 |
| A | Badge Requests (request → inbox → approve → mine) | 9 |
| B | Parent Snapshot (create → read by code → invalid 404) | 6 |
| C | Council Initiatives (create → list) | 6 |
| D | Mine privacy + contract (M5-R2-B) | 4 |
| E | Image Generation (happy path, truncation, missing fields) | 5 |
| F | Teams lifecycle (create → get → join → mine → leave x2) (M5-R3-A) | 8 |
| G | Chat endpoint: valid JWT → 200+response, invalid token → 401, msg too long → 400, not 500 guard (M5-R3-C, M5-R4-C, M6-CHAT-CONTEXT-C) | 6 |
| I | Telegram agent-post: no auth → 401, unknown agent → 404, missing root_message_id → 400 (M5-R5-C) | 3 |
| **Total** | | **52** |

**Flow D** (M5-R2-B, `/api/badges/requests/mine`):
- D-1: GET /mine → 200, requests is list
- D-2: approved request found in list (reuses req_id from Flow A)
- D-3: status=approved
- D-4: `requestedBy.deviceId` отсутствует в ответе (privacy check)

**Flow E** (M5-R2-C, `/api/images/generate`):
- E-1: `mode=generate, context=passport` → 200 (`imageBase64` present) или 503 (нет ключа OpenAI) — оба допустимы
- E-2: `prompt` длиной > 300 символов → не 500 (200 или 503, sanitization отработала)
- E-3: без `mode` → 400
- E-4: без `context` → 400

**Flow F** (M5-R3-A, `/api/teams`):
- F-1: POST /api/teams (leader) → 201, id present
- F-2: GET /api/teams/<id> → 200, name matches
- F-3: POST /api/teams/<id>/join (joiner) → 200, joiner in members
- F-4: GET /api/teams/mine (leader) → 200, team id matches
- F-5: POST /api/teams/<id>/leave (joiner) → 200, status=success
- F-6: POST /api/teams/<id>/leave (leader, last member) → 200, status=success (team deleted)

**Flow G** (M5-R3-C + M5-R4-C + M6-CHAT-CONTEXT-C, `/api/chat`):
- G-auth: `auth/verify-code (participant)` → 200, accessToken present
- G-1: POST /api/chat с valid JWT → 200, `response` field present
- G-2: POST /api/chat с invalid Bearer token → 401
- G-3: POST /api/chat с message длиннее 2000 символов → 400 (`CHAT_MAX_MESSAGE_LEN`)
- G-4: POST /api/chat с valid JWT, простое сообщение → не 500 (server error guard)

При изменении любого контракта из §3 — обновить скрипт, запустить, убедиться в 0 failures.

---

## 6. Ownership и обновление

| Действие | Кто обновляет |
|----------|---------------|
| Изменение endpoint в `backend/app.py` | Разработчик + Agent A review |
| Добавление поля — обновить §3 | Agent A |
| Breaking change — согласовать с фронтом | NeuroStepa → Agent A + Agent B |
| После обновления — перезапустить smoke | Agent A |

*Последнее обновление: 2026-02-28 (M5-R4-A, Agent A — Supabase GAP fix: requestedBy nested dict, load_inbox() SQL filtering. Prior: M5-R4-C, Agent C — /api/chat pending badges context, CHAT_MAX_MESSAGE_LEN 400, 44 checks)*

---

## 5.1 Supabase Provider Coverage (M5-R4-A audit)

**Audit result: GAP FOUND AND FIXED (2026-02-28)**

`SupabaseBadgeRequestsStore._row_to_badge_request()` previously returned flat keys (`requestedByDeviceId`, etc.) while `app.py` expected nested `requestedBy: {deviceId, nickname}`. In prod (USE_SUPABASE=true) this caused `requested_by_device_id` to be written as empty string, `/mine` filtering always returning empty, and approve logic failing.

Fixed: nested dicts returned by `_row_to_badge_request()`, flat-key fallback in `_badge_request_to_row()`.

Added: `SupabaseBadgeRequestsStore.load_inbox()` — SQL-level filtering by camp_id, squad_id, status, TTL. `badge_request_inbox()` uses it via `hasattr()`.

Smoke 39/39 PASSED (baseline unchanged).
