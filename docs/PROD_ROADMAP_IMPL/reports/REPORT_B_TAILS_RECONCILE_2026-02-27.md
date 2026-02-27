# REPORT: TAILS_RECONCILE_B — UX Tail Reconciliation

**Agent:** B (UX/Frontend consistency)  
**Task ID:** TAILS_RECONCILE_B  
**Date:** 2026-02-27  
**Branch:** devbro/m5-r1-2-runtime-warnings  
**Commit:** `9e7ab96`

---

## 1. ImageSourceBlock — Таблица использования

| Экран / Компонент | context передан | onGenerate | onProcess | Назначение | Корректно? |
|---|---|---|---|---|---|
| `TeamDashboard.tsx` | `team_flag` | ✅ (requestImageGenerate) | ✅ | Флаг Движка | ✅ |
| `TeamDashboard.tsx` | `gerb` | ✅ (requestImageGenerate) | ✅ | Герб Движка | ✅ |
| `ProfileView.tsx` | `passport_avatar` | ❌ нет | ❌ нет | Аватар паспорта (upload-only) | ✅ (по дизайну upload-only) |
| `ProfileView.tsx` | `workshop_badge` | ✅ (requestImageGenerate) | ✅ | Изображение значка Кузницы | ✅ |
| `WingDashboard.tsx` | `wing_avatar` | ✅ (requestImageGenerate) | ✅ | Аватар Крыла | ✅ |
| `SquadCornerDashboard.tsx` | `squad_photo` | ✅ (context-switched: squad_corner/counselor_squad) | ✅ | Фото уголка (4 поля) | ✅ |
| `CounselorSquadDashboard.tsx` | `squad_photo` | ✅ (context: counselor_squad, если canEdit) | ✅ | Фото вожатского отряда | ✅ |

### Где НЕ используется (по дизайну не должен)

- **Родительский раздел (M2 parent read-only)** — ImageSourceBlock не используется. Раздел содержит только read-only просмотр прогресса ребёнка. Любой upload/generate был бы нарушением M2 safety boundary. ✅ CONFIRMED
- **CouncilDashboard** — только текстовые карточки инициатив, изображения не нужны. ✅ по дизайну.
- **SquadCabinetPanel** — только chip статуса и кнопки навигации, без загрузки изображений. ✅ по дизайну.

### Выявленный gap: `process` label в DEFAULT_LABELS

Кнопка «Обработать ИИ» ранее fallback-ила на хардкод `labels.process ?? 'Обработать ИИ'`, но поле `process` не было объявлено ни в одном context-specific DEFAULT_LABELS. Это делало перевод/кастомизацию кнопки невозможной через стандартный `labels` prop. **Исправлено** (см. ниже).

---

## 2. M3/M4 Chip & Label Consistency Audit

### squad-corner-readiness-chip (M3-SC)

Хелпер: `getSquadCornerReadinessTone()` → `'muted' | 'warn' | 'success'`  
Используется в: `SquadCornerDashboard.tsx`, `SquadCabinetPanel.tsx`

| Статус | label | tone | CSS border | CSS color (до) | CSS color (после) |
|---|---|---|---|---|---|
| `empty` | Уголок пуст | `muted` | rgba(255,255,255,0.2) | ❌ нет | `rgba(255,255,255,0.55)` ✅ |
| `partial` | Уголок частично заполнен | `warn` | rgba(255, 196, 86, 0.52) | ❌ нет | `rgba(255, 196, 86, 0.9)` ✅ |
| `ready` | Уголок готов | `success` | rgba(90, 215, 140, 0.52) | ❌ нет | `rgba(90, 215, 140, 0.9)` ✅ |

**Было:** border-color задан, color текста не задан → текст наследовал `rgba(255,255,255,0.x)` базового `.m3-status-chip` (нечитаемый на warn/success тонах).

### council-status-chip (M3-CN)

Хелпер: прямое значение `readStatus` → class `tone-${st}`  
Используется в: `CouncilDashboard.tsx`

| Статус | label | CSS border | CSS color (до) | CSS color (после) |
|---|---|---|---|---|
| `new` | Новая | rgba(255,255,255,0.26) | ❌ нет | `rgba(255,255,255,0.6)` ✅ |
| `reviewing` | На рассмотрении | rgba(255, 196, 86, 0.52) | ❌ нет | `rgba(255, 196, 86, 0.9)` ✅ |
| `accepted` | Принята | rgba(90, 215, 140, 0.52) | ❌ нет | `rgba(90, 215, 140, 0.9)` ✅ |
| `rejected` | Отклонена | rgba(255, 110, 110, 0.52) | ❌ нет | `rgba(255, 110, 110, 0.9)` ✅ |
| `done` | Выполнена | rgba(86, 170, 255, 0.5) | ❌ нет | `rgba(86, 170, 255, 0.9)` ✅ |

Все 5 council статусов покрыты CSS ✅. Legacy mapper (`mapLegacyInitiativeStatus`) корректен ✅.

---

## 3. M2 Parent Read-Only — Подтверждение

- `ProfileView.tsx` parent-секция (`isParentMode`): ImageSourceBlock **отсутствует** в parent child-view.
- В parent read-only блоке используются только `img` (display-only) + text.
- `canUseExpensiveActions(role)` блокирует AI-кнопки для non-traveler ролей на уровне компонента (defense-in-depth).
- Никакие upload/generate/process возможности **не доступны** родителю.
- **ВЕРДИКТ: M2 parent read-only boundary — NOT TOUCHED. ✅**

---

## 4. Изменённые файлы

| Файл | Тип изменения |
|---|---|
| `src/components/ImageSourceBlock.tsx` | Добавлен `process` label в DEFAULT_LABELS для 6 context-ов |
| `src/styles/profile-view.css` | Добавлен `color` к squad-corner-readiness-chip и council-status-chip тонам |

---

## 5. Build & Smoke

- `npm run build` → exit_code: 0, `✓ built in 1m 56s`
- TypeScript: без ошибок
- Lint: без ошибок
- RBAC: не затронут
- M2 parent read-only: не затронут

---

## 6. Handoff

**Для оркестратора (НейроСтёпа):**

- Commit `9e7ab96` на ветке `devbro/m5-r1-2-runtime-warnings` — безопасен для включения в релиз
- Изменения low-risk: только CSS color-токены + label-поле в компоненте
- ImageSourceBlock coverage matrix задокументирован — можно использовать как baseline для следующего цикла
- CLAIM_BOARD обновлён

**Открытые наблюдения (не баги, к сведению):**
- `SquadCornerDashboard` и `CounselorSquadDashboard` используют `context="squad_photo"` для ImageSourceBlock labels, но передают разные context-строки в `requestImageGenerate` API (`squad_corner` / `counselor_squad`). Это корректно — два разных уровня абстракции.
- `passport_avatar` в ProfileView — upload-only (нет onGenerate/onProcess). По дизайну: аватар паспорта генерируется отдельным потоком.
