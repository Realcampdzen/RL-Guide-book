#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
ПРОСТОЙ ПРАВИЛЬНЫЙ ПАРСЕР
Использует структуру из ai-data и заполняет данными из Путеводителя
"""

import os
import json
import re
from pathlib import Path
from dataclasses import dataclass, asdict
from typing import List, Dict, Optional, Set
from datetime import datetime

@dataclass
class Badge:
    id: str
    title: str
    emoji: str
    category_id: str
    level: str
    description: Optional[str] = None
    importance: Optional[str] = None
    skill_tips: Optional[str] = None
    criteria: Optional[str] = None
    confirmation: Optional[str] = None
    subtasks: Optional[List['Badge']] = None

@dataclass
class Category:
    id: str
    title: str
    description: Optional[str] = None
    badge_count: int = 0
    expected_badges: int = 0

class SimpleCorrectParser:
    def __init__(self, ai_data_path: str, guide_file: str):
        self.ai_data_path = Path(ai_data_path)
        self.guide_file = guide_file
        self.categories: List[Category] = []
        self.badges: List[Badge] = []
        self.guide_content = ""
        
    def load_guide(self):
        """Загружает содержимое Путеводителя"""
        try:
            with open(self.guide_file, 'r', encoding='utf-8') as f:
                self.guide_content = f.read()
            print(f"✅ Загружен Путеводитель: {len(self.guide_content)} символов")
        except FileNotFoundError:
            print(f"❌ Файл {self.guide_file} не найден")
            return False
        return True
    
    def extract_badge_info_from_guide(self, badge_id: str):
        """Извлекает информацию о значке из Путеводителя"""
        
        # Ищем основной блок значка - более гибкий паттерн
        pattern = rf'{re.escape(badge_id)}\.?\s*Значок\s*([^\s«]*)\s*«([^»]+)»'
        matches = list(re.finditer(pattern, self.guide_content))
        
        if not matches:
            return None
        
        # Берём последнее вхождение (основной текст, а не оглавление)
        match = matches[-1]
        
        emoji = match.group(1).strip() if match.group(1) else ""
        title = match.group(2)
        
        # Получаем позицию найденного блока значка
        badge_start = match.start()
        
        # Ищем описание (Цель:) - после найденного блока
        desc_pattern = rf'Цель:\s*([^.\n]+(?:\.\s*[^.\n]+)*)'
        desc_match = re.search(desc_pattern, self.guide_content[badge_start:badge_start + 2000], re.DOTALL)
        description = desc_match.group(1).strip() if desc_match else ""
        
        # Ищем раздел "Почему этот значок важен?" - после найденного блока
        importance_pattern = rf'Почему этот значок важен\?\s*([^💡]*?)(?=💡|Как получить|$)'
        importance_match = re.search(importance_pattern, self.guide_content[badge_start:badge_start + 2000], re.DOTALL)
        importance = ""
        if importance_match:
            importance_text = importance_match.group(1).strip()
            # Извлекаем пункты с 🔹
            importance_points = re.findall(r'🔹\s*([^🔹\n]+)', importance_text)
            importance = '\n'.join([f"🔹 {point.strip()}" for point in importance_points])
        
        # Ищем раздел "💡 Как сделать..." - после найденного блока
        skill_tips_pattern = rf'💡\s*Как[^📌]*?([^📌]*?)(?=📌|Как закрепить|Как получить|$)'
        skill_tips_match = re.search(skill_tips_pattern, self.guide_content[badge_start:badge_start + 2000], re.DOTALL)
        skill_tips = ""
        if skill_tips_match:
            skill_tips_text = skill_tips_match.group(1).strip()
            # Извлекаем пункты с 📌
            tips_points = re.findall(r'📌\s*([^📌\n]+)', skill_tips_text)
            if tips_points:
                skill_tips = f"💡 {skill_tips_text.split('💡')[1].split('📌')[0].strip() if '💡' in skill_tips_text else ''}\n" + '\n'.join([f"📌 {point.strip()}" for point in tips_points])
        
        # Ищем раздел "Как закрепить эффект?" - после найденного блока
        consolidate_pattern = rf'Как закрепить эффект\?\s*([^📌]*?)(?=📌|Как получить|$)'
        consolidate_match = re.search(consolidate_pattern, self.guide_content[badge_start:badge_start + 2000], re.DOTALL)
        consolidate_tips = ""
        if consolidate_match:
            consolidate_text = consolidate_match.group(1).strip()
            # Извлекаем пункты с 📌
            consolidate_points = re.findall(r'📌\s*([^📌\n]+)', consolidate_text)
            if consolidate_points:
                consolidate_tips = "Как закрепить эффект?\n" + '\n'.join([f"📌 {point.strip()}" for point in consolidate_points])
        
        # Объединяем skill_tips и consolidate_tips
        if consolidate_tips:
            skill_tips = skill_tips + "\n\n" + consolidate_tips if skill_tips else consolidate_tips
        
        # Ищем критерии (Как получить значок) - после найденного блока
        criteria_pattern = rf'Как получить значок[^:]*:\s*([^📎]*?)(?=📎|Чем подтверждается|$)'
        criteria_match = re.search(criteria_pattern, self.guide_content[badge_start:badge_start + 2000], re.DOTALL)
        criteria = ""
        if criteria_match:
            criteria_text = criteria_match.group(1).strip()
            # Извлекаем пункты с ✅
            criteria_points = re.findall(r'✅\s*([^✅\n]+)', criteria_text)
            if criteria_points:
                criteria = '\n'.join([f"✅ {point.strip()}" for point in criteria_points])
        
        # Ищем подтверждение (Чем подтверждается) - после найденного блока
        confirmation_pattern = rf'Чем подтверждается:\s*([^📎]*?)(?=📎|$)'
        confirmation_match = re.search(confirmation_pattern, self.guide_content[badge_start:badge_start + 2000], re.DOTALL)
        confirmation = ""
        if confirmation_match:
            confirmation_text = confirmation_match.group(1).strip()
            # Извлекаем пункты с 📎
            confirmation_points = re.findall(r'📎\s*([^📎\n]+)', confirmation_text)
            if confirmation_points:
                confirmation = '\n'.join([f"📎 {point.strip()}" for point in confirmation_points])
        
        return {
            'title': title,
            'emoji': emoji,
            'description': description,
            'importance': importance,
            'skill_tips': skill_tips,
            'criteria': criteria,
            'confirmation': confirmation
        }
    
    def process_ai_data_file(self, file_path: Path):
        """Обрабатывает файл ai-data"""
        try:
            with open(file_path, 'r', encoding='utf-8') as f:
                data = json.load(f)
            
            badge_id = data.get('id', '')
            if not badge_id:
                print(f"⚠️ Нет ID в файле {file_path}")
                return None
            
            # Извлекаем правильные данные из Путеводителя
            guide_info = self.extract_badge_info_from_guide(badge_id)
            
            if not guide_info:
                print(f"⚠️ Не найдена информация для {badge_id} в Путеводителе")
                return None
            
            # Создаём значок
            badge = Badge(
                id=badge_id,
                title=guide_info['title'],
                emoji=guide_info['emoji'],
                category_id=data.get('categoryId', ''),
                level=data.get('level', 'Одноуровневый'),
                description=guide_info['description'],
                importance=guide_info['importance'],
                skill_tips=guide_info['skill_tips'],
                criteria=guide_info['criteria'],
                confirmation=guide_info['confirmation']
            )
            
            # Обрабатываем подуровни если есть
            if 'levels' in data and data['levels']:
                badge.subtasks = []
                for level_data in data['levels']:
                    level_id = level_data.get('id', '')
                    if level_id:
                        level_guide_info = self.extract_badge_info_from_guide(level_id)
                        if level_guide_info:
                            subtask = Badge(
                                id=level_id,
                                title=level_guide_info['title'],
                                emoji=level_guide_info['emoji'],
                                category_id=data.get('categoryId', ''),
                                level=level_data.get('level', ''),
                                description=level_guide_info['description'],
                                importance=level_guide_info['importance'],
                                skill_tips=level_guide_info['skill_tips'],
                                criteria=level_guide_info['criteria'],
                                confirmation=level_guide_info['confirmation']
                            )
                            badge.subtasks.append(subtask)
            
            return badge
            
        except Exception as e:
            print(f"❌ Ошибка при обработке {file_path}: {e}")
            return None
    
    def parse(self):
        """Основной метод парсинга"""
        if not self.load_guide():
            return None
        
        print(f"Парсинг ai-data из: {self.ai_data_path}")
        
        # Обрабатываем все файлы в ai-data
        for category_dir in self.ai_data_path.iterdir():
            if not category_dir.is_dir():
                continue
                
            print(f"\n📁 Обрабатываем категорию: {category_dir.name}")
            
            # Создаём категорию
            category_id = category_dir.name.split('-')[1] if '-' in category_dir.name else category_dir.name
            category = Category(
                id=category_id,
                title=f"Категория {category_id}",
                expected_badges=0
            )
            
            badge_count = 0
            for json_file in category_dir.glob('*.json'):
                if json_file.name == 'index.json':
                    continue
                    
                badge = self.process_ai_data_file(json_file)
                if badge:
                    self.badges.append(badge)
                    badge_count += 1
                    print(f"  ✅ {badge.id}: {badge.title}")
            
            category.badge_count = badge_count
            self.categories.append(category)
        
        return self._create_output()
    
    def _create_output(self) -> Dict:
        """Создание выходного JSON"""
        return {
            "metadata": {
                "total_categories": len(self.categories),
                "total_badges": len(self.badges),
                "source_file": self.guide_file,
                "parsed_at": datetime.now().strftime("%Y-%m-%d %H:%M:%S")
            },
            "categories": [asdict(cat) for cat in self.categories],
            "badges": [asdict(badge) for badge in self.badges]
        }

def main():
    parser = SimpleCorrectParser("ai-data", "Путеводитель.txt")
    result = parser.parse()
    
    if result:
        # Сохраняем результат
        output_file = "perfect_parsed_data_simple.json"
        with open(output_file, 'w', encoding='utf-8') as f:
            json.dump(result, f, ensure_ascii=False, indent=2)
        
        print(f"\n✅ Результат сохранен в {output_file}")
        print(f"📊 Обработано категорий: {result['metadata']['total_categories']}")
        print(f"📊 Обработано значков: {result['metadata']['total_badges']}")
    else:
        print("❌ Ошибка парсинга")

if __name__ == "__main__":
    main()
