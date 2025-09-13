from flask import Flask, jsonify, request
from flask_cors import CORS

app = Flask(__name__)
CORS(app)

@app.route('/api/chat', methods=['POST'])
def chat():
    """Простой чат-бот"""
    try:
        data = request.get_json()
        message = data.get("message", "")
        
        responses = [
            "Привет! Я НейроВалюша, цифровая вожатая проекта 'Реальный Лагерь'! 🌟",
            "В 'Реальном Лагере' есть 14 категорий значков для развития разных навыков!",
            "Система значков помогает отслеживать прогресс и достижения участников лагеря!",
            "Хочешь узнать о значках? Посмотри категории в главном меню!",
            "Каждый значок имеет свой уровень сложности: базовый, продвинутый, экспертный!"
        ]
        
        # Простая логика ответов
        if "привет" in message.lower():
            response = responses[0]
        elif "значк" in message.lower():
            response = responses[1]
        elif "систем" in message.lower():
            response = responses[2]
        elif "категори" in message.lower():
            response = responses[3]
        elif "уровен" in message.lower():
            response = responses[4]
        else:
            response = responses[0]
        
        return jsonify({
            "response": response,
            "suggestions": [
                "Покажи все категории значков",
                "Расскажи о системе значков"
            ]
        })
        
    except Exception as e:
        return jsonify({
            "error": "Ошибка при обращении к чат-боту",
            "message": str(e)
        }), 500

@app.route('/api/stats')
def stats():
    """Статистика"""
    return jsonify({
        "total_categories": 14,
        "total_badges": 242,
        "status": "API работает!"
    })

@app.route('/')
def index():
    """Главная страница"""
    return jsonify({
        "message": "Путеводитель API",
        "version": "2.0.0",
        "endpoints": ["/api/chat", "/api/stats"]
    })

if __name__ == '__main__':
    app.run(debug=True)