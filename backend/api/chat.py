from flask import Flask, jsonify, request
from flask_cors import CORS
import json
import os

app = Flask(__name__)
CORS(app)

# Путь к файлу с данными
DATA_FILE = "perfect_parsed_data.json"

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
        
        return jsonify({
            "total_categories": len(categories),
            "total_badges": len(badges),
            "status": "API работает!"
        })
    except Exception as e:
        return jsonify({"error": f"Ошибка загрузки статистики: {str(e)}"}), 500

@app.route('/')
def index():
    """Главная страница"""
    return jsonify({
        "message": "Путеводитель API",
        "version": "2.0.0",
        "endpoints": {
            "chat": "/api/chat",
            "stats": "/api/stats"
        }
    })

# Экспортируем app для Vercel
if __name__ == '__main__':
    app.run(debug=True)
