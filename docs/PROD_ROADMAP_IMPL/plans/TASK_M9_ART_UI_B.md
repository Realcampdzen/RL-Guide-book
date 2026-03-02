# TASK: M9-ART-UI-B — Арты/скины: UI модерации и галерея

**Агент: B (Frontend/UX)**  
**Base:** `main` (после merge A)  
**Branch:** `agent-b/m9-art-ui`  
**Depends:** M9-ART-MODERATION-A

## Scope

### 1. API-утилита `badgeArtApi.ts`
- `submitArt(token, data)` → POST
- `fetchArts(badgeId?, status?)` → GET
- `fetchArtsInbox(token)` → GET inbox
- `reviewArt(token, id, status, note?)` → PATCH

### 2. Галерея артов в BadgeLevelView
- В карточке значка: секция «Арты сообщества» — grid утверждённых артов
- Кнопка «Предложить свой арт» → модалка (upload/paste + source select)
- Каноничный арт (status=canon) показывается первым с бейджем ⭐

### 3. Модерация в inbox staff
- Вкладка «Арты» рядом с «Заявки» и «Планы»
- Preview арта + approve/reject/canon кнопки

## DoD
- [ ] `badgeArtApi.ts` создан
- [ ] Галерея артов отображается
- [ ] Staff может модерировать
- [ ] `npm run build` clean, `tsc --noEmit` clean
