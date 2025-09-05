"""
Система загрузки данных значков из ai-data/
"""
import json
import os
from typing import Dict, List, Optional
from pathlib import Path

from models.badge import Badge, BadgeLevel, Category, BadgeData


class DataLoader:
    """Загрузчик данных значков"""
    
    def __init__(self, data_path: str = "../ai-data"):
        """
        Инициализация загрузчика
        
        Args:
            data_path: Путь к папке с данными ai-data/
        """
        self.data_path = Path(data_path)
        self._badge_data: Optional[BadgeData] = None
        self._categories_cache: Dict[str, Category] = {}
        self._badges_cache: Dict[str, Badge] = {}
    
    def load_all_data(self) -> BadgeData:
        """Загружает все данные значков"""
        if self._badge_data is not None:
            return self._badge_data
        
        # Загружаем главный индекс
        master_index_path = self.data_path / "MASTER_INDEX.json"
        if not master_index_path.exists():
            raise FileNotFoundError(f"Не найден файл {master_index_path}")
        
        with open(master_index_path, 'r', encoding='utf-8') as f:
            master_data = json.load(f)
        
        # Загружаем все категории
        categories = []
        for category_info in master_data["categories"]:
            category = self._load_category(category_info)
            categories.append(category)
        
        # Создаем объект BadgeData
        self._badge_data = BadgeData(
            project=master_data["project"],
            version=master_data["version"],
            totalCategories=master_data["totalCategories"],
            totalBadges=master_data["totalBadges"],
            categories=categories
        )
        
        return self._badge_data
    
    def _load_category(self, category_info: Dict) -> Category:
        """Загружает категорию и все её значки"""
        category_id = category_info["id"]
        category_path = self.data_path / category_info["path"]
        
        # Загружаем индекс категории
        index_path = category_path / "index.json"
        with open(index_path, 'r', encoding='utf-8') as f:
            category_index = json.load(f)
        
        # Загружаем введение категории
        intro_path = category_path / "introduction.md"
        introduction = None
        if intro_path.exists():
            with open(intro_path, 'r', encoding='utf-8') as f:
                introduction = f.read()
        
        # Загружаем все значки категории
        badges = []
        for badge_info in category_index["badges"]:
            badge = self._load_badge(category_path, badge_info)
            badges.append(badge)
            self._badges_cache[badge.id] = badge
        
        category = Category(
            id=category_id,
            title=category_info["title"],
            emoji=category_info["emoji"],
            path=category_info["path"],
            badges=badges,
            introduction=introduction
        )
        
        self._categories_cache[category_id] = category
        return category
    
    def _load_badge(self, category_path: Path, badge_info: Dict) -> Badge:
        """Загружает значок из JSON файла"""
        badge_id = badge_info["id"]
        badge_file = category_path / f"{badge_id}.json"
        
        if not badge_file.exists():
            raise FileNotFoundError(f"Не найден файл значка {badge_file}")
        
        with open(badge_file, 'r', encoding='utf-8') as f:
            badge_data = json.load(f)
        
        # Загружаем уровни значка
        levels = []
        for level_data in badge_data.get("levels", []):
            level = BadgeLevel(
                id=level_data["id"],
                level=level_data["level"],
                title=level_data["title"],
                emoji=level_data["emoji"],
                criteria=level_data["criteria"],
                confirmation=level_data["confirmation"]
            )
            levels.append(level)
        
        badge = Badge(
            id=badge_data["id"],
            title=badge_data["title"],
            emoji=badge_data["emoji"],
            categoryId=badge_data["categoryId"],
            description=badge_data["description"],
            nameExplanation=badge_data.get("nameExplanation"),
            skillTips=badge_data.get("skillTips"),
            examples=badge_data.get("examples"),
            philosophy=badge_data.get("philosophy"),
            howToBecome=badge_data.get("howToBecome"),
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
        all_badges = []
        for category in self._badge_data.categories:
            all_badges.extend(category.badges)
        return all_badges