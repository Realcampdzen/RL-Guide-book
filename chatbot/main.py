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

from core.data_loader_new import DataLoaderNew
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

# Монтирование статических файлов (независимо от текущей рабочей директории)
BASE_DIR = Path(__file__).parent
STATIC_DIR = BASE_DIR / "static"
app.mount("/static", StaticFiles(directory=str(STATIC_DIR)), name="static")

# Глобальные переменные для компонентов
data_loader: Optional[DataLoaderNew] = None
openai_client: Optional[OpenAIClient] = None
context_manager: Optional[ContextManager] = None
response_generator: Optional[ResponseGenerator] = None


@app.on_event("startup")
async def startup_event():
    """Инициализация компонентов при запуске"""
    global data_loader, openai_client, context_manager, response_generator
    
    try:
        # Печать без эмодзи для совместимости с консолью Windows CP1251
        print("Zapusk chat-bota Putevoditelja...")
        
        # Инициализация компонентов
        print("Zagruzka dannyh znachkov...")
        data_loader = DataLoaderNew(use_ai_data=True)
        data_loader.preload_popular_categories()  # Предзагружаем популярные категории
        
        print("Initsializacija OpenAI klienta...")
        openai_client = OpenAIClient()
        
        print("Nastrojka sistemy konteksta...")
        context_manager = ContextManager(data_loader)
        
        print("Initsializacija generatora otvetov...")
        response_generator = ResponseGenerator(openai_client, data_loader, context_manager)
        
        print("Chat-bot gotov k rabote!")
        
    except Exception as e:
        # Без эмодзи, чтобы избежать ошибок кодировки в консоли
        print(f"Oshibka initsializacii: {e}")
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
        <link rel="stylesheet" href="/static/chatbot.css">
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
                <div class="suggestion" data-message="Покажи все категории значков">📚 Все категории</div>
                <div class="suggestion" data-message="Рекомендуй значки по моим интересам">🎯 Рекомендации</div>
                <div class="suggestion" data-message="Объясни философию системы значков">💭 Философия</div>
            </div>
            
            <div class="input-container">
                <input type="text" id="messageInput" placeholder="Напиши свой вопрос...">
                <button id="sendButton">Отправить</button>
            </div>
        </div>

        <script src="/static/chatbot.js"></script>
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
        
        # Получаем историю сообщений пользователя
        conversation_history = response_generator.context_manager.get_conversation_history(request.user_id)
        
        # Добавляем новое сообщение пользователя в историю
        user_message = Message(role="user", content=request.message, metadata={})
        response_generator.context_manager.add_message_to_history(request.user_id, user_message)
        
        # Генерируем ответ
        response = response_generator.generate_response(
            user_message=request.message,
            user_id=request.user_id,
            conversation_history=conversation_history
        )
        
        # Добавляем ответ бота в историю
        bot_message = Message(role="assistant", content=response.response, metadata=response.metadata)
        response_generator.context_manager.add_message_to_history(request.user_id, bot_message)
        
        return response
        
    except Exception as e:
        # Возвращаем дружелюбное сообщение вместо 500, чтобы фронтенд не падал
        try:
            user_ctx = response_generator.context_manager.get_user_context(request.user_id) if response_generator else None
        except Exception:
            user_ctx = None
        return ChatResponse(
            response=f"Извини, сейчас не получилось ответить: {str(e)}",
            suggestions=[
                "Покажи все категории значков",
                "Рекомендуй значки по моим интересам",
                "Объясни философию системы значков"
            ],
            context_updates=user_ctx,
            metadata={
                "error": str(e),
                "timestamp": datetime.now().isoformat()
            }
        )


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
        
        category = data_loader.get_category(category_id)
        if not category:
            raise HTTPException(status_code=404, detail="Категория не найдена")
        badges = category.badges
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
