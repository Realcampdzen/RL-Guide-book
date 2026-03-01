# TASK: M8-COUNCIL-UI-B — Совет Лагеря: UI инициатив

**Агент: B (Frontend/UX)**  
**Base:** `main` (после merge A)  
**Branch:** `agent-b/m8-council-ui`  
**Depends:** M8-COUNCIL-INITIATIVES-A

## Контекст

Agent A добавляет CRUD для инициатив Совета. Нужно подключить UI: список, создание, голосование, статусы.

## Что читать

- `docs/BACKEND_CONTRACT_GUARD.md` §3.8 — API контракты (после merge A)
- `src/components/CouncilDashboard.tsx` — текущий UI Совета
- `src/utils/aiService.ts` — `fetchCouncilInitiative()` (текущая ИИ-генерация)

## Scope

### 1. API-утилита `councilApi.ts`

- `createInitiative(token, data)` → POST
- `fetchInitiatives(token, filters?)` → GET
- `updateInitiativeStatus(token, id, status)` → PATCH
- `voteInitiative(token, id)` → POST vote

### 2. Вкладка «Инициативы» в CouncilDashboard

- Список инициатив с карточками (title, description, status-чип, votes, author)
- Кнопка «Предложить инициативу» → модалка (title + description + опционально teamId)
- Кнопка голосования 👍 (один голос на устройство, состояние = localStorage)
- Staff может менять статус инициативы (dropdown: proposed→discussed→approved→in_progress→done)

### 3. Связь с ИИ-генератором

Сохранить текущий `fetchCouncilInitiative()` как «Сгенерировать идею ИИ» → результат подставляется в форму создания инициативы.

## DoD

- [ ] `councilApi.ts` создан
- [ ] Список инициатив отображается
- [ ] Создание + голосование работает
- [ ] Staff может менять статусы
- [ ] `npm run build` clean, `tsc --noEmit` clean
