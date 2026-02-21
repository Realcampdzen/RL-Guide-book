# REPORT_D_P2-01 — Backend: полный RBAC для educator

**Агент:** D  
**Task ID:** P2-01  
**Дата:** 2026-02-21  
**Статус:** ✅ done

---

## 1. Что сделано

### `backend/app.py`

Роль `educator` добавлена во все нужные места:

1. **`CHAT_ALLOWED_ROLES`** — educator теперь может использовать чат НейроВалюши:
   ```python
   CHAT_ALLOWED_ROLES = ('participant', 'parent', 'counselor', 'educator', 'shift_leader', 'camp_director', 'developer')
   ```

2. **`GET /api/badges/requests/inbox`** — educator видит inbox заявок:
   ```python
   _require_roles(("counselor", "educator", "shift_leader", "camp_director", "developer"), ...)
   ```

3. **`_badge_request_resolve()`** (approve/reject) — educator может одобрять/отклонять заявки.

4. **`GET /api/shifts`** — educator читает список смен.

5. **`GET /api/shifts/<id>/squads`** — educator читает список отрядов.

6. **`GET /api/squads/mine`** — educator видит своё членство.

7. **`POST /api/squads/<id>/join`** — educator может вступать в отряды.

8. **`GET /api/squads/<id>/corner`** — educator читает уголок отряда (только GET, PATCH закрыт для educator).

9. **`GET/POST /api/squads/<id>/messages`** — educator может читать и писать в squad chat.

### Что educator НЕ может (не изменялось)

- `POST /api/shifts` — создать смену (ORGANIZER_ROLES)
- `DELETE /api/shifts/<id>` — удалить смену
- `POST /api/shifts/<id>/squads` — создать отряд
- `DELETE /api/squads/<id>` — удалить отряд
- `PATCH /api/squads/<id>/corner` — редактировать уголок (только counselor+)
- `POST /api/organizer/generate-code` — выдавать коды участникам

### Tokens: educator codes работают автоматически

`/api/auth/verify-code` итерирует через `CHAT_ALLOWED_ROLES`, куда теперь включён educator — educator токены генерируются и верифицируются корректно.

---

## 2. Evidence

| Что | Файл | Изменение |
|-----|------|-----------|
| CHAT_ALLOWED_ROLES | `backend/app.py` | + educator |
| badge inbox | `backend/app.py` | + educator |
| badge approve/reject | `backend/app.py` | + educator |
| shifts read | `backend/app.py` | + educator |
| squads read | `backend/app.py` | + educator |
| squad join | `backend/app.py` | + educator |
| squad messages | `backend/app.py` | + educator |
| squad corner GET | `backend/app.py` | + educator |

---

## 3. DoD checklist

- [x] educator может использовать чат (CHAT_ALLOWED_ROLES)
- [x] educator видит inbox заявок
- [x] educator может одобрять/отклонять заявки
- [x] educator читает список отрядов/смен
- [x] educator НЕ может управлять сменами (ORGANIZER_ROLES не изменён)
- [x] educator может вступить в отряд и читать сообщения
