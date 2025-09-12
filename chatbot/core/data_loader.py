"""
Система загрузки данных значков из perfect_parsed_data.json
"""
import json
import os
from typing import Dict, List, Optional
from pathlib import Path

from models.badge import Badge, BadgeLevel, Category, BadgeData


class DataLoader:
    """Загрузчик данных значков"""
    
    def __init__(self, data_path: str = "perfect_parsed_data.json"):
        """
        Инициализация загрузчика
        
        Args:
            data_path: Путь к файлу perfect_parsed_data.json
        """
        self.data_path = Path(data_path)
        self._badge_data: Optional[BadgeData] = None
        self._categories_cache: Dict[str, Category] = {}
        self._badges_cache: Dict[str, Badge] = {}
    
    def load_all_data(self) -> BadgeData:
        """Загружает все данные значков из perfect_parsed_data.json"""
        if self._badge_data is not None:
            return self._badge_data
        
        if not self.data_path.exists():
            raise FileNotFoundError(f"Не найден файл {self.data_path}")
        
        with open(self.data_path, 'r', encoding='utf-8') as f:
            perfect_data = json.load(f)
        
        # Загружаем все категории
        categories = []
        for category_info in perfect_data["categories"]:
            category = self._load_category_from_perfect_data(category_info, perfect_data["badges"])
            categories.append(category)
        
        # Создаем объект BadgeData
        self._badge_data = BadgeData(
            project="Путеводитель",
            version="1.0",
            totalCategories=perfect_data["metadata"]["total_categories"],
            totalBadges=perfect_data["metadata"]["total_badges"],
            categories=categories
        )
        
        return self._badge_data
    
    def _load_category_from_perfect_data(self, category_info: Dict, all_badges: List[Dict]) -> Category:
        """Загружает категорию и все её значки из perfect_parsed_data.json"""
        category_id = category_info["id"]
        
        # Фильтруем значки для этой категории
        category_badges = [badge for badge in all_badges if badge["category_id"] == category_id]
        
        # Группируем значки по базовому ID (например, 12.9.1, 12.9.2, 12.9.3 -> 12.9)
        badge_groups = {}
        for badge_data in category_badges:
            badge_id = badge_data["id"]
            if '.' in badge_id:
                base_id = '.'.join(badge_id.split('.')[:-1])  # 12.9.1 -> 12.9
            else:
                base_id = badge_id
            
            if base_id not in badge_groups:
                badge_groups[base_id] = []
            badge_groups[base_id].append(badge_data)
        
        # Загружаем все значки категории
        badges = []
        for base_id, badge_group in badge_groups.items():
            badge = self._load_badge_from_perfect_data(base_id, badge_group)
            badges.append(badge)
            self._badges_cache[badge.id] = badge
        
        category = Category(
            id=category_id,
            title=category_info["title"],
            emoji="",  # В perfect_parsed_data.json нет emoji для категорий
            path=f"category-{category_id}",
            badges=badges,
            introduction=None
        )
        
        self._categories_cache[category_id] = category
        return category
    
    def _load_badge_from_perfect_data(self, base_id: str, badge_group: List[Dict]) -> Badge:
        """Загружает значок из perfect_parsed_data.json"""
        # Берем первый элемент группы как основной значок
        main_badge = badge_group[0]
        
        # Создаем уровни значка
        levels = []
        for badge_data in badge_group:
            level = BadgeLevel(
                id=badge_data["id"],
                level=badge_data.get("level", "Базовый уровень"),
                title=badge_data["title"],
                emoji=badge_data["emoji"],
                criteria=badge_data.get("criteria") or "",
                confirmation=badge_data.get("confirmation") or ""
            )
            levels.append(level)
        
        # Создаем основной значок
        badge = Badge(
            id=base_id,
            title=main_badge["title"],
            emoji=main_badge["emoji"],
            categoryId=main_badge["category_id"],
            description=main_badge.get("description") or "",
            nameExplanation=None,
            skillTips=None,
            examples=None,
            philosophy=None,
            howToBecome=None,
            levels=levels
        )
        
        return badge
    
    def get_category(self, category_id: str) -> Optional[Category]:
        """Получает категорию по ID"""
        if not self._categories_cache:
            self.load_all_data()
        return self._categories_cache.get(category_id)
    
    def get_badge(self, badge_id: str) -> Optional[Badge]:
        """Получает значок по ID"""
        if not self._badges_cache:
            self.load_all_data()
        return self._badges_cache.get(badge_id)
    
    def get_all_categories(self) -> List[Category]:
        """Получает все категории"""
        if not self._badge_data:
            self.load_all_data()
        return self._badge_data.categories
    
    def search_badges(self, query: str) -> List[Badge]:
        """Поиск значков по запросу"""
        if not self._badges_cache:
            self.load_all_data()
        
        query_lower = query.lower()
        results = []
        
        for badge in self._badges_cache.values():
            # Поиск по названию, описанию и советам
            if (query_lower in badge.title.lower() or
                query_lower in badge.description.lower() or
                (badge.skillTips and query_lower in badge.skillTips.lower())):
                results.append(badge)
        
        return results
    
    def get_badges_by_category(self, category_id: str) -> List[Badge]:
        """Получает все значки категории"""
        category = self.get_category(category_id)
        if category:
            return category.badges
        return []
    
    def get_category_context(self, category_id: str) -> Optional[str]:
        """Получает контекст категории (введение + философия)"""
        category = self.get_category(category_id)
        if not category:
            return None
        
        context_parts = []
        if category.introduction:
            context_parts.append(category.introduction)
        
        return "\n\n".join(context_parts) if context_parts else None
    
    def get_all_badges(self) -> List[Badge]:
        """Получает все значки из всех категорий"""
        if not self._badge_data:
            self.load_all_data()
        all_badges = []
        for category in self._badge_data.categories:
            all_badges.extend(category.badges)
        return all_badges