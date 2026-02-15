# Деплой бота Путеводителя на Cloudflare

## ✅ Что сделано

Добавлен новый эндпоинт для бота Путеводителя:
- **Эндпоинт**: `POST /api/putevoditel/chat`
- **Использует**: ту же логику что и НейроВалюша (загрузка данных значков, системный промпт)
- **Fallback**: умные ответы при отсутствии OpenAI ключа

## 🚀 Деплой

### 0. Синхронизация (из корня репозитория)

Перед сборкой выполните синхронизацию данных и промптов:

```bash
npm run sync:cf-api-ai-data
npm run sync:cf-api-prompts
```

См. [docs/DATA_SYNC.md](../docs/DATA_SYNC.md).

### 1. Сборка проекта (уже выполнена)

```bash
cd cf-api
npm install
npm run build
```

### 2. Загрузка в Cloudflare

1. Cloudflare Dashboard → Workers & Pages → `real-vibe-ai-studio` → Deployments → **Create deployment**
2. Environment: **Production**
3. Upload: выбрать **папку `dist`** из `cf-api/dist/`
4. Save and deploy

### 3. Проверка

```powershell
# Проверка health
Invoke-RestMethod -Uri "https://real-vibe-ai-studio.pages.dev/health"

# Тест бота Путеводителя
$body = @{ message = "Привет! Расскажи про лагерь" } | ConvertTo-Json
Invoke-RestMethod -Uri "https://real-vibe-ai-studio.pages.dev/api/putevoditel/chat" -Method Post -ContentType "application/json" -Body $body
```

## 📝 Использование на фронтенде

Фронтенд должен отправлять запросы на:
```
POST https://real-vibe-ai-studio.pages.dev/api/putevoditel/chat
```

**Формат запроса:**
```json
{
  "message": "Текст сообщения",
  "context": {
    "current_badge": {
      "id": "12.3",
      "title": "Название значка"
    },
    "current_category": {
      "id": "12",
      "title": "Название категории"
    }
  }
}
```

**Формат ответа:**
```json
{
  "reply": "Ответ бота",
  "response": "Ответ бота" // для совместимости
}
```

## ⚙️ Настройки Cloudflare

Убедитесь, что в Cloudflare Dashboard → Workers & Pages → Settings → Variables and Secrets → **Production** установлены:

- ✅ `OPENAI_API_KEY` (обязательно)
- ✅ `OPENAI_PROXY_BASE_URL` (опционально, если используется прокси)
- ✅ `OPENAI_PROXY_TOKEN` (опционально, если используется прокси)
- ✅ `NEUROVALYUSHA_KV` (опционально, для кэширования данных значков)

## 🔧 Особенности

- Бот использует ту же логику что и НейроВалюша
- Поддерживает контекст значков (если передан `context.current_badge`)
- Автоматически загружает данные значков из `public/ai-data/`
- Использует системный промпт с информацией о лагере и системе значков
- Fallback ответы работают даже без OpenAI ключа

## 📚 Связанные файлы

- `cf-api/src/index.tsx` - основной файл с эндпоинтом
- `cf-api/src/neurovalyusha/constants.ts` - системные промпты
- `cf-api/src/neurovalyusha/ai_data_loader.ts` - загрузка данных значков
- `cf-api/public/ai-data/` - данные значков

