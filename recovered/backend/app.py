#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Flask API для Путеводителя "Реального Лагеря"
Предоставляет данные о категориях и значках
"""

from flask import Flask, jsonify, request, send_from_directory
from flask_cors import CORS
import json
import os
import requests
from pathlib import Path
from dotenv import load_dotenv

# Загружаем переменные окружения из .env файла (если есть)
load_dotenv()

app = Flask(__name__)
CORS(app)  # Разрешаем CORS для фронтенда

# Путь к файлу с данными (фиксируем относительно backend/, чтобы не зависеть от cwd)
DATA_FILE = os.path.join(os.path.dirname(__file__), "perfect_parsed_data.json")

@app.route('/')
def index():
    """Главная страница"""
    return jsonify({
        "message": "Путеводитель API",
        "version": "2.0.0",
        "total_badges": 242,
        "total_categories": 14,
        "endpoints": {
            "categories": "/api/categories",
            "badges": "/api/badges",
            "data": "/api/data",
            "category": "/api/category/<id>",
            "badge": "/api/badge/<id>",
            "search": "/api/search",
            "stats": "/api/stats"
        }
    })

@app.route('/api/data')
def get_all_data():
    """Получить все данные (категории и значки)"""
    try:
        if not os.path.exists(DATA_FILE):
            return jsonify({"error": "Файл данных не найден"}), 404
        
        with open(DATA_FILE, 'r', encoding='utf-8') as f:
            data = json.load(f)
        
        return jsonify(data)
    except Exception as e:
        return jsonify({"error": f"Ошибка загрузки данных: {str(e)}"}), 500

@app.route('/api/categories')
def get_categories():
    """Получить список всех категорий"""
    try:
        if not os.path.exists(DATA_FILE):
            return jsonify({"error": "Файл данных не найден"}), 404
        
        with open(DATA_FILE, 'r', encoding='utf-8') as f:
            data = json.load(f)
        
        return jsonify({
            "categories": data.get("categories", []),
            "total": len(data.get("categories", []))
        })
    except Exception as e:
        return jsonify({"error": f"Ошибка загрузки категорий: {str(e)}"}), 500

@app.route('/api/badges')
def get_badges():
    """Получить список всех значков"""
    try:
        if not os.path.exists(DATA_FILE):
            return jsonify({"error": "Файл данных не найден"}), 404
        
        with open(DATA_FILE, 'r', encoding='utf-8') as f:
            data = json.load(f)
        
        # Фильтрация по категории
        category_id = request.args.get('category_id')
        badges = data.get("badges", [])
        
        if category_id:
            badges = [badge for badge in badges if badge.get("category_id") == category_id]
        
        return jsonify({
            "badges": badges,
            "total": len(badges)
        })
    except Exception as e:
        return jsonify({"error": f"Ошибка загрузки значков: {str(e)}"}), 500

@app.route('/api/category/<category_id>')
def get_category(category_id):
    """Получить конкретную категорию по ID"""
    try:
        if not os.path.exists(DATA_FILE):
            return jsonify({"error": "Файл данных не найден"}), 404
        
        with open(DATA_FILE, 'r', encoding='utf-8') as f:
            data = json.load(f)
        
        categories = data.get("categories", [])
        category = next((cat for cat in categories if cat.get("id") == category_id), None)
        
        if not category:
            return jsonify({"error": "Категория не найдена"}), 404
        
        # Получаем значки для этой категории
        badges = data.get("badges", [])
        category_badges = [badge for badge in badges if badge.get("category_id") == category_id]
        
        category["badges"] = category_badges
        
        return jsonify(category)
    except Exception as e:
        return jsonify({"error": f"Ошибка загрузки категории: {str(e)}"}), 500

@app.route('/api/badge/<badge_id>')
def get_badge(badge_id):
    """Получить конкретный значок по ID"""
    try:
        if not os.path.exists(DATA_FILE):
            return jsonify({"error": "Файл данных не найден"}), 404
        
        with open(DATA_FILE, 'r', encoding='utf-8') as f:
            data = json.load(f)
        
        badges = data.get("badges", [])
        badge = next((badge for badge in badges if badge.get("id") == badge_id), None)
        
        if not badge:
            return jsonify({"error": "Значок не найден"}), 404
        
        return jsonify(badge)
    except Exception as e:
        return jsonify({"error": f"Ошибка загрузки значка: {str(e)}"}), 500

@app.route('/api/search')
def search_badges():
    """Поиск значков по названию или описанию"""
    try:
        query = request.args.get('q', '').lower()
        if not query:
            return jsonify({"error": "Необходим параметр 'q' для поиска"}), 400
        
        if not os.path.exists(DATA_FILE):
            return jsonify({"error": "Файл данных не найден"}), 404
        
        with open(DATA_FILE, 'r', encoding='utf-8') as f:
            data = json.load(f)
        
        badges = data.get("badges", [])
        results = []
        
        for badge in badges:
            title = badge.get("title", "").lower()
            description = badge.get("description", "").lower()
            
            if query in title or query in description:
                results.append(badge)
        
        return jsonify({
            "results": results,
            "total": len(results),
            "query": query
        })
    except Exception as e:
        return jsonify({"error": f"Ошибка поиска: {str(e)}"}), 500

@app.route('/api/stats')
def get_stats():
    """Получить статистику по значкам и категориям"""
    try:
        if not os.path.exists(DATA_FILE):
            return jsonify({"error": "Файл данных не найден"}), 404
        
        with open(DATA_FILE, 'r', encoding='utf-8') as f:
            data = json.load(f)
        
        categories = data.get("categories", [])
        badges = data.get("badges", [])
        
        # Статистика по уровням
        level_stats = {}
        for badge in badges:
            level = badge.get("level", "Неизвестно")
            level_stats[level] = level_stats.get(level, 0) + 1
        
        # Статистика по категориям
        category_stats = {}
        for category in categories:
            cat_id = category.get("id")
            cat_badges = [b for b in badges if b.get("category_id") == cat_id]
            category_stats[cat_id] = {
                "title": category.get("title"),
                "total_badges": len(cat_badges),
                "expected_badges": category.get("expected_badges", 0)
            }
        
        return jsonify({
            "total_categories": len(categories),
            "total_badges": len(badges),
            "level_distribution": level_stats,
            "category_distribution": category_stats,
            "metadata": data.get("metadata", {})
        })
    except Exception as e:
        return jsonify({"error": f"Ошибка загрузки статистики: {str(e)}"}), 500

@app.route('/perfect_parsed_data.json')
def serve_parsed_data():
    """Сервим файл с парсированными данными"""
    try:
        return send_from_directory(os.path.dirname(__file__), 'perfect_parsed_data.json')
    except Exception as e:
        return jsonify({"error": f"Файл не найден: {str(e)}"}), 404

@app.route('/health')
def health_check():
    """Проверка здоровья API"""
    try:
        if os.path.exists(DATA_FILE):
            with open(DATA_FILE, 'r', encoding='utf-8') as f:
                data = json.load(f)
            
            metadata = data.get("metadata", {})
            return jsonify({
                "status": "healthy",
                "data_file": DATA_FILE,
                "total_categories": len(data.get("categories", [])),
                "total_badges": len(data.get("badges", [])),
                "last_parsed": metadata.get("parsed_at", "unknown")
            })
        else:
            return jsonify({
                "status": "unhealthy",
                "error": "Data file not found"
            }), 503
    except Exception as e:
        return jsonify({
            "status": "unhealthy",
            "error": str(e)
        }), 503

if __name__ == '__main__':
    # ВАЖНО (Windows): не используем эмодзи в stdout, иначе возможен UnicodeEncodeError (cp1251)
    print("Запуск API сервера Путеводителя...")
    print(f"Файл данных: {DATA_FILE}")
    
    if os.path.exists(DATA_FILE):
        with open(DATA_FILE, 'r', encoding='utf-8') as f:
            data = json.load(f)
        print(f"Загружено {len(data.get('categories', []))} категорий и {len(data.get('badges', []))} значков")
    else:
        print("Файл данных не найден!")
    
# Импорты для чат-бота
import sys
from pathlib import Path

# Добавляем путь к модулям чат-бота
CHATBOT_PATH = Path(__file__).parent.parent / "chatbot"
sys.path.append(str(CHATBOT_PATH))

# Глобальные переменные для компонентов чат-бота
chatbot_components = {
    'data_loader': None,
    'openai_client': None,
    'context_manager': None,
    'response_generator': None
}

def initialize_chatbot():
    """Инициализация компонентов чат-бота"""
    global chatbot_components
    
    try:
        import sys
        from pathlib import Path
        # Добавляем путь к модулям chatbot
        chatbot_path = Path(__file__).parent.parent / 'chatbot'
        if str(chatbot_path) not in sys.path:
            sys.path.insert(0, str(chatbot_path))
        
        from core.data_loader_new import DataLoaderNew
        from core.openai_client import OpenAIClient
        from core.context_manager import ContextManager
        from core.response_generator import ResponseGenerator
        
        print("Инициализация чат-бота...")
        
        # Инициализация компонентов
        # Каноничный источник данных для бота — public/ai-data (ai-data структура)
        chatbot_components['data_loader'] = DataLoaderNew(use_ai_data=True)
        # Лёгкий прогрев кэша (не грузим всё целиком при старте)
        chatbot_components['data_loader'].preload_popular_categories()
        
        # Проверяем наличие API ключа перед инициализацией OpenAI клиента
        api_key = os.getenv("OPENAI_API_KEY")
        if not api_key:
            print("OPENAI_API_KEY не найден. Чат-бот будет недоступен, но API для данных работает.")
            return False
        
        chatbot_components['openai_client'] = OpenAIClient()
        chatbot_components['context_manager'] = ContextManager(chatbot_components['data_loader'])
        chatbot_components['response_generator'] = ResponseGenerator(
            chatbot_components['openai_client'], 
            chatbot_components['data_loader'], 
            chatbot_components['context_manager']
        )
        
        print("Чат-бот инициализирован успешно!")
        return True
        
    except Exception as e:
        print(f"Ошибка инициализации чат-бота: {e}")
        import traceback
        traceback.print_exc()
        return False

@app.route('/api/chat', methods=['POST'])
def chat_with_bot():
    """Интегрированный чат-бот НейроВалюши"""
    try:
        data = request.get_json()
        
        # Проверяем, инициализирован ли чат-бот
        if not chatbot_components['response_generator']:
            # Пытаемся инициализировать
            if not initialize_chatbot():
                return jsonify({
                    "error": "Чат-бот не может быть инициализирован",
                    "message": "Проверьте настройки OpenAI API"
                }), 503
        
        # Обрабатываем веб-контекст
        context = data.get("context", {})
        if context and isinstance(context, dict) and context:
            chatbot_components['response_generator'].context_manager.update_web_context(
                user_id=data.get("user_id", "web_user"),
                web_context=context
            )
        
        # Получаем историю сообщений пользователя
        user_id = data.get("user_id", "web_user")
        conversation_history = chatbot_components['response_generator'].context_manager.get_conversation_history(user_id)
        
        # Добавляем новое сообщение пользователя в историю
        from models.conversation import Message
        user_message = Message(role="user", content=data.get("message", ""), metadata={})
        chatbot_components['response_generator'].context_manager.add_message_to_history(user_id, user_message)
        
        # Генерируем ответ
        response = chatbot_components['response_generator'].generate_response(
            user_message=data.get("message", ""),
            user_id=user_id,
            conversation_history=conversation_history
        )
        
        # Добавляем ответ бота в историю
        bot_message = Message(role="assistant", content=response.response, metadata=response.metadata)
        chatbot_components['response_generator'].context_manager.add_message_to_history(user_id, bot_message)
        
        # Flask jsonify не умеет сериализовать pydantic-модели напрямую
        context_updates = response.context_updates
        if context_updates is not None:
            if hasattr(context_updates, "model_dump"):
                context_updates = context_updates.model_dump()
            elif hasattr(context_updates, "dict"):
                context_updates = context_updates.dict()

        return jsonify({
            "response": response.response,
            "suggestions": response.suggestions or [
                "Покажи все категории значков",
                "Рекомендуй значки по моим интересам",
                "Объясни философию системы значков"
            ],
            "context_updates": context_updates,
            "metadata": response.metadata
        })
        
    except Exception as e:
        return jsonify({
            "error": "Ошибка при обращении к чат-боту",
            "message": str(e)
        }), 500

# Для Vercel
if __name__ == '__main__':
    # ВАЖНО (Windows): не используем эмодзи в stdout, иначе возможен UnicodeEncodeError (cp1251)
    print("Запуск Flask API для Путеводителя...")
    
    if os.path.exists(DATA_FILE):
        with open(DATA_FILE, 'r', encoding='utf-8') as f:
            data = json.load(f)
        print(f"Загружено {len(data.get('categories', []))} категорий и {len(data.get('badges', []))} значков")
    else:
        print("Файл данных не найден!")
    
    print("API доступен по адресу: http://localhost:4000")
    print("Статистика: http://localhost:4000/api/stats")
    print("Поиск: http://localhost:4000/api/search?q=валюша")
    print("Чат-бот: http://localhost:4000/api/chat")
    
    app.run(debug=False, host='0.0.0.0', port=4000)

# Для Vercel - экспортируем app
# Vercel будет использовать это как WSGI приложение
