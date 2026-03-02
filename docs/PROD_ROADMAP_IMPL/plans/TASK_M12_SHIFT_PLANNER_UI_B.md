# TASK: M12-SHIFT-PLANNER-UI-B — План-сетка: UI

**Агент: B (Frontend/UX)**  
**Base:** `main` (после merge A)  
**Branch:** `agent-b/m12-shift-planner-ui`  
**Depends:** M12-SHIFT-PLANNER-A

## Scope

### 1. API утилита `scheduleApi.ts`
- `fetchSchedule(shiftId)` → GET all events
- `fetchDaySchedule(shiftId, dayIndex)` → GET day
- `createEvent(token, shiftId, data)` → POST
- `updateEvent(token, eventId, data)` → PATCH
- `deleteEvent(token, eventId)` → DELETE

### 2. ShiftSchedulePanel компонент

Таблица-сетка: дни смены × временные слоты.
- Горизонталь: дни (День 1, День 2, ... День N)
- Вертикаль: время (07:00, 08:00, ..., 22:00)
- Ячейки: карточки событий с цветом по типу
  - 🟢 event (зелёный)
  - 🟡 training (жёлтый)
  - 🔵 workshop (синий)
  - 🟣 tradition (фиолетовый)
  - ⚪ free_time (серый)
  - 🟠 meal (оранжевый)

### 3. Создание/редактирование

Для shift_leader:
- Клик на пустой слот → modal: title + type + time + responsible (dropdown вожатых)
- Клик на существующее событие → edit modal
- Удаление через кнопку в edit modal

### 4. Навигация

- Доступ из кабинета Вожатского Отряда (таб «План-сетка»)
- Read-only для участников (видят своё расписание)

## DoD
- [ ] `scheduleApi.ts` создан
- [ ] ShiftSchedulePanel с таблицей-сеткой
- [ ] CRUD для shift_leader
- [ ] Read-only для участников
- [ ] `tsc --noEmit` clean
