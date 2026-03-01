# TASK: M7-PLAN-UI-B — План значка: UI подтверждения

**Агент: B (Frontend/UX)**  
**Base:** `main` (текущее состояние — Agent A уже добавил endpoints)  
**Branch:** `agent-b/m7-plan-ui`

## Контекст

Agent A реализовал серверный workflow для планов значков. Теперь нужно подключить UI.

**Новые API endpoints (уже работают):**
- `POST /api/badges/plans` — создать/обновить план (upsert по device_id+badge_id)
- `GET /api/badges/plans/mine` — мои планы (?status=filter)
- `GET /api/badges/plans/inbox` — планы на review (staff)
- `PATCH /api/badges/plans/<id>/review` — approve/reject с counselorNote

## Что читать

- `docs/PROD_ROADMAP_IMPL/AGENT_INSTRUCTIONS.md` — правила работы
- `docs/BACKEND_CONTRACT_GUARD.md` §3.7 — контракты Badge Plans API
- `src/views/ProfileView.tsx` — ЛК, модалка плана, inbox
- `src/utils/badgeApprovalApi.ts` — как устроены API-вызовы для заявок (образец)
- `backend/app.py` — endpoints (для понимания request/response формата)

## Scope

### 1. Утилита API для планов

Создать `src/utils/badgePlanApi.ts` (по аналогии с `badgeApprovalApi.ts`):
- `submitBadgePlan(plan)` → POST /api/badges/plans
- `fetchMyPlans(status?)` → GET /api/badges/plans/mine
- `fetchPlansInbox()` → GET /api/badges/plans/inbox
- `reviewPlan(planId, status, note?)` → PATCH /api/badges/plans/{id}/review

### 2. Кнопка «Отправить план вожатому» в модалке плана

В `ProfileView.tsx` в модалке «План получения» (где есть `IBadgePlan`):
- Добавить кнопку «Отправить план вожатому» (при наличии `accessToken` и роли `participant`)
- При клике: вызов `submitBadgePlan()` → тост «План отправлен!»
- Гейт: `FeatureGate` для traveler (показать «Разблокируй по коду»)

### 3. Статус-чип на плане

Показать статус плана визуально:
- `draft` → серый чип «Черновик»
- `submitted` → жёлтый чип «На проверке»
- `approved` → зелёный чип «✓ Одобрен» + counselorNote
- `rejected` → красный чип «✗ Отклонён» + counselorNote

### 4. Вкладка «Планы» в inbox staff

В `ProfileView.tsx` рядом с «Входящие заявки» добавить:
- Вкладку/переключатель «Планы» (для staff ролей)
- Список submitted планов с кнопками Approve/Reject
- При Approve/Reject: модалка с counselorNote → вызов `reviewPlan()` → оптимистичный UI

### 5. Синхронизация статуса планов

При загрузке ЛК (mount):
- Вызвать `fetchMyPlans()` если есть token
- Обновить локальные `IBadgePlan` статусами с сервера (если сервер вернул approved/rejected)

## DoD

- [ ] `badgePlanApi.ts` создан с 4 функциями
- [ ] Кнопка «Отправить план» работает
- [ ] Статус-чипы отображаются корректно
- [ ] Staff видит планы в inbox и может approve/reject
- [ ] `npm run build` — clean
- [ ] `npx tsc --noEmit` — clean

## Формат отчёта

```
Агент: B (Frontend/UX)
Task: M7-PLAN-UI-B
Branch: agent-b/m7-plan-ui
Commit: <hash>

Файлы:
- [NEW] src/utils/badgePlanApi.ts
- [MOD] src/views/ProfileView.tsx
- [MOD] (другие изменённые файлы)

Build: npm run build — CLEAN
TSC: npx tsc --noEmit — CLEAN
```
