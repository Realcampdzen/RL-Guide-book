# 🚀 Быстрый старт - Путеводитель "Реальный Лагерь"

> **Получите проект запущенным за 5 минут!**

## 📋 Предварительные требования

- **Node.js** 18+ ([скачать](https://nodejs.org/))
- **Python** 3.8+ ([скачать](https://python.org/))
- **Git** ([скачать](https://git-scm.com/))
- **OpenAI API ключ** ([получить](https://platform.openai.com/api-keys))

## ⚡ Установка и запуск

### 1. Клонирование репозитория
```bash
git clone https://github.com/Realcampdzen/RL-Guide-book.git
cd RL-Guide-book
```

### 2. Установка зависимостей

#### Frontend (React приложение)
```bash
npm install
```

#### Backend и Чат-бот
```bash
# Установка зависимостей для API сервера
pip install -r requirements.txt

# Установка зависимостей для чат-бота
cd chatbot
pip install -r requirements.txt
cd ..
```

### 3. Настройка окружения

Создайте файл `.env` в корне проекта:
```env
# OpenAI API для чат-бота
OPENAI_API_KEY=your_openai_api_key_here

# Настройки приложения
NODE_ENV=development
PORT=3001
API_PORT=4000
CHATBOT_PORT=8000

# Telegram (опционально): TELEGRAM_BOT_TOKEN, TELEGRAM_CHANNEL_ID, TELEGRAM_WEBHOOK_SECRET — см. docs/EVENTS_AND_WEBHOOKS.md
```

### 4. Запуск всех сервисов

#### Вариант 1: Автоматический запуск (Windows)
```bash
# Запуск всех сервисов одной командой
start_all_services.bat
```

#### Вариант 2: Ручной запуск

Откройте **3 терминала** и выполните команды:

**Терминал 1: Frontend**
```bash
npm run dev
```

**Терминал 2: Backend API**
```bash
python backend/app.py
```

**Терминал 3: Чат-бот НейроВалюша**
```bash
cd chatbot
python main.py
```

## 🌐 Доступ к приложению

После запуска всех сервисов:

- **🌐 Веб-приложение**: http://localhost:3001/RL-Guide-book/ (base path для совместимости с GitHub Pages)
- **🔧 Flask API**: http://localhost:4000 (health: `/health`, чат: `/api/chat`)
- **🤖 Чат-бот НейроВалюша**: http://localhost:8000
- **💬 Чат-интерфейс**: http://localhost:3001 (в веб-приложении)

## 🎯 Что вы увидите

### Веб-приложение
- **Космическая навигация** по категориям значков
- **3D визуализация** с Three.js
- **Интерактивный чат** с НейроВалюшей
- **Адаптивный дизайн** для всех устройств

### Чат-бот НейроВалюша
- **Персонализированные рекомендации** значков
- **Объяснение методики** простыми словами
- **Креативные идеи** для получения значков
- **Контекстное общение** с памятью

## 🧪 Тестирование

### Проверка работы API
```bash
# Тест API сервера
curl http://localhost:4000/health

# Тест чат-бота
curl -X POST http://localhost:8000/chat \
  -H "Content-Type: application/json" \
  -d '{"message": "Привет!", "user_id": "test"}'
```

### Проверка веб-интерфейса
1. Откройте http://localhost:3001/RL-Guide-book/
2. Попробуйте навигацию по категориям
3. Откройте чат и напишите НейроВалюше

### Перед деплоем на GitHub Pages
См. [docs/DEPLOY_GITHUB_PAGES.md](docs/DEPLOY_GITHUB_PAGES.md) — pre-deploy чеклист (sync:ai-data, verify:webp, self-check, build). Опционально проверить доступность бэкенда: `BACKEND_URL=http://localhost:4000 npm run self-check` (бэкенд должен быть запущен).

## 🐛 Решение проблем

### Порт уже занят
```bash
# Проверка занятых портов
netstat -an | findstr :3001
netstat -an | findstr :4000
netstat -an | findstr :8000

# Остановка процессов
# Windows
taskkill /F /IM node.exe
taskkill /F /IM python.exe

# Linux/Mac
pkill -f node
pkill -f python
```

### Ошибки зависимостей
```bash
# Очистка и переустановка
rm -rf node_modules
npm install

# Python
pip install --upgrade pip
pip install -r requirements.txt
```

### Форма плана значка не работает (Структурировать / Сгенерировать план)
- Для работы ИИ в форме «Составить план» (Профиль → В пути → Составить план) необходим запущенный Flask backend: `npm run start:backend` или `cd backend && python app.py`.

### Проблемы с OpenAI API
- Проверьте правильность API ключа в `.env`
- Убедитесь, что у вас есть доступ к OpenAI API
- Проверьте баланс аккаунта OpenAI

## 📚 Дополнительная информация

- **📖 Полная документация**: [README.md](./README.md)
- **🤖 Чат-бот**: [chatbot/README.md](./chatbot/README.md)
- **📊 Отчет о проекте**: [PROJECT_COMPLETION_REPORT.md](./PROJECT_COMPLETION_REPORT.md)
- **🔄 История изменений**: [CHANGELOG.md](./CHANGELOG.md)

## 🆘 Поддержка

Если у вас возникли проблемы:

1. **Проверьте** [Issues](https://github.com/Realcampdzen/RL-Guide-book/issues)
2. **Создайте** новый Issue с описанием проблемы
3. **Приложите** логи ошибок и скриншоты

---

**🎉 Готово! Теперь вы можете исследовать систему значков "Реального Лагеря" с помощью НейроВалюши!**
