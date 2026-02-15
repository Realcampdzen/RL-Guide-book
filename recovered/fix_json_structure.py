#!/usr/bin/env python3
# -*- coding: utf-8 -*-

import json
import re

def fix_json_structure():
    """Исправляет структуру JSON файла, интегрируя markdown"""
    
    print("Начинаем обработку файла...")
    
    # Читаем исходный файл
    with open('chatbot/perfect_parsed_data1.json', 'r', encoding='utf-8') as f:
        content = f.read()
    
    print(f"Файл прочитан, размер: {len(content)} символов")
    
    # Находим начало JSON данных (первый объект значка)
    json_start = content.find('{\n  "id": "1.1"')
    
    if json_start == -1:
        print("Не удалось найти начало JSON данных")
        return
    
    # Извлекаем markdown контент
    markdown_content = content[:json_start].strip()
    
    # Находим основную JSON структуру в конце файла
    # Ищем последний } который закрывает основную структуру
    last_brace = content.rfind('}')
    if last_brace == -1:
        print("Не удалось найти конец JSON структуры")
        return
    
    # Извлекаем основную JSON структуру
    main_json_content = content[json_start:last_brace + 1]
    
    # Парсим основную структуру
    try:
        main_data = json.loads(main_json_content)
        print(f"Успешно загружена основная структура")
    except json.JSONDecodeError as e:
        print(f"Ошибка парсинга основной структуры: {e}")
        return
    
    # Создаем новую структуру
    new_structure = {
        "metadata": {
            "title": "Путеводитель Реального Лагеря - Полные данные",
            "version": "2.0",
            "lastUpdated": "2024-12-19",
            "description": "Полная база данных всех категорий и значков из Путеводителя Реального Лагеря",
            "sourceFile": "perfect_parsed_data1.json"
        },
        "categoryDescription": {
            "id": "1",
            "title": "КАТЕГОРИЯ 1: ЗА ЛИЧНЫЕ ДОСТИЖЕНИЯ",
            "content": markdown_content,
            "markdownLength": len(markdown_content)
        },
        "badges": main_data if isinstance(main_data, list) else main_data.get('badges', [])
    }
    
    # Добавляем дополнительную информацию, если есть
    if isinstance(main_data, dict):
        if 'additional_materials' in main_data:
            new_structure['additional_materials'] = main_data['additional_materials']
    
    # Сохраняем новый файл
    output_file = 'perfect_parsed_data_integrated.json'
    with open(output_file, 'w', encoding='utf-8') as f:
        json.dump(new_structure, f, ensure_ascii=False, indent=2)
    
    print(f"✅ Файл успешно сохранен как {output_file}")
    
    # Проверяем валидность
    try:
        with open(output_file, 'r', encoding='utf-8') as f:
            data = json.load(f)
        print("✅ Новый файл является валидным JSON")
        print(f"📊 Статистика:")
        print(f"   - Всего значков: {len(data['badges'])}")
        print(f"   - Размер markdown: {len(data['categoryDescription']['content'])} символов")
        print(f"   - Размер файла: {len(json.dumps(data, ensure_ascii=False))} символов")
        
        # Показываем примеры значков
        if data['badges']:
            print(f"   - Первый значок: {data['badges'][0].get('title', 'N/A')}")
            if len(data['badges']) > 1:
                print(f"   - Последний значок: {data['badges'][-1].get('title', 'N/A')}")
                
    except json.JSONDecodeError as e:
        print(f"❌ Ошибка в новом файле: {e}")

if __name__ == "__main__":
    fix_json_structure()
