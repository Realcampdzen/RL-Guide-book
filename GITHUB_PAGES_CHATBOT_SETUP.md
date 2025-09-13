# 🤖 Настройка чат-бота для GitHub Pages

## ✅ Что сделано

1. **Изменен ChatBot.tsx** - теперь использует прямой вызов OpenAI API
2. **Убран API ключ из кода** - используется переменная окружения
3. **Готово к деплою** на GitHub Pages

## 🔧 Настройка переменной окружения в GitHub

### Шаг 1: Добавить секрет в GitHub
1. Перейдите в ваш репозиторий: https://github.com/Realcampdzen/RL-Guide-book
2. Нажмите **Settings** → **Secrets and variables** → **Actions**
3. Нажмите **New repository secret**
4. **Name**: `REACT_APP_OPENAI_API_KEY`
5. **Value**: `ваш_openai_api_ключ_из_файла_.env`
6. Нажмите **Add secret**

### Шаг 2: Обновить GitHub Actions workflow
Нужно обновить `.github/workflows/deploy.yml` чтобы использовать секрет:

```yaml
- name: Build frontend
  run: npm run build
  env:
    REACT_APP_OPENAI_API_KEY: ${{ secrets.REACT_APP_OPENAI_API_KEY }}
```

### Шаг 3: Деплой
После настройки секрета:
1. Сделайте любой коммит (например, обновите README)
2. GitHub Actions автоматически пересоберет и задеплоит приложение
3. Чат-бот будет работать на https://realcampdzen.github.io/RL-Guide-book/

## 🎯 Результат

После настройки:
- ✅ **Веб-приложение работает** на GitHub Pages
- ✅ **Чат-бот НейроВалюша работает** через OpenAI API
- ✅ **Никаких дополнительных серверов** не нужно
- ✅ **Бесплатно** на GitHub Pages

## 🧪 Проверка

После деплоя проверьте:
1. **Главная страница**: https://realcampdzen.github.io/RL-Guide-book/
2. **Чат-бот**: Нажмите на кнопку чата и напишите сообщение
3. **НейроВалюша должна ответить** на русском языке

---

**🎉 Чат-бот будет работать на GitHub Pages без дополнительных серверов!**
