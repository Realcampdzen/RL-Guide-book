"""
Интеграция с OpenAI API
"""
import os
from typing import List, Dict, Any, Optional
from openai import OpenAI
from dotenv import load_dotenv

from models.conversation import Message, UserContext

# Загружаем переменные окружения
load_dotenv()


class OpenAIClient:
    """Клиент для работы с OpenAI API"""
    
    def __init__(self, api_key: Optional[str] = None):
        """
        Инициализация клиента
        
        Args:
            api_key: API ключ OpenAI (если не указан, берется из .env)
        """
        self.api_key = api_key or os.getenv("OPENAI_API_KEY")
        if not self.api_key:
            raise ValueError("Не указан OPENAI_API_KEY")
        
        self.client = OpenAI(api_key=self.api_key)
        self.model = "gpt-4o-mini"  # Используем GPT-4o mini как указано в требованиях
    
    def generate_response(
        self,
        messages: List[Message],
        system_prompt: str,
        user_context: Optional[UserContext] = None,
        max_tokens: int = 1000,
        temperature: float = 0.7
    ) -> str:
        """
        Генерирует ответ от бота
        
        Args:
            messages: История сообщений
            system_prompt: Системный промпт
            user_context: Контекст пользователя
            max_tokens: Максимальное количество токенов
            temperature: Температура генерации
            
        Returns:
            Ответ бота
        """
        # Формируем сообщения для API
        api_messages = [{"role": "system", "content": system_prompt}]
        
        # Добавляем контекст пользователя если есть
        if user_context:
            context_info = self._format_user_context(user_context)
            api_messages.append({"role": "system", "content": f"Контекст пользователя: {context_info}"})
        
        # Добавляем историю сообщений
        for message in messages[-10:]:  # Ограничиваем историю последними 10 сообщениями
            api_messages.append({
                "role": message.role,
                "content": message.content
            })
        
        try:
            response = self.client.chat.completions.create(
                model=self.model,
                messages=api_messages,
                max_tokens=max_tokens,
                temperature=temperature
            )
            
            return response.choices[0].message.content.strip()
        
        except Exception as e:
            return f"Извините, произошла ошибка при генерации ответа: {str(e)}"
    
    def _format_user_context(self, context: UserContext) -> str:
        """Форматирует контекст пользователя для промпта"""
        context_parts = []
        
        if context.current_category:
            context_parts.append(f"Текущая категория: {context.current_category}")
        
        if context.current_badge:
            context_parts.append(f"Текущий значок: {context.current_badge}")
        
        if context.interests:
            context_parts.append(f"Интересы: {', '.join(context.interests)}")
        
        if context.level:
            context_parts.append(f"Уровень: {context.level}")
        
        return "; ".join(context_parts)
    
    def generate_creative_ideas(
        self,
        badge_id: str,
        badge_info: str,
        user_context: Optional[UserContext] = None
    ) -> List[str]:
        """
        Генерирует креативные идеи для получения значка
        
        Args:
            badge_id: ID значка
            badge_info: Информация о значке
            user_context: Контекст пользователя
            
        Returns:
            Список креативных идей
        """
        prompt = f"""
        Ты - креативный вожатый "Реального Лагеря". 
        Пользователь интересуется значком: {badge_id}
        
        Информация о значке:
        {badge_info}
        
        Сгенерируй 3-5 креативных и практических идей для получения этого значка.
        Идеи должны быть:
        - Конкретными и выполнимыми
        - Интересными и мотивирующими
        - Подходящими для лагерной среды
        - Учитывающими возраст участников (8-17 лет)
        
        Формат ответа: каждая идея с новой строки, начинается с эмодзи и краткого описания.
        """
        
        if user_context and user_context.interests:
            prompt += f"\n\nИнтересы пользователя: {', '.join(user_context.interests)}"
        
        try:
            response = self.client.chat.completions.create(
                model=self.model,
                messages=[{"role": "user", "content": prompt}],
                max_tokens=500,
                temperature=0.8
            )
            
            # Разбиваем ответ на отдельные идеи
            ideas = response.choices[0].message.content.strip().split('\n')
            return [idea.strip() for idea in ideas if idea.strip()]
        
        except Exception as e:
            return [f"Извините, не удалось сгенерировать идеи: {str(e)}"]
    
    def explain_philosophy(
        self,
        category_id: str,
        category_info: str,
        user_context: Optional[UserContext] = None
    ) -> str:
        """
        Объясняет философию категории простыми словами
        
        Args:
            category_id: ID категории
            category_info: Информация о категории
            user_context: Контекст пользователя
            
        Returns:
            Объяснение философии
        """
        prompt = f"""
        Ты - мудрый вожатый "Реального Лагеря". 
        Объясни философию категории {category_id} простыми и понятными словами.
        
        Информация о категории:
        {category_info}
        
        Объяснение должно быть:
        - Понятным для детей и подростков
        - Мотивирующим и вдохновляющим
        - Практичным и применимым
        - Использовать примеры из жизни
        - Длиной 2-3 абзаца
        
        Используй дружелюбный тон и эмодзи для лучшего восприятия.
        """
        
        try:
            response = self.client.chat.completions.create(
                model=self.model,
                messages=[{"role": "user", "content": prompt}],
                max_tokens=400,
                temperature=0.6
            )
            
            return response.choices[0].message.content.strip()
        
        except Exception as e:
            return f"Извините, не удалось объяснить философию: {str(e)}"
