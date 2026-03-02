# TASK: M16-DASHBOARD-BACKEND-A — Unified Inbox API

**Агент: A (Data/Backend)**  
**Base:** `main @ 627a1e2`  
**Branch:** `agent-a/m16-dashboard`

## Контекст

Пульт Управления — единый inbox для всех pending запросов от пользователей. Агрегирует данные из всех существующих stores: badge_requests, council_initiatives, badge_arts, ugc proposals, inspector tasks, engine approvals.

## Scope

### 1. API: GET `/api/admin/inbox`

RBAC: developer + shift_leader+

Агрегирует pending items из всех stores:
```json
{
  "items": [
    {
      "type": "badge_request",
      "id": "br_123",
      "user": {"device_id": "...", "nickname": "Ваня", "avatar_url": "..."},
      "data": {"badge_id": "1.1.1", "badge_name": "...", "attachments": []},
      "status": "pending",
      "created_at": "2026-03-02T10:00:00Z"
    },
    {
      "type": "council_initiative",
      "id": "ci_456",
      "user": {...},
      "data": {"title": "...", "description": "...", "status": "submitted"},
      "status": "submitted",
      "created_at": "..."
    },
    {
      "type": "badge_art",
      "id": "ba_789",
      "user": {...},
      "data": {"image_url": "...", "source": "original"},
      "status": "pending",
      "created_at": "..."
    },
    {
      "type": "engine_approve",
      "id": "eng_012",
      "user": {...},
      "data": {"title": "Орлы", "squad_id": "..."},
      "status": "pending",
      "created_at": "..."
    },
    {
      "type": "inspector_task",
      "id": "it_345",
      "user": {...},
      "data": {"task_title": "...", "checklist_title": "..."},
      "status": "done_pending",
      "created_at": "..."
    }
  ],
  "counts": {
    "badge_request": 3,
    "council_initiative": 1,
    "badge_art": 2,
    "engine_approve": 1,
    "inspector_task": 4,
    "total": 11
  }
}
```

Сортировка: по `created_at` desc (новые сверху).
Фильтрация: query param `?type=badge_request` (optional).

### 2. API: POST `/api/admin/action`

RBAC: developer + shift_leader+

```json
{
  "item_type": "badge_request",
  "item_id": "br_123",
  "action": "approve",
  "comment": "Отлично!"
}
```

Маршрутизация action к нужному store:
- badge_request → badge_requests store → update status
- council_initiative → council_initiatives store → update status
- badge_art → badge_arts store → review
- engine_approve → engines store → approve
- inspector_task → inspector_progress store → approve

### 3. Smoke Flow AA (2 checks)
- `AA-1`: GET /api/admin/inbox → 200 + has counts
- `AA-2`: POST /api/admin/action → 200

## DoD
- [ ] GET /api/admin/inbox (aggregated) + POST /api/admin/action (universal) + Flow AA
