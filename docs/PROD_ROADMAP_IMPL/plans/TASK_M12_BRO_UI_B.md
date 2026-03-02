# TASK: M12-BRO-UI-B — БРО: UI прогрессии

**Агент: B (Frontend/UX)**  
**Base:** `main` (после merge A)  
**Branch:** `agent-b/m12-bro-ui`  
**Depends:** M12-BRO-BACKEND-A

## Scope

### 1. API утилита `broApi.ts`
- `initiateBro(token, squadId)` → POST initiate
- `fetchBroEvents(squadId)` → GET events
- `fetchMyPassport(deviceId)` → GET passport
- `startPassport(token, broEventId)` → POST passport
- `markTask(token, passportId, taskId)` → PATCH task
- `createWing(token, squadId, data)` → POST engine with type=bro_wing

### 2. БРО панель
- Подключить существующую БРО секцию к серверным данным
- Для вожатого: кнопка «Объявить Бросвящение в отряде»
- Для участника: после Бросвящения → BroPassport чек-лист
- Визуальный прогресс: задания с чекбоксами + progress bar
- Завершение: анимация + «Создать Крыло»

### 3. Крыло
- Кабинет Крыла = EngineCabinetPanel с type=bro_wing (reuse)
- Отображение в Отрядном Уголке с маркером 🦅

### 4. Разблокировка БРО значков
- При completed BroPassport → снять lock с категории «БРО значки»
- В ProfileView: показать бейдж «БРО» рядом с ником

## DoD
- [ ] `broApi.ts` создан
- [ ] BroPassport UI работает
- [ ] Крыло создаётся и отображается
- [ ] `tsc --noEmit` clean
