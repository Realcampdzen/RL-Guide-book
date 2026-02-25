# PLAN_M1_UI_SMOKE_CHECKLIST.md

UI smoke checklist для финального закрытия M1 scoped engines.

## Preconditions

- Backend запущен.
- `USE_SUPABASE=true` для целевого стенда.
- Миграция `003_teams_scope.sql` применена.

## Сценарии

1. Открыть ЛК -> «Кабинет управления Движка».
2. Нажать «Создать».
3. Проверить selector scope:
   - camp
   - shift
   - squad
4. Выбрать `camp`:
   - поля `shiftId/squadId` скрыты.
5. Выбрать `shift`:
   - `shiftId` виден,
   - `squadId` скрыт.
6. Выбрать `squad`:
   - `shiftId` и `squadId` видны.
7. Создать по одному движку в каждом scope-slot.
8. Проверить фильтрацию через query (если используется):
   - `?scope=shift&shiftId=...`
   - `?scope=squad&shiftId=...&squadId=...`
9. Проверить корректное поведение `/api/teams/mine` при разных контекстах.
10. Проверить отсутствие regressions:
    - лого/герб/план-таблица/вступление по коду.

## Acceptance

- Все 10 шагов пройдены без блокирующих ошибок.
- Зафиксированы скриншоты/заметки по каждому шагу.
- M1 пункт может быть переведён в done после фиксации evidence.
