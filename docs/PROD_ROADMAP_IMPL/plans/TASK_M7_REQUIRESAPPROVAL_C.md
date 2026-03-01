# TASK: M7-REQUIRESAPPROVAL-C — Флаг requiresApproval в ai-data

**Агент: C (Chat/AI/Data)**  
**Base:** `main @ 00d320a`  
**Branch:** `agent-c/m7-requires-approval`

## Контекст

Сейчас в продукте есть система заявок на подтверждение уровней значков (backend + UI). Но в данных (`public/ai-data/`) нет явного указания, какие значки требуют staff-подтверждения, а какие можно self-claim. Это продуктовое решение Q3: «mixed — бытовые/рефлексивные/безопасные self-claim, ключевые/БРО/социально значимые через staff».

## Что читать

- `docs/PROD_ROADMAP_IMPL/AGENT_INSTRUCTIONS.md` — правила работы
- `docs/PRODUCT_MECHANICS_AND_ROADMAP.md` §7.4 (подтверждение достижений, Q3)
- `public/ai-data/` — структура JSON-данных значков
- `chatbot/prompts/system_prompt.py` — системный промпт НейроВалюши
- `src/types/userProgress.ts` — типы прогресса (model)

## Scope

### 1. Добавить поле `requiresApproval` в JSON-схему значков

В каждом JSON-файле уровня значка (`public/ai-data/category-X/X.Y.json`) в объекте каждого уровня добавить опциональное поле:

```json
{
  "id": "9.1.1",
  "title": "...",
  "requiresApproval": true,
  ...
}
```

**Правила разметки:**
- `requiresApproval: true` — категория **9 (БРО)**, все уровни (инициация, бродела, бросвящение — это социально значимые действия)
- `requiresApproval: true` — категория **10 (Реальный Лагерь)**, все уровни (организационные значки лагеря)
- Остальные категории — **не добавлять поле** (по умолчанию = false = self-claim)

### 2. TypeScript тип

Добавить в `src/types/` (или обновить существующий тип данных значков) опциональное поле:

```typescript
requiresApproval?: boolean;
```

Убедиться, что TypeScript build проходит.

### 3. Обновить системный промпт чатбота

В `chatbot/prompts/system_prompt.py` — если в контексте текущего значка `requiresApproval: true`, добавить в промпт фразу:

> «Этот значок требует подтверждения вожатым. Расскажи участнику, что после выполнения действий нужно отправить заявку через кнопку «Подтвердить уровень» — вожатый проверит и одобрит.»

Если `requiresApproval` нет или false — не добавлять эту фразу.

### 4. Валидация

- `npm run build` — TypeScript build clean
- `npm run self-check` — без ошибок
- Проверить, что JSON-файлы в `public/ai-data/category-9/` и `category-10/` содержат `requiresApproval: true`
- Проверить, что JSON-файлы в остальных категориях **не** содержат это поле

## DoD

- [ ] JSON файлы в `category-9/` и `category-10/` обновлены
- [ ] TypeScript тип обновлён, build clean
- [ ] Системный промпт обновлён с условной логикой
- [ ] `npm run build` проходит
- [ ] Коммит на ветку `agent-c/m7-requires-approval`

## Формат отчёта

```
Агент: C (Chat/AI/Data)
Task: M7-REQUIRESAPPROVAL-C
Branch: agent-c/m7-requires-approval
Base: main @ 00d320a
Commit: <hash>

Файлы:
- [MOD] public/ai-data/category-9/*.json (requiresApproval: true)
- [MOD] public/ai-data/category-10/*.json (requiresApproval: true)
- [MOD] src/types/<relevant-file>.ts (optional field)
- [MOD] chatbot/prompts/system_prompt.py (conditional phrase)

Build: npm run build — CLEAN
Self-check: npm run self-check — CLEAN
```
