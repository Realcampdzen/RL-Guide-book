"""
Система управления контекстом пользователя
"""
from typing import Dict, Optional, List, Any
from datetime import datetime, timedelta
import json
import os

from models.conversation import UserContext, Conversation, Message, WebContext
from core.data_loader import DataLoader


class ContextManager:
    """Менеджер контекста пользователей"""
    
    def __init__(self, data_loader: DataLoader, storage_path: str = "chatbot/storage"):
        """
        Инициализация менеджера контекста
        
        Args:
            data_loader: Загрузчик данных значков
            storage_path: Путь для сохранения контекста
        """
        self.data_loader = data_loader
        self.storage_path = storage_path
        self._contexts: Dict[str, UserContext] = {}
        self._conversations: Dict[str, Conversation] = {}
        
        # Создаем папку для хранения если её нет
        os.makedirs(storage_path, exist_ok=True)
        
        # Загружаем сохраненные контексты
        self._load_contexts()
        
        # Загружаем сохраненные диалоги
        self._load_conversations()
    
    def get_user_context(self, user_id: str) -> UserContext:
        """Получает контекст пользователя"""
        if user_id not in self._contexts:
            self._contexts[user_id] = UserContext(
                user_id=user_id,
                current_category=None,
                current_badge=None,
                level="beginner"
            )
        return self._contexts[user_id]
    
    def update_user_context(
        self,
        user_id: str,
        current_category: Optional[str] = None,
        current_badge: Optional[str] = None,
        interests: Optional[List[str]] = None,
        level: Optional[str] = None,
        **kwargs
    ) -> UserContext:
        """
        Обновляет контекст пользователя
        
        Args:
            user_id: ID пользователя
            current_category: Текущая категория
            current_badge: Текущий значок
            interests: Интересы пользователя
            level: Уровень пользователя
            **kwargs: Дополнительные данные сессии
            
        Returns:
            Обновленный контекст
        """
        context = self.get_user_context(user_id)
        
        if current_category is not None:
            context.current_category = current_category
        if current_badge is not None:
            context.current_badge = current_badge
        if interests is not None:
            context.interests = interests
        if level is not None:
            context.level = level
        
        # Обновляем данные сессии
        context.session_data.update(kwargs)
        
        # Сохраняем контекст
        self._save_context(context)
        
        return context
    
    def detect_context_from_message(self, user_id: str, message: str) -> UserContext:
        """
        Определяет контекст из сообщения пользователя
        
        Args:
            user_id: ID пользователя
            message: Сообщение пользователя
            
        Returns:
            Обновленный контекст
        """
        context = self.get_user_context(user_id)
        message_lower = message.lower()
        
        
        # Поиск упоминаний категорий (только если не установлена из веб-контекста)
        if not context.current_category:
            categories = self.data_loader.get_all_categories()
            for category in categories:
                # Более точный поиск - ищем полное название категории или точные упоминания
                category_title_lower = category.title.lower()
                if (category_title_lower == message_lower or  # Точное совпадение
                    f" {category_title_lower} " in f" {message_lower} " or  # Категория как отдельное слово
                    category.emoji in message or
                    f"категория {category.id}" in message_lower or
                    f"категории {category.id}" in message_lower):
                    context.current_category = category.id
                    context.current_badge = None  # Сбрасываем значок при смене категории
                    break
        
        # Поиск упоминаний значков (только если не установлен из веб-контекста)
        if not context.current_badge:
            all_badges = self.data_loader.get_all_badges()
            for badge in all_badges:
                # Более точный поиск - ищем полное название значка или точные упоминания
                badge_title_lower = badge.title.lower()
                if (badge_title_lower == message_lower or  # Точное совпадение
                    f" {badge_title_lower} " in f" {message_lower} " or  # Значок как отдельное слово
                    badge.emoji in message or
                    f"значок {badge.id}" in message_lower or
                    f"значка {badge.id}" in message_lower):
                    context.current_badge = badge.id
                    if not context.current_category:  # Устанавливаем категорию только если не установлена
                        context.current_category = badge.categoryId
                    break
        
        # Определение интересов по ключевым словам
        interest_keywords = {
            "творчество": ["творчество", "рисование", "музыка", "танцы", "театр"],
            "спорт": ["спорт", "бег", "футбол", "плавание", "фитнес"],
            "наука": ["наука", "эксперименты", "математика", "физика", "химия"],
            "природа": ["природа", "экология", "животные", "растения", "лес"],
            "технологии": ["технологии", "программирование", "роботы", "компьютеры"],
            "общение": ["общение", "дружба", "команда", "лидерство", "помощь"]
        }
        
        detected_interests = []
        for interest, keywords in interest_keywords.items():
            if any(keyword in message_lower for keyword in keywords):
                if interest not in context.interests:
                    detected_interests.append(interest)
        
        if detected_interests:
            context.interests.extend(detected_interests)
            context.interests = list(set(context.interests))  # Убираем дубликаты
        
        # Определение уровня по ключевым словам
        if any(word in message_lower for word in ["новичок", "начинающий", "первый раз"]):
            context.level = "beginner"
        elif any(word in message_lower for word in ["опытный", "продвинутый", "уже делал"]):
            context.level = "advanced"
        elif any(word in message_lower for word in ["эксперт", "мастер", "профессионал"]):
            context.level = "expert"
        
        # Сохраняем обновленный контекст
        self._save_context(context)
        
        
        return context
    
    def get_contextual_badge_info(self, user_id: str) -> Optional[Dict[str, Any]]:
        """
        Получает информацию о текущем значке в контексте пользователя
        
        Args:
            user_id: ID пользователя
            
        Returns:
            Информация о значке или None
        """
        context = self.get_user_context(user_id)
        
        if not context.current_badge:
            return None
        
        badge = self.data_loader.get_badge(context.current_badge)
        if not badge:
            return None
        
        return {
            "badge": badge,
            "category": self.data_loader.get_category(badge.categoryId),
            "user_level": context.level,
            "user_interests": context.interests
        }
    
    def get_contextual_category_info(self, user_id: str) -> Optional[Dict[str, Any]]:
        """
        Получает информацию о текущей категории в контексте пользователя
        
        Args:
            user_id: ID пользователя
            
        Returns:
            Информация о категории или None
        """
        context = self.get_user_context(user_id)
        
        if not context.current_category:
            return None
        
        category = self.data_loader.get_category(context.current_category)
        if not category:
            return None
        
        return {
            "category": category,
            "badges": category.badges,
            "user_level": context.level,
            "user_interests": context.interests
        }
    
    def get_personalized_recommendations(self, user_id: str, limit: int = 5) -> List[Dict[str, Any]]:
        """
        Получает персонализированные рекомендации значков
        
        Args:
            user_id: ID пользователя
            limit: Максимальное количество рекомендаций
            
        Returns:
            Список рекомендаций
        """
        context = self.get_user_context(user_id)
        recommendations = []
        
        # Получаем все значки
        all_categories = self.data_loader.get_all_categories()
        
        for category in all_categories:
            for badge in category.badges:
                score = self._calculate_badge_score(badge, context)
                if score > 0:
                    recommendations.append({
                        "badge": badge,
                        "category": category,
                        "score": score,
                        "reason": self._get_recommendation_reason(badge, context)
                    })
        
        # Сортируем по релевантности
        recommendations.sort(key=lambda x: x["score"], reverse=True)
        
        return recommendations[:limit]
    
    def _calculate_badge_score(self, badge, context: UserContext) -> float:
        """Вычисляет релевантность значка для пользователя"""
        score = 0.0
        
        # Базовый балл
        score += 1.0
        
        # Бонус за соответствие интересам
        if context.interests:
            badge_text = f"{badge.title} {badge.description}".lower()
            for interest in context.interests:
                if interest.lower() in badge_text:
                    score += 2.0
        
        # Бонус за текущую категорию
        if context.current_category and badge.categoryId == context.current_category:
            score += 1.5
        
        # Бонус за уровень сложности
        if context.level == "beginner" and len(badge.levels) <= 2:
            score += 1.0
        elif context.level == "advanced" and len(badge.levels) >= 3:
            score += 1.0
        
        return score
    
    def _get_recommendation_reason(self, badge, context: UserContext) -> str:
        """Получает причину рекомендации значка"""
        reasons = []
        
        if context.interests:
            badge_text = f"{badge.title} {badge.description}".lower()
            for interest in context.interests:
                if interest.lower() in badge_text:
                    reasons.append(f"соответствует вашему интересу к {interest}")
        
        if context.current_category and badge.categoryId == context.current_category:
            reasons.append("из вашей текущей категории")
        
        if context.level == "beginner" and len(badge.levels) <= 2:
            reasons.append("подходит для начинающих")
        elif context.level == "advanced" and len(badge.levels) >= 3:
            reasons.append("подходит для продвинутых")
        
        return ", ".join(reasons) if reasons else "может быть интересен"
    
    def _save_context(self, context: UserContext):
        """Сохраняет контекст пользователя"""
        file_path = os.path.join(self.storage_path, f"context_{context.user_id}.json")
        with open(file_path, 'w', encoding='utf-8') as f:
            json.dump(context.dict(), f, ensure_ascii=False, indent=2, default=str)
    
    def _load_contexts(self):
        """Загружает сохраненные контексты"""
        if not os.path.exists(self.storage_path):
            return
        
        for filename in os.listdir(self.storage_path):
            if filename.startswith("context_") and filename.endswith(".json"):
                file_path = os.path.join(self.storage_path, filename)
                try:
                    with open(file_path, 'r', encoding='utf-8') as f:
                        data = json.load(f)
                    context = UserContext(**data)
                    self._contexts[context.user_id] = context
                except Exception as e:
                    print(f"Ошибка загрузки контекста {filename}: {e}")
    
    def get_conversation_history(self, user_id: str) -> List[Message]:
        """
        Получает историю сообщений пользователя
        
        Args:
            user_id: ID пользователя
            
        Returns:
            Список сообщений из истории
        """
        if user_id not in self._conversations:
            self._conversations[user_id] = Conversation(
                conversation_id=f"conv_{user_id}",
                user_context=self.get_user_context(user_id)
            )
        
        return self._conversations[user_id].messages
    
    def add_message_to_history(self, user_id: str, message: Message):
        """
        Добавляет сообщение в историю пользователя
        
        Args:
            user_id: ID пользователя
            message: Сообщение для добавления
        """
        if user_id not in self._conversations:
            self._conversations[user_id] = Conversation(
                conversation_id=f"conv_{user_id}",
                user_context=self.get_user_context(user_id)
            )
        
        conversation = self._conversations[user_id]
        conversation.messages.append(message)
        conversation.updated_at = datetime.now()
        
        # Ограничиваем историю последними 20 сообщениями
        if len(conversation.messages) > 20:
            conversation.messages = conversation.messages[-20:]
        
        # Сохраняем историю
        self._save_conversation(conversation)
    
    def _save_conversation(self, conversation: Conversation):
        """Сохраняет историю диалога"""
        file_path = os.path.join(self.storage_path, f"conversation_{conversation.conversation_id}.json")
        with open(file_path, 'w', encoding='utf-8') as f:
            json.dump(conversation.dict(), f, ensure_ascii=False, indent=2, default=str)
    
    def _load_conversations(self):
        """Загружает сохраненные диалоги"""
        if not os.path.exists(self.storage_path):
            return
        
        for filename in os.listdir(self.storage_path):
            if filename.startswith("conversation_") and filename.endswith(".json"):
                file_path = os.path.join(self.storage_path, filename)
                try:
                    with open(file_path, 'r', encoding='utf-8') as f:
                        data = json.load(f)
                    conversation = Conversation(**data)
                    # Извлекаем user_id из conversation_id
                    user_id = conversation.conversation_id.replace("conv_", "")
                    self._conversations[user_id] = conversation
                except Exception as e:
                    print(f"Ошибка загрузки диалога {filename}: {e}")
    
    def clear_old_contexts(self, days: int = 30):
        """Очищает старые контексты"""
        cutoff_date = datetime.now() - timedelta(days=days)
        
        for user_id, context in list(self._contexts.items()):
            # Здесь можно добавить логику очистки старых контекстов
            # Пока просто удаляем неактивные
            pass
    
    def update_web_context(self, user_id: str, web_context):
        """
        Обновляет контекст пользователя на основе веб-интерфейса
        
        Args:
            user_id: ID пользователя
            web_context: Контекст из веб-интерфейса (WebContext)
        """
        if web_context is None:
            return

        # В Flask-интеграции web_context приходит как dict из request.get_json().
        # Поддерживаем оба формата: dict и pydantic WebContext.
        if isinstance(web_context, dict):
            try:
                web_context = WebContext(**web_context)
            except Exception as e:
                print(f"⚠️ Некорректный web_context для пользователя {user_id}: {e}")
                return

        context = self.get_user_context(user_id)
        
        # Обновляем контекст на основе веб-интерфейса
        if web_context.current_category:
            context.current_category = web_context.current_category.get('id')
        
        if web_context.current_badge:
            raw_badge_id = web_context.current_badge.get('id')
            # Нормализуем ID значка: если это уровень вида 11.3.2 -> приводим к базовому 11.3
            if isinstance(raw_badge_id, str) and raw_badge_id.count('.') >= 2:
                parts = raw_badge_id.split('.')
                norm_badge_id = '.'.join(parts[:2])
            else:
                norm_badge_id = raw_badge_id
            context.current_badge = norm_badge_id
            # Убеждаемся, что категория установлена
            badge_category_id = (
                web_context.current_badge.get('categoryId')
                or web_context.current_badge.get('category_id')
                or web_context.current_badge.get('category')
            )
            if badge_category_id:
                context.current_category = badge_category_id

        # Если веб-контекст явно не задаёт категорию/значок — очищаем, чтобы не было "залипших" значений
        if web_context.current_badge is None:
            context.current_badge = None
        if web_context.current_category is None and context.current_badge is None:
            context.current_category = None
        
        # Сохраняем информацию о текущем экране
        context.session_data['current_view'] = web_context.current_view
        context.session_data['web_category'] = web_context.current_category
        context.session_data['web_badge'] = web_context.current_badge
        context.session_data['current_level'] = web_context.current_level
        context.session_data['current_level_badge_title'] = web_context.current_level_badge_title
        
        # Сохраняем обновленный контекст
        self._save_context(context)
        
        # ВАЖНО (Windows): избегаем эмодзи в stdout (cp1251), иначе возможен UnicodeEncodeError
        print(f"[web-context] user={user_id}")
        print(f"  view: {web_context.current_view}")
        print(f"  category: {context.current_category}")
        print(f"  badge: {context.current_badge}")
        if web_context.current_level_badge_title:
            print(f"  level_title: {web_context.current_level_badge_title}")
