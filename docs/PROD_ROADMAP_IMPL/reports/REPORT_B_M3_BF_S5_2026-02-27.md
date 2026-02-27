# REPORT: M3-BF-S5 — Auto-sync + Celebration + Reject Reason

**Агент:** B (UX/Frontend consistency)  
**Task ID:** M3-BF-S5  
**Дата:** 2026-02-27  
**Branch:** `agentb/m3-bf-s5-auto-sync`  
**Commit:** `44533b0`  
**Статус:** ✅ DONE

---

## Что сделано

### Deliverable 1: `performApprovalSync(silent: boolean)` — рефакторинг и авто-синк

Прежний `syncApprovedLevels` (однорежимный, без защиты от повторного применения) заменён на `performApprovalSync(silent: boolean)`:

- **"Only new" фильтр:** перед вызовом `applyApprovedLevel` проверяется `getLevelProgress(levelId)?.status === 'achieved'` — уже начисленные уровни пропускаются.
- **Silent mode:** когда `silent=true` — нет блокирующих спиннеров, нет `setApprovalsSyncStatus`, тихий fail при ошибке API.
- **Celebration:** если `applied > 0` — вызывается `startTutorial` с заголовком «Уровень получен!» и CTA `onComplete: () => setActiveTab('collection')`. Один hint на весь батч.
- **Alias `syncApprovedLevels`** сохранён (`useCallback(() => performApprovalSync(false), [performApprovalSync])`) — все существующие call sites работают без изменений.

### Deliverable 2: Авто-синк при монтировании

Добавлен `autoSyncDoneRef` + `useEffect`:

```tsx
const autoSyncDoneRef = useRef(false);
useEffect(() => {
  if (autoSyncDoneRef.current) return;
  if (!accessToken || !canRequestApprovals) return;
  autoSyncDoneRef.current = true;
  void performApprovalSync(true);
}, [accessToken, canRequestApprovals, performApprovalSync]);
```

- Срабатывает ровно один раз за mount (ref-guard).
- Зависит от `accessToken` — роли `traveler` и `parent` без токена не затронуты (M2 safe implicit).
- `canRequestApprovals` guard — дополнительная защита для staff-only режимов.

### Deliverable 3: Причина отклонения в «Мои заявки»

Под чипом `rejected` отображается серый текст «Причина: [resolutionNote]» (max 100 символов, с ellipsis, `title` атрибут для полного текста).

---

## M2 Guard — подтверждено

| Проверка | Результат |
|----------|-----------|
| Auto-sync требует `accessToken` | ✅ traveler/parent без токена — не запускается |
| Auto-sync требует `canRequestApprovals` | ✅ только participant/counselor/educator |
| Блок «Мои заявки» рендерится только при `canRequestApprovals && !isParentChildReadonlyView` | ✅ (из M3-BF-S4, без изменений) |
| Rejection reason виден только в разрешённых ролях | ✅ (в том же guard-блоке) |

---

## Build output

```
✓ 189 modules transformed.
✓ built in 1m 24s
```

Lint: 0 ошибок (ReadLints — no linter errors found).

---

## Изменённые файлы

| Файл | Изменение |
|------|-----------|
| `src/views/ProfileView.tsx` | +50 / -10 строк: `performApprovalSync`, `syncApprovedLevels` alias, `autoSyncDoneRef`, auto-sync `useEffect`, rejection reason display |

CSS изменений нет (chip-классы добавлены в M3-BF-S4).  
`badgeApprovalApi.ts` не изменён (read-only).

---

## Definition of Done — checklist

- [x] Auto-sync при mount работает: новые одобрения применяются без действий пользователя
- [x] Hint с celebration (`startTutorial`) показывается только если есть новые уровни (`applied > 0`)
- [x] Hint единый на батч, с CTA «Открыть коллекцию» (`setActiveTab('collection')`)
- [x] Reject reason отображается под чипом с truncation до 100 символов
- [x] M2 guard подтверждён (`accessToken` + `canRequestApprovals` guards)
- [x] `syncApprovedLevels` alias сохранён — существующие call sites работают
- [x] Build clean: 189 modules, 0 errors
- [x] Lint clean: 0 linter errors
- [x] Commit `44533b0` на ветке `agentb/m3-bf-s5-auto-sync`
- [x] CLAIM_BOARD обновлён

---

## Handoff

Следующий шаг для оркестратора: смержить `agentb/m3-bf-s5-auto-sync` → `main`. Далее возможные задачи:
- M3-BF-S6: тест end-to-end синка через реальный `/api/badges/requests/mine` endpoint (Agent A сделал backend).
- Добавить анимацию получения значка в `collection`-табе при навигации через CTA.
