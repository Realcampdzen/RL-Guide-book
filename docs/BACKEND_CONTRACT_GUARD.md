# Backend Contract Guard — Critical API Endpoints

**Срез:** 2026-02-27  
**Автор:** Agent A (Data/Backend contracts)  
**Task:** M5-R2-A  
**Источник истины:** `backend/app.py`

Этот документ фиксирует API-контракты для трёх критических endpoint-групп постпилотного контура. Цель — не допустить breaking-регрессий при будущих доработках backend'а.

---

## 1. Scope

Документ покрывает следующие endpoint-группы:

| Группа | Endpoints |
|--------|-----------|
| **Badge Requests** | `POST /api/badges/requests`, `GET /api/badges/requests/mine`, `GET /api/badges/requests/inbox`, `POST /api/badges/requests/{id}/approve`, `POST /api/badges/requests/{id}/reject` |
| **Parent Insights** | `POST /api/parent-snapshot`, `GET /api/parent-snapshot`, `GET /api/parent-insights` |
| **Council Initiatives** | `GET /api/council/initiatives`, `POST /api/council/initiatives` |

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

**Auth:** `participant | developer`  
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
        "deviceId": "string (mandatory)"
      },
      "resolvedAt": "string ISO8601 | null (optional)",
      "resolvedBy": "object | null (optional)"
    }
  ]
}
```

**Mandatory fields:** `requests` (array, may be empty), каждый объект: `id`, `status`, `levelId`, `createdAt`, `requestedBy.deviceId`  
**Sort:** newest-first (descending createdAt)

**Breaking changes:**
- Переименование `requests` → другое
- Удаление статусного поля или изменение набора допустимых значений статуса (`pending|approved|rejected`)

---

#### `GET /api/badges/requests/inbox`

**Auth:** `counselor | educator | shift_leader | camp_director | developer`  
**Query params:** `campId` (optional), `squadId` (optional), `status` (optional: `pending|approved|rejected`)  
**Response 200:**
```json
{
  "requests": [ /* same shape as /mine */ ]
}
```

**Mandatory fields:** `requests` (array)  
**Sort:** pending-first, then newest-first within group

**Breaking changes:**
- Удаление фильтра `status`
- Смена порядка сортировки без уведомления

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

### 3.2 Parent Insights

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

#### `GET /api/parent-insights?code={code}`

**Auth:** Не требуется (публичный read-only по временному коду)  
**Query params:** `code` (required для полного ответа)

**Response 200 (без code или пустой code — placeholder):**
```json
{
  "overallProgress": {
    "percent": 0,
    "stage":   "'start'",
    "achieved": 0,
    "total":    0
  },
  "weeklyTrend":  { "direction": "flat" },
  "strengthsTop3": [],
  "nextSteps":    []
}
```

**Response 200 (с валидным code):**
```json
{
  "overallProgress": {
    "percent":  "int 0-100 (mandatory)",
    "stage":    "'start' | 'steady' | 'high' (mandatory)",
    "achieved": "int (mandatory)",
    "total":    "int (mandatory)"
  },
  "weeklyTrend": {
    "direction": "'up' | 'down' | 'flat' (mandatory)"
  },
  "strengthsTop3": [ { "categoryId": "str", "title": "str", "score": "int" } ],
  "nextSteps":     [ { "title": "str", "hint": "str" } ],
  "source":        "'parent_snapshot_code' (mandatory)"
}
```

**Response 404** — code не найден  
**Response 410** — code истёк

**Mandatory fields (с кодом):** `overallProgress` (объект), `overallProgress.percent` (int), `overallProgress.achieved` (int), `overallProgress.total` (int), `overallProgress.stage`, `weeklyTrend.direction`, `source`

**Breaking changes:**
- Удаление `overallProgress` или любого его обязательного subfield
- Изменение `source` с `"parent_snapshot_code"` — фронт использует для определения типа ответа
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
# С AUTH_SECRET — полный прогон (22 checks):
AUTH_SECRET=<secret> python backend/scripts/smoke_backend_critical.py --base-url http://localhost:4000

# Без секрета — только /api/health:
python backend/scripts/smoke_backend_critical.py --base-url http://localhost:4000
```

Скрипт проверяет:
- Наличие всех mandatory полей в response
- HTTP-статусы (201/200/404/410)
- Корректность flow (request → approve → статус=approved в /mine)

При изменении любого контракта из §3 — обновить скрипт, запустить, убедиться в 0 failures.

---

## 6. Ownership и обновление

| Действие | Кто обновляет |
|----------|---------------|
| Изменение endpoint в `backend/app.py` | Разработчик + Agent A review |
| Добавление поля — обновить §3 | Agent A |
| Breaking change — согласовать с фронтом | NeuroStepa → Agent A + Agent B |
| После обновления — перезапустить smoke | Agent A |

*Последнее обновление: 2026-02-27 (M5-R2-A, Agent A)*
