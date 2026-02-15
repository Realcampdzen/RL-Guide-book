# Отчёт по реализации плана ролей, RBAC и подтверждений

**Дата:** 2026-02-11  
**План-источник:** `docs/PLAN_ROLES_RBAC_AND_APPROVALS.md`

## 1. Результат в целом

Реализован рабочий контур:

- role-based доступы для ключевых API и UI-сценариев;
- traveler-модель «видно, но нельзя» для дорогих действий;
- MVP-процесс подтверждений значков: `request -> inbox -> approve/reject -> sync в локальный прогресс`;
- базовый контур membership (участник/вожатый <-> отряд/смена);
- dev UX для быстрой симуляции ролей и прогресса.

## 2. Реализация по этапам плана

## Этап A — Feature Gates для traveler

### Что сделано

- Добавлен единый компонент гейта:
  - `src/components/FeatureGate.tsx`
  - режимы `overlay | replace`, причина блокировки, CTA.
- Расширены role-хелперы:
  - `src/types/authRole.ts`
  - `isTraveler`, `canUseExpensiveActions`, `canRequestBadgeApproval`, `canModerateBadgeApprovals`.
- Добавлена блокировка дорогих действий в image UI:
  - `src/components/ImageSourceBlock.tsx`
  - disabled для traveler + пояснение + CTA «Разблокировать по коду».
- В `ProfileView` гейты применены к панелям и разделам, где traveler должен видеть функциональность, но без онлайн-действий:
  - `SquadCornerDashboard`, `RealDiaryDashboard`, `TeamDashboard`, `CouncilDashboard`, `WingDashboard`, ветки spaceship/non-spaceship.
- Для `ImageSourceBlock` в `ProfileView` добавлен единый CTA на unlock:
  - `src/views/ProfileView.tsx`.

### Итог по этапу A

Этап закрыт для MVP: traveler видит ключевые экраны, но дорогие действия и online-потоки закрыты единым lock UX.

## Этап B — Dev UX быстрых сценариев

### Что сделано

- Добавлен dev endpoint для мгновенного получения JWT на localhost:
  - `POST /api/dev/login`
  - файл: `backend/app.py`.
- В UI песочницы добавлены кнопки:
  - `Dev login: Participant / Parent / Counselor / Shift leader`
  - `Dev logout`
  - отображение состояния busy/error.
  - файл: `src/views/ProfileView.tsx`.
- Расширен dev-блок прогресса:
  - выдача статуса сразу по списку `levelId` (через запятую);
  - добавлена кнопка `Сбросить прогресс`.
  - файл: `src/views/ProfileView.tsx`.
- Зафиксировано правило «не смешивать role и token»:
  - при sandbox-смене роли токен сбрасывается.
  - файл: `src/context/AuthContext.tsx`.

### Итог по этапу B

Этап закрыт: локально можно быстро эмулировать роли и состояние прогресса без ручной возни с секретами/кодами.

## Этап C — MVP подтверждений значков

### Backend (данные и API)

- Добавлены файловые хранилища:
  - `backend/data/badge_requests.json`
  - `backend/data/memberships.json`
  - и соответствующие load/save helpers в `backend/app.py`.
- Добавлен RBAC helper:
  - `_require_roles(...)` в `backend/app.py`.
- Добавлена валидация `levelId`:
  - `_is_valid_level_id(...)` в `backend/app.py`.
- Добавлены endpoints:
  - `POST /api/badges/requests`
  - `GET /api/badges/requests/mine`
  - `GET /api/badges/requests/inbox`
  - `POST /api/badges/requests/<id>/approve`
  - `POST /api/badges/requests/<id>/reject`
  - `GET /api/badges/approvals/mine`

### Frontend

- Добавлен API-слой для approvals:
  - `src/utils/badgeApprovalApi.ts`.
- В карточке уровня добавлена отправка заявки:
  - кнопка «Отправить на подтверждение вожатому»
  - файл: `src/views/BadgeLevelView.tsx`.
- В `ProfileView` переработан bubble «Заявки»:
  - вкладки `Подтверждения значков` и `События webhook (legacy)`;
  - блоки «Мои заявки», «Inbox подтверждений», «Синхронизация одобрений».
- Добавлено применение одобрений в локальный прогресс:
  - `applyApprovedLevel(levelId, evidence?)`
  - файл: `src/context/ProgressContext.tsx`.

### Итог по этапу C

Этап закрыт для MVP: полный цикл подтверждений работает в архитектуре offline-first с явной синхронизацией решений на устройство.

## Этап D — Membership (минимальный фундамент)

### Что сделано

- Добавлены endpoints:
  - `POST /api/squads/<squadId>/join`
  - `GET /api/squads/mine`
  - файл: `backend/app.py`.
- При создании badge request подставляются membership-контексты `campId/squadId`, если есть.
- В inbox для staff добавлена фильтрация по `campId/squadId` + авто-ограничение для counselor по своему membership.
- В UI (`ProfileView`) добавлен блок «Мой отряд»:
  - просмотр текущего membership;
  - вступление в отряд по `squadId` (participant/developer);
  - для staff показ участников отряда.

### Итог по этапу D

Этап закрыт на MVP-уровне, достаточном для связки participant/staff и фильтров заявок.

## Этап E — Совет лагеря как сущность

### Статус

Не реализовывался как отдельный новый workflow (`initiatives.json` + отдельные API), так как в плане обозначен как optional «после MVP подтверждений».

## 3. Технические детали реализации

## Backend (`backend/app.py`)

Добавлены:

- новые константы и lock-объекты для хранилищ заявок и membership;
- универсальные auth-утилиты, включая localhost-dev сценарии;
- membership resolve helpers;
- валидация levelId;
- dev-login endpoint;
- approvals и memberships API.

Старые контуры webhook events сохранены как legacy и доступны во вкладке событий.

## Frontend

Ключевые изменения:

- role-хелперы и правила доступа: `src/types/authRole.ts`;
- корректный auth state reset при смене роли: `src/context/AuthContext.tsx`;
- unified lock UX: `src/components/FeatureGate.tsx`;
- блокировка expensive image flows для traveler: `src/components/ImageSourceBlock.tsx`;
- отправка заявки из экрана уровня: `src/views/BadgeLevelView.tsx`;
- sync одобрений в local progress: `src/context/ProgressContext.tsx`;
- approvals/membership API-клиент: `src/utils/badgeApprovalApi.ts`;
- основной orchestration UI: `src/views/ProfileView.tsx`.

## 4. Валидация и проверки

Выполнены проверки:

1. `npx tsc --noEmit` — успешно.
2. `python -m py_compile backend/app.py` — успешно.
3. `npm run self-check` — успешно (без ошибок выполнения).

Примечание из self-check:

- есть предупреждение про реальные секреты в `.env` (рекомендована ротация и хранение только локально).

## 5. Что дополнительно доработано в процессе

- Убраны неиспользуемые импорты/переменные в `ProfileView`, из-за которых падал strict TS.
- В dev-панели добавлен массовый apply по нескольким `levelId` за одно действие.
- В image-блоках профиля добавлен унифицированный CTA на unlock для traveler.

## 6. Оставшиеся риски и следующие улучшения

1. Добавить отдельные интеграционные smoke-тесты API для approvals/membership.
2. Вынести часть крупной логики `ProfileView` в подкомпоненты (технический долг по размеру файла).
3. Для этапа E (если подтверждается приоритет): ввести сущность инициатив Совета лагеря как отдельный backend workflow.

## 7. Файлы, затронутые в рамках плана

- `backend/app.py`
- `src/components/FeatureGate.tsx`
- `src/components/ImageSourceBlock.tsx`
- `src/context/AuthContext.tsx`
- `src/context/ProgressContext.tsx`
- `src/types/authRole.ts`
- `src/utils/badgeApprovalApi.ts`
- `src/views/BadgeLevelView.tsx`
- `src/views/ProfileView.tsx`
