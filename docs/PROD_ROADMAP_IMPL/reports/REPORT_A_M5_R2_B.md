# REPORT — Agent A | M5-R2-B

**Task ID:** M5-R2-B  
**Agent:** A (Data/Backend contracts)  
**Date:** 2026-02-27  
**Status:** ✅ DONE  

---

## Summary

Закрыты три deliverable по badge_requests backend:

1. **Inbox educator auto-scope** — GET /api/badges/requests/inbox теперь автоматически ограничивает выдачу своим отрядом для роли `educator` (по тому же механизму `_resolve_membership_context`, что уже работал для `counselor`).
2. **Mine endpoint — expanded roles + privacy** — GET /api/badges/requests/mine расширен до 6 ролей (`participant, parent, educator, counselor, shift_leader, developer`) и применяет privacy-проекцию: `requestedBy.deviceId` не возвращается в ответе.
3. **Smoke script — Flow D + bugfix Flow B** — добавлен Flow D (4 checks, тест mine + privacy), исправлен Flow B (неверный URL `/api/parent-insights` → `/api/parent-snapshot`). Итог: **31 CHECKS PASSED**.

---

## Key Finding: squadId не в JWT

Задача указывала «filter by squadId from JWT», но JWT содержит только `role`, `campId`, `deviceId`, `exp`. `squadId` в JWT отсутствует. Реализация выполнена через `_resolve_membership_context(device_id)` — тот же механизм что уже используется для `counselor`. Это additive-only изменение, breaking changes отсутствуют.

---

## Deliverable 1: Inbox educator auto-scope

**Файл:** `backend/app.py` ~строка 2886

**До:**
```python
if actor_role == "counselor" and not camp_filter and not squad_filter:
    camp_self, squad_self = _resolve_membership_context(device_id)
```

**После:**
```python
if actor_role in ("counselor", "educator") and not camp_filter and not squad_filter:
    camp_self, squad_self = _resolve_membership_context(device_id)
```

Поведение: если `educator` вызывает `/inbox` без явных `campId`/`squadId` query params — автоматически ограничивается своим отрядом. `shift_leader`, `camp_director`, `developer` по-прежнему видят все заявки по умолчанию.

---

## Deliverable 2: Mine — expanded roles + privacy projection

**Файл:** `backend/app.py` ~строки 2843–2880

Добавлена вспомогательная функция:
```python
def _project_mine_row(row: dict) -> dict:
    """Return badge request row without requestedBy.deviceId (privacy projection)."""
    result = {k: v for k, v in row.items() if k != "requestedBy"}
    req_by = row.get("requestedBy") or {}
    if req_by:
        result["requestedBy"] = {"nickname": req_by.get("nickname")}
    return result
```

Endpoint изменён:
- Auth: `("participant", "parent", "educator", "counselor", "shift_leader", "developer")` (было: `("participant", "developer")`)
- Response: каждая строка проходит через `_project_mine_row` — `requestedBy.deviceId` отсутствует в ответе
- Фильтрация по `deviceId` из JWT сохранена

---

## Deliverable 3: Smoke script — Flow D + bugfix Flow B

**Файл:** `backend/scripts/smoke_backend_critical.py`

### Flow D (новый, 4 checks):
- `run_flow_a()` рефакторирован: возвращает `(req_id, participant_token)` вместо `None`
- `run_flow_d(req_id, participant_token)` вызывает GET /mine с participant token (из Flow A) и проверяет:
  1. `requests` is list
  2. approved request found (по `req_id` из Flow A)
  3. `status == "approved"`
  4. `requestedBy.deviceId` absent (privacy check)

### Flow B bugfix:
URL исправлен с несуществующего `/api/parent-insights` на корректный `/api/parent-snapshot`. Структура проверок обновлена под фактический response (`progress`, `exportedAt`) вместо несуществующего `overallProgress`.

### Итоговый счёт:
```
Health:  1 check
Flow A:  9 checks (badge request lifecycle)
Flow B:  6 checks (parent snapshot create → read → invalid 404)
Flow C:  6 checks (council initiatives)
Flow D:  4 checks (mine privacy + contract)  ← новый M5-R2-B
Flow E:  5 checks (image generation)

TOTAL: 31 CHECKS PASSED
```

---

## Smoke output (локальный backend, USE_SUPABASE=false)

```
Smoke backend critical flows — http://127.0.0.1:4000
============================================================
[Health]            PASS /api/health status
[Flow A]            PASS auth/verify-code (participant)
                    PASS auth/verify-code (shift_leader)
                    PASS POST /api/badges/requests — id present
                    PASS POST /api/badges/requests — status=pending
                    PASS GET /api/badges/requests/inbox — request present
                    PASS POST approve — status=approved
                    PASS POST approve — resolvedAt present
                    PASS GET /api/badges/requests/mine — request found
                    PASS GET /api/badges/requests/mine — status=approved
[Flow B]            PASS auth/verify-code (participant)
                    PASS POST /api/parent-snapshot — parentLinkCode present
                    PASS GET /api/parent-snapshot — progress present
                    PASS GET /api/parent-snapshot — exportedAt present
                    PASS GET /api/parent-snapshot — progress has entries
                    PASS GET /api/parent-snapshot?code=INVALID — 404
[Flow C]            PASS auth/verify-code (shift_leader)
                    PASS POST /api/council/initiatives — id present
                    PASS POST /api/council/initiatives — status=idea
                    PASS POST /api/council/initiatives — title matches
                    PASS GET /api/council/initiatives — list returned
                    PASS GET /api/council/initiatives — new initiative found in list
[Flow D]            PASS GET /api/badges/requests/mine — requests is list
                    PASS GET /api/badges/requests/mine — approved request found
                    PASS GET /api/badges/requests/mine — status=approved
                    PASS GET /api/badges/requests/mine — requestedBy.deviceId absent (privacy)
[Flow E]            PASS auth/verify-code (participant)
                    PASS POST /api/images/generate — E-1: 503 (acceptable)
                    PASS POST /api/images/generate — E-2: long prompt not 500
                    PASS POST /api/images/generate — E-3: missing mode -> 400
                    PASS POST /api/images/generate — E-4: missing context -> 400

RESULT: ALL 31 CHECKS PASSED
```

---

## Contract Guard Updates

**Файл:** `docs/BACKEND_CONTRACT_GUARD.md`

- §1 Scope: добавлена группа Image Generation, Parent Snapshot исправлен (убран несуществующий `parent-insights`)
- §3.1 `/mine`: auth расширен до 6 ролей, `requestedBy.deviceId` помечен как absent (privacy), breaking change для возврата deviceId добавлен
- §3.1 `/inbox`: добавлена заметка про educator auto-scope
- §3.2: переименован в «Parent Snapshot», `/api/parent-insights` заменён на `/api/parent-snapshot`, структура ответа исправлена
- §5: smoke table обновлена (31 total, Flow D добавлен с описанием)

---

## Files Changed

| Файл | Изменение |
|------|-----------|
| `backend/app.py` | inbox educator scope + mine privacy/roles + `_project_mine_row` |
| `backend/scripts/smoke_backend_critical.py` | Flow D (4 checks), Flow A рефакторинг, Flow B bugfix, docstring |
| `docs/BACKEND_CONTRACT_GUARD.md` | /mine + inbox + §3.2 + §5 обновлены |
| `docs/PROD_ROADMAP_IMPL/CLAIM_BOARD.md` | M5-R2-B entry добавлен |
| `docs/ROADMAP_2026.md` | M5-R2-B entry в Status Sync Log |
| `docs/PROD_ROADMAP_IMPL/reports/REPORT_A_M5_R2_B.md` | этот файл |

---

## Guardrails Verified

- ✅ RBAC (`ORGANIZER_ROLES`) не тронут
- ✅ `badge_requests.json` структура не изменена
- ✅ M2 parent read-only поверхности не затронуты
- ✅ Только additive изменения в контракте
- ✅ Миграции отсутствуют

---

## Handoff

**Следующий агент:** NeuroStepa (оркестратор)  
**Статус контура:** smoke 31/31, contract guard актуален, inbox educator scope добавлен, mine privacy confirmed.  
**Нет открытых хвостов по M5-R2-B.**
