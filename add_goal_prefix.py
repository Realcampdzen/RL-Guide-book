#!/usr/bin/env python3
# -*- coding: utf-8 -*-

import json
import os
import glob

def add_goal_prefix_to_descriptions():
    """Добавляет 'Цель: ' в начало всех описаний в ai-data файлах"""
    
    # Находим все JSON файлы в ai-data
    ai_data_files = glob.glob("ai-data/**/*.json", recursive=True)
    
    updated_count = 0
    
    for file_path in ai_data_files:
        try:
            with open(file_path, 'r', encoding='utf-8') as f:
                data = json.load(f)
            
            # Проверяем, есть ли поле description
            if 'description' in data and data['description']:
                description = data['description'].strip()
                
                # Если описание не начинается с "Цель:", добавляем его
                if not description.startswith('Цель:'):
                    data['description'] = f"Цель: {description}"
                    
                    # Сохраняем обновленный файл
                    with open(file_path, 'w', encoding='utf-8') as f:
                        json.dump(data, f, ensure_ascii=False, indent=2)
                    
                    print(f"✅ Обновлен: {file_path}")
                    updated_count += 1
                else:
                    print(f"⏭️  Уже содержит 'Цель:': {file_path}")
            else:
                print(f"⚠️  Нет описания: {file_path}")
                
        except Exception as e:
            print(f"❌ Ошибка в файле {file_path}: {e}")
    
    print(f"\n🎉 Обновлено {updated_count} файлов")
    return updated_count

if __name__ == "__main__":
    print("🔄 Добавляем 'Цель:' в начало всех описаний...")
    add_goal_prefix_to_descriptions()
