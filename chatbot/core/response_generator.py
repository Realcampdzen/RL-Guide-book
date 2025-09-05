"""
Генератор персонализированных ответов
"""
from typing import List, Dict, Any, Optional
from datetime import datetime

from models.conversation import Message, UserContext, ChatResponse
from models.badge import Badge, Category
from core.openai_client import OpenAIClient
from core.data_loader import DataLoader
from core.context_manager import ContextManager
from prompts.system_prompt import (
    get_system_prompt_with_context,
    get_badge_explanation_prompt,
    get_creative_ideas_prompt,
    get_recommendation_prompt
)


class ResponseGenerator:
    """Генератор ответов чат-бота"""
    
    def __init__(
        self,
        openai_client: OpenAIClient,
        data_loader: DataLoader,
        context_manager: ContextManager
    ):
        """
        Инициализация генератора ответов
        
        Args:
            openai_client: Клиент OpenAI
            data_loader: Загрузчик данных
            context_manager: Менеджер контекста
        """
        self.openai_client = openai_client
        self.data_loader = data_loader
        self.context_manager = context_manager
    
    def generate_response(
        self,
        user_message: str,
        user_id: str,
        conversation_history: List[Message]
    ) -> ChatResponse:
        """
        Генерирует ответ на сообщение пользователя
        
        Args:
            user_message: Сообщение пользователя
            user_id: ID пользователя
            conversation_history: История диалога
            
        Returns:
            Ответ бота
        """
        # Обновляем контекст на основе сообщения
        user_context = self.context_manager.detect_context_from_message(user_id, user_message)
        
        # Определяем тип запроса
        request_type = self._analyze_request_type(user_message, user_context)
        
        # Генерируем ответ в зависимости от типа запроса
        if request_type == "badge_explanation":
            response = self._generate_badge_explanation(user_message, user_context)
        elif request_type == "creative_ideas":
            response = self._generate_creative_ideas(user_message, user_context)
        elif request_type == "recommendations":
            response = self._generate_recommendations(user_message, user_context)
        elif request_type == "category_info":
            response = self._generate_category_info(user_message, user_context)
        elif request_type == "philosophy":
            response = self._generate_philosophy_explanation(user_message, user_context)
        else:
            response = self._generate_general_response(user_message, user_context, conversation_history)
        
        # Очищаем ответ от markdown форматирования
        response = self._clean_markdown(response)
        
        # Генерируем предложения для дальнейшего общения
        suggestions = self._generate_suggestions(user_context)
        
        return ChatResponse(
            response=response,
            suggestions=suggestions,
            context_updates=user_context,
            metadata={
                "request_type": request_type,
                "timestamp": datetime.now().isoformat()
            }
        )
    
    def _analyze_request_type(self, message: str, context: UserContext) -> str:
        """Анализирует тип запроса пользователя"""
        message_lower = message.lower()
        
        # Ключевые слова для разных типов запросов
        if any(word in message_lower for word in ["объясни", "расскажи", "что такое", "как получить"]):
            if context.current_badge:
                return "badge_explanation"
            elif context.current_category:
                return "category_info"
        
        if any(word in message_lower for word in ["идеи", "как сделать", "примеры", "варианты"]):
            return "creative_ideas"
        
        if any(word in message_lower for word in ["рекомендуй", "посоветуй", "что выбрать", "подходящий"]):
            return "recommendations"
        
        if any(word in message_lower for word in ["философия", "зачем", "почему", "смысл"]):
            return "philosophy"
        
        return "general"
    
    def _generate_badge_explanation(self, message: str, context: UserContext) -> str:
        """Генерирует объяснение значка"""
        if not context.current_badge:
            return "Сначала выберите значок, который вас интересует! 😊"
        
        badge = self.data_loader.get_badge(context.current_badge)
        if not badge:
            return "Извините, не удалось найти информацию об этом значке."
        
        # Формируем информацию о значке
        badge_info = self._format_badge_info(badge)
        
        # Генерируем объяснение
        prompt = get_badge_explanation_prompt(badge_info)
        
        return self.openai_client.generate_response(
            messages=[Message(role="user", content=prompt, metadata={})],
            system_prompt=get_system_prompt_with_context(
                current_badge=badge.title,
                user_level=context.level,
                user_interests=context.interests
            )
        )
    
    def _generate_creative_ideas(self, message: str, context: UserContext) -> str:
        """Генерирует креативные идеи"""
        if not context.current_badge:
            return "Для генерации идей выберите значок, который вас интересует! 💡"
        
        badge = self.data_loader.get_badge(context.current_badge)
        if not badge:
            return "Извините, не удалось найти информацию об этом значке."
        
        # Формируем информацию о значке
        badge_info = self._format_badge_info(badge)
        user_context_str = f"Интересы: {', '.join(context.interests)}, Уровень: {context.level}"
        
        # Генерируем идеи
        prompt = get_creative_ideas_prompt(badge_info, user_context_str)
        
        return self.openai_client.generate_response(
            messages=[Message(role="user", content=prompt, metadata={})],
            system_prompt=get_system_prompt_with_context(
                current_badge=badge.title,
                user_level=context.level,
                user_interests=context.interests
            )
        )
    
    def _generate_recommendations(self, message: str, context: UserContext) -> str:
        """Генерирует рекомендации значков"""
        # Получаем персонализированные рекомендации
        recommendations = self.context_manager.get_personalized_recommendations(context.user_id, limit=5)
        
        if not recommendations:
            return "Пока у меня нет рекомендаций. Расскажите о своих интересах, и я подберу подходящие значки! 🎯"
        
        # Формируем ответ с рекомендациями
        response_parts = ["Вот мои рекомендации для вас: 🌟\n"]
        
        for i, rec in enumerate(recommendations[:3], 1):
            badge = rec["badge"]
            reason = rec["reason"]
            response_parts.append(
                f"{i}. {badge.emoji} **{badge.title}**\n"
                f"   {reason}\n"
                f"   {badge.description[:100]}...\n"
            )
        
        response_parts.append("\nКакой значок вас больше всего заинтересовал? 😊")
        
        return "\n".join(response_parts)
    
    def _generate_category_info(self, message: str, context: UserContext) -> str:
        """Генерирует информацию о категории"""
        if not context.current_category:
            return "Выберите категорию, о которой хотите узнать больше! 📚"
        
        category = self.data_loader.get_category(context.current_category)
        if not category:
            return "Извините, не удалось найти информацию об этой категории."
        
        # Формируем информацию о категории
        category_info = f"""
**{category.emoji} {category.title}**

{category.introduction or "Описание категории пока не доступно."}

Значки в этой категории:
"""
        
        for badge in category.badges[:5]:  # Показываем первые 5 значков
            category_info += f"\n• {badge.emoji} {badge.title}"
        
        if len(category.badges) > 5:
            category_info += f"\n• ... и еще {len(category.badges) - 5} значков"
        
        category_info += "\n\nКакой значок вас интересует? 🤔"
        
        return category_info
    
    def _generate_philosophy_explanation(self, message: str, context: UserContext) -> str:
        """Генерирует объяснение философии"""
        if context.current_category:
            category = self.data_loader.get_category(context.current_category)
            if category:
                return self.openai_client.explain_philosophy(
                    category.id,
                    category.introduction or category.title,
                    context
                )
        
        # Общая философия системы значков
        return """
🌟 **Философия системы значков "Реального Лагеря"**

Значки здесь — не награды, а **маршруты развития**! 🗺️

Каждый значок — это не медаль за прошлое, а **маяк, освещающий направления твоего развития**. 

**Главные принципы:**
• 🎯 **Опыт важнее награды** - главная ценность в навыках, которые ты развиваешь
• 🧭 **Ты выбираешь свой путь** - значки помогают найти направление, но выбор за тобой
• 🌱 **Развитие через практику** - навыки развиваются только через реальное применение
• 🤝 **Помощь другим** - обучая других, ты лучше понимаешь материал

**Помни:** значки — это не цель, а средство стать лучшей версией себя! 💪

О какой категории или значке хочешь узнать больше? 😊
"""
    
    def _generate_general_response(
        self,
        message: str,
        context: UserContext,
        conversation_history: List[Message]
    ) -> str:
        """Генерирует общий ответ"""
        # Формируем системный промпт с контекстом
        system_prompt = get_system_prompt_with_context(
            current_category=context.current_category or "",
            current_badge=context.current_badge or "",
            user_level=context.level,
            user_interests=context.interests
        )
        
        # Добавляем контекстную информацию о значках/категориях
        context_info = self._get_contextual_info(context)
        if context_info:
            system_prompt += f"\n\n## Дополнительная информация:\n{context_info}"
        
        return self.openai_client.generate_response(
            messages=conversation_history,
            system_prompt=system_prompt,
            user_context=context
        )
    
    def _format_badge_info(self, badge: Badge) -> str:
        """Форматирует информацию о значке"""
        info_parts = [
            f"**{badge.emoji} {badge.title}**",
            f"Описание: {badge.description}"
        ]
        
        if badge.nameExplanation:
            info_parts.append(f"Объяснение названия: {badge.nameExplanation}")
        
        if badge.skillTips:
            info_parts.append(f"Советы: {badge.skillTips}")
        
        if badge.examples:
            info_parts.append(f"Примеры: {badge.examples}")
        
        if badge.philosophy:
            info_parts.append(f"Философия: {badge.philosophy}")
        
        if badge.howToBecome:
            info_parts.append(f"Как получить: {badge.howToBecome}")
        
        # Добавляем информацию об уровнях
        if badge.levels:
            info_parts.append("\n**Уровни:**")
            for level in badge.levels:
                info_parts.append(f"- {level.emoji} {level.title}: {level.criteria[:100]}...")
        
        return "\n\n".join(info_parts)
    
    def _get_contextual_info(self, context: UserContext) -> str:
        """Получает контекстную информацию"""
        info_parts = []
        
        # Добавляем информацию о текущем экране
        current_view = context.session_data.get('current_view')
        if current_view:
            view_names = {
                'intro': 'Главная страница',
                'categories': 'Список категорий',
                'category': 'Категория значков',
                'badge': 'Страница значка',
                'badge-level': 'Уровень значка',
                'introduction': 'Введение в путеводитель',
                'additional-material': 'Дополнительные материалы'
            }
            view_name = view_names.get(current_view, current_view)
            info_parts.append(f"Пользователь находится на экране: {view_name}")
        
        if context.current_badge:
            badge = self.data_loader.get_badge(context.current_badge)
            if badge:
                info_parts.append(f"Текущий значок: {badge.emoji} {badge.title}")
                info_parts.append(f"Описание: {badge.description}")
        
        if context.current_category:
            category = self.data_loader.get_category(context.current_category)
            if category:
                info_parts.append(f"Текущая категория: {category.emoji} {category.title}")
                if category.introduction:
                    info_parts.append(f"О категории: {category.introduction[:200]}...")
        
        return "\n".join(info_parts)
    
    def _generate_suggestions(self, context: UserContext) -> List[str]:
        """Генерирует предложения для дальнейшего общения"""
        suggestions = []
        
        if context.current_badge:
            badge = self.data_loader.get_badge(context.current_badge)
            if badge:
                suggestions.extend([
                    f"Расскажи подробнее о значке {badge.title}",
                    f"Дай идеи для получения {badge.title}",
                    f"Какие навыки развивает {badge.title}?"
                ])
        
        if context.current_category:
            category = self.data_loader.get_category(context.current_category)
            if category:
                suggestions.extend([
                    f"Покажи все значки категории {category.title}",
                    f"Объясни философию {category.title}",
                    f"Рекомендуй значки из {category.title}"
                ])
        
        # Общие предложения
        suggestions.extend([
            "Покажи все категории значков",
            "Рекомендуй значки по моим интересам",
            "Объясни философию системы значков"
        ])
        
        return suggestions[:5]  # Возвращаем максимум 5 предложений
    
    def _clean_markdown(self, text: str) -> str:
        """Очищает текст от markdown форматирования"""
        import re
        
        # Удаляем **жирный текст**
        text = re.sub(r'\*\*(.*?)\*\*', r'\1', text)
        
        # Удаляем *курсив*
        text = re.sub(r'\*(.*?)\*', r'\1', text)
        
        # Удаляем ### заголовки
        text = re.sub(r'^###\s*', '', text, flags=re.MULTILINE)
        
        # Удаляем ## заголовки
        text = re.sub(r'^##\s*', '', text, flags=re.MULTILINE)
        
        # Удаляем # заголовки
        text = re.sub(r'^#\s*', '', text, flags=re.MULTILINE)
        
        # Удаляем `код`
        text = re.sub(r'`(.*?)`', r'\1', text)
        
        # Удаляем лишние переносы строк
        text = re.sub(r'\n\s*\n\s*\n', '\n\n', text)
        
        return text.strip()
