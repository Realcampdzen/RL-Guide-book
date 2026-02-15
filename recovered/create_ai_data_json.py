#!/usr/bin/env python3
"""
Создает единый JSON файл со всеми данными из папки ai-data/
для использования в Vercel API
"""

import json
import os
from pathlib import Path

def load_ai_data():
    """Загружает все данные из папки ai-data/"""
    ai_data_path = Path("ai-data")
    
    if not ai_data_path.exists():
        print("❌ Папка ai-data не найдена!")
        return None
    
    # Загружаем MASTER_INDEX
    master_index_path = ai_data_path / "MASTER_INDEX.json"
    if not master_index_path.exists():
        print("❌ MASTER_INDEX.json не найден!")
        return None
    
    with open(master_index_path, 'r', encoding='utf-8') as f:
        master_index = json.load(f)
    
    print(f"✅ MASTER_INDEX загружен: {master_index['totalCategories']} категорий, {master_index['totalBadges']} значков")
    
    categories = []
    badges = []
    
    # Загружаем данные из каждой категории
    for category_info in master_index['categories']:
        category_path = ai_data_path / category_info['path']
        category_index_path = category_path / "index.json"
        
        if not category_index_path.exists():
            print(f"⚠️ Не найден {category_index_path}")
            continue
        
        with open(category_index_path, 'r', encoding='utf-8') as f:
            category_data = json.load(f)
        
        # Создаем категорию
        category = {
            "id": category_info['id'],
            "title": category_info['title'],
            "emoji": category_info['emoji'],
            "path": category_info['path'],
            "badge_count": category_data.get('badges', 0),
            "introduction": None,
            "philosophy": None,
            "badges": []
        }
        
        # Загружаем значки категории
        for badge_info in category_data.get('badgesData', []):
            badge = {
                "id": badge_info['id'],
                "title": badge_info['title'],
                "emoji": badge_info['emoji'],
                "category_id": category_info['id'],
                "category_title": category_info['title'],
                "levels": badge_info.get('levels', []),
                "description": f"{badge_info['title']} - значок категории \"{category_info['title']}\"",
                "criteria": f"Критерии для получения значка \"{badge_info['title']}\"",
                "benefits": f"Польза от получения значка \"{badge_info['title']}\""
            }
            
            category['badges'].append(badge)
            badges.append(badge)
        
        categories.append(category)
        print(f"✅ Категория {category_info['id']}: {category_info['title']} ({len(category['badges'])} значков)")
    
    # Создаем итоговый объект данных
    result = {
        "categories": categories,
        "badges": badges,
        "totalCategories": len(categories),
        "totalBadges": len(badges),
        "totalLevels": sum(len(badge['levels']) for badge in badges),
        "version": "2.0.0",
        "source": "ai-data",
        "created": "2025-01-09"
    }
    
    print(f"\n✅ Итого создано:")
    print(f"   📁 Категорий: {result['totalCategories']}")
    print(f"   🏆 Значков: {result['totalBadges']}")
    print(f"   📊 Уровней: {result['totalLevels']}")
    
    return result

def main():
    print("🚀 Создание ai_data_complete.json из папки ai-data/...\n")
    
    data = load_ai_data()
    if not data:
        print("❌ Не удалось загрузить данные!")
        return
    
    # Сохраняем в файл
    output_file = "ai_data_complete.json"
    with open(output_file, 'w', encoding='utf-8') as f:
        json.dump(data, f, ensure_ascii=False, indent=2)
    
    file_size = os.path.getsize(output_file) / 1024 / 1024
    print(f"\n✅ Данные сохранены в {output_file}")
    print(f"📁 Размер файла: {file_size:.2f} MB")
    
    # Проверяем первые несколько категорий
    print(f"\n📋 Первые 3 категории:")
    for i, category in enumerate(data['categories'][:3]):
        print(f"   {i+1}. {category['emoji']} {category['title']} ({category['badge_count']} значков)")
    
    # Проверяем значок "Валюша"
    valusha = next((b for b in data['badges'] if b['id'] == '1.1'), None)
    if valusha:
        print(f"\n✅ Значок 'Валюша' найден: {valusha['title']} в категории '{valusha['category_title']}'")
    else:
        print(f"\n❌ Значок 'Валюша' НЕ найден!")

if __name__ == "__main__":
    main()
