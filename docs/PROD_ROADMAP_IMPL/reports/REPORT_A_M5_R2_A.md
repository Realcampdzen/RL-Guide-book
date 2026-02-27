# REPORT: M5-R2-A — Backend Release Hardening (Contracts + Smoke Automation Lite)

**Агент:** A (Data/Backend contracts)  
**Task ID:** M5-R2-A  
**Branch:** agent-a/m5-r2-backend-hardening  
**Дата:** 2026-02-27  
**Статус:** ✅ DONE  

---

## 1. Scope

Post-GO hardening без RBAC-изменений и миграций. Три deliverable:

1. Smoke-runbook/скрипт для critical backend flows
2. Contract guard документ (mandatory/optional fields, breaking-change policy)
3. Секция §5.3 в release playbook

---

## 2. Deliverable 1: Smoke Script

**Файл:** `backend/scripts/smoke_backend_critical.py`

**Запуск:**
```bash
AUTH_SECRET=<secret> python backend/scripts/smoke_backend_critical.py \
  --base-url http://localhost:4000
```

**Архитектура:**
- Чистый Python 3, только stdlib + `requests`-совместимая работа через `urllib`
- Вычисляет HMAC auth-коды внутри (та же логика, что в `app.py: _auth_compute_code`)
- Три режима: полный (22 checks с AUTH_SECRET), health-only (1 check, без секрета), кастомный base-url

**Flows:**
```
Flow A — Badge Request (9 checks):
  [1] auth/verify-code (participant) → JWT
  [2] auth/verify-code (shift_leader) → JWT
  [3] POST /api/badges/requests → 201, id=BR-*, status=pending
  [4] GET  /api/badges/requests/inbox → 200, request found
  [5] POST /api/badges/requests/{id}/approve → 200, status=approved
  [6] POST approve → resolvedAt present
  [7] GET  /api/badges/requests/mine → 200, request found
  [8] GET  /api/badges/requests/mine → status=approved
  [9] [implicit in auth steps]

Flow B — Parent Insights (6 checks):
  [1] auth/verify-code (participant) → JWT
  [2] POST /api/parent-snapshot → 200, parentLinkCode
  [3] GET  /api/parent-insights?code={code} → 200, overallProgress present
  [4] GET  /api/parent-insights → overallProgress.percent is int
  [5] GET  /api/parent-insights → overallProgress.achieved is int
  [6] GET  /api/parent-insights?code=INVALIDCODE00 → 404

Flow C — Council Initiatives (5 checks):
  [1] auth/verify-code (shift_leader) → JWT
  [2] POST /api/council/initiatives → 201, id present
  [3] POST → status=idea
  [4] POST → title matches
  [5] GET  /api/council/initiatives → list returned + new initiative found

Health:
  [1] GET /api/health → status=ok
```

**Результаты верификации (локальный backend, 2026-02-27):**
```
Smoke backend critical flows — http://127.0.0.1:4000
============================================================

[Health]
  PASS  /api/health status

[Flow A] Badge Request: request -> inbox -> approve -> mine
  PASS  auth/verify-code (participant)
  PASS  auth/verify-code (shift_leader)
  PASS  POST /api/badges/requests — id present
  PASS  POST /api/badges/requests — status=pending
  PASS  GET /api/badges/requests/inbox — request present
  PASS  POST approve — status=approved
  PASS  POST approve — resolvedAt present
  PASS  GET /api/badges/requests/mine — request found
  PASS  GET /api/badges/requests/mine — status=approved

[Flow B] Parent Insights: snapshot create -> insights read -> invalid 404
  PASS  auth/verify-code (participant)
  PASS  POST /api/parent-snapshot — parentLinkCode present
  PASS  GET /api/parent-insights — overallProgress present
  PASS  GET /api/parent-insights — overallProgress.percent is int
  PASS  GET /api/parent-insights — overallProgress.achieved is int
  PASS  GET /api/parent-insights?code=INVALID — 404

[Flow C] Council Initiatives: create -> list
  PASS  auth/verify-code (shift_leader)
  PASS  POST /api/council/initiatives — id present
  PASS  POST /api/council/initiatives — status=idea
  PASS  POST /api/council/initiatives — title matches
  PASS  GET /api/council/initiatives — list returned
  PASS  GET /api/council/initiatives — new initiative found in list

============================================================
RESULT: ALL 22 CHECKS PASSED
```

**Exit code:** 0 (все прошли)

---

## 3. Deliverable 2: Contract Guard Document

**Файл:** `docs/BACKEND_CONTRACT_GUARD.md`

Структура:
- §1 Scope (6 endpoint-групп)
- §2 Additive-Only Policy (правило: non-breaking = только additive)
- §3 Endpoint Contracts (mandatory/optional fields + breaking per endpoint)
- §4 Breaking vs Non-Breaking таблица (12 типов изменений)
- §5 Smoke Verification (команды + связь со скриптом)
- §6 Ownership

**Ключевые mandatory fields:**

| Endpoint | Mandatory fields |
|----------|------------------|
| POST /api/badges/requests | `request.id`, `request.status`, `request.levelId`, `request.createdAt`, `request.requestedBy.deviceId` |
| GET /api/badges/requests/inbox | `requests` (array) |
| GET /api/badges/requests/mine | `requests` (array), каждый: `id`, `status`, `levelId`, `createdAt` |
| POST approve/reject | `request.id`, `request.status`, `request.resolvedAt`, `request.resolvedBy.deviceId` |
| GET /api/parent-insights | `overallProgress.percent`, `overallProgress.achieved`, `overallProgress.total`, `overallProgress.stage`, `weeklyTrend.direction`, `source` |
| POST /api/parent-snapshot | `parentLinkCode`, `expiresAt` |
| POST /api/council/initiatives | `id`, `title`, `status`, `createdAt` |
| GET /api/council/initiatives | `initiatives` (array), каждый: `id`, `title`, `status`, `createdAt` |

---

## 4. Deliverable 3: Playbook §5.3

**Файл:** `docs/PROD_RELEASE_PLAYBOOK.md` (секция §5.3 добавлена)

Содержит:
- Команду запуска smoke против prod и localhost
- Таблицу flows/checks
- Ожидаемый вывод
- Интерпретацию конкретных FAIL-кейсов
- Ссылку на BACKEND_CONTRACT_GUARD.md

---

## 5. Файлы изменены / созданы

| Файл | Действие |
|------|----------|
| `backend/scripts/smoke_backend_critical.py` | Создан |
| `docs/BACKEND_CONTRACT_GUARD.md` | Создан |
| `docs/PROD_RELEASE_PLAYBOOK.md` | Добавлена §5.3 |
| `docs/PROD_ROADMAP_IMPL/CLAIM_BOARD.md` | Добавлена M5-R2-A Backend Hardening секция |
| `docs/ROADMAP_2026.md` | Добавлена M5-R2-A в Status Sync Log |
| `docs/PROD_ROADMAP_IMPL/reports/REPORT_A_M5_R2_A.md` | Создан (этот файл) |

---

## 6. Out of Scope (не трогалось)

- RBAC изменения: нет
- Миграции БД: нет
- Новые фичи: нет
- Фронтенд изменения: нет

---

## 7. Handoff

**Smoke script готов к использованию любым агентом:**
```bash
AUTH_SECRET=<prod_auth_secret> python backend/scripts/smoke_backend_critical.py \
  --base-url https://backend-murex-one-40.vercel.app
```

**При любом изменении backend контракта:**
1. Проверить `docs/BACKEND_CONTRACT_GUARD.md` — не является ли изменение breaking
2. Если breaking — согласовать с фронтом (Agent B / NeuroStepa)
3. Запустить smoke-скрипт, убедиться в 0 FAIL
4. Обновить §3 BACKEND_CONTRACT_GUARD.md

**LKG (Last Known Good) для M5-R2-A:** commit hash — см. git log после коммита.

---

*Agent A (Data/Backend contracts) — 2026-02-27*
