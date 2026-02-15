# 🧠 Реальный Vайб AI Studio - Мигрировано на Cloudflare

## Описание проекта
Персональные AI-решения для бизнеса. Современное веб-приложение с AI-чатом на базе Hono + Cloudflare Pages.

## ✨ Особенности

- **Современная архитектура**: Hono framework + Cloudflare Workers
- **AI-чат с характером**: Кот Бро - интерактивный AI-помощник
- **OpenAI интеграция**: GPT-4o для умных ответов
- **Fallback система**: Работает даже без OpenAI ключа
- **Быстрая загрузка**: Edge deployment через Cloudflare Pages
- **Адаптивный дизайн**: TailwindCSS для всех устройств

## 🚀 Технологический стек

### Backend
- **Hono** v4.11.1 - Легкий и быстрый веб-фреймворк
- **Cloudflare Workers** - Edge runtime
- **OpenAI API** - GPT-4o для AI-ответов

### Frontend
- **TailwindCSS** - Современный CSS framework
- **Vanilla JavaScript** - Чистый JS без фреймворков
- **Font Awesome** - Иконки
- **Google Fonts** - Unbounded, Spline Sans, Space Grotesk

### DevOps
- **Wrangler** - Cloudflare CLI
- **Vite** - Build tool
- **PM2** - Process manager для разработки
- **Git** - Version control

### Промпты и данные (НейроВалюша / Путеводитель)
- Источник истины для промптов и фактов: **репозиторий** [chatbot/prompts/](../chatbot/prompts/). Перед деплоем из корня репозитория выполните `npm run sync:cf-api-ai-data` и `npm run sync:cf-api-prompts`. Папка `cf-api/prompts/` и файл `putevoditel_system_prompt_optimized.py` в корне cf-api — копии для справки, в рантайме не используются.

## 📦 Установка и запуск

### Предварительные требования
- Node.js v18+
- npm или yarn
- Cloudflare аккаунт (для деплоя)

### Локальная разработка

```bash
# Клонируйте репозиторий
git clone https://github.com/Realcampdzen/Real_Vibe_AI_Studio_New.git
cd webapp

# Установите зависимости
npm install

# Настройте переменные окружения (опционально)
cp .dev.vars.example .dev.vars
# Добавьте свой OPENAI_API_KEY в .dev.vars

# Соберите проект
npm run build

# Запустите локальный сервер
npm run dev:sandbox

# Или используйте PM2 (рекомендовано)
pm2 start ecosystem.config.cjs
```

### Доступ к приложению
- **Локально**: http://localhost:3000
- **Sandbox**: https://3000-ieg22x5hwgt9p5utrvi0d-b237eb32.sandbox.novita.ai
- **Production**: (будет доступно после деплоя)

## 🔑 Настройка OpenAI API

1. Получите API ключ на https://platform.openai.com/api-keys
2. Для локальной разработки:
   ```bash
   echo "OPENAI_API_KEY=your-key-here" > .dev.vars
   ```
3. Для production (Cloudflare):
   ```bash
   wrangler pages secret put OPENAI_API_KEY
   # Введите ваш ключ когда появится запрос
   ```

**Примечание**: Приложение работает и без OpenAI ключа, используя fallback-ответы!

## 📝 Доступные скрипты

```bash
npm run dev              # Vite dev server
npm run dev:sandbox      # Wrangler dev server для sandbox
npm run build            # Сборка проекта
npm run preview          # Предпросмотр production build
npm run deploy           # Деплой на Cloudflare Pages
npm run deploy:prod      # Деплой с указанием проекта
npm run clean-port       # Очистить порт 3000
npm run test             # Тест сервера (curl)
npm run git:status       # Git status
npm run git:log          # Git log
```

## 🌐 Деплой на Cloudflare Pages

```bash
# 1. Авторизуйтесь в Cloudflare
wrangler login

# 2. Создайте проект (первый раз)
wrangler pages project create webapp --production-branch main

# 3. Деплой
npm run deploy:prod

# 4. Настройте секреты (если используете OpenAI)
wrangler pages secret put OPENAI_API_KEY --project-name webapp
```

## 📚 Структура проекта

```
webapp/
├── src/
│   ├── index.tsx         # Основное Hono приложение
│   └── renderer.tsx      # HTML renderer
├── public/
│   └── static/
│       ├── chat.js       # Клиентский JavaScript
│       └── style.css     # Стили
├── dist/                 # Сборка (генерируется)
├── .dev.vars            # Локальные env переменные (не в git)
├── ecosystem.config.cjs  # PM2 конфигурация
├── wrangler.jsonc       # Cloudflare конфигурация
├── vite.config.ts       # Vite конфигурация
├── package.json         # Зависимости
└── README.md            # Этот файл
```

## 🎯 Основные функции

### Реализовано ✅
- ✅ Главная страница с hero секцией
- ✅ Описание услуг и преимуществ
- ✅ Интерактивный AI-чат виджет
- ✅ API endpoint для чата (/api/chat)
- ✅ Интеграция с OpenAI GPT-4o
- ✅ Fallback-ответы без API ключа
- ✅ Адаптивный дизайн для мобильных
- ✅ PM2 конфигурация для разработки
- ✅ Git version control

### Планируется 🔜
- 🔜 Деплой на Cloudflare Pages
- 🔜 История сообщений (persistent)
- 🔜 Дополнительные AI-персонажи
- 🔜 Админ-панель
- 🔜 Аналитика и метрики
- 🔜 Интеграция с Telegram
- 🔜 НейроВалюша в соцсетях (VK + Telegram комментарии) — см. `NEUROVALYUSHA_SETUP.md`

## 🤖 AI-персонаж: Кот Бро

**Характер**: Дружелюбный, ироничный, мемный
**Функции**: 
- Отвечает на вопросы о студии
- Демонстрирует возможности AI-ботов
- Ведет к конверсии через интерес
- Работает 24/7

**Примеры взаимодействия**:
- "Привет" → Знакомство с характером
- "Кто ты?" → История Кота Бро
- "Цена" → Информация о стоимости
- "Что умеешь?" → Демонстрация возможностей

## 📊 API Endpoints

### POST /api/chat
Отправка сообщения в чат

**Request**:
```json
{
  "message": "Привет!"
}
```

**Response**:
```json
{
  "response": "🐱 Мяу! Я Кот Бро..."
}
```

## 🛠 Технические детали

### Почему Hono?
- ⚡ Быстрый (быстрее Express)
- 🪶 Легкий (~12KB)
- 🌍 Edge-first архитектура
- 🔥 Отличная TypeScript поддержка

### Почему Cloudflare Pages?
- 🌐 Глобальный CDN
- ⚡ Минимальная задержка
- 💰 Бесплатный tier
- 🔒 Встроенная безопасность
- 📈 Auto-scaling

## 🔐 Безопасность

- ✅ CORS настроен для API routes
- ✅ Env переменные для секретов
- ✅ .dev.vars не в git
- ✅ XSS защита в чате
- ✅ Rate limiting (планируется)

## 👨‍💻 Разработка

### Коммиты
```bash
npm run git:commit "Your message"
```

### Проверка статуса
```bash
npm run git:status
npm run git:log
```

### PM2 команды
```bash
pm2 list                    # Список процессов
pm2 logs webapp --nostream  # Логи
pm2 restart webapp          # Перезапуск
pm2 delete webapp           # Удалить
```

## 📞 Контакты

- **Telegram**: [@Stivanovv](https://t.me/Stivanovv)
- **GitHub**: [Realcampdzen](https://github.com/Realcampdzen)
- **Email**: [в разработке]

## 📄 Лицензия

Проект создан для "Реальный Лагерь" / "Реальный Vайб AI Studio"

---

**Сделано с ❤️ и 🤖 для демонстрации возможностей AI-ботов**

*Этот проект - живой пример того, как AI может улучшить взаимодействие с клиентами* 🐱
