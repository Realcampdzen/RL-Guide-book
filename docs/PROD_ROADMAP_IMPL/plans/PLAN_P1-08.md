# PLAN_P1-08 — Единый контур чата через backend (убрать Cloudflare обходы)

**Агент:** C  
**Task ID:** P1-08  
**Дата создания плана:** 2026-02-21  
**Статус:** in_progress

---

## 1. Цель задачи

В prod-режиме все вызовы ИИ-чата и лимитов идут через наш backend `/api/chat` и `/api/chat/limits`. Убрать прямые вызовы Cloudflare endpoint `https://real-vibe-ai-studio.pages.dev/api/putevoditel/chat` из клиентского кода в prod-сборке.

Ссылка на описание задачи в [`TASKS.md`](../TASKS.md#p1-08).

---

## 2. Контекст (что уже есть)

- `src/utils/aiService.ts` — 6 функций, каждая содержит logic:
  ```
  const useLocalApi = import.meta.env.DEV || hostname === 'localhost' || hostname === '127.0.0.1';
  const chatbotUrl = useLocalApi ? '/api/chat' : 'https://real-vibe-ai-studio.pages.dev/api/putevoditel/chat';
  ```
  Итого ≈ 5 мест с дублированием этой логики + `getChatbotUrl()` helper тоже содержит Cloudflare URL.
- `src/components/ChatBot.tsx` — прямой Cloudflare URL в `sendText()` и в `useEffect` для лимитов (строки 77–78, 331–334)
- Backend `/api/chat` и `/api/chat/limits` уже реализованы и работают

**Цель изменения:**  
- В prod (`import.meta.env.PROD === true`) всегда использовать backend URL из env
- Ввести `VITE_BACKEND_URL` — базовый URL backend API
- Cloudflare URL убрать или оставить только для `import.meta.env.DEV` (явно)

**Invariants (нельзя сломать):**
- В local dev (`import.meta.env.DEV`) поведение не меняется — `/api/chat` через Vite proxy
- Все существующие функции продолжают работать через backend

---

## 3. Файлы для изменения

| Файл | Тип изменения | Описание |
|------|---------------|----------|
| `src/utils/aiService.ts` | modify | Заменить логику выбора URL: в prod → backend URL из `VITE_BACKEND_URL` env |
| `src/components/ChatBot.tsx` | modify | Заменить Cloudflare URL → backend URL в sendText и chat/limits useEffect |
| `.env.example` | modify | Добавить `VITE_BACKEND_URL` |

---

## 4. Шаги реализации

1. **Добавить helper `getChatApiUrl()` в `aiService.ts`**
   - Единая функция определения endpoint:
     ```ts
     function getChatApiUrl(): string {
       if (import.meta.env.DEV) return '/api/chat';
       return (import.meta.env.VITE_BACKEND_URL || '').replace(/\/$/, '') + '/api/chat';
     }
     function getChatLimitsUrl(): string {
       if (import.meta.env.DEV) return '/api/chat/limits';
       return (import.meta.env.VITE_BACKEND_URL || '').replace(/\/$/, '') + '/api/chat/limits';
     }
     ```
   - Заменить все 5 мест с hardcoded URL в aiService.ts

2. **Обновить `ChatBot.tsx`**
   - Заменить в `useEffect` для chat/limits: `limitsUrl` → использовать helper
   - Заменить в `sendText`: `chatbotUrl` → использовать helper
   - Импортировать helper из aiService или дублировать inline

3. **Обновить `.env.example`**
   - Добавить: `# VITE_BACKEND_URL=https://your-backend.vercel.app`

---

## 5. Зависимости

- **Зависит от:** P1-06 рекомендован (RBAC на backend), но P1-08 можно делать параллельно
- **Блокирует:** —
- **Параллельно:** P1-07

---

## 6. Риски

| Риск | Вероятность | Митигация |
|------|-------------|-----------|
| `VITE_BACKEND_URL` не задан в prod → пустой URL | Средняя | Fallback: если VITE_BACKEND_URL пуст → relative `/api/chat` (работает если FE и BE на одном origin) |
| CORS при разных доменах FE и BE | Средняя | backend/app.py уже использует flask-cors, проверить конфиг |

---

## 7. Definition of Done

- [x] В prod-сборке нет прямых запросов на Cloudflare endpoint
- [x] `ChatBot.tsx` использует только `/api/chat` или `VITE_BACKEND_URL + /api/chat`
- [x] `aiService.ts` в prod не переключается на внешний endpoint
- [x] `.env.example` обновлён: `VITE_BACKEND_URL`
- [ ] Отчёт создан в `reports/REPORT_C_P1-08.md`
- [ ] `CLAIM_BOARD.md` обновлён (статус done)
- [ ] `TASKS.md` обновлён (статус done + Evidence)

---

## 8. Отклонения от плана (заполнять по ходу)

*Пусто — заполнять во время реализации, если план меняется.*
