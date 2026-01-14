# 🚀 Деплой Путеводителя Реального Лагеря

## Автоматический деплой через GitHub Actions

### Настройка GitHub Pages

1. **Перейдите в настройки репозитория**:
   - Откройте `https://github.com/Realcampdzen/RL-Guide-book/settings`
   - Найдите раздел "Pages" в левом меню

2. **Настройте источник**:
   - В разделе "Source" выберите "GitHub Actions"
   - Сохраните изменения

3. **Настройте домен (опционально)**:
   - В разделе "Custom domain" укажите `putevoditel.realcampspb.ru`
   - Включите "Enforce HTTPS"

**Важно:** Workflow запускается при push в ветку `main` и не требует дополнительных правил защиты окружения.

### Workflow файлы

- **`.github/workflows/deploy-simple.yml`** - Основной деплой на GitHub Pages
- **`.github/workflows/ci.yml`** - Проверка качества кода

### Триггеры автоматического деплоя

- ✅ **Push в ветку `main`** - автоматический деплой
- ✅ **Pull Request в `main`** - проверка кода
- ✅ **Ручной запуск** - через GitHub Actions UI

### Локальная разработка

```bash
# Установка зависимостей
npm install

# Запуск в режиме разработки
npm run dev

# Сборка для продакшена
npm run build

# Предварительный просмотр сборки
npm run preview
```

### Мониторинг деплоя

1. **GitHub Actions**:
   - Перейдите в `https://github.com/Realcampdzen/RL-Guide-book/actions`
   - Следите за статусом workflow'ов

2. **GitHub Pages**:
   - После успешного деплоя сайт будет доступен по адресу:
   - `https://realcampdzen.github.io/RL-Guide-book/`
   - Или по кастомному домену (если настроен)

### Устранение проблем

- **Build failed**: Проверьте логи в GitHub Actions
- **Deploy failed**: Убедитесь, что GitHub Pages включен
- **Domain issues**: Проверьте DNS настройки

### Безопасность

- Все секреты хранятся в GitHub Secrets
- Используется `GITHUB_TOKEN` для авторизации
- HTTPS принудительно включен для безопасности
