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

app = Flask(__name__)
CORS(app)  # Разрешаем CORS для фронтенда

# Путь к файлу с данными
DATA_FILE = "perfect_parsed_data.json"

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
        return send_from_directory('.', 'perfect_parsed_data.json')
    except Exception as e:
        return jsonify({"error": f"Файл не найден: {str(e)}"}), 404

@app.route('/health')
def health_check():
    """Проверка здоровья API"""
    try:
        if os.path.exists(DATA_FILE):
            with open(DATA_FILE, 'r', encoding='utf-8') as f:
                data = json.load(f)
            
            return jsonify({
                "status": "healthy",
                "data_file": DATA_FILE,
                "total_categories": len(data.get("categories", [])),
                "total_badges": len(data.get("badges", [])),
                "last_parsed": data.get("metadata", {}).get("parsed_at", "unknown")
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
    print("🚀 Запуск API сервера Путеводителя...")
    print(f"📁 Файл данных: {DATA_FILE}")
    
    if os.path.exists(DATA_FILE):
        with open(DATA_FILE, 'r', encoding='utf-8') as f:
            data = json.load(f)
        print(f"✅ Загружено {len(data.get('categories', []))} категорий и {len(data.get('badges', []))} значков")
    else:
        print("⚠️ Файл данных не найден!")
    
@app.route('/api/chat', methods=['POST'])
def chat_with_bot():
    """Прокси для чат-бота НейроВалюши"""
    try:
        data = request.get_json()
        
        # Формируем правильный запрос для FastAPI
        chat_request = {
            "message": data.get("message", ""),
            "user_id": data.get("user_id", "web_user")
        }
        
        # Добавляем context только если он не пустой
        context = data.get("context", {})
        if context and isinstance(context, dict) and context:
            chat_request["context"] = context
        
        # Проксируем запрос к FastAPI чат-боту
        chat_response = requests.post(
            'http://127.0.0.1:8000/chat',
            json=chat_request,
            headers={'Content-Type': 'application/json'},
            timeout=30
        )
        
        if chat_response.status_code == 200:
            return jsonify(chat_response.json())
        else:
            return jsonify({
                "error": "Чат-бот временно недоступен",
                "message": "Попробуйте позже или обратитесь к администратору"
            }), 503
            
    except requests.exceptions.ConnectionError:
        return jsonify({
            "error": "Чат-бот не запущен",
            "message": "НейроВалюша временно недоступна. Запустите чат-бот отдельно."
        }), 503
    except Exception as e:
        return jsonify({
            "error": "Ошибка при обращении к чат-боту",
            "message": str(e)
        }), 500

if __name__ == '__main__':
    print("🚀 Запуск Flask API для Путеводителя...")
    
    if os.path.exists(DATA_FILE):
        with open(DATA_FILE, 'r', encoding='utf-8') as f:
            data = json.load(f)
        print(f"✅ Загружено {len(data.get('categories', []))} категорий и {len(data.get('badges', []))} значков")
    else:
        print("⚠️ Файл данных не найден!")
    
    print("🌐 API доступен по адресу: http://localhost:5000")
    print("📊 Статистика: http://localhost:5000/api/stats")
    print("🔍 Поиск: http://localhost:5000/api/search?q=валюша")
    print("🤖 Чат-бот: http://localhost:5000/api/chat")
    
    app.run(debug=False, host='0.0.0.0', port=5000)
