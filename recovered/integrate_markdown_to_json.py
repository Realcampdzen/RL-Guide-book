#!/usr/bin/env python3
# -*- coding: utf-8 -*-

import json
import re

def integrate_markdown_to_json():
    """Интегрирует markdown контент в JSON структуру"""
    
    # Читаем исходный файл
    with open('chatbot/perfect_parsed_data1.json', 'r', encoding='utf-8') as f:
        content = f.read()
    
    # Находим начало JSON данных
    json_start = content.find('{\n  "id": "1.1"')
    
    if json_start == -1:
        print("Не удалось найти начало JSON данных")
        return
    
    # Извлекаем markdown контент
    markdown_content = content[:json_start].strip()
    
    # Извлекаем JSON данные
    json_content = content[json_start:]
    
    # Парсим все JSON объекты
    badges_data = []
    
    # Разделяем на отдельные JSON объекты
    brace_count = 0
    current_obj = ""
    in_object = False
    
    for char in json_content:
        if char == '{':
            if not in_object:
                in_object = True
                current_obj = char
            else:
                current_obj += char
            brace_count += 1
        elif char == '}':
            current_obj += char
            brace_count -= 1
            if brace_count == 0 and in_object:
                # Завершили один объект
                try:
                    obj = json.loads(current_obj)
                    badges_data.append(obj)
                except json.JSONDecodeError as e:
                    print(f"Ошибка парсинга объекта: {e}")
                    # Попробуем найти проблемный объект
                    print(f"Проблемный объект (первые 100 символов): {current_obj[:100]}")
                current_obj = ""
                in_object = False
    
    print(f"Успешно загружено {len(badges_data)} значков")
    
    # Создаем новую структуру
    new_structure = {
        "metadata": {
            "title": "Путеводитель Реального Лагеря - Полные данные",
            "version": "2.0",
            "lastUpdated": "2024-12-19",
            "description": "Полная база данных всех категорий и значков из Путеводителя Реального Лагеря",
            "totalBadges": len(badges_data),
            "sourceFile": "perfect_parsed_data1.json"
        },
        "categoryDescription": {
            "id": "1",
            "title": "КАТЕГОРИЯ 1: ЗА ЛИЧНЫЕ ДОСТИЖЕНИЯ",
            "content": markdown_content,
            "markdownLength": len(markdown_content)
        },
        "badges": badges_data
    }
    
    # Сохраняем новый файл
    output_file = 'perfect_parsed_data_integrated.json'
    with open(output_file, 'w', encoding='utf-8') as f:
        json.dump(new_structure, f, ensure_ascii=False, indent=2)
    
    print(f"Файл успешно сохранен как {output_file}")
    
    # Проверяем валидность
    try:
        with open(output_file, 'r', encoding='utf-8') as f:
            data = json.load(f)
        print("✅ Новый файл является валидным JSON")
        print(f"📊 Статистика:")
        print(f"   - Всего значков: {len(data['badges'])}")
        print(f"   - Размер markdown: {len(data['categoryDescription']['content'])} символов")
        print(f"   - Размер файла: {len(json.dumps(data, ensure_ascii=False))} символов")
    except json.JSONDecodeError as e:
        print(f"❌ Ошибка в новом файле: {e}")

if __name__ == "__main__":
    integrate_markdown_to_json()
