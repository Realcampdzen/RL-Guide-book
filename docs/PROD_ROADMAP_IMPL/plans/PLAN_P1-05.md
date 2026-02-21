# PLAN_P1-05 — Убрать forced traveler в prod

**Агент:** B  
**Task ID:** P1-05  
**Дата создания плана:** 2026-02-21  
**Статус:** in_progress

---

## 1. Цель задачи

Убрать блок в `src/utils/authStorage.ts`, который принудительно возвращает роль `traveler` при `import.meta.env.PROD`. После этого роль берётся напрямую из JWT-токена, выданного бэкендом. Это критично для pilot-режима: участник смены должен сохранять роль `participant` в prod, а не деградировать до `traveler`.

Ссылка: [TASKS.md P1-05](../TASKS.md#p1-05--frontend-убрать-forced-traveler-в-prod)

---

## 2. Контекст (что уже есть)

- **`src/utils/authStorage.ts`** — содержит `loadAuthStorage()`. Строка 62:
  ```ts
  const effectiveRole = import.meta.env.PROD && role !== 'traveler' ? 'traveler' : role;
  ```
  Это блокирует работу всех ролей (participant, counselor, shift_leader и т.д.) в prod-сборке.

- **`src/context/AuthContext.tsx`** — вызывает `loadAuthStorage()` при инициализации и после `setAuth`. Токен хранится в `rl_auth_v1` ключ localStorage.

- **JWT структура** (от `/api/auth/verify-code`): содержит `role`, `campId`, `deviceId`, `exp`. Декодируется на фронте при `setAuth` в `ProfileView`.

- **`DEFAULT_ROLE`** = `'traveler'` — используется при отсутствии/невалидности токена.

- **Что нельзя сломать:**
  - `clearAuthStorage()` при истёкшем токене (exp check) — сохранить.
  - Поддержка legacy role value `'organizer'` → маппинг на `'shift_leader'` — сохранить.
  - Local dev с JSON-файлами — не затрагивается (это чисто frontend-изменение).

---

## 3. Файлы для изменения

| Файл | Тип изменения | Описание |
|------|---------------|----------|
| `src/utils/authStorage.ts` | modify | Удалить строку с `effectiveRole` (forced traveler), использовать `role` напрямую |

---

## 4. Шаги реализации

1. **Удалить forced traveler из `loadAuthStorage`**
   - В `src/utils/authStorage.ts`, строка 62: удалить строку с `effectiveRole` и заменить `effectiveRole` на `role` в return-объекте.
   - Убедиться, что exp-check и DEFAULT_ROLE при ошибке остаются нетронутыми.

2. **Проверить UX при отсутствии токена**
   - При `DEFAULT_ROLE` = `'traveler'` пользователь видит CTA "ввести код".
   - В `ProfileView` уже есть проверка: traveler → показывается секция unlock/sandbox.
   - Убедиться в коде, что при cleared/expired токене пользователь получает понятный UI.

3. **Lint-проверка**
   - Запустить `npm run self-check` чтобы убедиться, что изменение не сломало ничего.

---

## 5. Зависимости

- **Зависит от:** P1-06 (Server-side RBAC по JWT) — для полной безопасности нужен работающий backend RBAC; данная задача — frontend-часть, которая выполняется параллельно/заранее.
- **Блокирует:** P1-09 (UX smoke-сценарии) — нужна рабочая роль в prod для прохождения сценариев.
- **Параллельно:** P1-04 (закрыть dev-двери), P1-06 (RBAC backend).

---

## 6. Риски

| Риск | Вероятность | Митигация |
|------|-------------|-----------|
| Старые сессии в localStorage с `developer` ролью выйдут в prod | Средняя | exp-check обнулит при истечении; при первом деплое можно сбросить ключ, но не обязательно — developer роль выдаётся только через verify-code |
| Пользователь с невалидным токеном получает доступ | Низкая | Бэкенд всё равно проверяет JWT на каждом запросе (P1-06); фронт — только UI-гейты |

---

## 7. Definition of Done

- [x] Блок `import.meta.env.PROD` → forced traveler удалён из `authStorage.ts`
- [x] Роль определяется из `accessToken` (JWT payload) через нормальный flow `loadAuthStorage`
- [x] При expired/отсутствующем токене → DEFAULT_ROLE = 'traveler' → понятный UX (CTA "ввести код")
- [x] `npm run self-check` проходит без ошибок
- [x] Отчёт создан в `reports/REPORT_B_P1-05.md`
- [x] `CLAIM_BOARD.md` обновлён (статус done)
- [x] `TASKS.md` обновлён (статус done + Evidence)
- [x] `docs/ROADMAP_2026.md` обновлён (новая строка Done)
- [x] `.memory-bank/progress.md` обновлён (Recent Changes)

---

## 8. Отклонения от плана (заполнять по ходу)

*Пусто — заполнять во время реализации, если план меняется.*
