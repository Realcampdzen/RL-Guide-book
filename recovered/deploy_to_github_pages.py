#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Скрипт для деплоя веб-приложения Путеводителя на GitHub Pages
с поддержкой чат-бота НейроВалюши
"""

import os
import shutil
import json
import subprocess
from pathlib import Path

def build_frontend():
    """Сборка фронтенда"""
    print("🔨 Сборка фронтенда...")
    
    # Установка зависимостей
    subprocess.run(["npm", "install"], check=True)
    
    # Сборка проекта
    subprocess.run(["npm", "run", "build"], check=True)
    
    print("✅ Фронтенд собран успешно!")

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
    
    # Создаем файл для деплоя на Vercel/Netlify
    create_vercel_config(backend_dir)
    create_netlify_config(backend_dir)
    
    print("✅ Бэкенд подготовлен!")

def create_vercel_config(backend_dir):
    """Создание конфигурации для Vercel"""
    vercel_config = {
        "version": 2,
        "builds": [
            {
                "src": "api/app.py",
                "use": "@vercel/python"
            }
        ],
        "routes": [
            {
                "src": "/api/(.*)",
                "dest": "/api/app.py"
            },
            {
                "src": "/(.*)",
                "dest": "/$1"
            }
        ]
    }
    
    config_path = backend_dir / "vercel.json"
    with open(config_path, 'w', encoding='utf-8') as f:
        json.dump(vercel_config, f, indent=2, ensure_ascii=False)
    
    print(f"📝 Создан конфиг Vercel: {config_path}")

def create_netlify_config(backend_dir):
    """Создание конфигурации для Netlify"""
    netlify_config = {
        "build": {
            "command": "npm run build",
            "publish": "dist"
        },
        "functions": {
            "directory": "api"
        },
        "redirects": [
            {
                "from": "/api/*",
                "to": "/.netlify/functions/app.py",
                "status": 200
            }
        ]
    }
    
    config_path = backend_dir / "netlify.toml"
    with open(config_path, 'w', encoding='utf-8') as f:
        f.write(f"[build]\n")
        f.write(f"command = \"npm run build\"\n")
        f.write(f"publish = \"dist\"\n\n")
        f.write(f"[functions]\n")
        f.write(f"directory = \"api\"\n\n")
        f.write(f"[[redirects]]\n")
        f.write(f"from = \"/api/*\"\n")
        f.write(f"to = \"/.netlify/functions/app.py\"\n")
        f.write(f"status = 200\n")
    
    print(f"📝 Создан конфиг Netlify: {config_path}")

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
    instructions = """# Инструкции по деплою на GitHub Pages

## Автоматический деплой (Рекомендуется)

1. Убедитесь, что у вас есть файл `.github/workflows/deploy.yml`
2. Запушьте изменения в ветку `main`
3. GitHub Actions автоматически соберет и задеплоит проект

## Ручной деплой

1. Запустите скрипт деплоя:
   ```bash
   python deploy_to_github_pages.py
   ```

2. Скопируйте содержимое папки `dist` в ветку `gh-pages`

## Альтернативные платформы

### Vercel
1. Подключите репозиторий к Vercel
2. Vercel автоматически определит настройки из `vercel.json`

### Netlify
1. Подключите репозиторий к Netlify
2. Netlify использует настройки из `netlify.toml`

## Важные замечания

- Чат-бот НейроВалюша интегрирован в Flask API
- Для работы чат-бота нужен OpenAI API ключ
- Статические файлы (изображения, JSON) копируются автоматически
- CORS настроен для работы с GitHub Pages

## Проверка деплоя

После деплоя проверьте:
- [ ] Главная страница загружается
- [ ] API endpoints работают (`/api/categories`, `/api/badges`)
- [ ] Чат-бот отвечает (`/api/chat`)
- [ ] Изображения загружаются корректно
"""
    
    with open("DEPLOYMENT_INSTRUCTIONS.md", 'w', encoding='utf-8') as f:
        f.write(instructions)
    
    print("📖 Созданы инструкции по деплою: DEPLOYMENT_INSTRUCTIONS.md")

def main():
    """Основная функция деплоя"""
    print("🚀 Начинаем деплой Путеводителя на GitHub Pages...")
    
    try:
        # Сборка фронтенда
        build_frontend()
        
        # Подготовка бэкенда
        prepare_backend()
        
        # Создание GitHub Actions workflow
        create_github_workflow()
        
        # Создание инструкций
        create_deployment_instructions()
        
        print("\n✅ Деплой подготовлен успешно!")
        print("\n📋 Следующие шаги:")
        print("1. Запушьте изменения в репозиторий")
        print("2. GitHub Actions автоматически задеплоит проект")
        print("3. Проверьте работу на https://yourusername.github.io/RL-Guide-book/")
        print("\n🤖 Чат-бот НейроВалюша будет работать через интегрированный API!")
        
    except Exception as e:
        print(f"❌ Ошибка при деплое: {e}")
        return 1
    
    return 0

if __name__ == "__main__":
    exit(main())
