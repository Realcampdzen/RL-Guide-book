# План рефакторинга: RBAC и Изоляция Идентичности

- `[x]` **1. Унификация проверки прав (Frontend / `ProfileView.tsx` / `AppViewRouter.tsx`)**
    - `[x]` Внедрить хук `usePermissions` в `ProfileView.tsx`
    - `[x]` Заменить хардкод `role === ...` на `can('...')`
    - `[x]` Убрать излишние утилиты типа `canSeeOtradBlocks` или заменить их вызовами правильной функции
- `[x]` **2. Защита Identity Model (Frontend / Backend)**
    - `[x]` Проверено: `useAuth.ts` и `authStorage.ts` уже чисто переключают storageKey на бандл baseDeviceId при 401.
    - `[x]` Проверено: `ProgressContext` изолирует сохранение по namespace (user account vs v1 traveler).
- `[x]` **3. Изоляция Rate Limits (Backend)**
    - `[x]` Проверено: В production `device_id` для `/api/chat` берётся из JWT payload (actor id), а не из X-Device-Id заголовка. Ошибок rate limit collision не будет.
- `[/]` **4. Архитектурный Рефакторинг `ProfileView.tsx` (DDD / Strangler Fig)**
    - `[x]` Разработать и утвердить архитектурный Master Plan (`implementation_plan.md`)
    - `[x]` Фаза 0: Изоляция ChildRouteModal (Proof of Concept)
    - `[x]` Фаза 1: Удушение Стейта (вынос `useState` в `useProfileModals`, `useProfileForms`, `usePlannerState`)
    - `[x]` Фаза 2: Изоляция Модальных Инстансов (`PlannerModal`, `ProofModal` готовы)
    - `[x]` Фаза 3: Децентрализация Катушек (`InspectorContainer`, `CouncilContainer`, `TeamContainer`)
