# TASK: M11-INSPECTOR-UI-B — Инспектор Пользы: UI в кабинете

**Агент: B (Frontend/UX)**  
**Base:** `main` (после merge C)  
**Branch:** `agent-b/m11-inspector-ui`  
**Depends:** M11-INSPECTOR-C

## Контекст

В кабинете есть stub-кнопка «Игровая система полезных дел. Прокачивает 4К и культуру заботы.» сверху. Нужно подключить к серверным данным из M11-INSPECTOR-C.

## Scope

### 1. API утилита `inspectorApi.ts`
- `fetchChecklists()` → GET
- `fetchProgress(deviceId)` → GET progress
- `markTaskDone(token, data)` → POST progress
- `approveTask(token, taskId)` → PATCH approve

### 2. InspectorPanel компонент

При нажатии на stub-кнопку открывается панель:
- Список чек-листов с прогресс-баром (3/5 выполнено)
- Текущий активный чек-лист развёрнут
- Заблокированные чек-листы (серые, с подсказкой «Завершите предыдущий»)

### 3. Карточка задания
- Описание задания
- Чекбокс «Выполнено» → отметка + «Ждёт подтверждения вожатого»
- 4К маркер-чип (какой навык прокачивает): цветной бейдж
- Статус: not_started | done_pending | approved

### 4. Staff approve в inbox
- Новая вкладка «Инспектор» в staff inbox (рядом с Заявки, Планы, Арты)
- Список заданий pending approval
- Кнопка «Подтвердить» на каждом

### 5. Прогрессия
- При завершении всех заданий чек-листа → анимация + разблокировка следующего
- Share trigger: «Чек-лист завершён! Создать карточку?»

## DoD
- [ ] `inspectorApi.ts` создан
- [ ] InspectorPanel подключён к stub-кнопке
- [ ] Чек-листы с прогрессией отображаются
- [ ] Staff может подтверждать задания
- [ ] `npm run build` clean, `tsc --noEmit` clean
