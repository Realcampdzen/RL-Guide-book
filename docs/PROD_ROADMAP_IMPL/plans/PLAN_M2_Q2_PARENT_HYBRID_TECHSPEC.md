# PLAN_M2_Q2_PARENT_HYBRID_TECHSPEC.md

M2 / Q2: Родительский hybrid-контур

## Цель

Сделать родительский режим двухконтурным:
1) у родителя есть **свой ЛК**,
2) просмотр прогресса ребёнка всегда **read-only** через отдельную витрину.

## Product contract

- Parent persona не «играет» как participant.
- Родитель видит:
  - свой кабинет (заметки/организационные блоки/ссылки),
  - отдельный блок «Прогресс ребёнка» (read-only).
- Любые действия, изменяющие прогресс ребёнка, из parent-view запрещены.

## Scope M2

### Frontend

1. `ProfileView`:
- разделить parent UX на две зоны:
  - Parent Home (свой контур),
  - Child Progress View (read-only).

2. Read-only guard:
- отключить/скрыть интерактивные CTA «В путь», «Подтвердить», «Создать» в режиме просмотра ребёнка.
- оставить только безопасные действия: просмотр/копирование/шеринг read-only отчёта.

3. Маркеры режима:
- явный бейдж «Режим родителя / просмотр ребёнка (read-only)».

### Backend

4. `parent-snapshot`:
- подтвердить контракт только на чтение для parent-кодов.
- TTL/валидация/ошибки 404/410 оставить прозрачными.

5. RBAC hardening:
- проверить, что parent role не может вызывать mutation endpoint’ы ребёнка.

## Технические шаги

1. Аудит UI точек мутаций в parent-flow.
2. Внедрение `isParentChildReadonlyView` флага в ProfileView/BadgeView entrypoints.
3. Централизованный guard helper для кнопок/панелей.
4. Проверка API на mutation запреты для parent.
5. Smoke сценарии + evidence.

## Smoke checklist (M2)

1. Parent открывает `parent_code`/`parent_view`.
2. Видит read-only индикатор.
3. Не может отправить заявки/изменить прогресс.
4. Может просматривать достижения и данные ребёнка.
5. Ошибки просроченного кода читаемы (410/404) и не ломают ЛК.

## Definition of Done

- Parent UX разделён на «свой ЛК» и «витрина ребёнка (read-only)».
- Мутации ребёнка из parent-view недоступны на UI и backend.
- Есть отчёт и smoke evidence.
