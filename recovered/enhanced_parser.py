#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Улучшенный парсер, который использует структуру ai-data как шаблон
и заполняет её правильными данными из Путеводителя
"""

import json
import re
import os
from collections import defaultdict

def load_guide():
    """Загружает данные из Путеводителя.txt"""
    with open('Путеводитель.txt', 'r', encoding='utf-8') as f:
        return f.read()

def load_ai_data_structure(category_id):
    """Загружает структуру из ai-data для категории"""
    ai_data_path = f'ai-data/category-{category_id}'
    if not os.path.exists(ai_data_path):
        return None
    
    structure = {}
    
    # Загружаем все JSON файлы в категории
    for filename in os.listdir(ai_data_path):
        if filename.endswith('.json') and filename != 'index.json':
            file_path = os.path.join(ai_data_path, filename)
            try:
                with open(file_path, 'r', encoding='utf-8') as f:
                    data = json.load(f)
                    badge_id = data.get('id', filename.replace('.json', ''))
                    structure[badge_id] = data
            except Exception as e:
                print(f"Ошибка загрузки {file_path}: {e}")
    
    return structure

def extract_badge_info_from_guide(badge_id):
    """Извлекает информацию о значке из Путеводителя"""
    guide_text = load_guide()
    
    # Ищем основную информацию о значке
    main_pattern = rf'^{re.escape(badge_id)}\.?\s*Значок\s*([^«]+)«([^»]+)»\.'
    main_match = re.search(main_pattern, guide_text, re.MULTILINE)
    
    if not main_match:
        # Пробуем найти без "Значок"
        alt_pattern = rf'^{re.escape(badge_id)}\.?\s*([^«]+)«([^»]+)»\.'
        main_match = re.search(alt_pattern, guide_text, re.MULTILINE)
    
    if not main_match:
        return None
    
    emoji = main_match.group(1).strip()
    title = main_match.group(2)
    
    # Ищем описание цели
    goal_pattern = rf'^{re.escape(badge_id)}\.?\s*Значок[^.]*\.\s*\n-Цель:\s*([^\n]+)'
    goal_match = re.search(goal_pattern, guide_text, re.MULTILINE)
    
    description = ""
    if goal_match:
        description = goal_match.group(1).strip()
    
    # Ищем уровни
    levels = []
    level_pattern = rf'^{re.escape(badge_id)}\.(\d+)\.?\s*(?:Базовый уровень|Продвинутый уровень|Экспертный уровень|Одноуровневый)?\s*–?\s*([^«]+)«([^»]+)»\.?'
    
    for match in re.finditer(level_pattern, guide_text, re.MULTILINE):
        level_num = match.group(1)
        level_emoji = match.group(2).strip()
        level_title = match.group(3)
        
        # Ищем критерии для этого уровня
        level_id = f"{badge_id}.{level_num}"
        criteria_pattern = rf'^{re.escape(level_id)}\.?\s*[^.]*\.\s*\n-Цель:\s*([^\n]+)'
        criteria_match = re.search(criteria_pattern, guide_text, re.MULTILINE)
        
        level_description = ""
        if criteria_match:
            level_description = criteria_match.group(1).strip()
        
        levels.append({
            "id": level_id,
            "level": "Базовый уровень" if level_num == "1" else "Продвинутый уровень" if level_num == "2" else "Экспертный уровень",
            "title": level_title,
            "emoji": level_emoji,
            "description": level_description,
            "criteria": f"✅ {level_description}",  # Упрощённые критерии
            "confirmation": "📎 Подтверждение вожатого об участии в практике."
        })
    
    return {
        "id": badge_id,
        "title": title,
        "emoji": emoji,
        "description": description,
        "levels": levels
    }

def create_enhanced_badge(ai_structure, guide_info):
    """Создаёт значок, используя структуру ai-data и данные из Путеводителя"""
    if not guide_info:
        return None
    
    # Базовый значок из ai-data
    base_badge = ai_structure.get(guide_info["id"], {})
    
    # Создаём новый значок с правильными данными
    enhanced_badge = {
        "id": guide_info["id"],
        "title": guide_info["title"],
        "emoji": guide_info["emoji"],
        "category_id": base_badge.get("categoryId", guide_info["id"].split(".")[0]),
        "level": "Одноуровневый" if not guide_info["levels"] else "Многоуровневый",
        "description": guide_info["description"],
        "criteria": f"✅ {guide_info['description']}" if guide_info["description"] else "",
        "confirmation": "📎 Подтверждение вожатого об участии в практике."
    }
    
    # Добавляем уровни если есть
    if guide_info["levels"]:
        enhanced_badge["subtasks"] = []
        for level in guide_info["levels"]:
            enhanced_badge["subtasks"].append({
                "id": level["id"],
                "title": level["title"],
                "emoji": level["emoji"],
                "level": level["level"],
                "description": level["description"],
                "criteria": level["criteria"],
                "confirmation": level["confirmation"]
            })
    
    return enhanced_badge

def parse_all_categories():
    """Парсит все категории, используя структуру ai-data"""
    guide_text = load_guide()
    
    # Находим все категории
    categories = set()
    category_pattern = r'^([0-9]+)\.\s*[^.]*\.'
    for match in re.finditer(category_pattern, guide_text, re.MULTILINE):
        categories.add(match.group(1))
    
    all_badges = []
    
    for category_id in sorted(categories, key=int):
        print(f"Обрабатываем категорию {category_id}...")
        
        # Загружаем структуру ai-data
        ai_structure = load_ai_data_structure(category_id)
        if not ai_structure:
            print(f"  ⚠️ Нет ai-data для категории {category_id}")
            continue
        
        # Находим все значки в этой категории
        category_pattern = rf'^{category_id}\.([0-9]+)\.?\s*Значок'
        badge_numbers = set()
        for match in re.finditer(category_pattern, guide_text, re.MULTILINE):
            badge_numbers.add(match.group(1))
        
        for badge_num in sorted(badge_numbers, key=int):
            badge_id = f"{category_id}.{badge_num}"
            
            # Извлекаем информацию из Путеводителя
            guide_info = extract_badge_info_from_guide(badge_id)
            if not guide_info:
                print(f"  ⚠️ Не найдена информация для {badge_id}")
                continue
            
            # Создаём улучшенный значок
            enhanced_badge = create_enhanced_badge(ai_structure, guide_info)
            if enhanced_badge:
                all_badges.append(enhanced_badge)
                print(f"  ✅ Обработан {badge_id}: {enhanced_badge['title']}")
    
    return all_badges

def main():
    """Основная функция"""
    print("🚀 Запуск улучшенного парсера...")
    print("📋 Используем структуру ai-data как шаблон")
    print("📖 Заполняем данными из Путеводителя\n")
    
    # Парсим все категории
    all_badges = parse_all_categories()
    
    # Создаём итоговую структуру
    result = {
        "badges": all_badges,
        "total_badges": len(all_badges),
        "generated_by": "enhanced_parser.py",
        "source": "Путеводитель.txt + ai-data structure"
    }
    
    # Сохраняем результат
    output_file = "perfect_parsed_data_enhanced.json"
    with open(output_file, 'w', encoding='utf-8') as f:
        json.dump(result, f, ensure_ascii=False, indent=2)
    
    print(f"\n✅ Парсинг завершён!")
    print(f"📊 Обработано значков: {len(all_badges)}")
    print(f"💾 Результат сохранён в: {output_file}")

if __name__ == "__main__":
    main()
