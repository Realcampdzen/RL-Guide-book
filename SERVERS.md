# 🖥️ Серверы проекта - Путеводитель Реального Лагеря

## 📋 Основной staging сервер (для разработки и тестирования)

**Команда:** `npm run dev` или `npm run dev:staging`  
**Порт:** `3001`  
**URL:** `http://localhost:3001/RL-Guide-book/`  
**Назначение:** Локальный staging сервер, максимально точно повторяет то, что будет на GitHub Pages

### Особенности:
- ✅ Base path: `/RL-Guide-book/` (как на GitHub Pages)
- ✅ Hot Module Replacement (HMR) для быстрой разработки
- ✅ Прокси для API: `/api/*` → `http://127.0.0.1:4000`
- ✅ Отдает файлы из `public/` по пути `/RL-Guide-book/`
- ✅ Режим разработки с source maps и быстрой перезагрузкой

**Это ваш основной сервер для работы!**

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
# 1. Запустите Flask API (в отдельном терминале)
npm run start:backend

# 2. Запустите staging сервер
npm run dev

# 3. Откройте в браузере
# http://localhost:3001/RL-Guide-book/
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

## 🔍 Быстрая проверка

| Сервер | Команда | Порт | URL | Назначение |
|--------|---------|------|-----|------------|
| **Staging** | `npm run dev` | 3001 | `/RL-Guide-book/` | Основной для разработки |
| **Preview** | `npm run preview:prod` | 4002 | `/RL-Guide-book/` | Тест production build |
| **HTML** | `npm run dev:html` | 4002 | `/bluenest.html` | Альтернативный |
| **Flask API** | `npm run start:backend` | 4000 | `/api/*` | Backend API |

---

## ⚠️ Важные замечания

1. **Основной сервер для работы:** `npm run dev` на порту 3001
2. **Flask API должен быть запущен** для работы чат-бота
3. **Всегда тестируйте production build** (`npm run preview:prod`) перед пушем
4. **GitHub Pages деплоится автоматически** при push в `main`
