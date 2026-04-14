# Отчёт: реализация MVP «Смены и отряды» (staff-флоу)

**Дата отчёта:** 9 февраля 2026

---

## 1. Кто такой агент

- **Имя/тип:** Auto — агент-маршрутизатор в Cursor (AI coding assistant).
- **Режим работы:** выполнение плана по задаче «Создание смен/отрядов организатором» из [FEATURE_AUTH_ROLES_DVIZHKI_PLAN.md](../../docs/FEATURE_AUTH_ROLES_DVIZHKI_PLAN.md) §7–8; реализация по приложенному плану (staff_flow_shifts_squads_mvp).
- **Ограничение:** не редактировать сам план; отмечать задачи по плану (todo) по мере выполнения.

---

## 2. Контекст и цель

- **Цель:** фундамент «смена → отряды → коды» для онлайн-Движков; организатор создаёт смены/отряды и выдаёт коды без глобального секрета в клиенте.
- **Уже было:** роли (organizer, shift_leader, counselor), JWT, verify-code, generate-code по секрету, counselor-squad (локально).
- **Не было:** уровень «смена», API смен/отрядов, ЛК организатора.

---

## 3. Что сделано — бэкенд

- **Файл:** [backend/app.py](../../backend/app.py).
- **Константы:** `SHIFTS_FILE`, `_SHIFTS_LOCK`, `ORGANIZER_ROLES`.
- **Функции:** `_require_organizer_jwt()`, `_shifts_load()`, `_shifts_save()`; хранение в `backend/data/shifts.json` в формате `{ "shifts": [...], "squads": [...] }`.
- **Эндпоинты** (все требуют JWT организатора или developer):
  - `GET /api/shifts` — список смен;
  - `POST /api/shifts` — создание смены (name, startDate, endDate);
  - `GET /api/shifts/<shiftId>/squads` — список отрядов смены;
  - `POST /api/shifts/<shiftId>/squads` — создание отряда (name);
  - `POST /api/organizer/generate-code` — выдача кода (deviceId, role, shiftId опционально) по JWT, без заголовка X-Generate-Code-Secret.
- Существующий `POST /api/auth/generate-code` оставлен для песочницы/скриптов.

---

## 4. Что сделано — фронтенд

- **[src/types/authRole.ts](../../src/types/authRole.ts):** добавлена функция `canCreateShiftsAndSquads(role)`; роль `organizer` уже была в типах и подписях.
- **[src/utils/authStorage.ts](../../src/utils/authStorage.ts):** изменений нет; роль организатора сохраняется как есть.
- **[src/views/ProfileView.tsx](../../src/views/ProfileView.tsx):**
  - Импорт и использование `canCreateShiftsAndSquads`; отображение подписи роли для organizer в паспорте.
  - Состояние: список смен, карта отрядов по сменам, формы и модалки для смены/отряда/кода.
  - Загрузка: при роли организатора и наличии accessToken — GET /api/shifts, затем для каждой смены GET /api/shifts/:id/squads.
  - Блок «Смены и отряды»: список смен с датами, по каждой — список отрядов, кнопки «Добавить отряд», «Создать смену», «Выдать код».
  - Модалки: создание смены (название, даты), добавление отряда (название), выдача кода (deviceId, роль, смена опционально) с отображением кода и кнопкой «Копировать».
- Все запросы к новым API с заголовком `Authorization: Bearer <accessToken>`.

---

## 5. Критерии готовности (из плана)

- Организатор по JWT создаёт смены и отряды через API и через ЛК.
- Организатор в ЛК выдаёт код (deviceId, роль, смена); код верифицируется через существующий verify-code и выдаёт JWT с ролью и campId = shiftId.
- Список смен и отрядов отображается в ЛК и сохраняется в `data/shifts.json`.

---

## 6. Что не входило в MVP

- Панель вожатого (§7.3); назначение вожатых на отряд; точки коммуникации и лимиты; связь counselor-squad с отрядами смены.

---

## 7. Всё, что сделано в этом чате (полный перечень)

Ниже — полный список действий агента в чате по файлам и шагам.

### Backend (backend/app.py)

- Добавлены константы после `_PARENT_SNAPSHOTS_LOCK`: `SHIFTS_FILE`, `_SHIFTS_LOCK`, `ORGANIZER_ROLES`.
- Добавлена функция `_require_organizer_jwt()` после `_require_parent_snapshot_auth()` (проверка Bearer JWT, роль organizer или developer).
- Добавлены функции `_shifts_load()` и `_shifts_save()` после `_parent_snapshots_save()` (чтение/запись `data/shifts.json` с lock).
- Добавлены маршруты после `auth_verify_code()` и перед `parent_snapshot_create()`:
  - `GET /api/shifts`
  - `POST /api/shifts`
  - `GET /api/shifts/<shift_id>/squads`
  - `POST /api/shifts/<shift_id>/squads`
  - `POST /api/organizer/generate-code`

### Frontend (src/types/authRole.ts)

- Добавлена функция `canCreateShiftsAndSquads(role)` (возвращает true для organizer и developer).
- В импорт из authRole в ProfileView добавлен экспорт `canCreateShiftsAndSquads`.

### Frontend (src/views/ProfileView.tsx)

- В импорт из authRole добавлено `canCreateShiftsAndSquads`.
- Добавлена переменная `showOrganizerPanel = canCreateShiftsAndSquads(role)`.
- Добавлено состояние: `organizerShifts`, `organizerSquadsMap`, `organizerShiftFormOpen`, `organizerShiftForm`, `organizerSquadFormOpen`, `organizerSquadFormShiftId`, `organizerSquadFormName`, `organizerCodeModalOpen`, `organizerCodeForm`, `organizerCodeResult`, `organizerLoading`, `organizerError`.
- Добавлен `organizerApiBase` (useMemo) для выбора dev/prod API.
- Добавлены два useEffect: загрузка смен при `showOrganizerPanel` и `accessToken`; загрузка отрядов по списку смен (зависимость от id смен).
- В блок отображения роли в паспорте добавлена роль `organizer` в массив (вместе с counselor, shift_leader, developer).
- Добавлен блок «Смены и отряды» (условие `showOrganizerPanel`): заголовок, индикатор загрузки/ошибки, список смен с отрядами, кнопки «Создать смену», «Выдать код», «Добавить отряд» по каждой смене.
- Добавлены три модалки:
  - форма создания смены (name, startDate, endDate + POST /api/shifts);
  - форма добавления отряда (name + POST /api/shifts/:id/squads);
  - форма выдачи кода (deviceId, role, shiftId + POST /api/organizer/generate-code + отображение кода и копирование).

### Todo-лист в чате

- Созданы и отмечены выполненными:
  1. Backend: shifts.json load/save, _require_organizer_jwt, shifts/squads API
  2. Backend: POST /api/organizer/generate-code
  3. Frontend: authRole + authStorage organizer, canCreateShiftsAndSquads
  4. ProfileView: блок «Смены и отряды» (shifts, squads, выдать код)

### Проверки

- Вызов read_lints для изменённых файлов (ошибок нет).
- Запуск npm run self-check (успешно).

### Файл authStorage

- Изменений не вносилось (роль organizer уже не маппилась в shift_leader в текущей версии).
