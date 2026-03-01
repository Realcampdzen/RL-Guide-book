# TASK: M8-COUNCIL-INITIATIVES-A — Совет Лагеря: персистентные инициативы

**Агент: A (Data/Backend)**  
**Base:** `main @ c9458b4`  
**Branch:** `agent-a/m8-council-initiatives`

## Контекст

Совет Лагеря сейчас — информационная панель + ИИ-генератор инициатив. Инициативы «улетают в воздух» — нет хранения. Нужно добавить серверный CRUD для инициатив с привязкой к движкам/отрядам.

Образцы паттернов: `BadgePlansStore`, `BadgeRequestsStore`.

## Что читать

- `docs/PRODUCT_MECHANICS_AND_ROADMAP.md` §7.9 — Совет Лагеря
- `src/components/CouncilDashboard.tsx` — текущий UI
- `backend/app.py` — существующие endpoints
- `backend/storage/` — паттерн StorageProvider

## Scope

### 1. CouncilInitiativesStore

По паттерну BadgePlansStore:
- `base.py` — абстракт для инициатив
- `json_provider.py` — JSON-файл (`backend/data/council_initiatives.json`)
- `supabase_provider.py` — Supabase (таблица `council_initiatives`)

Модель:
```python
{
  "id": "uuid",
  "device_id": "string",
  "camp_id": "string",
  "title": "string",
  "description": "string",
  "status": "proposed | discussed | approved | in_progress | done",
  "team_id": "string | null",      # связь с Движком
  "squad_id": "string | null",     # связь с отрядом
  "author_nickname": "string",
  "votes_up": 0,
  "created_at": "ISO datetime",
  "updated_at": "ISO datetime"
}
```

### 2. Supabase Migration `004_council_initiatives.sql`

### 3. API Endpoints

| Method | Path | RBAC | Описание |
|--------|------|------|----------|
| POST | `/api/council/initiatives` | participant+staff | Создать инициативу |
| GET | `/api/council/initiatives` | participant+staff | Список инициатив (фильтр ?status, ?teamId) |
| PATCH | `/api/council/initiatives/<id>` | staff (counselor+) | Изменить статус, привязать к движку |
| POST | `/api/council/initiatives/<id>/vote` | participant+staff | Голос «за» (1 на device_id) |

### 4. Smoke Flow L (3 checks)

- `L-1`: POST initiative → 201
- `L-2`: GET list → содержит созданную
- `L-3`: PATCH status → 200

### 5. Документация

`BACKEND_CONTRACT_GUARD.md` §3.8 Council Initiatives.

## DoD

- [ ] Store (3 файла) + migration + seed JSON
- [ ] 4 endpoints работают
- [ ] Smoke ≥ 61/61
- [ ] Docs обновлены
