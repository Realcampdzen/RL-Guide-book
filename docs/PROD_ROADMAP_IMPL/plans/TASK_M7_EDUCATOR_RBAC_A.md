# TASK: M7-EDUCATOR-RBAC-A — Educator: полный backend RBAC

**Агент: A (Data/Backend)**  
**Base:** `main @ 630fafe`  
**Branch:** `agent-a/m7-educator-rbac`

## Контекст

Роль `educator` есть в типах и UI, но backend RBAC не включает её в ключевые endpoints. В P2-01 educator был добавлен в `CHAT_ALLOWED_ROLES`, но inbox (заявки и планы), squad read-only и shifts endpoints до сих пор не принимают educator JWT.

**Целевое поведение:** educator = staff-роль уровня counselor для: чата, inbox заявок, inbox планов, чтения смен/отрядов.

## Что читать

- `docs/PROD_ROADMAP_IMPL/AGENT_INSTRUCTIONS.md` — правила работы
- `docs/PRODUCT_MECHANICS_AND_ROADMAP.md` §3.2–3.4 — матрица RBAC и несостыковки
- `docs/BACKEND_CONTRACT_GUARD.md` — контракты API
- `backend/app.py` — все endpoints с RBAC-проверками

## Scope

### 1. Добавить `educator` в RBAC для inbox endpoints

В `backend/app.py` найти все места, где проверяется роль для staff-доступа, и добавить `educator`:

- `/api/badges/requests/inbox` — GET (educator видит заявки)
- `/api/badges/plans/inbox` — GET (educator видит планы)
- `/api/badges/plans/<id>/review` — PATCH (educator может approve/reject планы)
- `/api/badges/requests/<id>/approve` — PATCH (educator может подтвердить заявку)
- `/api/badges/requests/<id>/reject` — PATCH (educator может отклонить заявку)

### 2. Добавить `educator` в squad/shift read-only endpoints

- `/api/shifts` — GET (educator видит список смен)
- `/api/shifts/<id>/squads` — GET (educator видит отряды)
- `/api/squads/mine` — GET (educator видит свой отряд)

### 3. Убедиться что `educator` уже есть в чате

Проверить `CHAT_ALLOWED_ROLES` — если educator уже там (Done в P2-01), просто подтвердить.

### 4. Smoke-проверка

Добавить в `backend/scripts/smoke_backend_critical.py` проверку (1–2 checks):
- `K-1`: educator JWT → GET `/api/badges/requests/inbox` → 200 (не 403)
- `K-2`: educator JWT → GET `/api/badges/plans/inbox` → 200 (не 403)

### 5. Документация

Обновить `docs/BACKEND_CONTRACT_GUARD.md` — в каждом endpoint-параграфе добавить `educator` в список разрешённых ролей.

Обновить матрицу доступов в `docs/PRODUCT_MECHANICS_AND_ROADMAP.md` §3.3 — строка `educator`:
- Чат: Да (уже)
- Inbox заявок: Да (новое)
- Inbox планов: Да (новое)
- Shifts/squads read: Да (новое)

## DoD

- [ ] educator принимается в inbox и review endpoints (заявки + планы)
- [ ] educator может читать shifts/squads
- [ ] Smoke K-1 и K-2 проходят (educator JWT → 200)
- [ ] `BACKEND_CONTRACT_GUARD.md` обновлён
- [ ] Общий smoke ≥ 54/54 (52 текущих + 2 новых Flow K)
- [ ] Коммит на ветку `agent-a/m7-educator-rbac`

## Формат отчёта

```
Агент: A (Data/Backend)
Task: M7-EDUCATOR-RBAC-A
Branch: agent-a/m7-educator-rbac
Base: main @ 630fafe
Commit: <hash>

Файлы:
- [MOD] backend/app.py (educator в RBAC checks)
- [MOD] backend/scripts/smoke_backend_critical.py (Flow K, 2 checks)
- [MOD] docs/BACKEND_CONTRACT_GUARD.md (educator в разрешённых ролях)
- [MOD] docs/PRODUCT_MECHANICS_AND_ROADMAP.md (матрица §3.3)

Smoke: XX/54
```
