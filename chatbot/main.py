"""
Основной файл чат-бота Путеводителя "Реальный Лагерь"
"""
import os
import sys
from pathlib import Path
from typing import Dict, List, Optional
from datetime import datetime

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import HTMLResponse
import uvicorn

# Добавляем путь к модулям
sys.path.append(str(Path(__file__).parent))

from core.data_loader import DataLoader
from core.openai_client import OpenAIClient
from core.context_manager import ContextManager
from core.response_generator import ResponseGenerator
from models.conversation import ChatRequest, ChatResponse, Message, UserContext
from models.badge import Badge, Category

# Инициализация приложения
app = FastAPI(
    title="Чат-бот Путеводителя 'Реальный Лагерь'",
    description="Интеллектуальный чат-бот-вожатый по системе значков",
    version="1.0.0"
)

# Настройка CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Глобальные переменные для компонентов
data_loader: Optional[DataLoader] = None
openai_client: Optional[OpenAIClient] = None
context_manager: Optional[ContextManager] = None
response_generator: Optional[ResponseGenerator] = None


@app.on_event("startup")
async def startup_event():
    """Инициализация компонентов при запуске"""
    global data_loader, openai_client, context_manager, response_generator
    
    try:
        print("🚀 Запуск чат-бота Путеводителя...")
        
        # Инициализация компонентов
        print("📚 Загрузка данных значков...")
        data_loader = DataLoader()
        data_loader.load_all_data()
        
        print("🤖 Инициализация OpenAI клиента...")
        openai_client = OpenAIClient()
        
        print("🧠 Настройка системы контекста...")
        context_manager = ContextManager(data_loader)
        
        print("💬 Инициализация генератора ответов...")
        response_generator = ResponseGenerator(openai_client, data_loader, context_manager)
        
        print("✅ Чат-бот готов к работе!")
        
    except Exception as e:
        print(f"❌ Ошибка инициализации: {e}")
        raise


@app.get("/", response_class=HTMLResponse)
async def root():
    """Главная страница с интерфейсом чата"""
    html_content = """
    <!DOCTYPE html>
    <html lang="ru">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>НейроВалюша - Чат-бот Путеводителя</title>
        <style>
            body {
                font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
                margin: 0;
                padding: 20px;
                background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                min-height: 100vh;
            }
            .container {
                max-width: 800px;
                margin: 0 auto;
                background: white;
                border-radius: 20px;
                box-shadow: 0 20px 40px rgba(0,0,0,0.1);
                overflow: hidden;
            }
            .header {
                background: linear-gradient(135deg, #ff6b6b, #ffa500);
                color: white;
                padding: 20px;
                text-align: center;
            }
            .header h1 {
                margin: 0;
                font-size: 2em;
            }
            .header p {
                margin: 10px 0 0 0;
                opacity: 0.9;
            }
            .chat-container {
                height: 500px;
                overflow-y: auto;
                padding: 20px;
                background: #f8f9fa;
            }
            .message {
                margin: 15px 0;
                padding: 15px;
                border-radius: 15px;
                max-width: 80%;
            }
            .user-message {
                background: #007bff;
                color: white;
                margin-left: auto;
                text-align: right;
            }
            .bot-message {
                background: white;
                border: 1px solid #e9ecef;
                margin-right: auto;
            }
            .input-container {
                padding: 20px;
                background: white;
                border-top: 1px solid #e9ecef;
                display: flex;
                gap: 10px;
            }
            .input-container input {
                flex: 1;
                padding: 15px;
                border: 1px solid #ddd;
                border-radius: 25px;
                font-size: 16px;
                outline: none;
            }
            .input-container button {
                padding: 15px 25px;
                background: #007bff;
                color: white;
                border: none;
                border-radius: 25px;
                cursor: pointer;
                font-size: 16px;
            }
            .input-container button:hover {
                background: #0056b3;
            }
            .suggestions {
                padding: 10px 20px;
                background: #f8f9fa;
                border-top: 1px solid #e9ecef;
            }
            .suggestion {
                display: inline-block;
                margin: 5px;
                padding: 8px 15px;
                background: #e9ecef;
                border-radius: 20px;
                cursor: pointer;
                font-size: 14px;
            }
            .suggestion:hover {
                background: #dee2e6;
            }
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <h1>🌟 НейроВалюша</h1>
                <p>Твой персональный вожатый-эксперт по значкам "Реального Лагеря"</p>
            </div>
            
            <div class="chat-container" id="chatContainer">
                <div class="message bot-message">
                    Привет! 👋 Я НейроВалюша, твой цифровой вожатый! 
                    Я помогу тебе разобраться в системе значков "Реального Лагеря", 
                    подберу подходящие значки и дам креативные идеи для их получения! 
                    Что тебя интересует? 😊
                </div>
            </div>
            
            <div class="suggestions" id="suggestions">
                <div class="suggestion" onclick="sendMessage('Покажи все категории значков')">📚 Все категории</div>
                <div class="suggestion" onclick="sendMessage('Рекомендуй значки по моим интересам')">🎯 Рекомендации</div>
                <div class="suggestion" onclick="sendMessage('Объясни философию системы значков')">💭 Философия</div>
            </div>
            
            <div class="input-container">
                <input type="text" id="messageInput" placeholder="Напиши свой вопрос..." onkeypress="handleKeyPress(event)">
                <button onclick="sendMessage()">Отправить</button>
            </div>
        </div>

        <script>
            let userId = 'user_' + Math.random().toString(36).substr(2, 9);
            
            function handleKeyPress(event) {
                if (event.key === 'Enter') {
                    sendMessage();
                }
            }
            
            async function sendMessage(message = null) {
                const input = document.getElementById('messageInput');
                const messageText = message || input.value.trim();
                
                if (!messageText) return;
                
                // Добавляем сообщение пользователя
                addMessage(messageText, 'user');
                input.value = '';
                
                // Показываем индикатор загрузки
                const loadingId = addMessage('Думаю... 🤔', 'bot');
                
                try {
                    const response = await fetch('/chat', {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                        },
                        body: JSON.stringify({
                            message: messageText,
                            user_id: userId
                        })
                    });
                    
                    const data = await response.json();
                    
                    // Удаляем индикатор загрузки
                    removeMessage(loadingId);
                    
                    // Добавляем ответ бота
                    addMessage(data.response, 'bot');
                    
                    // Обновляем предложения
                    updateSuggestions(data.suggestions || []);
                    
                } catch (error) {
                    removeMessage(loadingId);
                    addMessage('Извините, произошла ошибка. Попробуйте еще раз.', 'bot');
                }
            }
            
            function addMessage(text, sender) {
                const container = document.getElementById('chatContainer');
                const messageDiv = document.createElement('div');
                messageDiv.className = `message ${sender}-message`;
                messageDiv.textContent = text;
                messageDiv.id = 'msg_' + Date.now();
                
                container.appendChild(messageDiv);
                container.scrollTop = container.scrollHeight;
                
                return messageDiv.id;
            }
            
            function removeMessage(messageId) {
                const message = document.getElementById(messageId);
                if (message) {
                    message.remove();
                }
            }
            
            function updateSuggestions(suggestions) {
                const container = document.getElementById('suggestions');
                container.innerHTML = '';
                
                suggestions.forEach(suggestion => {
                    const div = document.createElement('div');
                    div.className = 'suggestion';
                    div.textContent = suggestion;
                    div.onclick = () => sendMessage(suggestion);
                    container.appendChild(div);
                });
            }
        </script>
    </body>
    </html>
    """
    return HTMLResponse(content=html_content)


@app.post("/chat", response_model=ChatResponse)
async def chat(request: ChatRequest):
    """Основной endpoint для общения с ботом"""
    try:
        if not response_generator:
            raise HTTPException(status_code=500, detail="Бот не инициализирован")
        
        # Обрабатываем веб-контекст
        if request.context:
            # Обновляем контекст пользователя на основе веб-интерфейса
            response_generator.context_manager.update_web_context(
                user_id=request.user_id,
                web_context=request.context
            )
        
        # Создаем историю сообщений (пока простую)
        conversation_history = [
            Message(role="user", content=request.message, metadata={})
        ]
        
        # Генерируем ответ
        response = response_generator.generate_response(
            user_message=request.message,
            user_id=request.user_id,
            conversation_history=conversation_history
        )
        
        return response
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Ошибка генерации ответа: {str(e)}")


@app.get("/categories")
async def get_categories():
    """Получение списка всех категорий"""
    try:
        if not data_loader:
            raise HTTPException(status_code=500, detail="Загрузчик данных не инициализирован")
        
        categories = data_loader.get_all_categories()
        return {
            "categories": [
                {
                    "id": cat.id,
                    "title": cat.title,
                    "emoji": cat.emoji,
                    "badges_count": len(cat.badges)
                }
                for cat in categories
            ]
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Ошибка получения категорий: {str(e)}")


@app.get("/badges/{category_id}")
async def get_badges_by_category(category_id: str):
    """Получение значков категории"""
    try:
        if not data_loader:
            raise HTTPException(status_code=500, detail="Загрузчик данных не инициализирован")
        
        badges = data_loader.get_badges_by_category(category_id)
        return {
            "category_id": category_id,
            "badges": [
                {
                    "id": badge.id,
                    "title": badge.title,
                    "emoji": badge.emoji,
                    "description": badge.description,
                    "levels_count": len(badge.levels)
                }
                for badge in badges
            ]
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Ошибка получения значков: {str(e)}")


@app.get("/badge/{badge_id}")
async def get_badge_info(badge_id: str):
    """Получение информации о значке"""
    try:
        if not data_loader:
            raise HTTPException(status_code=500, detail="Загрузчик данных не инициализирован")
        
        badge = data_loader.get_badge(badge_id)
        if not badge:
            raise HTTPException(status_code=404, detail="Значок не найден")
        
        return {
            "badge": {
                "id": badge.id,
                "title": badge.title,
                "emoji": badge.emoji,
                "description": badge.description,
                "nameExplanation": badge.nameExplanation,
                "skillTips": badge.skillTips,
                "examples": badge.examples,
                "philosophy": badge.philosophy,
                "howToBecome": badge.howToBecome,
                "levels": [
                    {
                        "id": level.id,
                        "level": level.level,
                        "title": level.title,
                        "emoji": level.emoji,
                        "criteria": level.criteria,
                        "confirmation": level.confirmation
                    }
                    for level in badge.levels
                ]
            }
        }
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Ошибка получения значка: {str(e)}")


@app.get("/health")
async def health_check():
    """Проверка состояния бота"""
    return {
        "status": "healthy",
        "timestamp": datetime.now().isoformat(),
        "components": {
            "data_loader": data_loader is not None,
            "openai_client": openai_client is not None,
            "context_manager": context_manager is not None,
            "response_generator": response_generator is not None
        }
    }


if __name__ == "__main__":
    print("🌟 Запуск чат-бота НейроВалюши...")
    print("📱 Веб-интерфейс будет доступен по адресу: http://localhost:8000")
    print("🔧 API документация: http://localhost:8000/docs")
    
    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=8000,
        reload=True,
        log_level="info"
    )
