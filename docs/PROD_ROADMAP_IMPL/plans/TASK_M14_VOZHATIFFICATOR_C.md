# TASK: M14-VOZHATIFFICATOR-C — Вожатификатор + Путеводные Огни

**Агент: C (Chat/AI/Data)**  
**Base:** `main @ ff4878e`  
**Branch:** `agent-c/m14-vozhatifficator`

## Контекст

Из видения: «Вожатификатор — книжка по лагерной педагогике. 3 раздела: 2013-2019 (готов), 2019-2022 (в разработке), 2023+ (в разработке). Путеводные Огни — чек-лист вожатификации.»

В UI раздел Вожатификатор существует (контент 2013-2019).

## Scope

### 1. Разделы «В разработке»

Создать stub-контент для двух разделов:
- `ai-data/vozhatifficator/2019-2022.json`:
  ```json
  {"title": "2019-2022", "status": "in_development", "preview": "Этот раздел находится в разработке..."}
  ```
- `ai-data/vozhatifficator/2023-present.json`:
  ```json
  {"title": "2023 — настоящее время", "status": "in_development", "preview": "..."}
  ```

### 2. Путеводные Огни (Guiding Lights)

Чек-лист вожатификации — аналог Inspector но для вожатых:
- Создать `ai-data/vozhatifficator/guiding_lights.json`:
  ```json
  {
    "title": "Путеводные Огни",
    "description": "Чек-лист для проверки своего уровня вожатификации по системе Бро Отряда",
    "categories": [
      {
        "title": "Основы вожатства",
        "tasks": [
          {"id": "gl_1", "title": "Знаю правила безопасности", "level": "beginner"},
          {"id": "gl_2", "title": "Умею проводить орг.сбор", "level": "beginner"}
        ]
      }
    ]
  }
  ```
- Заполнить **минимум 3 категории × 5 пунктов** (15+ чек-пойнтов)
- Связать с соответствующими БРО значками

### 3. API

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/vozhatifficator/sections` | Список разделов (3 штуки) |
| GET | `/api/vozhatifficator/guiding-lights` | Чек-лист Путеводных Огней |

### 4. Chatbot prompt

Добавить секцию про Вожатификатор и Путеводные Огни.

## DoD
- [ ] 2 stub JSON для разделов «в разработке»
- [ ] `guiding_lights.json` с 15+ чек-пойнтами
- [ ] 2 API endpoints
- [ ] Chatbot prompt updated
