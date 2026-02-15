#!/usr/bin/env python3
"""
OpenAI API Proxy Server
Обходит региональные ограничения OpenAI API
"""

import os
import json
import asyncio
import aiohttp
from aiohttp import web, ClientSession
from aiohttp.web import Request, Response
import logging
from dotenv import load_dotenv

# Загружаем переменные окружения из .env файла
load_dotenv()

# Настройка логирования
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Конфигурация
OPENAI_API_KEY = os.getenv("OPENAI_API_KEY")
PROXY_URLS = [
    "https://api.openai-proxy.com/v1",  # Публичный прокси
    "https://openai-api-proxy.vercel.app/v1",  # Альтернативный прокси
    "https://api.openai.com/v1"  # Оригинальный API (если работает)
]

# Простые ответы для тестирования (если все прокси не работают)
FALLBACK_RESPONSES = {
    "привет": "Привет! Я НейроВалюша, твой цифровой вожатый! Как дела? 😊",
    "категории": "У нас есть 14 категорий значков! Хочешь узнать подробнее о какой-то конкретной?",
    "значки": "В системе 'Реального Лагеря' много интересных значков! Что тебя интересует?",
    "помощь": "Я помогу тебе разобраться в системе значков! Спрашивай что угодно! 🌟"
}

class OpenAIProxy:
    def __init__(self):
        self.session = None
        
    async def init_session(self):
        """Инициализация HTTP сессии"""
        if not self.session:
            self.session = ClientSession()
    
    async def cleanup(self):
        """Очистка ресурсов"""
        if self.session:
            await self.session.close()
    
    def get_fallback_response(self, data):
        """Возвращает простой ответ, если все прокси недоступны"""
        try:
            # Извлекаем сообщение пользователя
            messages = data.get('messages', [])
            if messages:
                last_message = messages[-1]
                user_text = last_message.get('content', '').lower()
                
                # Ищем подходящий ответ
                for key, response in FALLBACK_RESPONSES.items():
                    if key in user_text:
                        return web.json_response({
                            "choices": [{
                                "message": {
                                    "content": response,
                                    "role": "assistant"
                                }
                            }]
                        })
            
            # Дефолтный ответ
            return web.json_response({
                "choices": [{
                    "message": {
                        "content": "Привет! Я НейроВалюша! 🌟 К сожалению, сейчас у меня проблемы с подключением к AI, но я все равно могу помочь тебе с системой значков 'Реального Лагеря'! Спрашивай!",
                        "role": "assistant"
                    }
                }]
            })
            
        except Exception as e:
            logger.error(f"Ошибка в fallback ответе: {e}")
            return web.json_response({
                "choices": [{
                    "message": {
                        "content": "Извините, произошла ошибка. Попробуйте еще раз!",
                        "role": "assistant"
                    }
                }]
            })
    
    async def proxy_request(self, request: Request) -> Response:
        """Проксирование запроса к OpenAI API"""
        try:
            # Получаем данные запроса
            data = await request.json()
            headers = dict(request.headers)
            
            # Убираем заголовки, которые могут вызвать проблемы
            headers.pop('host', None)
            headers.pop('content-length', None)
            
            # Добавляем API ключ
            headers['Authorization'] = f'Bearer {OPENAI_API_KEY}'
            
            # Пробуем разные прокси URL
            for proxy_url in PROXY_URLS:
                try:
                    logger.info(f"Пробуем прокси: {proxy_url}")
                    
                    async with self.session.post(
                        f"{proxy_url}/chat/completions",
                        json=data,
                        headers=headers,
                        timeout=aiohttp.ClientTimeout(total=30)
                    ) as response:
                        
                        if response.status == 200:
                            result = await response.json()
                            logger.info(f"Успешный ответ от {proxy_url}")
                            return web.json_response(result)
                        else:
                            error_text = await response.text()
                            logger.warning(f"Ошибка {response.status} от {proxy_url}: {error_text}")
                            continue
                            
                except Exception as e:
                    logger.warning(f"Ошибка подключения к {proxy_url}: {e}")
                    continue
            
            # Если все прокси не сработали, используем fallback ответы
            logger.info("Все прокси недоступны, используем fallback ответы")
            return self.get_fallback_response(data)
            
        except Exception as e:
            logger.error(f"Ошибка проксирования: {e}")
            return web.json_response(
                {"error": f"Ошибка проксирования: {str(e)}"}, 
                status=500
            )

# Создаем экземпляр прокси
proxy = OpenAIProxy()

async def handle_chat_completions(request: Request) -> Response:
    """Обработчик для /v1/chat/completions"""
    return await proxy.proxy_request(request)

async def handle_health(request: Request) -> Response:
    """Проверка здоровья прокси"""
    return web.json_response({
        "status": "healthy",
        "service": "OpenAI API Proxy",
        "openai_key_configured": bool(OPENAI_API_KEY)
    })

async def init_app():
    """Инициализация приложения"""
    await proxy.init_session()
    
    app = web.Application()
    
    # Маршруты
    app.router.add_post('/v1/chat/completions', handle_chat_completions)
    app.router.add_get('/health', handle_health)
    app.router.add_get('/', handle_health)
    
    # Очистка при завершении
    app.on_cleanup.append(proxy.cleanup)
    
    return app

def main():
    """Запуск прокси-сервера"""
    if not OPENAI_API_KEY:
        logger.error("OPENAI_API_KEY не установлен!")
        return
    
    logger.info("🚀 Запуск OpenAI API Proxy...")
    logger.info(f"📡 Прокси будет доступен на: http://localhost:8080")
    logger.info(f"🔑 API ключ: {'*' * 20}{OPENAI_API_KEY[-4:]}")
    
    # Запускаем сервер
    web.run_app(init_app(), host='0.0.0.0', port=8080)

if __name__ == "__main__":
    main()
