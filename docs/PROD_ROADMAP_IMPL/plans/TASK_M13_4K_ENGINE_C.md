# TASK: M13-4K-ENGINE-C — 4К навыки: вычисление и данные

**Агент: C (Chat/AI/Data)**  
**Base:** `main @ 0bc6fb9`  
**Branch:** `agent-c/m13-4k`

## Контекст

4К навыки = Критическое мышление, Креативность, Коммуникация, Кооперация. В кабинете есть stub «4К — Навыки и рост». Нужно создать данные маппинга значков→навыки и API расчёта.

Из видения: «динамически отображается статистика и прогресс по 4К навыкам, с учётом деятельности — инициативы, полученные значки. А также по программам РЛ (4К, нейросети, вожатское мастерство, соуправление).»

## Scope

### 1. Маппинг значков → 4К

Создать `ai-data/4k_mapping.json`:
```json
{
  "badge_mappings": {
    "1.1.1": {"skills": ["communication", "cooperation"], "weights": [0.6, 0.4]},
    "1.2.1": {"skills": ["creativity"], "weights": [1.0]}
  },
  "category_defaults": {
    "1": {"skills": ["communication", "cooperation"], "weights": [0.5, 0.5]},
    "2": {"skills": ["creativity", "critical_thinking"], "weights": [0.6, 0.4]}
  },
  "activity_bonuses": {
    "council_initiative": {"skills": ["cooperation", "communication"], "bonus": 5},
    "engine_created": {"skills": ["cooperation", "creativity"], "bonus": 10},
    "inspector_checklist": {"skills": ["cooperation"], "bonus": 3}
  }
}
```

Заполнить маппинг для **всех 14 категорий** (category_defaults обязательно). Badge-level маппинг для ключевых значков (≥20).

### 2. Программы РЛ

Определить 4 программы:
- **4К навыки** — базовая (сумма по 4 навыкам)
- **Нейросети для обучения** — значки из категорий AI/творчества
- **Вожатское мастерство** — значки из БРО + Вожатификатор
- **Соуправление** — Движки + Совет + инициативы

### 3. Backend API

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/4k/stats/<deviceId>` | Scores по 4 навыкам + программам |
| GET | `/api/4k/mapping` | Маппинг (для UI визуализации) |

Алгоритм расчёта:
- Собрать earned badges (из badge_requests с status=approved)
- Для каждого → lookup в mapping → weighted sum per skill
- Добавить activity bonuses (инициативы, Движки, Inspector)
- Нормализовать 0–100

### 4. Chatbot prompt

Добавить секцию про 4К:
```
## 4К Навыки
Критическое мышление, Креативность, Коммуникация, Кооперация...
```

### 5. Smoke Flow U (2 checks)
- `U-1`: GET mapping → 200 + 14 categories
- `U-2`: GET stats → 200 + 4 skills

## DoD
- [ ] `ai-data/4k_mapping.json` с маппингом для 14 категорий
- [ ] 2 API endpoints + алгоритм расчёта
- [ ] Chatbot prompt updated
- [ ] Flow U pass
