# TASK: M7-SHARE-TRIGGERS-B — Шеринг: in-moment триггеры

**Агент: B (Frontend/UX)**  
**Base:** `main` (текущее состояние)  
**Branch:** `agent-b/m7-share-triggers`

## Контекст

Генератор соцкарточек уже работает (6 kinds, 2 formats). Но нет «триггеров в моменте» — приложение не предлагает создать карточку в ключевые моменты (rank-up, завершение дневника и т.д.). Нужно добавить ненавязчивые CTA.

## Что читать

- `docs/PROD_ROADMAP_IMPL/AGENT_INSTRUCTIONS.md` — правила работы
- `src/utils/socialGenerator.ts` — генератор карточек (kinds, formats)
- `src/context/ProgressContext.tsx` — прогресс, ранг (`getRank`)
- `src/components/RealDiaryDashboard.tsx` — дневник
- `src/views/ProfileView.tsx` — ЛК

## Scope

### 1. Триггер при Rank Up

В `ProgressContext.tsx` или `ProfileView.tsx`:
- При изменении ранга (когда `getRank(prev) !== getRank(current)`) — показать тост/оверлей:
  - «🎉 Новый ранг: [название]! Создать карточку?»
  - Кнопка → открывает Share Center с предвыбранным kind `progress_summary`
- Не показывать повторно (флаг в localStorage или `userData.meta`)

### 2. Триггер при 100% заполнении Реального Дневника

В `RealDiaryDashboard.tsx`:
- Определить «100%» как: все 3 поля (утро/день/вечер) заполнены за текущий день
- Показать тост: «📓 Дневник дня заполнен! Поделиться карточкой?»
- Кнопка → вызов `generateSocialCard({ kind: 'progress_summary', ... })`

### 3. Безопасность карточек

Проверить все пути генерации карточек:
- Убедиться, что `deviceId`, `accessToken`, JWT, внутренние ID **не попадают** в canvas/текст карточки
- Только безопасные поля: nickname, ранг, счётчики прогресса

## DoD

- [ ] Rank-up тост работает при изменении ранга
- [ ] Diary 100% тост работает
- [ ] Карточки не содержат чувствительных данных
- [ ] `npm run build` — clean
- [ ] `npx tsc --noEmit` — clean

## Формат отчёта

```
Агент: B (Frontend/UX)
Task: M7-SHARE-TRIGGERS-B
Branch: agent-b/m7-share-triggers
Commit: <hash>

Файлы:
- [MOD] src/context/ProgressContext.tsx или src/views/ProfileView.tsx
- [MOD] src/components/RealDiaryDashboard.tsx
- [MOD] (другие изменённые файлы)

Build: npm run build — CLEAN
TSC: npx tsc --noEmit — CLEAN
```
