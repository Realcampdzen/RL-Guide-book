#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Ультимативный финальный парсер - исправляет извлечение описаний
"""

import json
import re
import os
from collections import defaultdict

def load_guide():
    """Загружает данные из Путеводителя.txt"""
    with open('Путеводитель.txt', 'r', encoding='utf-8') as f:
        return f.read()

def extract_badge_info_from_guide(badge_id):
    """Извлекает информацию о значке из Путеводителя"""
    guide_text = load_guide()
    
    # Ищем основную информацию о значке - два варианта
    # Вариант 1: с эмодзи (краткая версия)
    main_pattern1 = rf'^{re.escape(badge_id)}\.?\s*Значок\s*([^«]+)«([^»]+)»\.'
    main_match1 = re.search(main_pattern1, guide_text, re.MULTILINE)
    
    # Вариант 2: без эмодзи (подробная версия)
    main_pattern2 = rf'^{re.escape(badge_id)}\.?\s*Значок\s*«([^»]+)»\.'
    main_match2 = re.search(main_pattern2, guide_text, re.MULTILINE)
    
    emoji = ""
    title = ""
    
    if main_match1:
        emoji = main_match1.group(1).strip()
        title = main_match1.group(2)
    elif main_match2:
        emoji = ""  # Нет эмодзи в основном значке
        title = main_match2.group(1)
    else:
        return None
    
    # Ищем описание цели - ищем в подробной версии
    description = ""
    
    # Ищем строку с "Цель:" после основного значка (подробная версия)
    goal_pattern = rf'^{re.escape(badge_id)}\.?\s*Значок[^.]*\.\s*\n-Цель:\s*([^\n]+)'
    goal_match = re.search(goal_pattern, guide_text, re.MULTILINE)
    
    if goal_match:
        description = goal_match.group(1).strip()
    
    # Ищем уровни
    levels = []
    level_pattern = rf'^{re.escape(badge_id)}\.(\d+)\.?\s*(?:Базовый уровень|Продвинутый уровень|Экспертный уровень|Одноуровневый)?\s*–?\s*([^«]+)«([^»]+)»\.?'
    
    level_matches = list(re.finditer(level_pattern, guide_text, re.MULTILINE))
    
    # Убираем дубликаты по ID
    seen_levels = set()
    
    for match in level_matches:
        level_num = match.group(1)
        level_emoji = match.group(2).strip()
        level_title = match.group(3)
        level_id = f"{badge_id}.{level_num}"
        
        if level_id in seen_levels:
            continue
        seen_levels.add(level_id)
        
        # Ищем критерии для этого уровня
        criteria_pattern = rf'^{re.escape(level_id)}\.?\s*[^.]*\.\s*\n-Цель:\s*([^\n]+)'
        criteria_match = re.search(criteria_pattern, guide_text, re.MULTILINE)
        
        level_description = ""
        if criteria_match:
            level_description = criteria_match.group(1).strip()
        
        # Определяем уровень
        level_name = "Одноуровневый"
        if level_num == "1":
            level_name = "Базовый уровень"
        elif level_num == "2":
            level_name = "Продвинутый уровень"
        elif level_num == "3":
            level_name = "Экспертный уровень"
        
        levels.append({
            "id": level_id,
            "level": level_name,
            "title": level_title,
            "emoji": level_emoji,
            "description": level_description,
            "criteria": f"✅ {level_description}" if level_description else "✅ Выполнить требования уровня",
            "confirmation": "📎 Подтверждение вожатого об участии в практике."
        })
    
    return {
        "id": badge_id,
        "title": title,
        "emoji": emoji,
        "description": description,
        "levels": levels
    }

def create_enhanced_badge(guide_info):
    """Создаёт значок с правильными данными из Путеводителя"""
    if not guide_info:
        return None
    
    # Создаём основной значок
    enhanced_badge = {
        "id": guide_info["id"],
        "title": guide_info["title"],
        "emoji": guide_info["emoji"],
        "category_id": guide_info["id"].split(".")[0],
        "level": "Одноуровневый" if not guide_info["levels"] else "Многоуровневый",
        "description": guide_info["description"],
        "criteria": f"✅ {guide_info['description']}" if guide_info["description"] else "✅ Выполнить требования значка",
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
    """Парсит все категории из Путеводителя"""
    guide_text = load_guide()
    
    # Находим все категории
    categories = set()
    category_pattern = r'^([0-9]+)\.\s*[^.]*\.'
    for match in re.finditer(category_pattern, guide_text, re.MULTILINE):
        categories.add(match.group(1))
    
    all_badges = []
    
    for category_id in sorted(categories, key=int):
        print(f"Обрабатываем категорию {category_id}...")
        
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
            enhanced_badge = create_enhanced_badge(guide_info)
            if enhanced_badge:
                all_badges.append(enhanced_badge)
                print(f"  ✅ Обработан {badge_id}: {enhanced_badge['title']}")
                if enhanced_badge['description']:
                    print(f"      Описание: {enhanced_badge['description'][:50]}...")
    
    return all_badges

def main():
    """Основная функция"""
    print("🚀 Запуск ультимативного финального парсера...")
    print("📖 Корректно извлекаем все данные из Путеводителя")
    print("🎯 Создаём правильную структуру для веб-приложения\n")
    
    # Парсим все категории
    all_badges = parse_all_categories()
    
    # Создаём итоговую структуру
    result = {
        "badges": all_badges,
        "total_badges": len(all_badges),
        "generated_by": "ultimate_final_parser.py",
        "source": "Путеводитель.txt"
    }
    
    # Сохраняем результат
    output_file = "perfect_parsed_data_ultimate_final.json"
    with open(output_file, 'w', encoding='utf-8') as f:
        json.dump(result, f, ensure_ascii=False, indent=2)
    
    print(f"\n✅ Парсинг завершён!")
    print(f"📊 Обработано значков: {len(all_badges)}")
    print(f"💾 Результат сохранён в: {output_file}")
    
    # Проверяем конкретные проблемные значки
    print(f"\n🔍 Проверяем проблемные значки:")
    for badge in all_badges:
        if badge["id"] in ["11.11", "11.12"]:
            print(f"  {badge['id']}: {badge['title']}")
            print(f"      Эмодзи: '{badge['emoji']}'")
            print(f"      Описание: {badge['description'][:100]}...")
            if 'subtasks' in badge:
                print(f"      Уровней: {len(badge['subtasks'])}")

if __name__ == "__main__":
    main()