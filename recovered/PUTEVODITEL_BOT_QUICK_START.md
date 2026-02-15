# 🚀 Быстрый деплой бота Путеводителя на Cloudflare

## ✅ Что сделано

Добавлен новый эндпоинт `/api/putevoditel/chat` для бота Путеводителя. Бот использует:
- ✅ Тот же OpenAI API что и другие боты
- ✅ Системный промпт НейроВалюши (с информацией о лагере и значках)
- ✅ Загрузку данных значков из `public/ai-data/`
- ✅ Поддержку контекста (текущий значок/категория)
- ✅ Умные fallback ответы

## 📦 Деплой (3 шага)

### 1. Проект уже собран
```bash
cd cf-api
npm run build  # ✅ Уже выполнено
```

### 2. Загрузить в Cloudflare

1. Откройте [Cloudflare Dashboard](https://dash.cloudflare.com/)
2. Workers & Pages → `real-vibe-ai-studio` → Deployments
3. **Create deployment** → Environment: **Production**
4. Upload: выберите папку `cf-api/dist/`
5. **Save and deploy**

### 3. Проверить работу

```powershell
# Тест эндпоинта
$body = @{ message = "Привет! Расскажи про лагерь" } | ConvertTo-Json
Invoke-RestMethod -Uri "https://real-vibe-ai-studio.pages.dev/api/putevoditel/chat" -Method Post -ContentType "application/json" -Body $body
```

## 🔗 Использование на фронтенде

**URL эндпоинта:**
```
POST https://real-vibe-ai-studio.pages.dev/api/putevoditel/chat
```

**Пример запроса:**
```javascript
const response = await fetch('https://real-vibe-ai-studio.pages.dev/api/putevoditel/chat', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    message: 'Расскажи про значок 12.3',
    context: {
      current_badge: { id: '12.3', title: 'Название значка' }
    }
  })
})

const data = await response.json()
console.log(data.reply) // Ответ бота
```

## ⚙️ Настройки Cloudflare

Убедитесь что в **Production** environment установлены:
- ✅ `OPENAI_API_KEY` (обязательно)
- ✅ `OPENAI_BASE_URL` (опционально, для работы без VPN в РФ: `https://api.openai-proxy.com/v1`)

### Настройка для работы без VPN в РФ

1. Откройте Cloudflare Dashboard → Workers & Pages → `real-vibe-ai-studio`
2. Перейдите в **Settings** → **Environment Variables**
3. Добавьте переменную:
   - **Name:** `OPENAI_BASE_URL`
   - **Value:** `https://api.openai-proxy.com/v1`
4. Сохраните изменения и перезапустите deployment

**Важно:** Код автоматически использует `OPENAI_BASE_URL` из переменных окружения. Если переменная не установлена, используется стандартный `https://api.openai.com/v1`.

## 📝 Что дальше?

1. ✅ Деплой выполнен - бот доступен на `/api/putevoditel/chat`
2. 🔗 Подключите фронтенд к новому эндпоинту
3. 🧪 Протестируйте работу бота
4. 📊 Проверьте логи в Cloudflare Dashboard если что-то не работает

## 🆘 Если что-то не работает

1. Проверьте что `OPENAI_API_KEY` установлен в Production
2. Проверьте логи в Cloudflare Dashboard → Workers & Pages → Logs
3. Используйте `?debug=1` в запросе для получения детальной информации об ошибках
4. **Если бот не работает в РФ:** Убедитесь, что установлена переменная `OPENAI_BASE_URL=https://api.openai-proxy.com/v1`

---

**Готово!** Бот Путеводителя готов к использованию 🎉

