# PLAN_P1-06 — Server-side RBAC по JWT

**Агент:** D  
**Task ID:** P1-06  
**Дата создания плана:** 2026-02-21  
**Статус:** done

---

## 1. Цель задачи

Подтвердить и обеспечить, что backend декодирует JWT и принимает решения по роли из токена — не доверяет телу запроса. Все защищённые эндпоинты проверены и исправлены.

[TASKS.md#p1-06](../TASKS.md#p1-06)

---

## 2. Контекст (что уже есть)

- `_require_roles()` — универсальный helper, возвращает `payload["role"]` из JWT
- `_require_organizer_jwt()` — для staff-flow, декодирует JWT, проверяет ORGANIZER_ROLES
- `_require_chat_auth()` — для чата, декодирует JWT, проверяет CHAT_ALLOWED_ROLES
- `_require_teams_auth()` — для teams, декодирует JWT
- `_require_parent_snapshot_auth()` — для parent snapshot

Паттерн: `payload, err = _require_roles(...)` — всегда использует JWT role, не body.

---

## 3. Файлы для изменения

| Файл | Тип изменения | Описание |
|------|---------------|----------|
| `backend/app.py` | audit + minor fixes | Убедиться что нет RBAC bypass через body |

---

## 4. Шаги реализации

1. **Аудит всех POST/PATCH/DELETE endpoints** — проверить, что доступ определяется только через JWT, не из тела запроса
2. **Проверить edge cases** — body.get("role") только для developer (membership simulation), не для access control
3. **Документировать результат**

---

## 5. Аудит результатов

| Endpoint | Auth механизм | Статус |
|----------|---------------|--------|
| `POST /api/dev/login` | `_is_localhost_request()` + `_is_production()` | ✅ закрыт в prod (P1-04) |
| `POST /api/auth/verify-code` | HMAC code validation | ✅ |
| `POST /api/auth/generate-code` | `X-Generate-Code-Secret` header | ✅ |
| `GET /api/shifts` | `_require_roles(participant+)` | ✅ |
| `POST /api/shifts` | `_require_organizer_jwt()` | ✅ |
| `DELETE /api/shifts/<id>` | `_require_organizer_jwt()` | ✅ |
| `GET /api/shifts/<id>/squads` | `_require_roles(participant+)` | ✅ |
| `POST /api/shifts/<id>/squads` | `_require_organizer_jwt()` | ✅ |
| `DELETE /api/squads/<id>` | `_require_organizer_jwt()` | ✅ |
| `POST /api/squads/<id>/join` | `_require_roles(participant+)` | ✅ |
| `GET/PATCH /api/squads/<id>/corner` | `_require_roles()` по методу | ✅ |
| `POST /api/squads/<id>/invite-code` | `_require_organizer_jwt()` | ✅ |
| `POST /api/squads/<id>/leave` | `_require_roles(participant+)` | ✅ |
| `DELETE /api/squads/<id>/members/<device>` | `_require_organizer_jwt()` | ✅ |
| `GET/POST /api/squads/<id>/messages` | `_require_roles(participant+)` | ✅ |
| `POST /api/badges/requests` | `_require_roles(participant+)` | ✅ |
| `GET /api/badges/requests/inbox` | `_require_roles(counselor+)` | ✅ |
| `POST /api/badges/requests/<id>/approve` | `_require_roles(counselor+)` | ✅ |
| `POST /api/badges/requests/<id>/reject` | `_require_roles(counselor+)` | ✅ |
| `POST /api/organizer/generate-code` | `_require_organizer_jwt()` | ✅ |
| `POST /api/parent-snapshot` | `_require_parent_snapshot_auth()` | ✅ |
| `POST /api/chat` | `_require_chat_auth()` | ✅ |

**Вывод:** Все endpoint'ы принимают решение по роли из JWT-payload, не из тела запроса. Body.get("role") присутствует только в developer-fallback для membership simulation (не access control bypass).

---

## 6. Definition of Done

- [x] Все staff-эндпоинты проверяют `role` из JWT, не из тела запроса
- [x] Попытка participant вызвать inbox → 403
- [x] Попытка без токена → 401
- [x] JWT expiry возвращает 401 (не 500) — `except jwt.ExpiredSignatureError: return 401`
- [x] Аудит задокументирован в этом плане

---

## 7. Отклонения от плана

*Нет отклонений.*
