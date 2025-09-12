#!/usr/bin/env python3
# -*- coding: utf-8 -*-

import json
import os
import glob
from typing import Dict, List

def load_ai_data_file(file_path: str) -> Dict:
    """Загружает данные из ai-data файла"""
    try:
        with open(file_path, 'r', encoding='utf-8') as f:
            return json.load(f)
    except Exception as e:
        print(f"❌ Ошибка чтения файла {file_path}: {e}")
        return {}

def update_perfect_parsed_data():
    """Обновляет perfect_parsed_data.json с данными из ai-data файлов"""
    print("🔄 Обновляю perfect_parsed_data.json с исправленными данными из ai-data")
    
    # Загружаем текущий perfect_parsed_data.json
    try:
        with open("perfect_parsed_data.json", 'r', encoding='utf-8') as f:
            perfect_data = json.load(f)
    except Exception as e:
        print(f"❌ Ошибка чтения perfect_parsed_data.json: {e}")
        return
    
    updated_count = 0
    
    # Находим все ai-data файлы
    ai_data_files = []
    for category_dir in glob.glob("ai-data/category-*"):
        for file_path in glob.glob(f"{category_dir}/*.json"):
            if not file_path.endswith("index.json") and not file_path.endswith("MASTER_INDEX.json"):
                ai_data_files.append(file_path)
    
    print(f"📁 Найдено {len(ai_data_files)} файлов значков")
    
    for file_path in ai_data_files:
        badge_id = os.path.basename(file_path).replace('.json', '')
        ai_data = load_ai_data_file(file_path)
        
        if not ai_data:
            continue
        
        # Находим соответствующий значок в perfect_parsed_data.json
        badge_found = False
        for category in perfect_data.get('categories', []):
            for badge in category.get('badges', []):
                if isinstance(badge, dict) and badge.get('id') == badge_id:
                    badge_found = True
                    
                    # Обновляем поля из ai-data
                    fields_to_update = [
                        'description', 'importance', 'skillTips', 'examples', 
                        'philosophy', 'howToBecome', 'nameExplanation'
                    ]
                    
                    for field in fields_to_update:
                        if field in ai_data and ai_data[field]:
                            if badge.get(field) != ai_data[field]:
                                badge[field] = ai_data[field]
                                print(f"  📝 Обновил {field} для значка {badge_id}")
                    
                    # Обновляем criteria и confirmation в levels
                    if 'levels' in ai_data and 'levels' in badge:
                        for ai_level in ai_data['levels']:
                            ai_level_id = ai_level.get('id')
                            for perfect_level in badge['levels']:
                                if perfect_level.get('id') == ai_level_id:
                                    # Обновляем criteria
                                    if 'criteria' in ai_level and ai_level['criteria']:
                                        if perfect_level.get('criteria') != ai_level['criteria']:
                                            perfect_level['criteria'] = ai_level['criteria']
                                            print(f"  📝 Обновил criteria для уровня {ai_level_id}")
                                    
                                    # Обновляем confirmation
                                    if 'confirmation' in ai_level and ai_level['confirmation']:
                                        if perfect_level.get('confirmation') != ai_level['confirmation']:
                                            perfect_level['confirmation'] = ai_level['confirmation']
                                            print(f"  📝 Обновил confirmation для уровня {ai_level_id}")
                                    break
                    
                    updated_count += 1
                    break
            if badge_found:
                break
        
        if not badge_found:
            print(f"⚠️ Значок {badge_id} не найден в perfect_parsed_data.json")
    
    # Сохраняем обновленный perfect_parsed_data.json
    try:
        with open("perfect_parsed_data.json", 'w', encoding='utf-8') as f:
            json.dump(perfect_data, f, ensure_ascii=False, indent=2)
        
        print(f"✅ Обновлено {updated_count} значков в perfect_parsed_data.json")
        print("📄 Файл perfect_parsed_data.json сохранен")
        
    except Exception as e:
        print(f"❌ Ошибка сохранения perfect_parsed_data.json: {e}")

def main():
    """Основная функция"""
    print("🔄 ОБНОВЛЕНИЕ PERFECT_PARSED_DATA.JSON")
    print("=" * 40)
    
    update_perfect_parsed_data()
    
    print("\n🎯 СЛЕДУЮЩИЕ ШАГИ:")
    print("1. Проверить отображение в веб-приложении")
    print("2. При необходимости исправить оставшиеся проблемы вручную")

if __name__ == "__main__":
    main()
