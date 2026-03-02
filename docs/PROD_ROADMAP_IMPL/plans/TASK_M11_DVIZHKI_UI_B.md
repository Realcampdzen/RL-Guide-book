# TASK: M11-DVIZHKI-UI-B — Движки: полный кабинет

**Агент: B (Frontend/UX)**  
**Base:** `main` (после merge A)  
**Branch:** `agent-b/m11-dvizhki-ui`  
**Depends:** M11-DVIZHKI-BACKEND-A

## Контекст

Раздел «Движок» уже есть в кабинете (нижняя панель). Есть табы: Мой Движок, План Движка, Путь Движка, Управление Лагерем. Есть кнопки «Создать» и «Вступить» (за auth lock). Нужно подключить к серверным данным и добавить полноценный кабинет.

## Scope

### 1. API утилита `engineApi.ts`
- `createEngine(token, squadId, data)` → POST
- `fetchEngines(squadId)` → GET
- `approveEngine(token, id)` → PATCH approve
- `joinEngine(token, id)` → POST join
- `leaveEngine(token, id)` → POST leave
- `updateGoal(token, id, goal)` → PATCH
- `approveGoal(token, id)` → PATCH goal/approve

### 2. Кабинет Движка
- Появляется при создании и одобрении Движка (аналогия с Отрядным Уголком)
- Участники: список с аватарами
- Цель Движка: ввести/отредактировать → «Отправить на утверждение вожатому» → статус-чип (draft/submitted/approved)
- Цель отображается в Отрядном Уголке рядом с аватаром Движка
- Чат Движка (reuse squad messages pattern но с engineId)

### 3. Действия из кабинета Движка
- «Предложить инициативу в Совет» → POST council initiative с engineId (reuse councilApi)
- «Предложить новую категорию» → modal с формой (title + description) → сохранить как предложение

### 4. Интеграция в Отрядный Уголок
- В секции кабинета отряда: аватары Движков + названия + текущая цель
- При клике → открытие кабинета Движка

### 5. Создание и вступление
- «Создать Движок»: modal (название + аватар) → pending → ждёт approve вожатого
- «Вступить в Движок»: список доступных → join

## DoD
- [ ] `engineApi.ts` создан
- [ ] Кабинет Движка работает
- [ ] Цель отображается в Отрядном Уголке
- [ ] Действия (Совет, категории) работают
- [ ] `npm run build` clean, `tsc --noEmit` clean
