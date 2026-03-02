# TASK: M11-INSPECTOR-C — Инспектор Пользы: система чек-листов

**Агент: C (Chat/AI/Data)**  
**Base:** `main @ e910330`  
**Branch:** `agent-c/m11-inspector`

## Контекст

Инспектор Пользы — игровая система полезных дел. В кабинете есть большая кнопка-stub сверху: «Игровая система полезных дел. Прокачивает 4К и культуру заботы.» 

Из видения: набор заданий-чек-листов различной сложности, прогрессия (завершил текущий → открывается следующий), подтверждение выполнения staff-ом.

## Scope

### 1. Данные чек-листов

Создать `ai-data/inspector/checklists.json`:
```json
[
  {
    "id": "inspector_01",
    "title": "Первые шаги доброты",
    "difficulty": "beginner",
    "category4k": ["cooperation", "communication"],
    "nextChecklistId": "inspector_02",
    "tasks": [
      {"id": "t1", "title": "Помоги другу с заданием", "description": "..."},
      {"id": "t2", "title": "Убери за собой в столовой", "description": "..."},
      {"id": "t3", "title": "Скажи комплимент вожатому", "description": "..."}
    ]
  }
]
```

Создать **минимум 5 чек-листов** с прогрессией: beginner → intermediate → advanced.
Задания должны быть реалистичными для лагерной смены.

### 2. Backend

В `backend/app.py` добавить:
- `GET /api/inspector/checklists` — все чек-листы
- `GET /api/inspector/progress/<deviceId>` — прогресс пользователя
- `POST /api/inspector/progress` — отметить задание выполненным
- `PATCH /api/inspector/progress/<taskId>/approve` — staff подтверждает (counselor+)

Store: InspectorProgressStore (JSON + Supabase)
Migration: `008_inspector.sql` (таблица inspector_progress)

### 3. Chatbot prompt

В `putevoditel_system_prompt.py` добавить секцию:
```
## 🔍 Инспектор Пользы
Инспектор Пользы — игровая система полезных дел...
[описание механики, как помогать участникам]
```

### 4. Smoke Flow R (2 checks)
- `R-1`: GET checklists → 200 + count ≥ 5
- `R-2`: POST progress → 201

### 5. 4К маппинг

Каждое задание маркировано навыком 4К:
- Критическое мышление (critical_thinking)
- Креативность (creativity)  
- Коммуникация (communication)
- Кооперация (cooperation)

## DoD
- [ ] 5+ чек-листов в `ai-data/inspector/`
- [ ] 4 API endpoints + Store + Migration
- [ ] Chatbot prompt updated
- [ ] Smoke Flow R pass
