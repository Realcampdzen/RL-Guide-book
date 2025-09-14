"""
Обновленный DataLoader для интеграции с ai-data структурой
Совместимость с существующим кодом бота
"""
import json
import os
from typing import Dict, List, Optional
from pathlib import Path

from models.badge import Badge, BadgeLevel, Category, BadgeData
from .ai_data_loader import AIDataLoader


class DataLoaderNew:
    """Обновленный загрузчик данных с поддержкой ai-data структуры"""
    
    def __init__(self, use_ai_data: bool = True, ai_data_path: str = "public/ai-data"):
        """
        Инициализация загрузчика
        
        Args:
            use_ai_data: Использовать ли новую ai-data структуру
            ai_data_path: Путь к папке ai-data
        """
        self.use_ai_data = use_ai_data
        
        if use_ai_data:
            self.ai_loader = AIDataLoader(ai_data_path)
            self._badge_data: Optional[BadgeData] = None
        else:
            # Fallback на старый DataLoader если нужно
            from .data_loader import DataLoader
            self.legacy_loader = DataLoader()
    
    def load_all_data(self) -> BadgeData:
        """Загружает все данные значков"""
        if self.use_ai_data:
            return self._load_ai_data()
        else:
            return self.legacy_loader.load_all_data()
    
    def _load_ai_data(self) -> BadgeData:
        """Загружает данные из ai-data структуры"""
        if self._badge_data is not None:
            return self._badge_data
        
        # Получаем все категории
        categories = []
        all_categories = self.ai_loader.get_all_categories()
        
        total_badges = 0
        total_levels = 0
        
        for category_info in all_categories:
            category = self.ai_loader.get_category(category_info['id'])
            if category:
                categories.append(category)
                total_badges += len(category.badges)
                total_levels += sum(len(badge.levels) for badge in category.badges)
        
        # Создаем объект BadgeData
        self._badge_data = BadgeData(
            project="Путеводитель",
            version="2.0",
            totalCategories=len(categories),
            totalBadges=total_badges,
            categories=categories
        )
        
        return self._badge_data
    
    def get_category(self, category_id: str) -> Optional[Category]:
        """Получает категорию по ID"""
        if self.use_ai_data:
            return self.ai_loader.get_category(category_id)
        else:
            return self.legacy_loader.get_category(category_id)
    
    def get_badge(self, badge_id: str) -> Optional[Badge]:
        """Получает значок по ID"""
        if self.use_ai_data:
            return self.ai_loader.get_badge(badge_id)
        else:
            return self.legacy_loader.get_badge(badge_id)
    
    def get_all_categories(self) -> List[Category]:
        """Получает все категории"""
        if self.use_ai_data:
            return self.load_all_data().categories
        else:
            return self.legacy_loader.get_all_categories()
    
    def search_badges(self, query: str) -> List[Badge]:
        """Поиск значков по запросу"""
        if self.use_ai_data:
            return self.ai_loader.search_badges(query)
        else:
            return self.legacy_loader.search_badges(query)
    
    def get_badges_by_category(self, category_id: str) -> List[Badge]:
        """Получает все значки категории"""
        if self.use_ai_data:
            return self.ai_loader.get_badges_by_category(category_id)
        else:
            return self.legacy_loader.get_badges_by_category(category_id)
    
    def get_category_context(self, category_id: str) -> Optional[str]:
        """Получает контекст категории"""
        if self.use_ai_data:
            return self.ai_loader.get_category_context(category_id)
        else:
            return self.legacy_loader.get_category_context(category_id)
    
    def get_all_badges(self) -> List[Badge]:
        """Получает все значки из всех категорий"""
        if self.use_ai_data:
            all_badges = []
            for category in self.get_all_categories():
                all_badges.extend(category.badges)
            return all_badges
        else:
            return self.legacy_loader.get_all_badges()
    
    def get_stats(self) -> Dict:
        """Получает статистику загрузки"""
        if self.use_ai_data:
            return self.ai_loader.get_stats()
        else:
            return {"mode": "legacy", "loaded": True}
    
    def preload_popular_categories(self):
        """Предзагружает популярные категории"""
        if self.use_ai_data:
            self.ai_loader.preload_popular_categories()
    
    def clear_cache(self):
        """Очищает кэш"""
        if self.use_ai_data:
            self.ai_loader.clear_cache()
            self._badge_data = None
