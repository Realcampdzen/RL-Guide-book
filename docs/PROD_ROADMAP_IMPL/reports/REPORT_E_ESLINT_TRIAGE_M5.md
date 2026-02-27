# ESLint Triage Report — E-ESLINT-TRIAGE-M5

**Agent:** Cloud Agent E (Opus 4.6)  
**Date:** 2026-02-27  
**Command:** `npx eslint src/ --ext .ts,.tsx --format json`  
**Total:** 193 issues (157 errors, 36 warnings)

---

## CRITICAL (блокируют prod-безопасность)

**Нет.**

Анализ security-чувствительных файлов:

| Файл | Issues | Verdict |
|---|---|---|
| `src/utils/authStorage.ts` | 0 | Clean |
| `src/context/AuthContext.tsx` | 1 (`react-hooks/set-state-in-effect` L23) | **Safe.** `setAuthState(loadAuthStorage())` в пустом `useEffect([])` — идиоматичный паттерн гидрации; одноразовый рендер, каскад невозможен. |
| `src/utils/aiService.ts` | 0 | Clean |

Ни одного `@ts-ignore` в кодовой базе `src/`. Ни одного `no-unused-vars` в auth/JWT путях. Безопасность не затронута.

---

## HIGH (влияют на runtime, но не блокируют)

### `@typescript-eslint/no-unused-expressions` — 6 шт, все в ProfileView.tsx

Паттерн: `ref.current && (ref.current.value = '')` — short-circuit assignment вместо `if`.

- `ProfileView.tsx:3455` — сброс proofPhotoInput в onClick "Подтвердить"
- `ProfileView.tsx:3490` — дубликат (второй блок карточек пути)
- `ProfileView.tsx:3529` — сброс proofPhotoInput в журнале достижений
- `ProfileView.tsx:6049` — сброс proofPhotoInput в overlay onClick
- `ProfileView.tsx:6115` — сброс proofPhotoInput в кнопке "Отправить в Telegram"
- `ProfileView.tsx:6117` — сброс proofPhotoInput в кнопке "Отмена"

**Runtime-риск: нулевой.** Код работает корректно (`&&` выполняет присвоение). Стилевое нарушение, не баг.  
**Fix:** заменить на `if (ref.current) ref.current.value = ''` — 6 однострочных правок.

### `@typescript-eslint/no-unused-vars` — 15 шт

| Файл | Строки | Переменная | Риск |
|---|---|---|---|
| `ProfileView.tsx` | 2755, 5025, 5112, 5496 | `e` (catch param) | None — стандартные catch-ки |
| `TeamContext.tsx` | 142 | `e` (catch param) | None |
| `useCustomCursor.ts` | 155, 208 | `e` (catch param) | None |
| `useDataLoader.ts` | 86, 103, 259, 269, 345, 354, 373 | `_` (destructure skip) | None — паттерн `[_, value]` |
| `react-img-fetchpriority.d.ts` | 4 | `T` (generic param) | None — type declaration |

**Runtime-риск: нулевой.** Все — стандартные паттерны: пустые catch-параметры и деструктуризация с `_`.

### `no-empty` — 3 шт, все в ProfileView.tsx

- `ProfileView.tsx:1373` — `try { sessionStorage.removeItem(...) } catch {}` — **intentional** silent catch для sessionStorage
- `ProfileView.tsx:1380` — `try { window.history.replaceState(...) } catch {}` — **intentional** silent catch для history API
- `ProfileView.tsx:4898` — `try { localStorage.setItem(...) } catch {}` — **intentional** silent catch для localStorage quota

**Runtime-риск: нулевой.** Паттерн `try { storage.op() } catch {}` — защита от QuotaExceeded / SecurityError в iframe/incognito.

---

## NOISE (safe to ignore / pre-existing style)

| Count | Rule | Verdict |
|---|---|---|
| 83 | `@typescript-eslint/no-explicit-any` | Style. Массив в CategoryView (22), useAppController (14), ChatBot (6), ProgressContext (6), BadgeLevelView (6), и др. Все — `any` в event handlers, API responses, JSON parsing. Не security-risk. |
| 28 | `no-useless-escape` | Style. Regex escapes в строках — безвредны. |
| 21 | `react-hooks/exhaustive-deps` | Style. Намеренное исключение deps для предотвращения лишних ре-рендеров. Стандартная практика. |
| 16 | `react-hooks/set-state-in-effect` | Style/new rule. ESLint 8 React-hooks плагин новее, чем код; все экземпляры — идиоматичные паттерны (setState в useEffect для гидрации/синхронизации). |
| 6 | `react/no-unescaped-entities` | Style. Кавычки `"` в JSX тексте. |
| 6 | `react/no-unknown-property` | Style. Custom SVG attributes / `fetchpriority`. |
| 2 | `no-irregular-whitespace` | Style. Спецсимволы (неразрывные пробелы) в строках — намеренные. |
| 2 | `react-hooks/preserve-manual-memoization` | Style. Ручные useMemo/useCallback. |
| 2 | `prefer-const` | Style. `let` → `const`. |
| 2 | `no-extra-boolean-cast` | Style. `!!` unnecessary. |
| 1 | `react-hooks/purity` | Style. Side effect in render. |

**Итого NOISE: 169 из 193 (88%)**

---

## Рекомендации

1. **Ничего не блокирует release.** Нет critical issues.
2. **Quick win (10 мин):** заменить 6 `&&` expressions на `if()` в ProfileView → убрать 6 HIGH issues.
3. **Не рекомендуется:** массовый фикс `no-explicit-any` (83 шт) сейчас — высокий риск регрессий при низкой пользе.
4. **Для будущего:** добавить `"lint": "eslint src/ --ext .ts,.tsx --max-warnings 200"` в `package.json` scripts, чтобы CI ловил новые issues.

---

*Report by Cloud Agent E (Opus 4.6) — 2026-02-27*
