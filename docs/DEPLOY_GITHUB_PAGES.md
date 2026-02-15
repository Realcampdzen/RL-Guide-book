# Деплой на GitHub Pages — подробная инструкция

Руководство по настройке и деплою фронтенда Путеводителя на GitHub Pages.

## Требования

- **Node.js** 18+
- При изменении контента в `ai-data/` — обязательно запустить `npm run sync:ai-data` перед commit

## Pre-deploy чеклист

Перед push в `main` (или перед ручной сборкой для деплоя):

1. **Синхронизация ai-data** (если правили `ai-data/`):
   ```bash
   npm run sync:ai-data
   ```

2. **Проверка WebP** (при добавлении новых изображений — `npm run images:webp`):
   ```bash
   npm run verify:webp
   ```

3. **Проверка целостности проекта**:
   ```bash
   npm run self-check
   ```

4. **Сборка**:
   ```bash
   npm run build
   ```

5. **Ручная проверка** (опционально):
   ```bash
   npm run preview:prod
   ```
   Откройте `http://localhost:4002/RL-Guide-book/` и проверьте навигацию, изображения, чат.

## basePath

Проект настроен на работу в поддиректории: `base: '/RL-Guide-book/'` в [vite.config.ts](../vite.config.ts).

- **Локальная разработка:** `http://localhost:3001/RL-Guide-book/`
- **Production (GitHub Pages):** `https://<user>.github.io/RL-Guide-book/`

## Workflow

- **Файл:** [.github/workflows/deploy-simple.yml](../.github/workflows/deploy-simple.yml)
- **Триггер:** push в ветку `main`
- **Результат:** содержимое `dist/` деплоится через GitHub Actions deploy-pages

## Настройка GitHub Pages

1. Откройте `Settings` → `Pages` репозитория
2. **Source:** выберите **GitHub Actions**
3. (Опционально) **Custom domain:** укажите свой домен и включите HTTPS

## URL после деплоя

- **Project site:** `https://<username>.github.io/RL-Guide-book/`
- Пример: `https://realcampdzen.github.io/RL-Guide-book/`

## Дополнительно

- [DEPLOYMENT.md](../DEPLOYMENT.md) — общий обзор деплоя
- [SERVERS.md](../SERVERS.md) — порты, dev-серверы, preview
- [DATA_SYNC.md](DATA_SYNC.md) — синхронизация ai-data
