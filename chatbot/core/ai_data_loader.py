"""
Система загрузки данных значков из ai-data структуры
"""
import json
import os
from typing import Dict, List, Optional
from pathlib import Path

from models.badge import Badge, BadgeLevel, Category, BadgeData


class AIDataLoader:
    """Загрузчик данных значков из ai-data структуры"""
    
    def __init__(self, ai_data_path: str = "../ai-data"):
        """
        Инициализация загрузчика
        
        Args:
            ai_data_path: Путь к папке ai-data
        """
        self.ai_data_path = Path(ai_data_path)
        self._badge_data: Optional[BadgeData] = None
        self._categories_cache: Dict[str, Category] = {}
        self._badges_cache: Dict[str, Badge] = {}
    
    def load_all_data(self) -> BadgeData:
        """Загружает все данные значков из ai-data структуры"""
        if self._badge_data is not None:
            return self._badge_data
        
        if not self.ai_data_path.exists():
            raise FileNotFoundError(f"Не найдена папка {self.ai_data_path}")
        
        # Загружаем главный индекс
        master_index_path = self.ai_data_path / "MASTER_INDEX.json"
        if not master_index_path.exists():
            raise FileNotFoundError(f"Не найден файл {master_index_path}")
        
        with open(master_index_path, 'r', encoding='utf-8') as f:
            master_index = json.load(f)
        
        # Загружаем все категории
        categories = []
        for category_info in master_index["categories"]:
            category = self._load_category_from_ai_data(category_info)
            categories.append(category)
        
        # Создаем объект BadgeData
        self._badge_data = BadgeData(
            project="Путеводитель",
            version="1.0",
            totalCategories=master_index["totalCategories"],
            totalBadges=master_index["totalBadges"],
            categories=categories
        )
        
        return self._badge_data
    
    def _load_category_from_ai_data(self, category_info: dict) -> Category:
        """Загружает категорию из ai-data структуры"""
        category_id = category_info["id"]
        
        # Загружаем индекс категории
        category_path = self.ai_data_path / category_info["path"]
        index_path = category_path / "index.json"
        
        if not index_path.exists():
            raise FileNotFoundError(f"Не найден файл {index_path}")
        
        with open(index_path, 'r', encoding='utf-8') as f:
            category_index = json.load(f)
        
        # Загружаем значки категории
        badges = []
        for badge_info in category_index.get("badgesData", []):
            badge = self._load_badge_from_ai_data(category_path, badge_info)
            badges.append(badge)
        
        # Создаем категорию
        category = Category(
            id=category_id,
            title=category_info["title"],
            emoji=category_info["emoji"],
            path=category_info["path"],
            badges=badges
        )
        
        return category
    
    def _load_badge_from_ai_data(self, category_path: Path, badge_info: dict) -> Badge:
        """Загружает значок из ai-data структуры"""
        badge_id = badge_info["id"]
        
        # Загружаем файл значка
        badge_file = category_path / f"{badge_id}.json"
        if not badge_file.exists():
            raise FileNotFoundError(f"Не найден файл {badge_file}")
        
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
                criteria=level_data.get("criteria", ""),
                confirmation=level_data.get("confirmation", "")
            )
            levels.append(level)
        
        # Создаем значок
        badge = Badge(
            id=badge_id,
            title=badge_data["title"],
            emoji=badge_data["emoji"],
            categoryId=badge_data["categoryId"],
            description=badge_data.get("description", ""),
            skillTips=badge_data.get("skillTips", ""),
            examples=badge_data.get("examples", ""),
            philosophy=badge_data.get("philosophy", ""),
            howToBecome=badge_data.get("howToBecome", ""),
            nameExplanation=badge_data.get("nameExplanation", ""),
            levels=levels
        )
        
        return badge
    
    def get_category_by_id(self, category_id: str) -> Optional[Category]:
        """Получает категорию по ID"""
        if not self._badge_data:
            self.load_all_data()
        
        for category in self._badge_data.categories:
            if category.id == category_id:
                return category
        return None
    
    def get_badge_by_id(self, badge_id: str) -> Optional[Badge]:
        """Получает значок по ID"""
        if not self._badge_data:
            self.load_all_data()
        
        for category in self._badge_data.categories:
            for badge in category.badges:
                if badge.id == badge_id:
                    return badge
        return None
    
    def search_badges(self, query: str) -> List[Badge]:
        """Поиск значков по запросу"""
        if not self._badge_data:
            self.load_all_data()
        
        query_lower = query.lower()
        results = []
        
        for category in self._badge_data.categories:
            for badge in category.badges:
                if (query_lower in badge.title.lower() or 
                    query_lower in badge.description.lower() or
                    query_lower in badge.importance.lower()):
                    results.append(badge)
        
        return results
