# TASK: M8-STAFF-DASHBOARD-B — Staff dashboards: статистика смены

**Агент: B (Frontend/UX)**  
**Base:** `main @ c9458b4`  
**Branch:** `agent-b/m8-staff-dashboard`

## Контекст

Staff (counselor, shift_leader, educator) видит inbox заявок и планов, но нет агрегированной статистики по смене: сколько участников, сколько заявок, средний прогресс и т.д.

## Что читать

- `src/views/ProfileView.tsx` — ЛК, таб «Смены и отряды»
- `src/utils/badgeApprovalApi.ts` — API заявок
- `src/utils/badgePlanApi.ts` — API планов

## Scope

### 1. Компонент `StaffDashboardPanel.tsx`

Отображает для staff-ролей:
- **Счётчики:** pending заявок, pending планов, approved за сегодня
- **Участники смены:** nickname-список из `/api/squads/mine` (members)
- **Быстрые действия:** «Открыть inbox заявок», «Открыть inbox планов»

### 2. Интеграция в ProfileView

- Новая панель `staff-dashboard` в списке panel views
- Кнопка/ссылка «Панель staff» видна только для counselor/educator/shift_leader/camp_director
- Автоматически подгружает данные при открытии

### 3. Nickname snapshot

При отображении участников отряда показывать nickname из данных membership (уже есть в `/api/squads/mine` → `members[].nickname`).

## DoD

- [ ] `StaffDashboardPanel.tsx` создан
- [ ] Панель доступна staff-ролям
- [ ] Счётчики корректно отображаются
- [ ] `npm run build` clean, `tsc --noEmit` clean
