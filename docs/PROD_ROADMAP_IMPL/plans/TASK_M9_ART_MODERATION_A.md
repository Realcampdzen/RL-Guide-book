# TASK: M9-ART-MODERATION-A — Арты/скины: серверная модерация

**Агент: A (Data/Backend)**  
**Base:** `main @ 833ae10`  
**Branch:** `agent-a/m9-art-moderation`

## Контекст

Скины значков генерируются ИИ или рисуются участниками, но остаются локальными. Нет серверного workflow: «предложить арт → модерация staff → канон → отображение в каталоге».

## Scope

### 1. BadgeArtsStore (по паттерну BadgePlansStore)

Модель:
```python
{
  "id": "uuid",
  "device_id": "string",
  "badge_id": "string",
  "image_url": "string",          # URL арта (Supabase Storage или base64)
  "source": "ai_generated | hand_drawn | uploaded",
  "status": "pending | approved | rejected | canon",
  "moderator_note": "string | null",
  "author_nickname": "string",
  "created_at": "ISO datetime"
}
```

### 2. Supabase Migration `006_badge_arts.sql`

### 3. API Endpoints

| Method | Path | RBAC |
|--------|------|------|
| POST | `/api/badges/arts` | participant+staff | Submit art |
| GET | `/api/badges/arts` | all | List arts (?badgeId, ?status) |
| GET | `/api/badges/arts/inbox` | staff | Pending arts for moderation |
| PATCH | `/api/badges/arts/<id>/review` | staff | approve/reject/canon |

### 4. Smoke Flow N (3 checks)
- `N-1`: POST art → 201
- `N-2`: GET inbox → contains art
- `N-3`: PATCH review (approve) → 200

### 5. Docs: `BACKEND_CONTRACT_GUARD.md` §3.10

## DoD
- [ ] Store + migration + 4 endpoints + Flow N + docs
- [ ] Smoke ≥ 70/70
