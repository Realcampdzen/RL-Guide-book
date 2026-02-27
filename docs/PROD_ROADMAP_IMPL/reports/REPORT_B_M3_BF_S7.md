# REPORT: M3-BF-S7 — ESLint HIGH + Staff Inbox Enrichment

**Агент:** B (UX/Frontend consistency)
**Task ID:** M3-BF-S7
**Дата:** 2026-02-28
**Branch:** `agent-b/m3-bf-s7`
**Commit:** `fa05be9`
**Статус:** DONE

---

## Что сделано

### Deliverable 1: ESLint HIGH — 6 no-unused-expressions исправлены

Паттерн `proofPhotoInputRef.current && (proofPhotoInputRef.current.value = '')` нарушал правило `no-unused-expressions` ESLint (результат логического AND не используется).

Заменено на `if`-форму во всех 6 местах:

```tsx
// БЫЛО:
proofPhotoInputRef.current && (proofPhotoInputRef.current.value = '');

// СТАЛО:
if (proofPhotoInputRef.current) proofPhotoInputRef.current.value = '';
```

Строки: 3551, 3586, 3625, 6336, 6402, 6410. Замена выполнена через `replace_all`, подтверждена grep-ом (6 новых вхождений, 0 старых).

### Deliverable 2: Inbox — отображение squadId отправителя

Строка requestedBy (~L5590) расширена — добавлен `req.squadId` как вторичный контекст:

```tsx
{req.requestedBy?.nickname || req.requestedBy?.deviceId || '—'}
{req.squadId && <span style={{ opacity: 0.6 }}> · отряд {req.squadId}</span>}
<span style={{ opacity: 0.6 }}> · {new Date(req.createdAt).toLocaleString('ru-RU')}</span>
```

Примечание: `BadgeRequestItem.requestedBy` не содержит `squadName` в типе — доступен только `req.squadId` на верхнем уровне. Это read-only отображение.

### Deliverable 3: Счётчик pending в заголовке inbox

Заголовок «Inbox подтверждений значков» заменён на динамичный с счётчиком pending:

```tsx
Входящие заявки{pendingCount > 0 ? ` (${pendingCount})` : ''}
```

При 0 pending — просто «Входящие заявки» без скобок.

---

## M2 Guard — подтверждено

Inbox-блок без изменений защищён `{canModerateApprovals && ...}`. M2 parent read-only safe.

---

## Build output

```
agent-b/m3-bf-s7
✓ 189 modules transformed.
✓ built in 1m 51s
```

Lint: ReadLints — no linter errors found.

---

## Изменённые файлы

| Файл | Изменение |
|------|-----------|
| `src/views/ProfileView.tsx` | +12/-8 строк: 6 ESLint fix + squadId display + pending counter |

---

## Definition of Done — checklist

- [x] 6 ESLint HIGH исправлены (no-unused-expressions → if-форма)
- [x] Inbox показывает squadId отправителя как secondary info
- [x] Счётчик pending в заголовке «Входящие заявки (N)»
- [x] Build: 0 errors (189 modules)
- [x] Lint: 0 ошибок
- [x] M2 guard не тронут
- [x] Commit `fa05be9` на ветке `agent-b/m3-bf-s7`
- [x] CLAIM_BOARD обновлён

---

## Handoff

Ветка `agent-b/m3-bf-s7` готова к merge в `main`. Следующие возможные задачи:
- Расширить тип `BadgeRequestItem.requestedBy` чтобы включить `squadName` когда backend начнёт его возвращать
- M3-BF-S8: дальнейшие UX улучшения inbox (сортировка по дате, фильтрация по статусу)
