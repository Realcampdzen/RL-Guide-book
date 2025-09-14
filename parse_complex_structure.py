#!/usr/bin/env python3
# -*- coding: utf-8 -*-

import json
import re

def parse_complex_structure():
    """Парсит сложную структуру файла с markdown и JSON по категориям"""
    
    print("Начинаем парсинг сложной структуры файла...")
    
    # Читаем исходный файл
    with open('chatbot/perfect_parsed_data1.json', 'r', encoding='utf-8') as f:
        content = f.read()
    
    print(f"Файл прочитан, размер: {len(content)} символов")
    
    # Находим все JSON объекты (они начинаются с { и содержат "id")
    json_objects = []
    markdown_sections = []
    
    # Ищем паттерны JSON объектов
    json_pattern = r'{\s*"id":\s*"[^"]+"'
    json_matches = list(re.finditer(json_pattern, content))
    
    print(f"Найдено {len(json_matches)} потенциальных JSON объектов")
    
    # Разделяем контент на секции
    current_pos = 0
    sections = []
    
    for i, match in enumerate(json_matches):
        start_pos = match.start()
        
        # Добавляем markdown секцию (если есть контент между позициями)
        if start_pos > current_pos:
            markdown_content = content[current_pos:start_pos].strip()
            if markdown_content:
                sections.append({
                    'type': 'markdown',
                    'content': markdown_content,
                    'start': current_pos,
                    'end': start_pos
                })
        
        # Находим конец JSON объекта
        brace_count = 0
        json_start = start_pos
        json_end = start_pos
        
        for j in range(start_pos, len(content)):
            char = content[j]
            if char == '{':
                brace_count += 1
            elif char == '}':
                brace_count -= 1
                if brace_count == 0:
                    json_end = j + 1
                    break
        
        # Извлекаем JSON объект
        json_content = content[json_start:json_end]
        try:
            json_obj = json.loads(json_content)
            sections.append({
                'type': 'json',
                'content': json_obj,
                'start': json_start,
                'end': json_end
            })
            print(f"  - JSON объект {json_obj.get('id', 'unknown')}: {json_obj.get('title', 'no title')}")
        except json.JSONDecodeError as e:
            print(f"  - Ошибка парсинга JSON: {e}")
        
        current_pos = json_end
    
    # Добавляем оставшийся контент как markdown
    if current_pos < len(content):
        remaining_content = content[current_pos:].strip()
        if remaining_content:
            sections.append({
                'type': 'markdown',
                'content': remaining_content,
                'start': current_pos,
                'end': len(content)
            })
    
    print(f"Всего секций: {len(sections)}")
    
    # Группируем по категориям
    categories = []
    current_category = None
    
    for section in sections:
        if section['type'] == 'markdown':
            # Проверяем, является ли это описанием категории
            if 'КАТЕГОРИЯ' in section['content'] and ':' in section['content']:
                # Начинается новая категория
                if current_category:
                    categories.append(current_category)
                
                # Извлекаем номер категории
                category_match = re.search(r'КАТЕГОРИЯ (\d+):', section['content'])
                category_id = category_match.group(1) if category_match else 'unknown'
                
                current_category = {
                    'id': category_id,
                    'description': section['content'],
                    'badges': []
                }
                print(f"Найдена категория {category_id}")
        elif section['type'] == 'json' and current_category:
            # Добавляем значок к текущей категории
            current_category['badges'].append(section['content'])
    
    # Добавляем последнюю категорию
    if current_category:
        categories.append(current_category)
    
    print(f"Обработано категорий: {len(categories)}")
    
    # Создаем итоговую структуру
    final_structure = {
        "metadata": {
            "title": "Путеводитель Реального Лагеря - Полные данные",
            "version": "2.0",
            "lastUpdated": "2024-12-19",
            "description": "Полная база данных всех категорий и значков из Путеводителя Реального Лагеря",
            "totalCategories": len(categories),
            "sourceFile": "perfect_parsed_data1.json"
        },
        "categories": categories
    }
    
    # Подсчитываем общее количество значков
    total_badges = sum(len(cat['badges']) for cat in categories)
    final_structure['metadata']['totalBadges'] = total_badges
    
    # Сохраняем результат
    output_file = 'perfect_parsed_data_structured.json'
    with open(output_file, 'w', encoding='utf-8') as f:
        json.dump(final_structure, f, ensure_ascii=False, indent=2)
    
    print(f"✅ Файл сохранен как {output_file}")
    print(f"📊 Статистика:")
    print(f"   - Категорий: {len(categories)}")
    print(f"   - Всего значков: {total_badges}")
    
    # Показываем статистику по категориям
    for cat in categories:
        print(f"   - Категория {cat['id']}: {len(cat['badges'])} значков")
    
    # Проверяем валидность
    try:
        with open(output_file, 'r', encoding='utf-8') as f:
            json.load(f)
        print("✅ Файл является валидным JSON")
    except json.JSONDecodeError as e:
        print(f"❌ Ошибка в файле: {e}")

if __name__ == "__main__":
    parse_complex_structure()
