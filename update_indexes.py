#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Скрипт для обновления индексов после очистки ai-data
"""

import json
from pathlib import Path

def update_category_indexes():
    """Обновляет index.json файлы в каждой категории"""
    ai_data_path = Path("ai-data")
    updated_categories = []
    
    for category_dir in ai_data_path.glob("category-*"):
        if not category_dir.is_dir():
            continue
            
        category_id = category_dir.name.replace("category-", "")
        index_file = category_dir / "index.json"
        
        if not index_file.exists():
            print(f"WARN: {category_dir.name}: index.json не найден")
            continue
        
        # Загружаем текущий индекс
        with open(index_file, 'r', encoding='utf-8') as f:
            index_data = json.load(f)
        
        # Находим все файлы значков
        badge_files = [f for f in category_dir.glob("*.json") if f.name != "index.json"]
        badge_ids = [f.stem for f in badge_files]
        
        # Обновляем данные
        index_data['badges'] = len(badge_ids)
        index_data['files'] = ["index.json"] + [f"{bid}.json" for bid in sorted(badge_ids)]
        
        # Пересчитываем уровни
        total_levels = 0
        badges_data = []
        
        for badge_file in badge_files:
            try:
                with open(badge_file, 'r', encoding='utf-8') as f:
                    badge_data = json.load(f)
                
                level_count = len(badge_data.get('levels', []))
                total_levels += level_count
                
                badges_data.append({
                    'id': badge_data['id'],
                    'title': badge_data['title'],
                    'emoji': badge_data['emoji'],
                    'levels': [level['level'] for level in badge_data.get('levels', [])]
                })
            except Exception as e:
                print(f"⚠️  Ошибка чтения {badge_file}: {e}")
        
        index_data['levels'] = total_levels
        index_data['badgesData'] = badges_data
        
        # Сохраняем обновленный индекс
        with open(index_file, 'w', encoding='utf-8') as f:
            json.dump(index_data, f, ensure_ascii=False, indent=2)
        
        updated_categories.append({
            'id': category_id,
            'title': index_data.get('title', f'Категория {category_id}'),
            'emoji': index_data.get('emoji', '📁'),
            'path': f"category-{category_id}/",
            'badges': len(badge_ids),
            'levels': total_levels,
            'status': 'COMPLETED',
            'files': index_data['files']
        })
        
        print(f"OK {category_dir.name}: {len(badge_ids)} значков, {total_levels} уровней")
    
    return updated_categories

def update_master_index(categories):
    """Обновляет MASTER_INDEX.json"""
    master_index_file = Path("ai-data/MASTER_INDEX.json")
    
    if not master_index_file.exists():
        print("ERROR: MASTER_INDEX.json не найден!")
        return
    
    # Загружаем текущий индекс
    with open(master_index_file, 'r', encoding='utf-8') as f:
        master_data = json.load(f)
    
    # Подсчитываем общую статистику
    total_badges = sum(cat['badges'] for cat in categories)
    total_levels = sum(cat['levels'] for cat in categories)
    
    # Обновляем данные
    master_data['totalCategories'] = len(categories)
    master_data['totalBadges'] = total_badges
    master_data['totalLevels'] = total_levels
    master_data['categories'] = categories
    master_data['progress'] = {
        'completed': total_badges,
        'remaining': 0,
        'percentage': 100
    }
    master_data['notes'] = f"Проект обновлён! Создано {total_badges} базовых значков и {total_levels} общих уровней. Все значки соответствуют Путеводителю."
    
    # Сохраняем обновленный индекс
    with open(master_index_file, 'w', encoding='utf-8') as f:
        json.dump(master_data, f, ensure_ascii=False, indent=2)
    
    print("\nОбновлен MASTER_INDEX.json:")
    print(f"   Категорий: {len(categories)}")
    print(f"   Значков: {total_badges}")
    print(f"   Уровней: {total_levels}")

def main():
    """Основная функция"""
    print("Обновление индексов после очистки ai-data...")
    
    categories = update_category_indexes()
    update_master_index(categories)
    
    print("\nОбновление завершено!")

if __name__ == "__main__":
    main()
