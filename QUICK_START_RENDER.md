# 🚀 Быстрый старт - Деплой на Render

## 📋 Что уже готово

✅ **Конфигурация Render**: `render.yaml`  
✅ **API для Node.js**: `api/package.json` + обновленный код  
✅ **Chatbot для Python**: обновленный `main.py` с поддержкой Render  
✅ **Скрипты деплоя**: `deploy_render.py`, `deploy_render.sh`, `deploy_render.ps1`  
✅ **Переменные окружения**: `render.env` с примером настроек  

## 🎯 Следующие шаги

### 1. Зайдите на Render Dashboard
```
https://dashboard.render.com
```

### 2. Создайте Blueprint
1. Нажмите **"New +"** → **"Blueprint"**
2. Подключите ваш GitHub репозиторий
3. Укажите путь к файлу: `render.yaml`
4. Нажмите **"Apply"**

### 3. Настройте переменные окружения
В каждом сервисе добавьте:
```
OPENAI_API_KEY=ваш_ключ_openai
RENDER_API_TOKEN=rnd_h0aJfxLMhjWzHNJx1lGouoyEEQnP
```

### 4. Запустите деплой
Render автоматически:
- Соберет все сервисы
- Настроит переменные окружения  
- Развернет приложение

## 🔧 Локальное тестирование

```bash
# Тест API
cd api
npm install
npm start

# Тест Chatbot  
cd chatbot
pip install -r requirements.txt
python main.py

# Тест Frontend
npm install
npm run build
npm run preview
```

## 📊 Проверка статуса

```bash
# Через скрипт
python deploy_render.py

# Или через PowerShell
.\deploy_render.ps1
```

## 🎉 Готово!

После успешного деплоя ваши сервисы будут доступны по адресам:
- **Frontend**: `https://putevoditel-frontend.onrender.com`
- **Chatbot**: `https://putevoditel-chatbot.onrender.com`  
- **API**: `https://putevoditel-api.onrender.com`
- **Backend**: `https://putevoditel-backend.onrender.com`

---

**Нужна помощь?** Смотрите полное руководство в `RENDER_DEPLOYMENT_GUIDE.md`
