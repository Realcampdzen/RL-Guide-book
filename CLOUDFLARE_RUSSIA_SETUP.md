# Настройка бота для работы без VPN в РФ

## Проблема

OpenAI API может быть недоступен для пользователей из РФ, даже если запросы идут с сервера Cloudflare. Для решения этой проблемы нужно использовать прокси-сервис через переменную окружения `OPENAI_BASE_URL`.

## Решение

### Шаг 1: Настройка переменных окружения в Cloudflare Dashboard

1. Откройте [Cloudflare Dashboard](https://dash.cloudflare.com/)
2. Перейдите в **Workers & Pages** → выберите проект `real-vibe-ai-studio`
3. Перейдите в **Settings** → **Environment Variables**
4. Найдите секцию **Production** (или нужный environment)

### Шаг 2: Добавление переменной OPENAI_BASE_URL

1. Нажмите **Add variable**
2. Заполните форму:
   - **Variable name:** `OPENAI_BASE_URL`
   - **Value:** `https://api.openai-proxy.com/v1`
3. Нажмите **Save**

### Шаг 3: Проверка обязательных переменных

Убедитесь, что также установлены следующие переменные:

- **OPENAI_API_KEY** - ваш ключ OpenAI API (обязательно)
- **OPENAI_MODEL** - модель (обычно `gpt-4o-mini`, опционально)
- **OPENAI_BASE_URL** - прокси для OpenAI API (для работы без VPN в РФ)

### Шаг 4: Перезапуск deployment

После добавления переменных окружения:

1. Перейдите в **Deployments**
2. Найдите последний deployment
3. Нажмите **Retry deployment** или создайте новый deployment

## Альтернативные прокси-сервисы

Если `https://api.openai-proxy.com/v1` не работает, можно попробовать:

1. **OpenRouter API:**
   - URL: `https://openrouter.ai/api/v1`
   - Требует отдельный API ключ от OpenRouter
   - Установите `OPENAI_BASE_URL=https://openrouter.ai/api/v1`

2. **Другие прокси-сервисы:**
   - Найдите работающий прокси-сервис для OpenAI API в РФ
   - Установите его URL в переменную `OPENAI_BASE_URL`

## Проверка работы

### 1. Проверка через Cloudflare Dashboard

1. Перейдите в **Workers & Pages** → `real-vibe-ai-studio` → **Logs**
2. Отправьте тестовый запрос к боту
3. Проверьте логи на наличие ошибок подключения к OpenAI API

### 2. Тестовый запрос

```powershell
# PowerShell
$body = @{ 
    message = "Привет! Расскажи про лагерь"
    user_id = "test_user"
} | ConvertTo-Json

Invoke-RestMethod -Uri "https://real-vibe-ai-studio.pages.dev/api/putevoditel/chat" `
    -Method Post `
    -ContentType "application/json" `
    -Body $body
```

```bash
# Bash
curl -X POST https://real-vibe-ai-studio.pages.dev/api/putevoditel/chat \
  -H "Content-Type: application/json" \
  -d '{
    "message": "Привет! Расскажи про лагерь",
    "user_id": "test_user"
  }'
```

### 3. Проверка на продакшене

1. Откройте сайт `https://realcampdzen.github.io/RL-Guide-book/`
2. Откройте чат-бот
3. Отправьте тестовое сообщение
4. Убедитесь, что бот отвечает корректно

## Диагностика проблем

### Проблема: Бот не отвечает

1. Проверьте логи в Cloudflare Dashboard → **Logs**
2. Убедитесь, что `OPENAI_API_KEY` установлен и корректный
3. Убедитесь, что `OPENAI_BASE_URL` установлен правильно

### Проблема: Ошибка подключения к OpenAI API

1. Проверьте, что прокси-сервис доступен:
   ```bash
   curl https://api.openai-proxy.com/v1/models
   ```
2. Если прокси не работает, попробуйте альтернативный прокси-сервис
3. Проверьте логи Cloudflare для детальной информации об ошибке

### Проблема: Бот работает медленно

1. Прокси-сервисы могут быть медленнее стандартного API
2. Это нормально для работы без VPN в РФ
3. Если скорость критична, рассмотрите использование собственного прокси-сервера

## Важные замечания

- Код автоматически использует `OPENAI_BASE_URL` из переменных окружения
- Если `OPENAI_BASE_URL` не установлен, используется стандартный `https://api.openai.com/v1`
- Убедитесь, что прокси-сервис работает и доступен из Cloudflare
- Для локальной разработки можно установить `OPENAI_BASE_URL` в `.env` файле

## Локальная разработка

Для локальной разработки добавьте в `.env` файл:

```bash
OPENAI_API_KEY=sk-...
OPENAI_BASE_URL=https://api.openai-proxy.com/v1
```

Код в `chatbot/core/openai_client.py` автоматически использует эти переменные.

## Дополнительная информация

- Подробная документация: `CLOUDFLARE_BOT_SETUP_DATA.md`
- Быстрый старт: `PUTEVODITEL_BOT_QUICK_START.md`
- Краткая справка: `CLOUDFLARE_BOT_SETUP_QUICK.md`

