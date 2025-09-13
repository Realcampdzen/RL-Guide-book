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
            "stats": "/api/stats",
            "chat": "/api/chat"
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

@app.route('/api/chat', methods=['POST'])
def chat_with_bot():
    """Простой чат-бот без сложных зависимостей"""
    try:
        data = request.get_json()
        message = data.get("message", "")
        
        # Простые ответы без OpenAI для начала
        responses = [
            "Привет! Я НейроВалюша, цифровая вожатая проекта 'Реальный Лагерь'! 🌟",
            "В 'Реальном Лагере' есть 14 категорий значков для развития разных навыков!",
            "Система значков помогает отслеживать прогресс и достижения участников лагеря!",
            "Хочешь узнать о значках? Посмотри категории в главном меню!",
            "Каждый значок имеет свой уровень сложности: базовый, продвинутый, экспертный!",
            "Значки помогают развивать креативность, коммуникацию и лидерские качества!"
        ]
        
        # Простая логика ответов
        if "привет" in message.lower() or "здравствуй" in message.lower():
            response = responses[0]
        elif "значк" in message.lower():
            response = responses[1]
        elif "систем" in message.lower():
            response = responses[2]
        elif "категори" in message.lower():
            response = responses[3]
        elif "уровен" in message.lower():
            response = responses[4]
        elif "развит" in message.lower():
            response = responses[5]
        else:
            response = responses[0]  # По умолчанию
        
        return jsonify({
            "response": response,
            "suggestions": [
                "Покажи все категории значков",
                "Расскажи о системе значков",
                "Какие есть уровни сложности?"
            ]
        })
        
    except Exception as e:
        return jsonify({
            "error": "Ошибка при обращении к чат-боту",
            "message": str(e)
        }), 500

# Экспортируем app для Vercel
if __name__ == '__main__':
    app.run(debug=True)
