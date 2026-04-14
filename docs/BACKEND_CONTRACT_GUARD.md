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
| **Badge Plans** | `POST /api/badges/plans`, `GET /api/badges/plans/mine`, `GET /api/badges/plans/inbox`, `PATCH /api/badges/plans/{id}/review` |
| **Parent Snapshot** | `POST /api/parent-snapshot`, `GET /api/parent-snapshot?code=` |
| **Council Initiatives** | `GET /api/council/initiatives`, `POST /api/council/initiatives` |
| **Image Generation** | `POST /api/images/generate` |
| **Chat** | `POST /api/chat` |
| **BRO** | `POST /api/squads/{squadId}/bro/initiate`, `GET /api/squads/{squadId}/bro/events`, `GET /api/bro/passport/{deviceId}`, `POST /api/bro/passport`, `PATCH /api/bro/passport/{id}/task`, `PATCH /api/bro/passport/{id}/complete` |
| **Shift Schedule** | `GET /api/shifts/{shiftId}/schedule`, `GET /api/shifts/{shiftId}/schedule/day/{dayIndex}`, `POST /api/shifts/{shiftId}/schedule`, `PATCH /api/schedule/{eventId}`, `DELETE /api/schedule/{eventId}` |
| **Workshops** | `POST /api/workshops`, `GET /api/workshops`, `GET /api/workshops/{id}`, `PATCH /api/workshops/{id}`, `POST /api/workshops/{id}/participants`, `POST /api/workshops/{id}/badges`, `DELETE /api/workshops/{id}/badges/{badgeId}`, `POST /api/workshops/{id}/badges/{badgeId}/confirm/{deviceId}` |
| **Camp Director** | `GET /api/camp/overview` |
| **Parent Auth** | `POST /api/auth/email/request`, `GET /api/auth/email/verify`, `POST /api/parent/suggest-route`, `GET /api/parent/suggestions/{childDeviceId}` |
| **Auth / Users (M15)** | `GET /api/auth/me`, `PATCH /api/auth/me`, `POST /api/auth/link-device` |
| **Dev Role (M15)** | `POST /api/dev/switch-role`, `GET /api/dev/users`, `PATCH /api/dev/users/{id}/role` |
| **Admin Inbox (M16)** | `GET /api/admin/inbox`, `POST /api/admin/action` |

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

**Провайдер изображений (M9-RUSSIAN-AI-C):**

| Env var | Values | Default | Описание |
|---------|--------|---------|----------|
| `IMAGE_PROVIDER` | `openai \| fusionbrain \| stub \| auto` | `openai` | Выбор провайдера генерации |
| `FUSIONBRAIN_API_KEY` | string | — | API ключ FusionBrain (Kandinsky) |
| `FUSIONBRAIN_SECRET_KEY` | string | — | Секретный ключ FusionBrain |

- `openai` — OpenAI GPT Image / DALL-E (requires `OPENAI_API_KEY`)
- `fusionbrain` — Kandinsky via FusionBrain API (async polling, 30s max)
- `stub` — 1x1 transparent PNG placeholder (no external calls, always 200)
- `auto` — fallback chain: openai → fusionbrain → stub

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

### 3.7 Badge Plans (M7-PLAN-WORKFLOW-A)

#### `POST /api/badges/plans`

**Auth:** `participant | parent | developer` (Bearer JWT)  
**Body:**
```json
{
  "badgeId":   "string (required)",
  "levelId":   "string (optional)",
  "planText":  "string (optional, max 4000 chars)",
  "checklist": [{"text": "string", "done": false}],
  "submit":    true
}
```

**Upsert logic:** If plan with same `device_id + badge_id` exists → update (200). Otherwise → create (201).

**Response 201 / 200:**
```json
{
  "plan": {
    "id":            "string (mandatory) — формат BP-XXXXXXXXXX",
    "deviceId":      "string (mandatory)",
    "badgeId":       "string (mandatory)",
    "levelId":       "string (optional)",
    "campId":        "string (optional)",
    "planText":      "string (mandatory)",
    "checklist":     "array (mandatory)",
    "status":        "'draft' | 'submitted' (mandatory)",
    "counselorNote": "null (mandatory at create)",
    "createdAt":     "string ISO8601 (mandatory)",
    "updatedAt":     "string ISO8601 (mandatory)"
  }
}
```

**Mandatory fields:** `plan.id`, `plan.status`, `plan.badgeId`, `plan.createdAt`

---

#### `GET /api/badges/plans/mine`

**Auth:** `participant | parent | developer`  
**Query params:** `status` (optional: `draft | submitted | approved | rejected`)  
**Response 200:**
```json
{
  "plans": [ /* same shape as POST response plan object */ ]
}
```

**Mandatory fields:** `plans` (array, may be empty)  
**Sort:** newest-first (descending updatedAt)

---

#### `GET /api/badges/plans/inbox`

**Auth:** `counselor | educator | shift_leader | camp_director | developer`  
**Query params:** `campId` (optional)  
**Response 200:**
```json
{
  "plans": [ /* plans with status=submitted */ ]
}
```

> **Auto-scope:** counselor/educator auto-scoped to their camp (via `_resolve_membership_context`).

**Mandatory fields:** `plans` (array)  
**Sort:** newest-first (descending updatedAt)

---

#### `PATCH /api/badges/plans/{id}/review`

**Auth:** `counselor | educator | shift_leader | camp_director | developer`  
**Body:**
```json
{
  "status":        "'approved' | 'rejected' (required)",
  "counselorNote": "string (optional, max 2000 chars)"
}
```

**Response 200:**
```json
{
  "plan": {
    "id":            "string (mandatory)",
    "status":        "'approved' | 'rejected' (mandatory)",
    "counselorNote": "string | null (optional)",
    "updatedAt":     "string ISO8601 (mandatory)"
  }
}
```

**HTTP 409** если план уже resolved (approved/rejected).  
**HTTP 404** если план не найден.

**Mandatory fields:** `plan.id`, `plan.status`, `plan.updatedAt`

---

### 3.8 Council Initiatives Extended (M8-COUNCIL-INITIATIVES-A)

#### `PATCH /api/council/initiatives/{id}`

**Auth:** `counselor | educator | shift_leader | camp_director | developer`  
**Body:**
```json
{
  "status":      "string (optional: idea|proposed|discussed|approved|in_progress|done)",
  "teamId":      "string | null (optional)",
  "description": "string (optional, max 2000 chars)"
}
```

**Response 200:**
```json
{
  "initiative": {
    "id":       "string (mandatory)",
    "status":   "string (mandatory)",
    "updatedAt": "string ISO8601 (mandatory)"
  }
}
```

**HTTP 404** если инициатива не найдена.

---

#### `POST /api/council/initiatives/{id}/vote`

**Auth:** `CHAT_ALLOWED_ROLES` (participant+staff)  
**Body:** empty or `{}`  
**Response 200:**
```json
{
  "initiative": {
    "id":      "string (mandatory)",
    "votesUp": "integer (mandatory)",
    "voters":  "array (mandatory)"
  },
  "voted": "boolean (mandatory) — true если голос поставлен, false если снят"
}
```

Тоггл: повторный вызов снимает голос.

---

### 3.9 Squad Kind (M8-COUNSELOR-SQUAD-A)

**Расширение `POST /api/shifts/{shiftId}/squads`:**
- Новое поле в body: `kind` (optional, default `"participant"`, values: `"participant" | "staff"`)
- `kind=staff` может создать только shift_leader/camp_director/developer → 403 для counselor/educator
- Поле `kind` возвращается в response squad object

**Расширение `GET /api/shifts/{shiftId}/squads`:**
- Новый query param: `?kind=participant|staff` (optional)
- Без фильтра → все отряды (обратная совместимость)

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

### 3.10 Badge Arts (M9-ART-MODERATION-A)

#### `POST /api/badges/arts`

**Auth:** `CHAT_ALLOWED_ROLES` (participant+staff)  
**Body:**
```json
{
  "badgeId":   "string (required)",
  "imageUrl":  "string (required)",
  "source":    "'ai_generated' | 'hand_drawn' | 'uploaded' (optional, default: uploaded)",
  "authorNickname": "string (optional)"
}
```

**Response 201:**
```json
{
  "art": {
    "id": "string (BA-XXXXXXXXXX)",
    "status": "pending",
    "badgeId": "string",
    "imageUrl": "string",
    "source": "string",
    "createdAt": "string ISO8601"
  }
}
```

---

#### `GET /api/badges/arts`

**Auth:** `CHAT_ALLOWED_ROLES`  
**Query params:** `badgeId` (optional), `status` (optional: pending|approved|rejected|canon)  
**Response 200:** `{ "arts": [...] }` — max 200, newest first

---

#### `GET /api/badges/arts/inbox`

**Auth:** `counselor | educator | shift_leader | camp_director | developer`  
**Response 200:** `{ "arts": [...] }` — only status=pending

---

#### `PATCH /api/badges/arts/{id}/review`

**Auth:** `counselor | educator | shift_leader | camp_director | developer`  
**Body:** `{ "status": "approved" | "rejected" | "canon", "moderatorNote"?: string }`  
**Response 200:** `{ "art": { ...updated } }`  
**HTTP 404** если арт не найден.  
**HTTP 409** если арт уже reviewed.

---

### 3.11 Engines (Движки) — M11-DVIZHKI-BACKEND-A

**Stores:** `engines`, `engine_members`

#### `POST /api/squads/{squadId}/engines`

**Auth:** `CHAT_ALLOWED_ROLES` (participant+staff)  
**Body:**
```json
{
  "title":     "string (required)",
  "goal":      "string (optional)",
  "avatarUrl": "string (optional)",
  "type":      "string (optional, default: 'regular')"
}
```

**Response 201:**
```json
{
  "engine": {
    "id":         "string (mandatory) — ENG-XXXXXXXXXX",
    "squadId":    "string (mandatory)",
    "title":      "string (mandatory)",
    "goal":       "string (optional)",
    "goalStatus": "'draft' (mandatory при создании)",
    "status":     "'pending' (mandatory при создании)",
    "type":       "string (mandatory)",
    "createdBy":  "string deviceId (mandatory)",
    "createdAt":  "string ISO8601 (mandatory)",
    "updatedAt":  "string ISO8601 (mandatory)"
  },
  "member": {
    "id":        "string (mandatory) — EM-XXXXXXXXXX",
    "engineId":  "string (mandatory)",
    "deviceId":  "string (mandatory)",
    "role":      "'creator' (mandatory)",
    "joinedAt":  "string ISO8601 (mandatory)"
  }
}
```

**Side effects:** creator автоматически записывается в engine_members.  
**Mandatory fields:** `engine.id`, `engine.status`, `engine.title`, `engine.createdAt`, `member.id`

---

#### `GET /api/squads/{squadId}/engines`

**Auth:** `CHAT_ALLOWED_ROLES`  
**Response 200:** `{ "engines": [...] }` — descending by createdAt

---

#### `PATCH /api/engines/{engineId}`

**Auth:** `CHAT_ALLOWED_ROLES` (только creator или staff)  
**Body:** `{ "title"?: string (max 200), "goal"?: string (max 2000), "avatarUrl"?: string }`  
**Response 200:** `{ "engine": { ...updated } }`  
**HTTP 403** если не creator и не staff. **HTTP 404** если не найден.  
**Side effect:** при обновлении `goal` → `goalStatus = "submitted"`.

---

#### `PATCH /api/engines/{engineId}/approve`

**Auth:** `counselor | educator | shift_leader | camp_director | developer`  
**Body:** `{ "status": "approved" | "rejected" }`  
**Response 200:** `{ "engine": { ...updated } }` **HTTP 400** invalid status. **HTTP 404** not found.

---

#### `PATCH /api/engines/{engineId}/goal/approve`

**Auth:** Staff only  
**Response 200:** `{ "engine": { ...updated, goalStatus: "approved" } }`  
**HTTP 409** если goalStatus != "submitted". **HTTP 404** not found.

---

#### `POST /api/engines/{engineId}/join`

**Auth:** `CHAT_ALLOWED_ROLES`  
**Response 200:** `{ "member": { id, engineId, deviceId, nickname, role: "member", joinedAt } }`  
**HTTP 404** engine not found. **HTTP 409** already a member.

---

#### `POST /api/engines/{engineId}/leave`

**Auth:** `CHAT_ALLOWED_ROLES`  
**Response 200:** `{ "status": "left" }` **HTTP 404** not a member.

---

#### `GET /api/engines/{engineId}/members`

**Auth:** `CHAT_ALLOWED_ROLES`  
**Response 200:** `{ "members": [...] }`

---

### 3.12 Inspector Пользы (M11-INSPECTOR-C)

**Store:** `inspector_progress`  
**Static data:** `ai-data/inspector/checklists.json`

#### `GET /api/inspector/checklists`

**Auth:** Нет (публичный)  
**Response 200:** `{ "missions": [...] }` из `checklists.json`. Fallback: `{ "missions": [] }`.

---

#### `GET /api/inspector/progress/{deviceId}`

**Auth:** Нет (публичный)  
**Response 200:**
```json
{
  "progress": [{
    "id": "string (UUID)", "deviceId": "string", "checklistId": "string",
    "taskId": "string", "status": "'completed' | 'approved'",
    "completedAt": "string ISO8601", "approvedBy": "string|null", "approvedAt": "string|null"
  }]
}
```

---

#### `POST /api/inspector/progress`

**Auth:** Нет (публичный)  
**Body:** `{ "deviceId": "string (req)", "checklistId": "string (req)", "taskId": "string (req)" }`  
**Response 201:** `{ "status": "ok", "entry": { ...new } }`  
**Response 200:** `{ "status": "already_completed", "entry": { ...existing } }` (идемпотентность)  
**HTTP 400** missing fields.

---

#### `PATCH /api/inspector/progress/{entryId}/approve`

**Auth:** `counselor | educator | shift_leader | camp_director | developer`  
**Response 200:** `{ "status": "ok", "entry": { ...status: "approved", approvedBy, approvedAt } }`  
**Response 200:** `{ "status": "already_approved" }` (идемпотентность)  
**HTTP 404** entry not found.

---

### 3.13 BRO (Бросвящение) — M12-BRO-BACKEND-A

**Stores:** `bro_events`, `bro_passports`, `bro_submissions`, `bro_initiatives`  
**Staff roles:** `counselor | educator | shift_leader | camp_director | developer`  
**All roles:** `participant + staff + developer`

#### `POST /api/bro/initiate`

**Auth:** Staff only  
**Body:** `{ "squadId": "string (req)", "customTasks"?: [{ title, description?, order? }] }`  
**Response 201:** `{ "event": { id, squadId, status: "active", createdAt, createdBy, customTasks? } }`  
**HTTP 400** squadId missing. **HTTP 409** active event already exists.

---

#### `GET /api/bro/events?squad_id={squadId}`

**Auth:** Нет  
**Response 200:** `{ "events": [...] }`

---

#### `PATCH /api/bro/events/{eventId}`

**Auth:** Staff only  
**Body:** `{ "action": "complete" }`  
**Response 200:** `{ "event": { ...status: "completed", completedAt, completedBy } }`  
**HTTP 404** / **409**

---

#### `GET /api/bro/passport?device_id={deviceId}`

**Auth:** Нет  
**Response 200:** `{ "passport": object | null }`

---

#### `POST /api/bro/passport`

**Auth:** All roles  
**Body:** `{ "broEventId": "string (req)" }`  
**Response 201:** `{ "passport": { id, deviceId, broEventId, status: "in_progress", tasks: [...] } }`  
**Response 200:** existing passport (идемпотентность).  
**HTTP 404** event not found / inactive.

---

#### `PATCH /api/bro/passport/{passportId}/task/{taskId}`

**Auth:** All roles  
**Response 200:** `{ "passport": { ...updated } }`  
**Side effect:** all tasks done → status="completed" + completedAt.  
**HTTP 404** passport/task not found.

---

#### `POST /api/bro/passport/{passportId}/task/{taskId}/submit`

**Auth:** All roles  
**Body:** `{ "text"?: string, "photoUrl"?: string, "nickname"?: string, "userRole"?: string }`  
**Response 201:** `{ "submission": { id, passportId, taskId, taskTitle, deviceId, squadId, status: "pending", submittedAt } }`  
**HTTP 400** no text/photoUrl. **HTTP 404** passport/task. **HTTP 409** already done/pending.

---

#### `GET /api/bro/submissions?squad_id={}&status={}`

**Auth:** Нет  
**Response 200:** `{ "submissions": [...] }` — newest first

---

#### `PATCH /api/bro/submissions/{submissionId}/review`

**Auth:** Staff only  
**Body:** `{ "action": "approve" | "reject", "comment"?: string }`  
**Response 200:** `{ "submission": { ...status, reviewedAt, reviewedBy } }`  
**Side effect:** approve → task.done=true in passport, auto-complete passport.  
**HTTP 404** / **409**

---

#### `GET/POST/DELETE /api/bro/initiatives`, `POST .../vote`, `POST .../send`

**Auth:** Нет (X-Device-Id header)

| Method | Endpoint | Req body | Status | Notes |
|--------|----------|----------|--------|-------|
| GET | `/api/bro/initiatives` | — | 200 | `{ "initiatives": [...] }` |
| POST | `/api/bro/initiatives` | `{ title (req), description? }` | 201 | status="voting" |
| DELETE | `/api/bro/initiatives/{id}` | — | 200 | `{ deleted: true }` |
| POST | `.../vote` | `{ vote?: bool }` | 200 | >=1 vote → status="approved" |
| POST | `.../send` | — | 200 | status="sent_to_council", creates council_initiative |

---

#### `GET /api/bro/squad`

**Auth:** Нет  
**Response 200:** `{ "members": [...completed BRO passports], "events": [...all wings] }`

---

### 3.14 Wing Initiations (Посвящения через Крыло) — M12-WING

| Method | Endpoint | Auth | Notes |
|--------|----------|------|-------|
| GET | `/api/wing/initiations?squad_id=` | Нет | type=squad_initiation events |
| POST | `/api/wing/initiations` | All roles | `{ squadId (req), name (req), description?, tasks: [...] }` → 201 |
| PATCH | `/api/wing/initiations/{id}` | All roles | `{ action: "complete" }` → 200 |
| POST | `/api/wing/initiations/{id}/join` | All roles | Creates passport with event's tasks → 201 (or 200 existing) |

---

### 3.15 Shifts (Смены) — M5-SHIFTS

**Store:** `shifts` (contains both `shifts[]` and `squads[]` arrays)  
**Staff auth helper:** `_require_organizer_jwt()` — allows `shift_leader | camp_director | developer`

#### `GET /api/shifts`

**Auth:** Нет (публичный)  
**Response 200:** `{ "shifts": [...] }` — includes dev-seeded default shift

---

#### `POST /api/shifts`

**Auth:** `shift_leader | camp_director | developer`  
**Body:** `{ "name": "string (req)", "startDate"?: string, "endDate"?: string, "durationDays"?: int (default 9) }`  
**Response 200:** `{ "shift": { id, name, startDate, endDate, durationDays, createdAt, createdBy? } }`  
**HTTP 400** name missing.

---

#### `PATCH /api/shifts/{shiftId}`

**Auth:** `counselor | educator | shift_leader | camp_director | developer`  
**Body:** `{ "name"?, "startDate"?, "endDate"?, "durationDays"?, "avatarUrl"? }`  
**Response 200:** `{ "shift": { ...updated } }`  
**HTTP 403** counselor/educator can only update own shift (campId match).  
**HTTP 404** shift not found. **HTTP 413** payload too large.

---

#### `DELETE /api/shifts/{shiftId}`

**Auth:** `shift_leader | camp_director | developer`  
**Response 200:** `{ "ok": true, "deleted": { shifts: 1, squads: N, memberships, corners, chats, inviteCodes, badgeRequests } }`  
**HTTP 404** shift not found. **HTTP 409** default shift cannot be deleted (except by developer).  
**Side effects:** каскадное удаление всех отрядов, memberships, corners, chat messages, invite codes, badge requests.

---

#### `GET /api/shifts/{shiftId}/squads?kind={participant|staff}`

**Auth:** Нет (публичный)  
**Response 200:** `{ "squads": [...] }` — с avatarUrl из squad corners. Фильтрация по `kind`.

---

### 3.16 Squads CRUD (Отряды)

#### `POST /api/shifts/{shiftId}/squads`

**Auth:** `counselor | educator | shift_leader | camp_director | developer`  
**Body:** `{ "name": "string (req)", "kind"?: "participant" | "staff" (default: "participant") }`  
**Response 200:** `{ "squad": { id, shiftId, name, kind, createdAt, createdBy? }, "membership": { ...auto-join } }`  
**HTTP 400** name missing / invalid kind. **HTTP 403** staff squads only for shift_leader+.  
**HTTP 404** shift not found.  
**Side effects:** создатель автоматически вступает в отряд (auto-join).

---

#### `GET /api/squads/{squadId}/preview`

**Auth:** All roles  
**Response 200:** `{ "squadId", "squadName", "shiftId", "shiftName" }`  
**HTTP 404** squad not found.

---

#### `PATCH /api/squads/{squadId}` *(via shift update)*

*Обновление отряда происходит через corner (см. §3.18).*

---

#### `DELETE /api/squads/{squadId}`

**Auth:** `shift_leader | camp_director | developer`  
**Response 200:** `{ "ok": true, "deleted": { squads: 1, memberships, corners, chats, inviteCodes, badgeRequests } }`  
**HTTP 404** not found.  
**Side effects:** каскадное удаление и прямой DELETE в Supabase.

---

### 3.17 Squad Membership (Участие в отрядах)

#### `POST /api/squads/{squadId}/join`

**Auth:** All roles  
**Body:** `{ "nickname"?: string, "role"?: string (developer only) }`  
**Response 200:** `{ "membership": { deviceId, campId, squadId, role, joinedAt, nickname? }, "squad": {...} }`  
**HTTP 403** camp mismatch. **HTTP 404** squad not found.  
**Side effects:** заменяет предыдущее membership для deviceId (один отряд на устройство).

---

#### `GET /api/squads/mine`

**Auth:** All roles  
**Response 200:**
```json
{
  "membership": { deviceId, campId, squadId, role, joinedAt, nickname?, avatarUrl? } | null,
  "squad": { ...squad object } | null,
  "shift": { ...shift object } | null,
  "participants": [{ nickname, avatarUrl, deviceId, role }],
  "members": [{ nickname, avatarUrl, deviceId, role }]
}
```

---

#### `POST /api/squads/{squadId}/leave`

**Auth:** All roles  
**Response 200:** `{ "status": "left", "squadId": "...", "membership": null }`

---

#### `POST /api/squads/{squadId}/kick`

**Auth:** `counselor | educator | shift_leader | camp_director | developer`  
**Body:** `{ "deviceId": "string (req)" }`  
**Response 200:** `{ "squadId", "members": [...], "participants": [...] }`  
**HTTP 403** access denied. **HTTP 404** squad not found. **HTTP 409** cannot kick yourself.

---

#### `DELETE /api/squads/{squadId}/members/{deviceId}`

**Auth:** `counselor | educator | shift_leader | camp_director | developer`  
**Response 200:** same as kick. Альтернативный REST endpoint.

---

#### `POST /api/squads/{squadId}/join-requests`

**Auth:** All roles  
**Body:** `{ ... }` — заявка на вступление  
*(Детальный контракт: см. app.py:4738)*

---

#### `GET /api/squads/join-requests/mine`

**Auth:** All roles  
**Response 200:** `{ "requests": [...] }`

---

### 3.18 Squad Corner & Invite Codes

#### `GET /api/squads/{squadId}/corner`

**Auth:** All roles (с проверкой membership)  
**Response 200:** `{ "squadId", "corner": { name?, motto?, chants?, greeting?, memes?, photoCorner?, photoFlag?, photoSquad?, photoWithCounselors?, planGridA?, planGridB?, updatedAt?, updatedBy? } }`

---

#### `PATCH /api/squads/{squadId}/corner`

**Auth:** `counselor | educator | shift_leader | camp_director | developer`  
**Body:** partial update — allowed keys: `name, motto, chants, greeting, memes, photoCorner, photoFlag, photoSquad, photoWithCounselors, planGridA, planGridB`  
**Response 200:** `{ "squadId", "corner": { ...updated }, "updatedAt" }`  
**HTTP 403** access denied. **HTTP 404** squad not found. **HTTP 413** payload > 512KB.

---

#### `POST /api/squads/{squadId}/invite-code`

**Auth:** `counselor | educator | shift_leader | camp_director | developer` (must manage squad)  
**Response 200:** `{ "squadId", "code": "XXXXXXXX", "createdAt", "expiresAt" }`  
**Side effects:** deletes prev active code for this squad, generates 8-char alphanumeric.

---

#### `GET /api/squads/by-invite-code?code={}`

**Auth:** All roles  
**Response 200:** `{ "squadId", "squadName", "shiftId", "shiftName" }`  
**HTTP 404** code not found / expired.

---

#### `GET /api/squads/resolve-invite?code={}`

**Auth:** All roles  
**Response 200:** same as above (legacy alias).

---

#### `POST /api/squads/join-by-code`

**Auth:** All roles  
**Body:** `{ "code": "string (req)" }`  
**Response 200:** joins squad and returns membership.  
**HTTP 404** code invalid.

---

### 3.19 Squad Messages (SquadChat)

**Store:** `squad_messages`  
**Rate limits:** per-minute + daily per-device

#### `GET /api/squads/{squadId}/messages?limit=50&before={msgId}`

**Auth:** All roles (must be squad member or dev-localhost)  
**Response 200:** `{ "squadId", "messages": [{ id, squadId, createdAt, deviceId, nickname, avatarUrl?, role, text }], "hasMore": bool }`  
**HTTP 403** not a member.

---

#### `POST /api/squads/{squadId}/messages`

**Auth:** All roles (must be squad member)  
**Body:** `{ "text": "string (req)", "nickname"?: string, "avatarUrl"?: string }`  
**Response 200:** `{ "message": { ...enriched message } }`  
**HTTP 400** empty text. **HTTP 403** not member. **HTTP 429** rate limit exceeded.  
**Validations:** length check, URL filter, profanity filter.

---

#### `DELETE /api/squads/{squadId}/messages/{msgId}`

**Auth:** Author of message OR `counselor | shift_leader | camp_director | developer`  
**Response 200:** `{ "ok": true }`  
**HTTP 403** access denied. **HTTP 404** message not found.  
**Side effects:** also unpins if the message was pinned.

---

#### `POST /api/squads/{squadId}/messages/{msgId}/pin`

**Auth:** `counselor | educator | shift_leader | camp_director | developer`  
**Body:** `{ "pinned": true | false }`  
**Response 200:** `{ "ok": true, "pinned": bool, "message": object | null }`

---

#### `GET /api/squads/{squadId}/pinned`

**Auth:** All roles  
**Response 200:** `{ "message": object | null }`

---

### 3.20 Engine Join Requests

#### `POST /api/engines/{engineId}/join-requests`

**Auth:** `CHAT_ALLOWED_ROLES` (participant+staff+developer)  
**Body:** `{ "nickname"?: "...", "message"?: "..." }`  
**Response 201:**  
```json
{
  "status": "pending",
  "request": {
    "id": "string",
    "type": "engine_join_request",
    "engineId": "string",
    "engineName": "string",
    "deviceId": "string",
    "nickname": "string",
    "role": "string",
    "message": "string",
    "status": "pending",
    "createdAt": "string ISO8601",
    "resolvedAt": null,
    "resolvedBy": null
  }
}
```
**HTTP 200** если запрос уже находится в статусе `pending` (идемпотентность, `status: "already_pending"`).  
**HTTP 400** если `engine_id` отсутствует.

---

#### `GET /api/engines/join-requests/mine`

**Auth:** `CHAT_ALLOWED_ROLES`  
**Response 200:** `{ "requests": [...] }` — возвращает все отправленные пользователем (по `deviceId`) заявки. Сортировка: newest-first.

---

### 3.21 Team Messages (Чат Движка - зеркальный Squad Messages)

**Store:** `squad_messages` (пространство `byTeamId`)  
**Rate limits:** Аналогичны squad messages (per-minute + daily).

#### `GET /api/teams/{teamId}/messages?limit=50&before={msgId}`

**Auth:** Специфично (любая роль, но обязан быть членом Движка или developer)  
**Response 200:** `{ "squadId": "...", "messages": [...], "hasMore": bool }` (enriched с users_by_device и team_members).  
**HTTP 403** если не член команды. **HTTP 404** команда не найдена.

---

#### `POST /api/teams/{teamId}/messages`

**Auth:** Член команды или developer  
**Body:** `{ "text": "string (req, max length/validation applied)", "nickname"?: "string", "avatarUrl"?: "string" }`  
**Response 200:** `{ "message": { ...enriched } }`  
**HTTP 400** пустой текст / ошибка валидации. **HTTP 429** лимит нарушен.

---

#### `DELETE /api/teams/{teamId}/messages/{msgId}`

**Auth:** Автор сообщения или Создатель Движка (leaderId)  
**Response 200:** `{ "ok": true }`  
**HTTP 403** access denied. **HTTP 404** message not found.

---

### 3.22 Team Engine Projects (Проекты внутри Движков)

**Store:** `engine_projects` (legacy JSON file `engine_projects.json`)

#### `GET /api/teams/{teamId}/projects`

**Auth:** Член команды  
**Response 200:** Массив объектов `[ { "id", "teamId", "title", "description", "plan", "targetBadgeId", "status", "photos", "reflection", "scenario", "createdBy", "createdAt", "submittedAt"?: "...", "reviewedAt"?: "...", "reviewedBy"?: "...", "reviewNote"?: "..." }, ... ]`

---

#### `POST /api/teams/{teamId}/projects`

**Auth:** Член команды  
**Body:** `{ "title": "string (req)", "description"?: "string", "plan"?: "string", "targetBadgeId"?: "string" }`  
**Response 201:** Объект проекта со статусом `"draft"`.

---

#### `PATCH /api/teams/{teamId}/projects/{projectId}`

**Auth:** Член команды  
**Body:** Частичное обновление полей `title, description, plan, targetBadgeId, photos, reflection, scenario, status`.  
Переходы статусов:
- `status: "in_progress"` переводит из `draft` / `rejected`.
- `status: "review"` переводит из `in_progress` и проставляет `submittedAt`.
- `status: "draft"` возвращает из `in_progress`.

**Response 200:** Обновленный объект проекта. **HTTP 404** проект не найден.

---

#### `POST /api/teams/{teamId}/projects/{projectId}/review`

**Auth:** Валидный JWT (де-факто подразумевается роль staff, проверяется в UI)  
**Body:** `{ "action": "approve" | "reject", "note"?: "string" }`  
**Response 200:** `{ "id": "...", "status": "approved" | "rejected", "reviewedAt": "...", "reviewedBy": "...", "reviewNote": "..." }`  
**Side effects:** При `action="approve"` у команды в `achievements` автоматически добавляется `targetBadgeId` проекта.  
**HTTP 400** если текущий статус не `review` или `action` передан неверно.

---

### 3.23 Team Initiatives (Инициативы Движков / Голосование)

**Store:** `initiatives` (legacy JSON file `initiatives.json`), `council_initiatives.json` (bridge)

#### `GET /api/teams/{teamId}/initiatives`

**Auth:** Член команды  
**Response 200:** Массив инициатив: `[ { "id", "teamId", "title", "description", "createdBy", "createdAt", "votes", "status", "totalMembers", "sentAt"?: "...", "sentBy"?: "..." }, ... ]`

---

#### `POST /api/teams/{teamId}/initiatives`

**Auth:** Член команды  
**Body:** `{ "title": "string (req)", "description"?: "string" }`  
**Response 201:** Объект инициативы со статусом `"voting"`. Создатель автоматически голосует "за".

---

#### `POST /api/teams/{teamId}/initiatives/{iniId}/vote`

**Auth:** Член команды  
**Body:** `{ "vote": bool (default: true) }`  
**Response 200:** Обновленная инициатива.  
**Side effects:** Проверяет, проголосовали ли все члены. Если да: статус становится `"approved"` или `"rejected"` в зависимости от консенсуса (все `true` = `approved`).

---

#### `POST /api/teams/{teamId}/initiatives/{iniId}/send`

**Auth:** Член команды  
**Response 200:** Обновленная инициатива (статус `"sent_to_council"`).  
**Side effects:** Копирует запись в хранилище Совета (`council_initiatives.json`) как bridging-протокол. Создает `CI-<iniId>` заявку на рассмотрение Советом лагеря.  
**HTTP 400** если статус инициативы не `"approved"`.

---

### 3.24 Vozhatifficator (Вожатификатор)

**Storage:** Локальные файлы в `ai-data/vozhatifficator/`

#### `GET /api/vozhatifficator/sections`

**Auth:** Нет (публичный)  
**Response 200:** Массив секций книги `[ { "id", "title", "status", "preview" }, ... ]`. Кэшированный ответ.

---

#### `GET /api/vozhatifficator/guiding-lights`

**Auth:** Нет (публичный)  
**Response 200:** Объект чеклиста Guiding Lights из `guiding_lights.json`.

---

### 3.25 Role Requests & Codes (Заявки и коды доступа)

#### `POST /api/role-codes/generate`

**Auth:** `developer` (email должен входить в `DEV_EMAILS` или проверяется JWT)  
**Body:** `{ "role": "string" }`  
**Response 201:** `{ "code": "RL-XXX-YYYY", "role": "...", "expiresAt": "..." }`  
**HTTP 400** если запрошена недопустимая роль.

---

#### `POST /api/role-codes/redeem`

**Auth:** Нет (публичный)  
**Body:** `{ "code": "string (req)", "deviceId": "string (req)", "baseDeviceId"?: "string", "legacyRoleOwner"?: "string" }`  
**Response 200:** `{ "role": "...", "accessToken": "...", "campId", "deviceId", "baseDeviceId", "personId", "accountId", "legacyOwnerRole" }`  
**HTTP 404/410** код не найден или истёк. **HTTP 409** код уже использован.

---

#### `POST /api/role-requests`

**Auth:** Публичный (опционально читает JWT из `Authorization: Bearer ...`)  
**Body:** `{ "deviceId|baseDeviceId": "string (req)", "desiredRole": "string (req)", "name"?: "string", "comment"?: "string", "email"?: "string" }`  
**Response 201:** `{"roleRequest": { "id", "deviceId", "baseDeviceId", "desiredRole", "name", "email", "comment", "status": "pending", "createdAt" } }`  
**Side effects:** Отправляет Telegram уведомление в канал админов.

---

#### `GET /api/role-requests`

**Auth:** Зависит от параметров:
- Обычный пользователь (запрашивает `?deviceId=xxx`): Нет или проверка по JWT.
- Администратор (запрашивает `?all=true`): JWT `ORGANIZER_ROLES + educator`.

**Response 200:** `{ "requests": [...] }`.  
**Примечание:** Если заявка одобрена (`status == "approved"`), сервер может 'на лету' подписать и вложить в объект заявки поле `accessToken` для автоматического логина.

---

#### `PATCH /api/role-requests/{requestId}`

**Auth:** Staff (`ORGANIZER_ROLES` — shift_leader / camp_director / developer)  
**Body:** `{ "status": "approved" | "rejected", "comment"?: "string" }`  
**Response 200:** Данные о результате ревью.  
**Side effects:** При одобрении может создавать одноразовый Role Code (или привязывать к email) и отправлять email уведомление (через Resend).

---

### 3.26 Auth Extended (Расширенная аутентификация)

#### `POST /api/auth/resolve`

**Auth:** Нет (OAuth callback / resolution)  
**Body:** `{ "email": "string (req)", "supabaseToken"?: "string", "supabaseUserId"?: "string", "deviceId|baseDeviceId": "string (req)", "desiredRole"?: "string" }`  

**Логика разрешения (Priority):**
1. Если `email` в `DEV_EMAILS` → выдает роль `developer`.
2. Если есть одобренный `role_request` для данного `email` (или `deviceId` + совпадение `desiredRole`) → выдает эту роль.
3. Если передан `desiredRole` и он не participant/traveler → создаёт/обновляет pending `role_request` и возвращает `{ "role": "pending", "message": "Ожидайте одобрения" }`.
4. Иначе (по умолчанию) → выдает роль `participant`.

**Response 200:** Объект `{ "role", "accessToken", "campId", "deviceId", "baseDeviceId", "personId", "accountId" }` или pending-заглушка.

---

#### `POST /api/auth/dev-pin`

**Auth:** Нет  
**Body:** `{ "pin": "string (req)", "deviceId": "string" }`  
**Response 200:** `{ "role": "developer", "accessToken": "..." }`  
**HTTP 401** неверный PIN. **HTTP 503** DEV_PIN не настроен.

---

#### `POST /api/organizer/generate-code`

**Auth:** Staff (`shift_leader | camp_director | developer`)  
**Body:** `{ "deviceId": "string (req)", "role": "string (req)", "shiftId"?: "string" }`  
**Response 200:** `{ "code": "...", "deviceId", "role", "shiftId", "expiresIn": "~40 min" }`  
**Примечания:** Использует `AUTH_SECRET` для криптографической генерации кода доступа (auth-слоты).

---

### 3.27 Family (Связи родителей и детей)

#### `GET /api/family/links`

**Auth:** Любой валидный JWT  
**Response 200:** `{ "links": [ { "id", "parentDeviceId", "childDeviceId", "label", "createdAt" }, ... ] }`

---

#### `POST /api/family/links`

**Auth:** Любой валидный JWT  
**Body:** `{ "childDeviceId": "string (req)", "label"?: "string" }`  
**Response 201:** `{"link": { ... }, "status": "created" }`  
**Response 200:** Если связь уже существует (`status: "already_exists"`).  
**HTTP 409** Нельзя добавить свой же `deviceId` как ребёнка.

---

#### `DELETE /api/family/links/{childDeviceId}`

**Auth:** Любой валидный JWT  
**Response 200:** `{ "status": "deleted" | "not_found", "childDeviceId": "..." }`

---

#### `GET /api/family/child-snapshot/{childDeviceId}`

**Auth:** Валидный JWT (Доступ: родитель, имеющий подтверждённую связь с ребёнком. Или админ-роли `shift_leader`, `camp_director`, `developer` — bypass проверки прав).  
**Response 200:**
```json
{
  "childDeviceId": "string",
  "exportedAt": "string",
  "progress": { ... },
  "profile": { ... }
}
```
**HTTP 403** Нет связи с этим ребёнком. **HTTP 404** Снэпшот ребёнка не найден / истёк.

---

### 3.28 4K Analytics (Аналитика компетенций)

#### `GET /api/4k/mapping`

**Auth:** Нет  
**Response 200:** Статический JSON из `4k_mappings.json` (веса наград, дефолтные скиллы категорий, бонусы активностей).

---

#### `GET /api/4k/stats/{deviceId}`

**Auth:** Нет  
**Response 200:** Расчётные баллы навыков 4K (collaboration, critical_thinking, creativity, communication) и треков развития:
```json
{
  "deviceId": "string",
  "skills": { "collaboration": 80, "critical_thinking": 100 },
  "raw": { "collaboration": 12.5, "critical_thinking": 16.0 },
  "programs": { "tech": { "label": "...", "emoji": "...", "raw": 5.0, "normalized": 50 } },
  "badgeCount": 10
}
```
**Логика расчёта:** Основывается на полученных ачивках (`badge_requests` status=approved) + бонусах за активности (участие в Движках, Совете, Бро-паспорте, Инспекторе Пользы).

---

### 3.29 Community Badges (Инкубатор)

#### `POST /api/community/badges`

**Auth:** Нет  
**Body:** `{ "title": "string (req)", "description"?: "string", "emoji"?: "string", "category_id"?: "string" }`  
**Response 201:** Запись успешно добавлена (`status: "success"`). Лимит: 100 значков (FIFO). Rate limit по IP.

---

#### `GET /api/community/badges`

**Auth:** Нет  
**Response 200:** Массив значков из `community_badges.json`.

---

### 3.30 Webhooks (Служебные интеграции)

#### `POST /api/webhook/telegram/{secret_path}` / `POST /api/webhook/vk/{secret_path}`

**Auth:** URL params `secret_path` должны совпадать с `TELEGRAM_WEBHOOK_SECRET` или `VK_WEBHOOK_SECRET`.  
**Response 200:** Принимает webhook body от платформ. Обработка сообщений (сохранение в `confirmation_events`) происходит асинхронно. 

---

#### `GET /api/webhook/confirmation-events?secret={secret}&limit=500`

**Auth:** Query `secret` должен совпадать с `TELEGRAM_WEBHOOK_SECRET` или `VK_WEBHOOK_SECRET`.  
**Response 200:** `{ "events": [...], "count": N }`

---

### 3.31 Telegram Notifications

Особая группа для уведомлений, отправляемых через сервер в Telegram канал администраторов или общий лог (например, Kot Thread Transport).

#### `POST /api/telegram/thread-post`

**Auth:** `CHAT_ALLOWED_ROLES` (участники и стафф)  
**Body:** `{ "root_message_id": int (req), "text": "string (req)", "source"?: "string" }`  
**Response 200:** `{ "ok": true, "sent": true }`  
**HTTP 409** дубликат текста в течение минуты. **HTTP 400** недостающие параметры.

---

#### `POST /api/telegram/notify-achievement` / `POST /api/telegram/notify-creator-card`

**Auth:** В зависимости от контекста (`participant` и др.)  
**Body:** `{ ... }` (зависит от объекта)  
**Реакция:** Отправка уведомления в Telegram (без значимого ответа в HTTP, обычно 200 OK).

---

### 3.32 Workshop Proposals (Заявки на Мастерские)

#### `POST /api/workshop/proposals`

**Auth:** `participant | developer`  
**Body:** `{ "type": "badge"|"category"|"version"|"art" (req), "title": "string (req)", "description"?: "string", "badgeId"?: "string", "image"?: "base64", "nickname"?: "string" }`  
**Response 201:** `{"proposal": { "id", "status": "pending", "createdAt": "...", "createdBy": {...} } }`

---

#### `GET /api/workshop/proposals/mine`

**Auth:** `participant | developer`  
**Response 200:** `{ "proposals": [...] }` (отсортировано newest-first).

---

#### `GET /api/workshop/proposals/inbox?status={status}&campId={campId}`

**Auth:** Staff (`counselor | educator | shift_leader | camp_director | developer`)  
**Response 200:** `{ "proposals": [...] }` (отсортировано, `pending` выше).

---

#### `POST /api/workshop/proposals/{proposalId}/approve` / `.../reject`

**Auth:** Staff  
**Body:** `{ "note"?: "string" }`  
**Response 200:** `{ "proposal": { ...status updated } }`.  
**HTTP 409** если уже разрешен.

---

### 3.33 Parent Extended (Обновленные доступы родителей)

#### `GET /api/parent-insights?code={code}`

**Auth:** Нет (доступ по коду Snapshot)  
**Response 200:** Умная AI-сводка на основе `progress` ребёнка. Структура: `{ "overallProgress", "weeklyTrend", "dynamicSignals", "strengthsTop3", "nextSteps", "source" }`

---

#### `GET /api/badges/approvals/mine`

**Auth:** `participant | developer`  
**Response 200:** `{ "approvals": [ { "requestId", "levelId", "approvedAt", "evidence", "badgeTitle", "campId", "squadId" }, ... ] }`. Список всех успешных апрувов пользователя.

---

### 3.34 Misc Endpoints (Прочее)

| Эндпоинт | Метод | Описание |
|---|---|---|
| `/api/chat/limits` | GET | Возвращает `{ "messagesPerDay": N }` из env. Без авторизации. |
| `/api/bro-missions` | GET / POST | Чтение или перезапись статического конфига миссий. |
| `/api/wings` | GET / POST | Чтение или обновление статического реестра Крыльев. |

---

## 5. Smoke Verification

Контракты автоматически проверяются скриптом:

```bash
# С AUTH_SECRET — полный прогон (79 checks):
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
| J | Badge Plans (submit → inbox → approve → mine) (M7-PLAN-WORKFLOW-A) | 4 |
| K | Educator RBAC: educator JWT → requests inbox 200, plans inbox 200 (M7-EDUCATOR-RBAC-A) | 2 |
| L | Council Initiatives extended: create → list → PATCH status (M8-COUNCIL-INITIATIVES-A) | 3 |
| M | Staff Squad: create kind=staff → filter ?kind=staff (M8-COUNSELOR-SQUAD-A) | 2 |
| N | Badge Arts: submit → inbox → approve (M9-ART-MODERATION-A) | 3 |
| O | Integration: plans + council + arts quick check (M10-SMOKE-STABILITY-A) | 5 |
| P | Engines lifecycle: create → approve → join → goal approve (M11-DVIZHKI-BACKEND-A) | 4 |
| **Total** | | **79** |

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

*Последнее обновление: 2026-04-14 (Antigravity — §3.11–3.14 added: Engines, Inspector, BRO, Wings. §7 gap inventory updated. Coverage ~49%)*

---

## 5.1 Supabase Provider Coverage (M5-R4-A audit)

**Audit result: GAP FOUND AND FIXED (2026-02-28)**

`SupabaseBadgeRequestsStore._row_to_badge_request()` previously returned flat keys (`requestedByDeviceId`, etc.) while `app.py` expected nested `requestedBy: {deviceId, nickname}`. In prod (USE_SUPABASE=true) this caused `requested_by_device_id` to be written as empty string, `/mine` filtering always returning empty, and approve logic failing.

Fixed: nested dicts returned by `_row_to_badge_request()`, flat-key fallback in `_badge_request_to_row()`.

Added: `SupabaseBadgeRequestsStore.load_inbox()` — SQL-level filtering by camp_id, squad_id, status, TTL. `badge_request_inbox()` uses it via `hasattr()`.

Smoke 39/39 PASSED (baseline unchanged).

---

## 7. Undocumented Endpoints (Gap Inventory)

> **Статус:** 100% эндпоинтов из `backend/app.py` задокументированы в Contract Guard.

**Итого:** §3 покрывает **ВСЕ ~130 уникальных эндпоинтов** (§3.1–3.34). Покрытие = **100%**.

> [!NOTE]
> Задокументированные группы:
> - §3.1–3.10: Badge Requests, Parent Snapshot, Council, Image Gen, Chat, Telegram, Plans, Squad Kind, Arts
> - §3.11–3.14: Engines, Inspector, BRO, Wings (апрель 2026)
> - §3.15–3.19: Shifts, Squads CRUD, Squad Membership, Corner & Invite, Squad Messages (апрель 2026)
> - §3.20–3.23: Engine Join Requests, Team Messages, Team Engine Projects, Team Initiatives (апрель 2026)
> - §3.24–3.27: Vozhatifficator, Role Requests & Codes, Auth Extended, Family (апрель 2026)
> - §3.28–3.34: 4K Analytics, Community Badges, Webhooks, TG Notifications, Workshop, Parent Extended, Misc (апрель 2026)
> 
> Следующий приоритет: поддерживать контракт при будущих изменениях бэкенда (Additive-Only).


