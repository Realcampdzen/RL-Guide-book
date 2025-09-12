#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Скрипт для создания отсутствующих значков на основе Путеводителя
"""

import json
import re
from pathlib import Path

def load_guidebook():
    """Загружает Путеводитель"""
    with open('Путеводитель.txt', 'r', encoding='utf-8') as f:
        return f.read()

def load_correct_badges():
    """Загружает правильную структуру значков"""
    with open('all_correct_badges.json', 'r', encoding='utf-8') as f:
        return json.load(f)

def extract_badge_content_from_guidebook(content, badge_id):
    """Извлекает содержимое значка из Путеводителя"""
    # Ищем секцию значка
    pattern = rf'{badge_id}\s+Значок\s+([^\s]+)\s+«([^»]+)»\.\s*([^💡\n]+?)(?=\n\n|\n💡|\n\d+\.\d+\.\d+\.|$)'
    match = re.search(pattern, content, re.DOTALL)
    
    if not match:
        return None
    
    emoji = match.group(1)
    title = match.group(2)
    description = match.group(3).strip()
    
    # Ищем примеры
    examples_pattern = rf'💡\s+Примеры[^:]*:\s*([^1\.\d]+?)(?=\n\d+\.\d+\.\d+\.|$)'
    examples_match = re.search(examples_pattern, content, re.DOTALL)
    examples = examples_match.group(1).strip() if examples_match else ""
    
    # Ищем уровни
    levels = []
    level_pattern = rf'{badge_id}\.(\d+)\s*\.\s*([^–]+)\s*–\s*([^\s]+)\s*«([^»]+)»'
    level_matches = re.finditer(level_pattern, content)
    
    for match in level_matches:
        level_num = match.group(1)
        level_name = match.group(2).strip()
        level_emoji = match.group(3)
        level_title = match.group(4)
        
        # Ищем критерии и подтверждение для этого уровня
        criteria_pattern = rf'{badge_id}\.{level_num}\.\s*[^–]+–\s*[^\s]+\s*«[^»]+»\s*\n([^📎]+?)(?=📎|$)'
        criteria_match = re.search(criteria_pattern, content, re.DOTALL)
        criteria = criteria_match.group(1).strip() if criteria_match else ""
        
        confirmation_pattern = rf'📎\s*([^📎]+?)(?=📎|\n\d+\.\d+\.\d+\.|$)'
        confirmation_match = re.search(confirmation_pattern, content, re.DOTALL)
        confirmation = confirmation_match.group(1).strip() if confirmation_match else ""
        
        levels.append({
            'id': f"{badge_id}.{level_num}",
            'level': level_name,
            'title': level_title,
            'emoji': level_emoji,
            'criteria': criteria,
            'confirmation': confirmation
        })
    
    return {
        'id': badge_id,
        'title': title,
        'emoji': emoji,
        'description': description,
        'examples': examples,
        'levels': levels
    }

def create_badge_file(badge_data, category_id):
    """Создает файл значка"""
    category_dir = Path(f"ai-data/category-{category_id}")
    category_dir.mkdir(exist_ok=True)
    
    badge_file = category_dir / f"{badge_data['id']}.json"
    
    # Создаем структуру файла
    badge_json = {
        "id": badge_data['id'],
        "title": badge_data['title'],
        "emoji": badge_data['emoji'],
        "categoryId": category_id,
        "description": f"Цель: {badge_data['description']}",
        "levels": badge_data['levels']
    }
    
    # Добавляем примеры, если есть
    if badge_data['examples']:
        badge_json['examples'] = f"💡 Примеры:\n{badge_data['examples']}"
    
    # Добавляем стандартные поля
    badge_json['importance'] = "🔹 Развивает важные навыки и качества.\n🔹 Помогает в личностном росте.\n🔹 Способствует командной работе."
    badge_json['skillTips'] = "💡 Как развить навык?\n📌 Регулярно практиковать и применять знания.\n📌 Получать обратную связь от вожатых и сверстников.\n📌 Анализировать свой прогресс и ставить новые цели."
    
    # Сохраняем файл
    with open(badge_file, 'w', encoding='utf-8') as f:
        json.dump(badge_json, f, ensure_ascii=False, indent=2)
    
    print(f"✅ Создан файл {badge_file}")
    return badge_file

def main():
    """Основная функция"""
    print("🔧 Создание отсутствующих значков...")
    
    # Загружаем данные
    guidebook_content = load_guidebook()
    correct_badges = load_correct_badges()
    
    # Находим отсутствующие значки
    existing_files = []
    ai_data_path = Path("ai-data")
    
    for category_dir in ai_data_path.glob("category-*"):
        if not category_dir.is_dir():
            continue
            
        for badge_file in category_dir.glob("*.json"):
            if badge_file.name == "index.json":
                continue
            existing_files.append(badge_file.stem)
    
    missing_badges = [badge for badge in correct_badges if badge['id'] not in existing_files]
    
    print(f"📋 Найдено {len(missing_badges)} отсутствующих значков:")
    for badge in missing_badges:
        print(f"   - {badge['id']} {badge['emoji']} «{badge['title']}»")
    
    # Создаем отсутствующие значки
    created_count = 0
    for badge in missing_badges:
        try:
            # Извлекаем содержимое из Путеводителя
            badge_content = extract_badge_content_from_guidebook(guidebook_content, badge['id'])
            
            if badge_content:
                category_id = badge['id'].split('.')[0]
                create_badge_file(badge_content, category_id)
                created_count += 1
            else:
                print(f"⚠️  Не удалось извлечь содержимое для {badge['id']}")
        except Exception as e:
            print(f"❌ Ошибка создания {badge['id']}: {e}")
    
    print(f"\n🎉 Создано {created_count} из {len(missing_badges)} отсутствующих значков!")

if __name__ == "__main__":
    main()
