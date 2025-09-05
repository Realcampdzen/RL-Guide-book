"""
Система управления контекстом пользователя
"""
from typing import Dict, Optional, List, Any
from datetime import datetime, timedelta
import json
import os

from models.conversation import UserContext, Conversation
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
        
        # Поиск упоминаний категорий
        categories = self.data_loader.get_all_categories()
        for category in categories:
            if (category.title.lower() in message_lower or
                category.emoji in message or
                f"категория {category.id}" in message_lower):
                context.current_category = category.id
                context.current_badge = None  # Сбрасываем значок при смене категории
                break
        
        # Поиск упоминаний значков (глобальный поиск)
        all_badges = self.data_loader.get_all_badges()
        for badge in all_badges:
            if (badge.title.lower() in message_lower or
                badge.emoji in message or
                f"значок {badge.id}" in message_lower):
                context.current_badge = badge.id
                context.current_category = badge.categoryId  # Устанавливаем категорию
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
        context = self.get_user_context(user_id)
        
        # Обновляем контекст на основе веб-интерфейса
        if web_context.current_category:
            context.current_category = web_context.current_category.get('id')
            # Сбрасываем значок при смене категории
            if not web_context.current_badge:
                context.current_badge = None
        
        if web_context.current_badge:
            context.current_badge = web_context.current_badge.get('id')
            # Убеждаемся, что категория установлена
            if web_context.current_badge.get('category_id'):
                context.current_category = web_context.current_badge.get('category_id')
        
        # Сохраняем информацию о текущем экране
        context.session_data['current_view'] = web_context.current_view
        context.session_data['web_category'] = web_context.current_category
        context.session_data['web_badge'] = web_context.current_badge
        
        # Сохраняем обновленный контекст
        self._save_context(context)
        
        print(f"🔄 Обновлен контекст для пользователя {user_id}:")
        print(f"   📱 Экран: {web_context.current_view}")
        print(f"   📁 Категория: {context.current_category}")
        print(f"   🏆 Значок: {context.current_badge}")
