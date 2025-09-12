#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Скрипт для восстановления perfect_parsed_data.json из Путеводителя.txt
"""

import json
import re
from collections import defaultdict

def load_guide():
    """Загружает данные из Путеводителя.txt"""
    with open('Путеводитель.txt', 'r', encoding='utf-8') as f:
        return f.read()

def load_perfect_data():
    """Загружает данные из perfect_parsed_data.json"""
    with open('perfect_parsed_data.json', 'r', encoding='utf-8') as f:
        return json.load(f)

def extract_main_badges_from_guide():
    """Извлекает основные значки из Путеводителя"""
    guide_text = load_guide()
    
    # Паттерн для поиска основных значков
    # Пример: "1.1 Значок 🔹 «Валюша». У этого значка три уровня сложности."
    main_badge_pattern = r'^([0-9]+\.[0-9]+) Значок ([^«]+) «([^»]+)»\.(.*?)$'
    
    main_badges = {}
    
    for line in guide_text.split('\n'):
        match = re.match(main_badge_pattern, line.strip())
        if match:
            badge_id = match.group(1)
            emoji = match.group(2).strip()
            title = match.group(3)
            description = match.group(4).strip()
            
            # Определяем количество уровней
            levels = 1  # по умолчанию одноуровневый
            if 'три уровня' in description:
                levels = 3
            elif 'два уровня' in description:
                levels = 2
            
            main_badges[badge_id] = {
                'id': badge_id,
                'title': title,
                'emoji': emoji,
                'levels': levels,
                'description': description
            }
    
    return main_badges

def extract_detailed_descriptions():
    """Извлекает подробные описания значков из Путеводителя"""
    guide_text = load_guide()
    
    # Ищем разделы с подробными описаниями
    # Пример: "11.12. Значок «Шоколадная Медитация»."
    detailed_pattern = r'^([0-9]+\.[0-9]+)\. Значок «([^»]+)»\.\s*$'
    
    detailed_descriptions = {}
    
    lines = guide_text.split('\n')
    for i, line in enumerate(lines):
        match = re.match(detailed_pattern, line.strip())
        if match:
            badge_id = match.group(1)
            title = match.group(2)
            
            # Ищем описание в следующих строках
            description_lines = []
            j = i + 1
            while j < len(lines) and not re.match(r'^[0-9]+\.[0-9]+', lines[j].strip()):
                if lines[j].strip() and not lines[j].strip().startswith('Почему этот значок важен?'):
                    description_lines.append(lines[j].strip())
                j += 1
            
            description = ' '.join(description_lines[:3])  # Берем первые 3 строки
            
            detailed_descriptions[badge_id] = {
                'title': title,
                'description': description
            }
    
    return detailed_descriptions

def create_missing_main_badges():
    """Создает отсутствующие основные значки"""
    main_badges = extract_main_badges_from_guide()
    detailed_descriptions = extract_detailed_descriptions()
    
    perfect_data = load_perfect_data()
    
    # Создаем список новых основных значков
    new_main_badges = []
    
    for badge_id, badge_info in main_badges.items():
        # Проверяем, есть ли уже такой значок
        existing = False
        for badge in perfect_data['badges']:
            if badge['id'] == badge_id:
                existing = True
                break
        
        if not existing:
            # Получаем подробное описание, если есть
            detailed = detailed_descriptions.get(badge_id, {})
            
            new_badge = {
                "id": badge_id,
                "title": detailed.get('title', badge_info['title']),
                "emoji": badge_info['emoji'],
                "category_id": badge_id.split('.')[0],
                "level": "Одноуровневый" if badge_info['levels'] == 1 else "Многоуровневый",
                "description": detailed.get('description', f"Основной значок {badge_info['title']}"),
                "criteria": f"Выполнить требования для получения значка {badge_info['title']}",
                "confirmation": f"📎 Подтверждение получения значка {badge_info['title']}"
            }
            
            new_main_badges.append(new_badge)
    
    return new_main_badges

def fix_wrong_descriptions():
    """Исправляет неправильные описания"""
    guide_text = load_guide()
    
    # Находим правильные описания для проблемных значков
    fixes = {}
    
    # Ищем описание для 11.12.1
    lines = guide_text.split('\n')
    for i, line in enumerate(lines):
        if '11.12.1. Базовый уровень' in line:
            # Ищем описание в следующих строках
            description_lines = []
            j = i + 1
            while j < len(lines) and not re.match(r'^[0-9]+\.[0-9]+', lines[j].strip()):
                if lines[j].strip() and not lines[j].strip().startswith('📎'):
                    description_lines.append(lines[j].strip())
                j += 1
            
            description = ' '.join(description_lines[:2])
            fixes['11.12.1'] = {
                'description': description,
                'criteria': '✅ Выбрать небольшой кусочек шоколада, фрукта или другого лакомства.\n✅ В течение 2–3 минут смаковать каждый укус, обращая внимание на вкус, текстуру, аромат.\n✅ Записать свои ощущения и заметить, как меняется восприятие еды.',
                'confirmation': '📎 3–5 пунктов ощущений по виду/аромату/текстуре/вкусу.\n📎 Подтверждение вожатого об участии в практике.'
            }
            break
    
    # Ищем описание для 11.12.2
    for i, line in enumerate(lines):
        if '11.12.2. Продвинутый уровень' in line:
            description_lines = []
            j = i + 1
            while j < len(lines) and not re.match(r'^[0-9]+\.[0-9]+', lines[j].strip()):
                if lines[j].strip() and not lines[j].strip().startswith('📎'):
                    description_lines.append(lines[j].strip())
                j += 1
            
            description = ' '.join(description_lines[:2])
            fixes['11.12.2'] = {
                'description': description,
                'criteria': '✅ Провести более сложную версию практики, выбрав один из вариантов.\n✅ Сравнить два продукта или осознанно съесть целое блюдо.\n✅ Записать все нюансы вкуса, ощущений, температуры.',
                'confirmation': '📎 Заметки о сравнении продуктов или осознанном поедании.\n📎 Анализ влияния контекста на восприятие вкуса.'
            }
            break
    
    return fixes

def main():
    print("Восстановление данных из Путеводителя")
    print("=" * 50)
    
    # 1. Создаем отсутствующие основные значки
    print("1. Создание отсутствующих основных значков...")
    new_main_badges = create_missing_main_badges()
    print(f"   Найдено {len(new_main_badges)} отсутствующих основных значков")
    
    # 2. Исправляем неправильные описания
    print("2. Исправление неправильных описаний...")
    fixes = fix_wrong_descriptions()
    print(f"   Найдено {len(fixes)} значков для исправления")
    
    # 3. Загружаем текущие данные
    perfect_data = load_perfect_data()
    
    # 4. Добавляем новые основные значки
    for new_badge in new_main_badges:
        perfect_data['badges'].append(new_badge)
    
    # 5. Исправляем существующие значки
    for badge in perfect_data['badges']:
        if badge['id'] in fixes:
            fix = fixes[badge['id']]
            badge['description'] = fix['description']
            badge['criteria'] = fix['criteria']
            badge['confirmation'] = fix['confirmation']
    
    # 6. Сортируем значки по ID
    perfect_data['badges'].sort(key=lambda x: x['id'])
    
    # 7. Обновляем метаданные
    perfect_data['metadata']['total_badges'] = len(perfect_data['badges'])
    perfect_data['metadata']['parsed_at'] = "2025-01-27 12:00:00"  # Текущее время
    
    # 8. Сохраняем исправленные данные
    with open('perfect_parsed_data_restored.json', 'w', encoding='utf-8') as f:
        json.dump(perfect_data, f, ensure_ascii=False, indent=2)
    
    print(f"3. Сохранено в perfect_parsed_data_restored.json")
    print(f"   Всего значков: {len(perfect_data['badges'])}")
    
    # Показываем примеры добавленных значков
    if new_main_badges:
        print("\nПримеры добавленных основных значков:")
        for badge in new_main_badges[:5]:
            print(f"   {badge['id']}: {badge['emoji']} {badge['title']}")

if __name__ == "__main__":
    main()
