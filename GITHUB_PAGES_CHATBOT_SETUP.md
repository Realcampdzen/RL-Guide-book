# 🤖 Настройка чат-бота для GitHub Pages

## ✅ Как работает на GitHub Pages

1. **Фронтенд** деплоится как статический сайт на GitHub Pages.
2. **Чат-бот в продакшене** ходит в Cloudflare endpoint:
   `https://real-vibe-ai-studio.pages.dev/api/putevoditel/chat`
3. **Локально** используется `/api/chat` через Vite proxy к Flask backend (порт 4000).

## 🔧 Что нужно настроить

### 1) Cloudflare endpoint
- Проверьте, что endpoint доступен и отвечает.
- В Cloudflare Secrets заданы `OPENAI_API_KEY` и `OPENAI_MODEL`.
- CORS разрешает `https://realcampdzen.github.io` и кастомный домен (если есть).

### 2) Если меняется URL эндпоинта
Обновите адрес в `src/components/ChatBot.tsx` (production URL).

## 🔐 GitHub Secrets
Для GitHub Pages секреты не нужны — ключи хранятся на стороне Cloudflare.

## 🚀 Деплой
1. Пуш в `main` запускает `.github/workflows/deploy-simple.yml`.
2. Проверяем сайт: `https://realcampdzen.github.io/RL-Guide-book/`.
3. Проверяем чат: открыть виджет и отправить сообщение.

## 🧪 Быстрая проверка
- Если чат молчит — проверьте консоль браузера (CORS/500).
- Посмотрите логи Cloudflare Worker (Requests/Errors).
