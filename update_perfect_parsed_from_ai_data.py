#!/usr/bin/env python3
"""
Скрипт для обновления perfect_parsed_data.json на основе исправленного ai-data/
Преобразует иерархическую структуру ai-data в плоскую структуру perfect_parsed_data.json
"""

import json
import os
from pathlib import Path
from typing import Dict, List, Any

def load_ai_data() -> Dict[str, Any]:
    """Загружает все данные из ai-data/"""
    ai_data = {}
    
    ai_data_dir = Path('ai-data')
    for category_dir in ai_data_dir.iterdir():
        if not category_dir.is_dir():
            continue
            
        for json_file in category_dir.glob('*.json'):
            if json_file.name == 'index.json':
                continue
                
            with open(json_file, 'r', encoding='utf-8') as f:
                data = json.load(f)
                ai_data[data['id']] = data
    
    return ai_data

def convert_ai_data_to_perfect_format(ai_data: Dict[str, Any]) -> Dict[str, Any]:
    """Преобразует ai-data в формат perfect_parsed_data.json"""
    
    # Загружаем существующий perfect_parsed_data.json для получения структуры категорий
    with open('perfect_parsed_data.json', 'r', encoding='utf-8') as f:
        existing_data = json.load(f)
    
    categories = existing_data.get('categories', [])
    
    # Создаем новый массив значков
    badges = []
    
    for badge_id, ai_badge in ai_data.items():
        # Если у значка есть уровни, создаем отдельные записи для каждого уровня
        if 'levels' in ai_badge and ai_badge['levels']:
            for level in ai_badge['levels']:
                # Если это одноуровневый значок, используем базовый ID
                if level['level'] == 'Одноуровневый':
                    badge_id = badge_id  # Используем базовый ID (например, 4.1)
                else:
                    badge_id = level['id']  # Используем ID уровня (например, 4.1.1)
                
                badge = {
                    "id": badge_id,
                    "title": level['title'],
                    "emoji": level['emoji'],
                    "category_id": ai_badge['categoryId'],
                    "level": level['level'],
                    "description": ai_badge.get('description', ''),
                    "criteria": level.get('criteria', ''),
                    "importance": ai_badge.get('importance', ''),
                    "skillTips": ai_badge.get('skillTips', ''),
                    "nameExplanation": ai_badge.get('nameExplanation', ''),
                    "examples": ai_badge.get('examples', ''),
                    "philosophy": ai_badge.get('philosophy', ''),
                    "howToBecome": ai_badge.get('howToBecome', '')
                }
                badges.append(badge)
        else:
            # Если уровней нет, создаем одну запись
            badge = {
                "id": badge_id,
                "title": ai_badge.get('title', ''),
                "emoji": ai_badge.get('emoji', ''),
                "category_id": ai_badge.get('categoryId', ''),
                "level": "Одноуровневый",
                "description": ai_badge.get('description', ''),
                "criteria": "",
                "importance": ai_badge.get('importance', ''),
                "skillTips": ai_badge.get('skillTips', ''),
                "nameExplanation": ai_badge.get('nameExplanation', ''),
                "examples": ai_badge.get('examples', ''),
                "philosophy": ai_badge.get('philosophy', ''),
                "howToBecome": ai_badge.get('howToBecome', '')
            }
            badges.append(badge)
    
    # Создаем новую структуру данных
    perfect_data = {
        "categories": categories,
        "badges": badges
    }
    
    return perfect_data

def main():
    print("🔄 Обновление perfect_parsed_data.json на основе ai-data/...")
    
    # Создаем резервную копию
    if Path('perfect_parsed_data.json').exists():
        import shutil
        shutil.copy('perfect_parsed_data.json', 'perfect_parsed_data_backup.json')
        print("✅ Создана резервная копия perfect_parsed_data_backup.json")
    
    # Загружаем ai-data
    print("🤖 Загрузка данных из ai-data/...")
    ai_data = load_ai_data()
    print(f"✅ Найдено {len(ai_data)} значков в ai-data")
    
    # Преобразуем в формат perfect_parsed_data.json
    print("🔄 Преобразование данных...")
    perfect_data = convert_ai_data_to_perfect_format(ai_data)
    
    # Сохраняем обновленный файл
    print("💾 Сохранение обновленного perfect_parsed_data.json...")
    with open('perfect_parsed_data.json', 'w', encoding='utf-8') as f:
        json.dump(perfect_data, f, ensure_ascii=False, indent=2)
    
    # Выводим статистику
    print("\n" + "="*60)
    print("📊 СТАТИСТИКА ОБНОВЛЕНИЯ")
    print("="*60)
    print(f"📁 Категорий: {len(perfect_data['categories'])}")
    print(f"🏆 Значков: {len(perfect_data['badges'])}")
    
    # Подсчитываем значки по категориям
    category_counts = {}
    for badge in perfect_data['badges']:
        category_id = badge['category_id']
        category_counts[category_id] = category_counts.get(category_id, 0) + 1
    
    print(f"\n📊 Значки по категориям:")
    for category_id, count in sorted(category_counts.items()):
        print(f"  • Категория {category_id}: {count} значков")
    
    print("\n✅ Обновление завершено!")
    print("📁 Резервная копия сохранена в perfect_parsed_data_backup.json")

if __name__ == "__main__":
    main()
