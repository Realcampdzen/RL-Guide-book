#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Упрощенный скрипт для подготовки к деплою на GitHub Pages
Без автоматической сборки фронтенда
"""

import os
import shutil
import json
from pathlib import Path

def prepare_backend():
    """Подготовка бэкенда для деплоя"""
    print("🔧 Подготовка бэкенда...")
    
    # Создаем директорию для бэкенда в dist
    dist_dir = Path("dist")
    backend_dir = dist_dir / "api"
    backend_dir.mkdir(exist_ok=True)
    
    # Копируем файлы бэкенда
    backend_files = [
        "backend/app.py",
        "backend/requirements.txt",
        "perfect_parsed_data.json"
    ]
    
    for file_path in backend_files:
        if os.path.exists(file_path):
            dest_path = backend_dir / Path(file_path).name
            shutil.copy2(file_path, dest_path)
            print(f"📁 Скопирован: {file_path} -> {dest_path}")
    
    # Копируем модули чат-бота
    chatbot_src = Path("chatbot")
    chatbot_dest = backend_dir / "chatbot"
    
    if chatbot_src.exists():
        shutil.copytree(chatbot_src, chatbot_dest, dirs_exist_ok=True)
        print(f"🤖 Скопирован чат-бот: {chatbot_src} -> {chatbot_dest}")
    
    print("✅ Бэкенд подготовлен!")

def create_github_workflow():
    """Создание GitHub Actions workflow для деплоя"""
    workflow_dir = Path(".github/workflows")
    workflow_dir.mkdir(parents=True, exist_ok=True)
    
    workflow_content = """name: Deploy to GitHub Pages

on:
  push:
    branches: [ main ]
  pull_request:
    branches: [ main ]

jobs:
  build-and-deploy:
    runs-on: ubuntu-latest
    
    steps:
    - name: Checkout
      uses: actions/checkout@v3
      
    - name: Setup Node.js
      uses: actions/setup-node@v3
      with:
        node-version: '18'
        cache: 'npm'
        
    - name: Install dependencies
      run: npm install
      
    - name: Build frontend
      run: npm run build
      
    - name: Deploy to GitHub Pages
      uses: peaceiris/actions-gh-pages@v3
      if: github.ref == 'refs/heads/main'
      with:
        github_token: ${{ secrets.GITHUB_TOKEN }}
        publish_dir: ./dist
"""
    
    workflow_path = workflow_dir / "deploy.yml"
    with open(workflow_path, 'w', encoding='utf-8') as f:
        f.write(workflow_content)
    
    print(f"🚀 Создан GitHub Actions workflow: {workflow_path}")

def create_deployment_instructions():
    """Создание инструкций по деплою"""
    instructions = """# 🚀 Инструкции по деплою Путеводителя на GitHub Pages

## ✅ Что уже готово

1. **Чат-бот НейроВалюша интегрирован в Flask API** - больше не нужен отдельный FastAPI сервер
2. **Все модули чат-бота скопированы** в папку `dist/api/chatbot/`
3. **GitHub Actions workflow создан** - автоматический деплой при пуше в main
4. **CORS настроен** для работы с GitHub Pages

## 🚀 Автоматический деплой (Рекомендуется)

### Шаг 1: Настройка репозитория
```bash
# Добавьте все файлы в git
git add .
git commit -m "Добавлена поддержка деплоя на GitHub Pages с чат-ботом"
git push origin main
```

### Шаг 2: Включение GitHub Pages
1. Перейдите в **Settings** → **Pages**
2. **Source**: GitHub Actions
3. Workflow автоматически создастся из `.github/workflows/deploy.yml`

### Шаг 3: Настройка переменных окружения (для чат-бота)
1. **Settings** → **Secrets and variables** → **Actions**
2. Добавьте `OPENAI_API_KEY` с вашим API ключом OpenAI

## 🔧 Ручной деплой

Если автоматический деплой не работает:

### Вариант 1: Через GitHub CLI
```bash
# Установите GitHub CLI
# Затем:
gh repo deploy --source=dist --target=gh-pages
```

### Вариант 2: Через веб-интерфейс
1. Соберите фронтенд: `npm run build`
2. Скопируйте содержимое папки `dist` в ветку `gh-pages`

## 🤖 Настройка чат-бота

### Локально
Создайте файл `.env` в корне проекта:
```
OPENAI_API_KEY=your_api_key_here
```

### На GitHub Pages
Добавьте `OPENAI_API_KEY` в Secrets репозитория

## 🔗 Альтернативные платформы

### Vercel
```bash
npm i -g vercel
vercel --prod
```

### Netlify
```bash
npm i -g netlify-cli
netlify deploy --prod
```

## 📋 Проверка деплоя

После деплоя проверьте:

1. **Главная страница**: `https://yourusername.github.io/RL-Guide-book/`
2. **API категории**: `https://yourusername.github.io/RL-Guide-book/api/categories`
3. **Чат-бот**: Откройте чат в веб-приложении
4. **Health check**: `https://yourusername.github.io/RL-Guide-book/api/health`

## 🐛 Решение проблем

### Чат-бот не отвечает
- ✅ Проверьте `OPENAI_API_KEY` в Secrets
- ✅ Убедитесь, что API ключ действителен
- ✅ Проверьте логи в консоли браузера

### API не работает
- ✅ Убедитесь, что Flask API запущен
- ✅ Проверьте CORS настройки
- ✅ Проверьте пути к файлам данных

### Изображения не загружаются
- ✅ Убедитесь, что файлы в папке `public/` скопированы
- ✅ Проверьте правильность путей в коде

## 🎉 Готово!

Ваш Путеводитель "Реальный Лагерь" с чат-ботом НейроВалюшей готов к деплою!

**Ключевые особенности:**
- 🤖 Чат-бот интегрирован в Flask API
- 🌐 Работает на GitHub Pages
- 📱 Адаптивный дизайн
- 🚀 Автоматический деплой
- 🔒 Безопасная работа с API ключами
"""
    
    with open("DEPLOYMENT_GUIDE.md", 'w', encoding='utf-8') as f:
        f.write(instructions)
    
    print("📖 Создано руководство по деплою: DEPLOYMENT_GUIDE.md")

def main():
    """Основная функция подготовки к деплою"""
    print("🚀 Подготовка к деплою Путеводителя на GitHub Pages...")
    
    try:
        # Подготовка бэкенда
        prepare_backend()
        
        # Создание GitHub Actions workflow
        create_github_workflow()
        
        # Создание инструкций
        create_deployment_instructions()
        
        print("\n✅ Подготовка к деплою завершена!")
        print("\n📋 Следующие шаги:")
        print("1. Установите Node.js и npm (если еще не установлены)")
        print("2. Запустите: npm install && npm run build")
        print("3. Запушьте изменения в репозиторий")
        print("4. GitHub Actions автоматически задеплоит проект")
        print("5. Проверьте работу на https://yourusername.github.io/RL-Guide-book/")
        print("\n🤖 Чат-бот НейроВалюша будет работать через интегрированный API!")
        
    except Exception as e:
        print(f"❌ Ошибка при подготовке к деплою: {e}")
        return 1
    
    return 0

if __name__ == "__main__":
    exit(main())
