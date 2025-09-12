#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Идеальный парсер Путеводителя "Реального Лагеря"
Каждый уровень считается как отдельный значок (241 значок всего)
"""

import re
import json
from dataclasses import dataclass, asdict
from typing import List, Dict, Optional, Set
from datetime import datetime


@dataclass
class Badge:
    id: str  # например "1.1.1" для уровней или "1.11" для одноуровневых
    title: str
    emoji: str
    category_id: str
    level: str  # "Базовый уровень", "Продвинутый уровень", "Экспертный уровень", "Одноуровневый"
    description: Optional[str] = None
    criteria: Optional[str] = None


@dataclass
class Category:
    id: str
    title: str
    description: Optional[str] = None
    badge_count: int = 0
    expected_badges: int = 0


class PerfectPutevoditelParser:
    def __init__(self, file_path: str):
        self.file_path = file_path
        self.categories: List[Category] = []
        self.badges: List[Badge] = []
        self.processed_badges: Set[str] = set()
        self.processed_categories: Set[str] = set()
        
    def parse(self) -> Dict:
        """Основной метод парсинга"""
        print(f"Парсинг файла: {self.file_path}")
        
        with open(self.file_path, 'r', encoding='utf-8') as file:
            content = file.read()
        
        # Находим оглавление
        toc_start = content.find("Оглавление")
        if toc_start == -1:
            toc_start = content.find("1. Категория «За личные достижения»")
        
        # Ищем конец оглавления
        toc_end = content.find("Категории и значки.", toc_start)
        if toc_end == -1:
            # Ищем второе вхождение "1. Категория"
            first_cat = content.find("1. Категория «За личные достижения»", toc_start)
            if first_cat != -1:
                second_cat = content.find("1. Категория «За личные достижения»", first_cat + 1)
                if second_cat != -1:
                    toc_end = second_cat
        
        if toc_end == -1:
            toc_end = len(content)
        
        toc_content = content[toc_start:toc_end]
        lines = toc_content.split('\n')
        
        self._parse_toc(lines)
        self._validate_results()
        
        return self._create_output()
    
    def _parse_toc(self, lines: List[str]):
        """Парсинг оглавления"""
        current_category = None
        
        # Правильные ожидаемые количества из оглавления
        expected_counts = {
            "1": 40,  # За личные достижения
            "2": 9,   # За легендарные дела
            "3": 9,   # Медиа значки
            "4": 10,  # За лагерные дела
            "5": 20,  # За отрядные дела (из оглавления)
            "6": 12,  # Гармония и порядок
            "7": 24,  # За творческие достижения
            "8": 9,   # Значки Движков (из оглавления)
            "9": 10,  # Значки Бро – Движения
            "10": 3,  # Значки на флаг отряда
            "11": 16, # Осознанность
            "12": 35, # ИИ: нейросети
            "13": 26, # Софт-скиллз (из оглавления)
            "14": 19  # Значки Инспектора Пользы
        }
        
        for line in lines:
            line = line.strip()
            if not line:
                continue
            
            # Поиск категорий
            category_match = re.match(r'^(\d+)\.\s*Категория\s*«([^»]+)»\s*[–—]\s*(\d+)\s*(?:значков?|значка|брозначков?)\.?', line)
            if category_match:
                cat_id = category_match.group(1)
                cat_title = category_match.group(2)
                # Используем правильное ожидаемое количество из основного контента
                expected_count = expected_counts.get(cat_id, 0)
                
                if cat_id not in self.processed_categories:
                    current_category = Category(
                        id=cat_id,
                        title=cat_title,
                        expected_badges=expected_count
                    )
                    self.categories.append(current_category)
                    self.processed_categories.add(cat_id)
                    print(f"Найдена категория: {cat_title} (ожидается {expected_count} значков)")
                continue
            
            # Парсинг значков
            if current_category:
                self._parse_badge_line(line, current_category)
    
    def _parse_badge_line(self, line: str, category: Category):
        """Центральный метод парсинга строк значков"""
        # Многоуровневые значки (формат: "1.1.1. Базовый уровень – 🔹 «Валюша»")
        multi_level_match = re.match(r'^(\d+)\.(\d+)\.(\d+)\.\s*(Базовый уровень|Продвинутый уровень\s*\d*|Экспертный уровень)\s*[–—]\s*([^\s]+)\s*«([^»]+)»', line)
        if multi_level_match:
            self._parse_multi_level_badge(multi_level_match, category)
            return
        
        # Одноуровневые значки (формат: "1.11 «Значок Бесконечности» или «Невозможный Значок»")
        single_level_match = re.match(r'^(\d+)\.(\d+)\s*«([^»]+)»\s*(?:или\s*«([^»]+)»)?', line)
        if single_level_match:
            self._parse_single_level_badge(single_level_match, category)
            return
        
        # Значки с эмодзи (формат: "2.2 Значок ☀️ «Солнце»")
        emoji_badge_match = re.match(r'^(\d+)\.(\d+)\s*Значок\s*([^\s]+)\s*«([^»]+)»', line)
        if emoji_badge_match:
            self._parse_emoji_badge(emoji_badge_match, category)
            return
        
        # Значки с эмодзи без "Значок" (формат: "2.4 Значок 🏕️ «Реальный Лагерь»")
        emoji_only_match = re.match(r'^(\d+)\.(\d+)\s*([^\s]+)\s*«([^»]+)»', line)
        if emoji_only_match:
            self._parse_emoji_only_badge(emoji_only_match, category)
            return
        
        # Значки с "Брозначок" (формат: "9.6. Брозначок 🌌 «Горизонт Событий»")
        broznachok_match = re.match(r'^(\d+)\.(\d+)\.\s*Брозначок\s*([^\s]+)\s*«([^»]+)»', line)
        if broznachok_match:
            self._parse_broznachok_badge(broznachok_match, category)
            return
        
        # Значки с "Высший значок" (формат: "9.8. ⚫ «Чёрный Брозначок». Высший значок Бро Отряда.")
        highest_badge_match = re.match(r'^(\d+)\.(\d+)\.\s*([^\s]+)\s*«([^»]+)»\.\s*Высший значок', line)
        if highest_badge_match:
            self._parse_highest_badge(highest_badge_match, category)
            return
        
        # НОВЫЕ ПАТТЕРНЫ ДЛЯ КАТЕГОРИЙ 10 И 11
        
        # Значки категории 10 (формат: "10.1. Значок 💡 «Мерцающий Маяк».")
        category_10_match = re.match(r'^(\d+)\.(\d+)\.\s*Значок\s*([^\s]+)\s*«([^»]+)»\.', line)
        if category_10_match:
            self._parse_category_10_badge(category_10_match, category)
            return
        
        # Значки категории 11 без точки (формат: "11.1 Значок 💭 «Реальное Я-Сообщение».")
        category_11_no_dot_match = re.match(r'^(\d+)\.(\d+)\s*Значок\s*([^\s]+)\s*«([^»]+)»\.', line)
        if category_11_no_dot_match:
            self._parse_category_11_no_dot_badge(category_11_no_dot_match, category)
            return
        
        # Значки категории 11 с альтернативным названием (формат: "11.6. Значок 👁️ «Реальное Внимание» или «Цифровой Детокс».")
        category_11_alt_match = re.match(r'^(\d+)\.(\d+)\.\s*Значок\s*([^\s]+)\s*«([^»]+)»\s*или\s*«([^»]+)»\.', line)
        if category_11_alt_match:
            self._parse_category_11_alt_badge(category_11_alt_match, category)
            return
        
        # Значки категории 8 без слова "Значок" (формат: "8.2. 🟣 «Фиолетовый Значок Движка».")
        category_8_simple_match = re.match(r'^(\d+)\.(\d+)\.\s*([^\s]+)\s*«([^»]+)»\.', line)
        if category_8_simple_match:
            self._parse_category_8_simple_badge(category_8_simple_match, category)
            return
        
        # Значки категории 14 с "значок" в середине (формат: "14.1.2. Продвинутый уровень – значок 🔍 «Продвинутый Реальный Инспектор».")
        category_14_middle_match = re.match(r'^(\d+)\.(\d+)\.(\d+)\.\s*(Базовый уровень|Продвинутый уровень|Экспертный уровень)\s*[–—]\s*значок\s*([^\s]+)\s*«([^»]+)»', line)
        if category_14_middle_match:
            self._parse_category_14_middle_badge(category_14_middle_match, category)
            return
    
    def _parse_multi_level_badge(self, match, category: Category):
        """Парсинг многоуровневых значков - каждый уровень как отдельный значок"""
        cat_id = match.group(1)
        badge_id = match.group(2)
        level_num = match.group(3)
        level_type = match.group(4)
        emoji = match.group(5)
        title = match.group(6)
        
        badge_key = f"{cat_id}.{badge_id}.{level_num}"
        
        if badge_key not in self.processed_badges:
            badge = Badge(
                id=badge_key,
                title=title,
                emoji=emoji,
                category_id=cat_id,
                level=level_type
            )
            self.badges.append(badge)
            self.processed_badges.add(badge_key)
            print(f"  - {level_type}: {title} {emoji}")
    
    def _parse_single_level_badge(self, match, category: Category):
        """Парсинг одноуровневых значков"""
        cat_id = match.group(1)
        badge_id = match.group(2)
        title1 = match.group(3)
        title2 = match.group(4) if match.group(4) else ""
        
        # Объединяем названия если есть альтернатива
        title = title1
        if title2:
            title = f"{title1} или {title2}"
        
        badge_key = f"{cat_id}.{badge_id}"
        if badge_key not in self.processed_badges:
            badge = Badge(
                id=badge_key,
                title=title,
                emoji="",
                category_id=cat_id,
                level="Одноуровневый"
            )
            self.badges.append(badge)
            self.processed_badges.add(badge_key)
            print(f"  - Одноуровневый: {title}")
    
    def _parse_emoji_badge(self, match, category: Category):
        """Парсинг значков с эмодзи и словом 'Значок'"""
        cat_id = match.group(1)
        badge_id = match.group(2)
        emoji = match.group(3)
        title = match.group(4)
        
        badge_key = f"{cat_id}.{badge_id}"
        if badge_key not in self.processed_badges:
            badge = Badge(
                id=badge_key,
                title=title,
                emoji=emoji,
                category_id=cat_id,
                level="Одноуровневый"
            )
            self.badges.append(badge)
            self.processed_badges.add(badge_key)
            print(f"  - Одноуровневый: {title} {emoji}")
    
    def _parse_emoji_only_badge(self, match, category: Category):
        """Парсинг значков только с эмодзи"""
        cat_id = match.group(1)
        badge_id = match.group(2)
        emoji = match.group(3)
        title = match.group(4)
        
        badge_key = f"{cat_id}.{badge_id}"
        if badge_key not in self.processed_badges:
            badge = Badge(
                id=badge_key,
                title=title,
                emoji=emoji,
                category_id=cat_id,
                level="Одноуровневый"
            )
            self.badges.append(badge)
            self.processed_badges.add(badge_key)
            print(f"  - Одноуровневый: {title} {emoji}")
    
    def _parse_broznachok_badge(self, match, category: Category):
        """Парсинг значков с 'Брозначок'"""
        cat_id = match.group(1)
        badge_id = match.group(2)
        emoji = match.group(3)
        title = match.group(4)
        
        badge_key = f"{cat_id}.{badge_id}"
        if badge_key not in self.processed_badges:
            badge = Badge(
                id=badge_key,
                title=title,
                emoji=emoji,
                category_id=cat_id,
                level="Одноуровневый"
            )
            self.badges.append(badge)
            self.processed_badges.add(badge_key)
            print(f"  - Одноуровневый: {title} {emoji}")
    
    def _parse_highest_badge(self, match, category: Category):
        """Парсинг высших значков"""
        cat_id = match.group(1)
        badge_id = match.group(2)
        emoji = match.group(3)
        title = match.group(4)
        
        badge_key = f"{cat_id}.{badge_id}"
        if badge_key not in self.processed_badges:
            badge = Badge(
                id=badge_key,
                title=title,
                emoji=emoji,
                category_id=cat_id,
                level="Высший"
            )
            self.badges.append(badge)
            self.processed_badges.add(badge_key)
            print(f"  - Высший: {title} {emoji}")
    
    def _parse_category_10_badge(self, match, category: Category):
        """Парсинг значков категории 10 (формат: '10.1. Значок 💡 «Мерцающий Маяк».')"""
        cat_id = match.group(1)
        badge_id = match.group(2)
        emoji = match.group(3)
        title = match.group(4)
        
        badge_key = f"{cat_id}.{badge_id}"
        if badge_key not in self.processed_badges:
            badge = Badge(
                id=badge_key,
                title=title,
                emoji=emoji,
                category_id=cat_id,
                level="Одноуровневый"
            )
            self.badges.append(badge)
            self.processed_badges.add(badge_key)
            print(f"  - Категория 10: {title} {emoji}")
    
    def _parse_category_11_no_dot_badge(self, match, category: Category):
        """Парсинг значков категории 11 без точки (формат: '11.1 Значок 💭 «Реальное Я-Сообщение».')"""
        cat_id = match.group(1)
        badge_id = match.group(2)
        emoji = match.group(3)
        title = match.group(4)
        
        badge_key = f"{cat_id}.{badge_id}"
        if badge_key not in self.processed_badges:
            badge = Badge(
                id=badge_key,
                title=title,
                emoji=emoji,
                category_id=cat_id,
                level="Одноуровневый"
            )
            self.badges.append(badge)
            self.processed_badges.add(badge_key)
            print(f"  - Категория 11 (без точки): {title} {emoji}")
    
    def _parse_category_11_alt_badge(self, match, category: Category):
        """Парсинг значков категории 11 с альтернативным названием (формат: '11.6. Значок 👁️ «Реальное Внимание» или «Цифровой Детокс».')"""
        cat_id = match.group(1)
        badge_id = match.group(2)
        emoji = match.group(3)
        title1 = match.group(4)
        title2 = match.group(5)
        
        # Объединяем названия
        title = f"{title1} или {title2}"
        
        badge_key = f"{cat_id}.{badge_id}"
        if badge_key not in self.processed_badges:
            badge = Badge(
                id=badge_key,
                title=title,
                emoji=emoji,
                category_id=cat_id,
                level="Одноуровневый"
            )
            self.badges.append(badge)
            self.processed_badges.add(badge_key)
            print(f"  - Категория 11 (альтернатива): {title} {emoji}")
    
    def _parse_category_8_simple_badge(self, match, category: Category):
        """Парсинг значков категории 8 без слова "Значок" (формат: '8.2. 🟣 «Фиолетовый Значок Движка».')"""
        cat_id = match.group(1)
        badge_id = match.group(2)
        emoji = match.group(3)
        title = match.group(4)
        
        badge_key = f"{cat_id}.{badge_id}"
        if badge_key not in self.processed_badges:
            badge = Badge(
                id=badge_key,
                title=title,
                emoji=emoji,
                category_id=cat_id,
                level="Одноуровневый"
            )
            self.badges.append(badge)
            self.processed_badges.add(badge_key)
            print(f"  - Категория 8 (простой): {title} {emoji}")
    
    def _parse_category_14_middle_badge(self, match, category: Category):
        """Парсинг значков категории 14 с 'значок' в середине"""
        cat_id = match.group(1)
        badge_id = match.group(2)
        level_num = match.group(3)
        level_type = match.group(4)
        emoji = match.group(5)
        title = match.group(6)
        
        badge_key = f"{cat_id}.{badge_id}.{level_num}"
        
        if badge_key not in self.processed_badges:
            badge = Badge(
                id=badge_key,
                title=title,
                emoji=emoji,
                category_id=cat_id,
                level=level_type
            )
            self.badges.append(badge)
            self.processed_badges.add(badge_key)
            print(f"  - {level_type}: {title} {emoji}")
    
    def _validate_results(self):
        """Валидация результатов"""
        print("\n=== ВАЛИДАЦИЯ ===")
        
        # Подсчитываем значки по категориям
        category_badge_counts = {}
        for badge in self.badges:
            cat_id = badge.category_id
            if cat_id not in category_badge_counts:
                category_badge_counts[cat_id] = 0
            category_badge_counts[cat_id] += 1
        
        # Обновляем количество значков в категориях
        for category in self.categories:
            category.badge_count = category_badge_counts.get(category.id, 0)
        
        # Проверяем соответствие ожидаемому количеству
        warnings = []
        total_expected = sum(cat.expected_badges for cat in self.categories)
        total_found = len(self.badges)
        
        if total_found != total_expected:
            warnings.append(f"Ожидалось {total_expected} значков, найдено {total_found}")
        
        for category in self.categories:
            if category.badge_count != category.expected_badges:
                warnings.append(f"Категория {category.id} ({category.title}): ожидалось {category.expected_badges}, найдено {category.badge_count}")
        
        if warnings:
            print("⚠️ Предупреждения:")
            for warning in warnings:
                print(f"  - {warning}")
        else:
            print("✅ Все данные корректны")
        
        print("\n=== СТАТИСТИКА ===")
        print(f"Категорий: {len(self.categories)}")
        print(f"Значков: {len(self.badges)}")
        
        print("\nРаспределение по категориям:")
        for category in self.categories:
            status = "✅" if category.badge_count == category.expected_badges else "⚠️"
            print(f"  {status} {category.title}: {category.badge_count}/{category.expected_badges} значков")
    
    def _create_output(self) -> Dict:
        """Создание выходного JSON"""
        return {
            "metadata": {
                "total_categories": len(self.categories),
                "total_badges": len(self.badges),
                "source_file": self.file_path,
                "parsed_at": datetime.now().strftime("%Y-%m-%d %H:%M:%S")
            },
            "categories": [asdict(cat) for cat in self.categories],
            "badges": [asdict(badge) for badge in self.badges]
        }


def main():
    parser = PerfectPutevoditelParser("Путеводитель.txt")
    result = parser.parse()
    
    # Сохраняем результат
    output_file = "perfect_parsed_data.json"
    with open(output_file, 'w', encoding='utf-8') as f:
        json.dump(result, f, ensure_ascii=False, indent=2)
    
    print(f"\n✅ Результат сохранен в {output_file}")


if __name__ == "__main__":
    main()
