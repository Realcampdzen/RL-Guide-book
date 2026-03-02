# TASK: M14-PILOT-HARDENING-B — Пилотная полировка

**Агент: B (Frontend/UX)**  
**Base:** `main` (после всех merge)  
**Branch:** `agent-b/m14-pilot-hardening`  
**Depends:** M14-CAMP-DIRECTOR-A, M14-VOZHATIFFICATOR-C (для интеграции)

## Контекст

Финальная полировка перед пилотом на реальной смене. Все новые компоненты M11-M14 должны быть интегрированы, иметь error boundaries и loading states.

## Scope

### 1. Интеграция новых компонентов M14

- **Camp Director Panel**: подключить `/api/camp/overview` → dashboard с карточками статистики (shifts, squads, engines, workshops, initiatives, badges, inspector, bro)
- Доступ: кнопка в правой панели для camp_director
- «Предложение Начальника» маркер в CouncilDashboard

- **Вожатификатор**: подключить 2 stub-раздела + Путеводные Огни чек-лист из C
- Существующий раздел → добавить 2 таба «2019-2022» и «2023+» с плашкой «В разработке»
- Путеводные Огни: чек-лист аналогичный InspectorBenefitPanel

- **Parent**: кнопка «Забронировать путёвку» → внешняя ссылка (CTA)

### 2. Error Boundaries

Обернуть все новые компоненты M11-M14 в React ErrorBoundary:
- `EngineCabinetPanel`
- `InspectorBenefitPanel`
- `BroPassportPanel`
- `ShiftSchedulePanel`
- `CounselorSquadDashboard`
- `EducatorWorkshopPanel`
- `FourKPanel`
- `CampDirectorPanel` (новый)

Fallback: «Произошла ошибка. Попробуйте обновить страницу.» + кнопка retry.

### 3. Loading States

Все API-вызовы → spinner + skeleton во время загрузки:
- engineApi, inspectorBenefitApi, broApi, scheduleApi, workshopApi, fourKApi, councilApi

### 4. Offline Fallbacks

Для critical panels: если API недоступен → показать данные из localStorage cache (если есть) + плашку «Офлайн — данные могут быть устаревшими».

### 5. Empty States

Для всех списков: если пустые → приятное сообщение вместо пустоты:
- «Пока нет Движков. Создай первый!»
- «Начни свой путь Инспектора Пользы»
- «Ещё никто не предложил инициативу»

## DoD
- [ ] Camp Director Panel интегрирован
- [ ] Вожатификатор + Путеводные Огни подключены
- [ ] ErrorBoundary на всех M11-M14 компонентах
- [ ] Loading states на всех API
- [ ] Offline fallbacks
- [ ] Empty states
- [ ] `tsc --noEmit` clean
