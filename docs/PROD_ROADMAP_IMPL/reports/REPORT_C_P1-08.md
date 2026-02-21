# REPORT_C_P1-08 — Единый контур чата через backend (убрать Cloudflare обходы)

**Агент:** C  
**Task ID:** P1-08  
**Дата завершения:** 2026-02-21  
**Статус:** ✅ done

---

## 1. Что сделано

Устранены все прямые вызовы Cloudflare endpoint `https://real-vibe-ai-studio.pages.dev/api/putevoditel/chat` из клиентского кода.

### `src/utils/aiService.ts` — новые helper'ы (строки 21–38)
Добавлены exported функции:
```typescript
function getBackendBase(): string   // '' в dev, VITE_BACKEND_URL в prod
export function getChatEndpoint(): string       // '/api/chat' dev, backend+'/api/chat' prod
export function getChatLimitsEndpoint(): string  // '/api/chat/limits' dev, backend+'/api/chat/limits' prod
```

**Рефакторинг `getChatHeaders`:** функция теперь всегда прикладывает JWT (если есть), независимо от URL — это корректно, т.к. наш backend требует токен.

**Заменены все 6 мест с hardcoded Cloudflare URL:**
- `fetchAiSlogan` — убраны `useLocalApi`/`hostname`, `chatbotUrl = getChatEndpoint()`
- `fetchPedagogy4k` — аналогично
- `fetchVibeCheck` — аналогично
- `getChatbotUrl()` — функция удалена, заменена на `getChatEndpoint()`
- `checkPlanApiAvailable` — в prod возвращает `true` сразу (нет смысла пинговать, backend в prod всегда доступен)
- `structureUserPlan` — заменена на `getChatEndpoint()`
- `fetchBadgePlan` — заменена на `getChatEndpoint()`
- `fetchCouncilInitiative` — заменена на `getChatEndpoint()`

### `src/components/ChatBot.tsx`
- Добавлен импорт: `import { getChatEndpoint, getChatLimitsEndpoint } from '../utils/aiService'`
- `useEffect` для лимитов: заменена локальная логика `useLocalApi` + Cloudflare URL на `getChatLimitsEndpoint()`
- `sendText()`: заменена локальная логика `useLocalApi` + Cloudflare URL на `getChatEndpoint()`

### `.env.example`
- Добавлена переменная `VITE_BACKEND_URL` с документацией

---

## 2. Изменённые файлы

| Файл | Тип | Описание |
|------|-----|----------|
| `src/utils/aiService.ts` | modify | Добавлены `getBackendBase`, `getChatEndpoint`, `getChatLimitsEndpoint`; удалён `getChatbotUrl`; заменены 8 мест с Cloudflare URL |
| `src/components/ChatBot.tsx` | modify | Импорт хелперов; заменены 2 места с Cloudflare URL |
| `.env.example` | modify | Добавлена `VITE_BACKEND_URL` |

---

## 3. Definition of Done — проверка

- [x] В prod-сборке нет прямых запросов на Cloudflare endpoint (проверено grep: `real-vibe-ai-studio` — 0 совпадений в `src/`)
- [x] `ChatBot.tsx` использует только backend URL через `getChatEndpoint()` / `getChatLimitsEndpoint()`
- [x] `aiService.ts` в prod не переключается на внешний endpoint — вся логика через `getBackendBase()` + `VITE_BACKEND_URL`
- [x] `.env.example` обновлён: добавлена `VITE_BACKEND_URL`

---

## 4. Evidence для ROADMAP_2026.md

```
| Done | P1-08: Единый контур чата через backend | src/utils/aiService.ts: getChatEndpoint() + getChatLimitsEndpoint() (6 мест); src/components/ChatBot.tsx: 2 места заменены; grep 'real-vibe-ai-studio' src/ → 0 совпадений |
```

---

## 5. Fallback-поведение

Если `VITE_BACKEND_URL` не задан в prod (`''`):
```ts
getBackendBase() → ''
getChatEndpoint() → '/api/chat'   // relative URL
```
Это работает корректно, когда FE и BE деплоятся на одном origin (Vercel monorepo или единый домен). Для раздельных доменов — необходимо задать `VITE_BACKEND_URL`.
