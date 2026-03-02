# TASK: M13-EDUCATOR-WORKSHOP-UI-B — Кабинет Мастерской: UI

**Агент: B (Frontend/UX)**  
**Base:** `main` (после merge A)  
**Branch:** `agent-b/m13-educator-workshop-ui`  
**Depends:** M13-EDUCATOR-WORKSHOP-A

## Scope

### 1. API утилита `workshopApi.ts`
- `createWorkshop(token, data)` → POST
- `fetchWorkshops()` → GET list
- `fetchWorkshop(id)` → GET detail
- `updateWorkshop(token, id, data)` → PATCH
- `addParticipant(token, id, data)` → POST participant
- `addBadge(token, id, badgeId)` → POST badge
- `removeBadge(token, id, badgeId)` → DELETE badge
- `confirmBadge(token, id, badgeId, deviceId)` → POST confirm

### 2. EducatorWorkshopPanel компонент

По принципу Кабинета Отряда:
- **Информация**: название, направление мастерской (editable для educator)
- **Участники**: список с возможностью добавления
- **Значки**: привязанные из Путеводителя + «Добавить значок» (search/select)
- **Подтверждения**: для каждого участника × значок → кнопка «Подтвердить получение»
- **Расписание**: интеграция с ShiftSchedulePanel (events type=workshop с workshop_id)

### 3. Отображение в Вожатском Отряде
- В табе «Мастерские» CounselorSquadDashboard: показывать реальные данные из API (вместо текущего filtered members stub)

### 4. Навигация
- Кнопка в правой панели кабинета «Кабинет Мастерской» (для educator)
- Или через таб Мастерские в Вожатском Отряде

## DoD
- [ ] `workshopApi.ts` создан
- [ ] EducatorWorkshopPanel работает
- [ ] Интеграция в CounselorSquadDashboard
- [ ] `tsc --noEmit` clean
