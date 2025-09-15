#!/usr/bin/env python3
"""
Скрипт для деплоя проекта на Render
"""
import os
import subprocess
import json
import requests
from pathlib import Path

# Конфигурация Render
RENDER_API_TOKEN = os.getenv('RENDER_API_TOKEN', 'rnd_h0aJfxLMhjWzHNJx1lGouoyEEQnP')
RENDER_API_BASE = 'https://api.render.com/v1'

def get_headers():
    """Получить заголовки для API запросов"""
    return {
        'Authorization': f'Bearer {RENDER_API_TOKEN}',
        'Content-Type': 'application/json'
    }

def check_render_service_status():
    """Проверить статус сервисов на Render"""
    print("🔍 Проверяем статус сервисов на Render...")
    
    try:
        response = requests.get(f'{RENDER_API_BASE}/services', headers=get_headers())
        response.raise_for_status()
        
        services = response.json()
        print(f"📊 Найдено сервисов: {len(services)}")
        
        for service in services:
            service_name = service.get('name', 'Unknown')
            service_details = service.get('serviceDetails', {})
            print(f"  - {service_name}")
            print(f"    Статус: {service.get('serviceDetails', {}).get('buildCommand', 'N/A')}")
            print(f"    URL: {service.get('serviceDetails', {}).get('url', 'N/A')}")
            print(f"    Создан: {service.get('createdAt', 'N/A')}")
            print()
            
    except requests.RequestException as e:
        print(f"❌ Ошибка при проверке статуса: {e}")

def create_render_blueprint():
    """Создать blueprint для деплоя"""
    print("📋 Создаем blueprint для Render...")
    
    blueprint_data = {
        "name": "putevoditel-app",
        "services": [
            {
                "name": "putevoditel-frontend",
                "type": "web",
                "env": "static",
                "buildCommand": "npm install && npm run build",
                "staticPublishPath": "./dist"
            },
            {
                "name": "putevoditel-chatbot",
                "type": "web", 
                "env": "python",
                "buildCommand": "pip install -r chatbot/requirements.txt",
                "startCommand": "cd chatbot && python main.py"
            }
        ]
    }
    
    try:
        response = requests.post(
            f'{RENDER_API_BASE}/blueprints',
            headers=get_headers(),
            json=blueprint_data
        )
        response.raise_for_status()
        
        result = response.json()
        print(f"✅ Blueprint создан: {result.get('id')}")
        return result
        
    except requests.RequestException as e:
        print(f"❌ Ошибка при создании blueprint: {e}")
        return None

def deploy_to_render():
    """Основная функция деплоя"""
    print("🚀 Начинаем деплой на Render...")
    print(f"🔑 Используем API токен: {RENDER_API_TOKEN[:10]}...")
    
    # Проверяем наличие render.yaml
    if not Path('render.yaml').exists():
        print("❌ Файл render.yaml не найден!")
        return False
    
    # Проверяем статус сервисов
    check_render_service_status()
    
    print("\n📝 Для полного деплоя выполните следующие шаги:")
    print("1. Зайдите на https://dashboard.render.com")
    print("2. Нажмите 'New +' -> 'Blueprint'")
    print("3. Подключите ваш GitHub репозиторий")
    print("4. Выберите файл render.yaml")
    print("5. Настройте переменные окружения:")
    print("   - OPENAI_API_KEY: ваш ключ OpenAI")
    print("   - RENDER_API_TOKEN: rnd_h0aJfxLMhjWzHNJx1lGouoyEEQnP")
    print("6. Нажмите 'Apply' для деплоя")
    
    return True

if __name__ == "__main__":
    deploy_to_render()
