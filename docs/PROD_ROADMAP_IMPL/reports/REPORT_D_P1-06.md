# REPORT_D_P1-06 — Server-side RBAC по JWT

**Агент:** D  
**Task ID:** P1-06  
**Дата:** 2026-02-21  
**Статус:** ✅ done

---

## 1. Что сделано

Проведён полный аудит всех защищённых endpoint'ов `backend/app.py`. Подтверждено:
- Все endpoint'ы принимают решения по роли из JWT payload, не из тела запроса
- `body.get("role")` присутствует только в dev-sandbox (developer membership simulation) — не является bypass RBAC
- Expired JWT → 401 (не 500): `except jwt.ExpiredSignatureError: return 401`
- Без токена → 401: проверки во всех `_require_*` функциях

## 2. Аудит (результат)

| Endpoint | Механизм | Результат |
|----------|----------|-----------|
| `POST /api/dev/login` | `_is_localhost_request()` + `_is_production()` | ✅ закрыт в prod |
| `POST /api/auth/verify-code` | HMAC code validation | ✅ |
| `GET /api/shifts` | `_require_roles(participant+)` | ✅ |
| `POST /api/shifts` | `_require_organizer_jwt()` | ✅ |
| `DELETE /api/shifts/<id>` | `_require_organizer_jwt()` | ✅ |
| `POST /api/squads/<id>/join` | `_require_roles(participant+)` | ✅ |
| `GET/PATCH /api/squads/<id>/corner` | `_require_roles()` по методу | ✅ |
| `POST /api/squads/<id>/invite-code` | `_require_organizer_jwt()` | ✅ |
| `GET/POST /api/squads/<id>/messages` | `_require_roles(participant+)` | ✅ |
| `POST /api/badges/requests` | `_require_roles(participant+)` | ✅ |
| `GET /api/badges/requests/inbox` | `_require_roles(counselor+)` | ✅ |
| `POST /api/badges/requests/<id>/approve` | `_require_roles(counselor+)` | ✅ |
| `POST /api/organizer/generate-code` | `_require_organizer_jwt()` | ✅ |
| `POST /api/parent-snapshot` | `_require_parent_snapshot_auth()` | ✅ |
| `POST /api/chat` | `_require_chat_auth()` | ✅ |

## 3. DoD checklist

- [x] Все staff-эндпоинты проверяют `role` из JWT, не из тела запроса
- [x] Попытка participant вызвать inbox → 403
- [x] Попытка без токена → 401
- [x] JWT expiry → 401 (не 500)
- [x] Аудит задокументирован в `plans/PLAN_P1-06.md`
