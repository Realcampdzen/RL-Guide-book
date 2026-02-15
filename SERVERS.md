# 🖥️ Серверы проекта - Путеводитель Реального Лагеря

**Локальная разработка:** основной dev — это Vite. Порт по умолчанию **3001**; для работы можно использовать любой свободный порт (например `npx vite --port 3009 --host`). Прогресс в localStorage привязан к origin (домен + порт), поэтому смена порта даёт отдельное хранилище — удобно для изолированной проверки.

---

## 📋 Dev-сервер (Vite)

**Команда по умолчанию:** `npm run dev`  
**Порт по умолчанию:** `3001`  
**URL:** `http://localhost:3001/RL-Guide-book/`  
**Назначение:** Локальная разработка; поведение соответствует деплою на GitHub Pages (base path, статика).

### Другой порт (например 3009):
```bash
npx vite --port 3009 --host
# или: npm run dev -- --port 3009 --host
```
Откройте `http://localhost:3009/RL-Guide-book/`

### Особенности:
- ✅ Base path: `/RL-Guide-book/` (как на GitHub Pages)
- ✅ Hot Module Replacement (HMR)
- ✅ Прокси для API: `/api/*` → `http://127.0.0.1:4000`
- ✅ Отдает файлы из `public/` по пути `/RL-Guide-book/`

---

## 🧪 Дополнительные порты (опционально)

При необходимости можно запустить второй экземпляр Vite на другом порту (например 3002, 3005, 3009) — для изолированной проверки или чтобы не конфликтовать с другими сервисами. Прогресс (localStorage) будет отдельным для каждого порта.

```bash
npm run dev -- --port 3005 --host
# или любой порт: npx vite --port 3009 --host
```

Подробнее: `DEV_ISOLATED_GUIDE.md`.

---

## 🚀 Production Preview (тестирование собранной версии)

**Команда:** `npm run preview:prod`  
**Порт:** `4002`  
**URL:** `http://localhost:4002/RL-Guide-book/`  
**Назначение:** Тестирование production build перед деплоем

### Особенности:
- ✅ Отдает файлы из папки `dist` (как на GitHub Pages)
- ✅ Base path: `/RL-Guide-book/`
- ✅ Используется для финальной проверки перед пушем в репозиторий

**Используйте после `npm run build` для проверки production версии!**

---

## 📄 HTML сервер (альтернативный)

**Команда:** `npm run dev:html`  
**Порт:** `4002`  
**URL:** `http://localhost:4002/bluenest.html`  
**Назначение:** Простой сервер для отдачи HTML файлов

### Особенности:
- Отдает `bluenest.html`, `categories.html`
- Прокси для Flask API на порт 4000
- Отдает статические файлы из `public/`

**Используется редко, в основном для тестирования отдельных HTML страниц**

---

## 🤖 Flask API Backend

**Команда:** `npm run start:backend` или `cd backend && python app.py`  
**Порт:** `4000`  
**URL:** `http://localhost:4000/api/chat`  
**Назначение:** Backend API для чат-бота и других сервисов

### Особенности:
- Flask приложение
- Эндпоинты: `/api/chat`, `/api/*`
- Используется через прокси из Vite dev сервера

**Необходим для работы чат-бота!**

Для кнопок «Структурировать» и «Сгенерировать план» в форме плана значка (Профиль → В пути → Составить план) также необходим запущенный Flask backend: `npm run start:backend`.

---

## 📦 Деплой на GitHub Pages

**Автоматический деплой:** При push в ветку `main`  
**Workflow:** `.github/workflows/deploy-simple.yml`  
**URL:** `https://[username].github.io/RL-Guide-book/`

### Процесс:
1. `npm run build` - сборка проекта в `dist/`
2. GitHub Actions автоматически деплоит содержимое `dist/`
3. Base path: `/RL-Guide-book/`

---

## 🎯 Рекомендуемый workflow

### Для разработки:
```bash
# 1. Запустите Flask API (в отдельном терминале), если нужен чат-бот
npm run start:backend

# 2. Запустите Vite (порт по умолчанию 3001; можно указать свой, например 3009)
npm run dev
# или: npx vite --port 3009 --host

# 3. Откройте в браузере
# http://localhost:3001/RL-Guide-book/  (или ваш порт)
```

### Перед пушем в репозиторий:
```bash
# 1. Соберите проект
npm run build

# 2. Протестируйте production версию
npm run preview:prod

# 3. Если всё ОК - делайте commit и push
git add .
git commit -m "описание изменений"
git push origin main
```

---

## 🚀 Сервер кабины (profile-desktop)

**Команда:** `npm run dev:profile-desktop`  
**Порт:** `3010`  
**URL:** `http://localhost:3010/RL-Guide-book/profile-desktop.html`  
**Назначение:** Шорткат — загружает приложение сразу в личный кабинет (профиль). Кабина «космического корабля» с пузырями — единый вид ЛК на всех портах (3001, 3002, 3010). Требует запущенный backend (4000). См. [docs/PROFILE_CABIN_SERVER_SETUP.md](docs/PROFILE_CABIN_SERVER_SETUP.md).

---

## 🔍 Быстрая проверка

| Сервер | Команда | Порт | URL | Назначение |
|--------|---------|------|-----|------------|
| **Vite dev** | `npm run dev` | 3001 (по умолч.) | `/RL-Guide-book/` | Локальная разработка (порт можно менять) |
| **Кабина (шорткат)** | `npm run dev:profile-desktop` | 3010 | `/RL-Guide-book/profile-desktop.html` | Загрузка сразу в ЛК «Пульт» |
| **Vite другой порт** | `npx vite --port 3009 --host` | любой | `/RL-Guide-book/` | Тот же режим, отдельный origin/прогресс |
| **Preview** | `npm run preview:prod` | 4002 | `/RL-Guide-book/` | Тест production build |
| **HTML** | `npm run dev:html` | 4002 | `/bluenest.html` | Альтернативный |
| **Flask API** | `npm run start:backend` | 4000 | `/api/*` | Backend API |

---

## ⚠️ Важные замечания

1. **Локальная разработка:** запускайте `npm run dev` (порт 3001) или `npx vite --port <порт> --host` — один порт не «официальнее» другого; прогресс хранится по origin (порт входит в origin).
2. **Flask API** нужен для работы чат-бота и формы плана значка (кнопки «Структурировать» / «Сгенерировать план») — запускайте `npm run start:backend` (порт 4000).
3. Перед пушем проверяйте production build: `npm run preview:prod`.
4. Деплой на GitHub Pages выполняется при push в `main` (workflow `deploy-simple.yml`).
