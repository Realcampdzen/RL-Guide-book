"""
Новый DataLoader для работы с ai-data структурой
Оптимизированная загрузка данных по требованию
"""
import json
import os
from typing import Dict, List, Optional, Tuple
from pathlib import Path
import logging

from models.badge import Badge, BadgeLevel, Category, BadgeData


class AIDataLoader:
    """Загрузчик данных значков из ai-data структуры"""
    
    def __init__(self, base_path: str = None):
        """
        Инициализация загрузчика
        
        Args:
            base_path: Путь к папке ai-data
        """
        if base_path is None:
            # Автоматически определяем путь к ai-data
            current_dir = Path(__file__).parent
            # Ищем папку ai-data в разных возможных местах
            possible_paths = [
                current_dir.parent.parent / "public" / "ai-data",  # Из chatbot/core/
                current_dir.parent / "public" / "ai-data",         # Из chatbot/
                Path("public/ai-data"),                            # Из корня проекта
                Path("../public/ai-data"),                         # Относительно текущей папки
            ]
            
            for path in possible_paths:
                if path.exists():
                    self.base_path = path
                    break
            else:
                raise FileNotFoundError("Не найдена папка ai-data. Проверьте структуру проекта.")
        else:
            self.base_path = Path(base_path)
        self.logger = logging.getLogger(__name__)
        
        # Кэши для оптимизации
        self._master_index: Optional[Dict] = None
        self._categories_cache: Dict[str, Category] = {}
        self._badges_cache: Dict[str, Badge] = {}
        self._category_introductions_cache: Dict[str, str] = {}
        
        # Статистика загрузки
        self._load_stats = {
            'master_index_loads': 0,
            'category_loads': 0,
            'badge_loads': 0,
            'introduction_loads': 0
        }
    
    def get_master_index(self) -> Dict:
        """Загружает MASTER_INDEX.json"""
        if self._master_index is not None:
            return self._master_index
        
        try:
            master_index_path = self.base_path / "MASTER_INDEX.json"
            with open(master_index_path, 'r', encoding='utf-8') as f:
                self._master_index = json.load(f)
            
            self._load_stats['master_index_loads'] += 1
            self.logger.info(f"✅ MASTER_INDEX загружен: {len(self._master_index.get('categories', []))} категорий")
            return self._master_index
            
        except Exception as e:
            self.logger.error(f"❌ Ошибка загрузки MASTER_INDEX: {e}")
            return {}
    
    def get_category_info(self, category_id: str) -> Optional[Dict]:
        """Получает информацию о категории из MASTER_INDEX"""
        master_index = self.get_master_index()
        for category in master_index.get('categories', []):
            if category['id'] == category_id:
                return category
        return None
    
    def get_category(self, category_id: str) -> Optional[Category]:
        """Загружает категорию с её значками"""
        if category_id in self._categories_cache:
            return self._categories_cache[category_id]
        
        try:
            # Получаем информацию о категории
            category_info = self.get_category_info(category_id)
            if not category_info:
                return None
            
            # Загружаем index.json категории
            category_path = self.base_path / category_info['path'] / "index.json"
            with open(category_path, 'r', encoding='utf-8') as f:
                category_data = json.load(f)
            
            # Загружаем introduction.md если есть
            introduction = self.get_category_introduction(category_id)
            
            # Загружаем все значки категории
            badges = []
            for badge_info in category_data.get('badgesData', []):
                badge = self.get_badge(badge_info['id'])
                if badge:
                    badges.append(badge)
            
            # Создаем объект Category
            category = Category(
                id=category_id,
                title=category_data['title'],
                emoji=category_info.get('emoji', ''),
                path=category_info['path'],
                badges=badges,
                introduction=introduction,
                philosophy=None  # Пока не используется в ai-data структуре
            )
            
            self._categories_cache[category_id] = category
            self._load_stats['category_loads'] += 1
            
            self.logger.info(f"✅ Категория {category_id} загружена: {len(badges)} значков")
            return category
            
        except Exception as e:
            self.logger.error(f"❌ Ошибка загрузки категории {category_id}: {e}")
            return None
    
    def get_badge(self, badge_id: str) -> Optional[Badge]:
        """Загружает конкретный значок"""
        if badge_id in self._badges_cache:
            return self._badges_cache[badge_id]
        
        try:
            # Определяем категорию по ID значка
            category_id = badge_id.split('.')[0]
            category_info = self.get_category_info(category_id)
            if not category_info:
                return None
            
            # Загружаем файл значка
            badge_path = self.base_path / category_info['path'] / f"{badge_id}.json"
            if not badge_path.exists():
                self.logger.warning(f"⚠️ Файл значка не найден: {badge_path}")
                return None
            
            with open(badge_path, 'r', encoding='utf-8') as f:
                badge_data = json.load(f)
            
            # Создаем уровни значка
            levels = []
            for level_data in badge_data.get('levels', []):
                level = BadgeLevel(
                    id=level_data['id'],
                    level=level_data['level'],
                    title=level_data['title'],
                    emoji=level_data['emoji'],
                    criteria=level_data.get('criteria', ''),
                    confirmation=level_data.get('confirmation', '')
                )
                levels.append(level)
            
            # Создаем объект Badge
            badge = Badge(
                id=badge_data['id'],
                title=badge_data['title'],
                emoji=badge_data['emoji'],
                categoryId=badge_data['categoryId'],
                description=badge_data.get('description', ''),
                nameExplanation=badge_data.get('nameExplanation'),
                skillTips=badge_data.get('skillTips'),
                examples=badge_data.get('examples'),
                philosophy=badge_data.get('philosophy'),
                howToBecome=badge_data.get('howToBecome'),
                levels=levels
            )
            
            self._badges_cache[badge_id] = badge
            self._load_stats['badge_loads'] += 1
            
            return badge
            
        except Exception as e:
            self.logger.error(f"❌ Ошибка загрузки значка {badge_id}: {e}")
            return None
    
    def get_category_introduction(self, category_id: str) -> Optional[str]:
        """Загружает introduction.md категории"""
        if category_id in self._category_introductions_cache:
            return self._category_introductions_cache[category_id]
        
        try:
            category_info = self.get_category_info(category_id)
            if not category_info:
                return None
            
            introduction_path = self.base_path / category_info['path'] / "introduction.md"
            if not introduction_path.exists():
                return None
            
            with open(introduction_path, 'r', encoding='utf-8') as f:
                introduction = f.read()
            
            self._category_introductions_cache[category_id] = introduction
            self._load_stats['introduction_loads'] += 1
            
            return introduction
            
        except Exception as e:
            self.logger.error(f"❌ Ошибка загрузки introduction для категории {category_id}: {e}")
            return None
    
    def search_badges(self, query: str) -> List[Badge]:
        """Поиск значков по запросу"""
        query_lower = query.lower()
        results = []
        
        # Сначала ищем в кэше
        for badge in self._badges_cache.values():
            if (query_lower in badge.title.lower() or
                query_lower in badge.description.lower() or
                (badge.skillTips and query_lower in badge.skillTips.lower())):
                results.append(badge)
        
        # Если недостаточно результатов, загружаем категории
        if len(results) < 5:
            master_index = self.get_master_index()
            for category_info in master_index.get('categories', []):
                category = self.get_category(category_info['id'])
                if category:
                    for badge in category.badges:
                        if badge not in results:
                            if (query_lower in badge.title.lower() or
                                query_lower in badge.description.lower() or
                                (badge.skillTips and query_lower in badge.skillTips.lower())):
                                results.append(badge)
        
        return results[:10]  # Возвращаем максимум 10 результатов
    
    def search_categories(self, query: str) -> List[Dict]:
        """Поиск категорий по запросу"""
        query_lower = query.lower()
        results = []
        
        master_index = self.get_master_index()
        for category_info in master_index.get('categories', []):
            if (query_lower in category_info['title'].lower()):
                results.append(category_info)
        
        return results
    
    def get_all_categories(self) -> List[Dict]:
        """Получает список всех категорий"""
        master_index = self.get_master_index()
        return master_index.get('categories', [])
    
    def get_badges_by_category(self, category_id: str) -> List[Badge]:
        """Получает все значки категории"""
        category = self.get_category(category_id)
        if category:
            return category.badges
        return []
    
    def get_category_context(self, category_id: str) -> Optional[str]:
        """Получает контекст категории (introduction)"""
        return self.get_category_introduction(category_id)
    
    def get_stats(self) -> Dict:
        """Получает статистику загрузки"""
        return {
            **self._load_stats,
            'cached_categories': len(self._categories_cache),
            'cached_badges': len(self._badges_cache),
            'cached_introductions': len(self._category_introductions_cache)
        }
    
    def clear_cache(self):
        """Очищает все кэши"""
        self._categories_cache.clear()
        self._badges_cache.clear()
        self._category_introductions_cache.clear()
        self.logger.info("🧹 Кэш очищен")
    
    def preload_category(self, category_id: str):
        """Предзагружает категорию в кэш"""
        self.get_category(category_id)
    
    def preload_popular_categories(self):
        """Предзагружает популярные категории"""
        popular_categories = ['1', '2', '7', '8', '11', '14']  # Самые популярные
        for category_id in popular_categories:
            self.preload_category(category_id)
        self.logger.info(f"🚀 Предзагружены популярные категории: {popular_categories}")


# Создаем глобальный экземпляр для использования в боте
ai_data_loader = AIDataLoader()