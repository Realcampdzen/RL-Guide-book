# PLAN_P2-01 — Backend: полный RBAC для educator

**Агент:** D  
**Task ID:** P2-01  
**Дата создания плана:** 2026-02-21  
**Статус:** done

---

## 1. Цель задачи

Включить роль `educator` в backend RBAC. Educator должен:
- использовать чат НейроВалюши
- видеть badge inbox заявок (читать + апрувить)
- читать список отрядов/смен
- НЕ может создавать/удалять смены/отряды

[TASKS.md#p2-01](../TASKS.md#p2-01)

---

## 2. Файлы для изменения

| Файл | Тип изменения | Описание |
|------|---------------|----------|
| `backend/app.py` | modify | Добавить educator в CHAT_ALLOWED_ROLES + protected endpoints |

---

## 3. Изменения

| Endpoint | Было | Стало |
|----------|------|-------|
| `CHAT_ALLOWED_ROLES` | participant, parent, counselor, shift_leader, camp_director, developer | + educator |
| `GET /api/badges/requests/inbox` | counselor, shift_leader, camp_director, developer | + educator |
| `POST /api/badges/requests/<id>/approve` | counselor, shift_leader, camp_director, developer | + educator |
| `POST /api/badges/requests/<id>/reject` | counselor, shift_leader, camp_director, developer | + educator |
| `GET /api/shifts` | participant, counselor, shift_leader, camp_director, developer | + educator |
| `GET /api/shifts/<id>/squads` | participant, counselor, shift_leader, camp_director, developer | + educator |
| `GET /api/squads/mine` | participant, counselor, shift_leader, camp_director, developer | + educator |
| `POST /api/squads/<id>/join` | participant, counselor, shift_leader, camp_director, developer | + educator |
| `GET /api/squads/<id>/corner` | participant, counselor, shift_leader, camp_director, developer | + educator |
| `GET/POST /api/squads/<id>/messages` | participant, parent, counselor, shift_leader, camp_director, developer | + educator |
| `POST /api/shifts` | ORGANIZER_ROLES (не изменялся) | не меняется |
| `DELETE /api/shifts/<id>` | ORGANIZER_ROLES (не изменялся) | не меняется |
| `POST /api/shifts/<id>/squads` | ORGANIZER_ROLES (не изменялся) | не меняется |
| `DELETE /api/squads/<id>` | ORGANIZER_ROLES (не изменялся) | не меняется |
| `POST /api/organizer/generate-code` | ORGANIZER_ROLES (не изменялся) | не меняется |

---

## 4. Definition of Done

- [x] educator может использовать чат (CHAT_ALLOWED_ROLES включает educator)
- [x] educator видит inbox заявок
- [x] educator может апрувить/реджектить заявки
- [x] educator читает список отрядов/смен
- [x] educator НЕ может управлять сменами (создать/удалить) — ORGANIZER_ROLES не изменён
- [x] educator может вступить в отряд и читать сообщения

---

## 5. Отклонения от плана

*Нет отклонений.*
