# Сервер кабины космического корабля — пересборка и запуск

Инструкция по пересборке и запуску сервера кабины после глобальных обновлений проекта (AuthProvider, бэкенд, Telegram, бот).

---

## 1. Зависимости

### Frontend
```bash
npm install
```

### Backend (Python)
```bash
pip install -r requirements.txt
# backend использует свой requirements.txt
cd backend && pip install -r requirements.txt
```

### Синхронизация данных (если меняли ai-data)
```bash
npm run sync:ai-data
```

---

## 2. Переменные окружения (.env)

Создайте `.env` в корне проекта (или скопируйте из `.env.example`):

```env
# API для чат-бота (обязательно для чата и формы плана)
OPENAI_API_KEY=sk-...

# Telegram (для webhook, отправки в канал, «Отправить в Telegram»)
TELEGRAM_BOT_TOKEN=...
TELEGRAM_CHANNEL_ID=...
TELEGRAM_WEBHOOK_SECRET=...

# Опционально: другие AI-провайдеры (см. .env.example)
# GOOGLE_API_KEY, ANTHROPIC_API_KEY и т.д.
```

**Примечание:** Без `OPENAI_API_KEY` чат и «Сгенерировать план» работать не будут (403/Connection error). Без Telegram-переменных — «Отправить в Telegram» и webhook недоступны.

---

## 3. Запуск сервисов

### Терминал 1: Backend (обязательно)
```bash
npm run start:backend
# или: cd backend && python app.py
```
- **Порт:** 4000  
- **Назначение:** API для чата, планов значков, community/bro-missions, Telegram webhook.

### Терминал 2: Сервер кабины
```bash
npm run dev:profile-desktop
```
- **Порт:** 3010  
- **URL кабины:** `http://localhost:3010/RL-Guide-book/profile-desktop.html`  
- Vite проксирует `/api/*` на backend (4000).

---

## 4. Открытие кабины

**URL:**
```
http://localhost:3010/RL-Guide-book/profile-desktop.html
```

Или по сетевому адресу (если host: true):
```
http://<ваш-IP>:3010/RL-Guide-book/profile-desktop.html
```

---

## 5. Что подтягивает кабина

| Компонент | Источник | Назначение |
|-----------|----------|------------|
| **AuthProvider** | `main.tsx` | Верификация кода, роли, чат (ChatBot, ProfileView используют useAuth) |
| **ProgressProvider** | То же | Прогресс, планы, достижения |
| **TeamProvider** | То же | Команды, приглашения |
| **HintOverlayProvider** | То же | Туториал, подсказки |
| **Backend API** | Vite proxy → :4000 | /api/chat, /api/community/badges, /api/bro-missions, /api/telegram/notify-achievement |
| **Telegram** | .env | Webhook, отправка в канал |
| **profile-view-spaceship.css** | `main.tsx` | Стили кабины «космический корабль» (подключены везде, кабина — единый вид ЛК) |

---

## 6. Быстрая проверка

1. Backend: `curl http://localhost:4000/api/stats` — должен вернуть JSON.
2. Кабина: открыть `http://localhost:3010/RL-Guide-book/profile-desktop.html` — загружается ЛК сразу в режиме профиля.
3. Чат: открыть чат в кабине — если OPENAI_API_KEY настроен, ответ придёт (иначе — ошибка 403 или fallback).

---

## 7. Дизайн кабины (круглые кнопки, пульт внизу)

Кабина — единый вид личного кабинета на всех точках входа (main, profile-desktop, staging). Корень `.profile-spaceship-root` и стили `profile-view-spaceship.css` подключены в `main.tsx`.

- При открытии **профиля** (через навбар на любом порту или через profile-desktop.html) отображается кабина с пузырями и консолью.
- **profile-desktop.html** — короткий путь: сразу загружает ЛК в режиме профиля (`__INITIAL_VIEW__ = 'profile'`).

**Проверка:** DevTools → вкладка Elements → в DOM при открытом профиле должен быть элемент с классом `profile-spaceship-root`.

---

## 8. Возможные проблемы

| Проблема | Решение |
|----------|---------|
| Кабина белый экран / краш | Проверить, что `main.tsx` включает `AuthProvider`. ChatBot и ProfileView требуют useAuth. |
| Чат не отвечает | Проверить OPENAI_API_KEY в .env; возможна ошибка 403 (unsupported country) — тогда нужен прокси или другой провайдер. |
| API 404 / CORS | Убедиться, что backend запущен на 4000; Vite proxy настроен в `vite.config.ts`. |
| Изображения не грузятся | Проверить `npm run sync:ai-data`; пути в public/ai-data и public/Новые значки. |

---

## 9. Файлы, которые относятся к кабине

- `profile-desktop.html` — страница-шорткат: сразу открывает ЛК в режиме профиля  
- `src/main.tsx` — точка входа (AuthProvider, ProgressProvider, TeamProvider, HintOverlayProvider, profile-spaceship-root, profile-view-spaceship.css)  
- `src/styles/profile-view-spaceship.css` — стили кабины  
- План и спека: [PLAN_PROFILE_SPACESHIP_ISOLATION.md](PLAN_PROFILE_SPACESHIP_ISOLATION.md), [PROFILE_CABIN_COCKPIT_SPEC.md](PROFILE_CABIN_COCKPIT_SPEC.md)
