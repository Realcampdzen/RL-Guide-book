#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Скрипт для проверки и исправления структуры ai-data
Проверяет соответствие данных Путеводителю
"""

import json
import os
import re
from pathlib import Path

def load_guidebook():
    """Загружает Путеводитель и парсит его структуру"""
    guidebook_path = "Путеводитель.txt"
    
    if not os.path.exists(guidebook_path):
        print(f"❌ Файл {guidebook_path} не найден!")
        return None
    
    with open(guidebook_path, 'r', encoding='utf-8') as f:
        content = f.read()
    
    return content

def parse_badge_from_guidebook(content, badge_id):
    """Парсит информацию о значке из Путеводителя"""
    # Ищем секцию значка по ID (например, "1.1 Значок")
    pattern = rf"{badge_id}\s+Значок\s+([^\s]+)\s+«([^»]+)»"
    match = re.search(pattern, content)
    
    if not match:
        return None
    
    emoji = match.group(1)
    title = match.group(2)
    
    # Ищем описание значка
    description_pattern = rf"{badge_id}\s+Значок\s+[^\s]+\s+«[^»]+»\.\s*([^💡\n]+?)(?=\n\n|\n💡|\n\d+\.\d+\.\d+\.|$)"
    desc_match = re.search(description_pattern, content, re.DOTALL)
    description = desc_match.group(1).strip() if desc_match else ""
    
    # Ищем примеры
    examples_pattern = rf"💡\s+Примеры[^:]*:\s*([^1\.\d]+?)(?=\n\d+\.\d+\.\d+\.|$)"
    examples_match = re.search(examples_pattern, content, re.DOTALL)
    examples = examples_match.group(1).strip() if examples_match else ""
    
    # Ищем уровни
    levels = []
    level_pattern = rf"{badge_id}\.(\d+)\s*\.\s*([^–]+)\s*–\s*([^\s]+)\s*«([^»]+)»"
    level_matches = re.finditer(level_pattern, content)
    
    for match in level_matches:
        level_num = match.group(1)
        level_name = match.group(2).strip()
        level_emoji = match.group(3)
        level_title = match.group(4)
        
        levels.append({
            'id': f"{badge_id}.{level_num}",
            'level': level_name,
            'title': level_title,
            'emoji': level_emoji
        })
    
    return {
        'id': badge_id,
        'title': title,
        'emoji': emoji,
        'description': description,
        'examples': examples,
        'levels': levels
    }

def validate_badge_file(file_path, guidebook_content):
    """Проверяет файл значка на соответствие Путеводителю"""
    try:
        with open(file_path, 'r', encoding='utf-8') as f:
            badge_data = json.load(f)
    except Exception as e:
        print(f"❌ Ошибка чтения {file_path}: {e}")
        return False
    
    badge_id = badge_data.get('id', '')
    guidebook_badge = parse_badge_from_guidebook(guidebook_content, badge_id)
    
    if not guidebook_badge:
        print(f"⚠️  Значок {badge_id} не найден в Путеводителе")
        return False
    
    issues = []
    
    # Проверяем название
    if badge_data.get('title') != guidebook_badge['title']:
        issues.append(f"Название: '{badge_data.get('title')}' != '{guidebook_badge['title']}'")
    
    # Проверяем эмодзи
    if badge_data.get('emoji') != guidebook_badge['emoji']:
        issues.append(f"Эмодзи: '{badge_data.get('emoji')}' != '{guidebook_badge['emoji']}'")
    
    # Проверяем описание
    description = badge_data.get('description', '')
    if not description.startswith('Цель:'):
        issues.append("Описание должно начинаться с 'Цель:'")
    
    # Проверяем уровни
    ai_levels = badge_data.get('levels', [])
    guidebook_levels = guidebook_badge['levels']
    
    if len(ai_levels) != len(guidebook_levels):
        issues.append(f"Количество уровней: {len(ai_levels)} != {len(guidebook_levels)}")
    
    for i, (ai_level, guide_level) in enumerate(zip(ai_levels, guidebook_levels)):
        if ai_level.get('title') != guide_level['title']:
            issues.append(f"Уровень {i+1} название: '{ai_level.get('title')}' != '{guide_level['title']}'")
        
        if ai_level.get('emoji') != guide_level['emoji']:
            issues.append(f"Уровень {i+1} эмодзи: '{ai_level.get('emoji')}' != '{guide_level['emoji']}'")
    
    if issues:
        print(f"❌ {badge_id}: {', '.join(issues)}")
        return False
    else:
        print(f"✅ {badge_id}: OK")
        return True

def main():
    """Основная функция"""
    print("🔍 Проверка соответствия ai-data Путеводителю...")
    
    # Загружаем Путеводитель
    guidebook_content = load_guidebook()
    if not guidebook_content:
        return
    
    # Находим все файлы значков
    ai_data_path = Path("ai-data")
    badge_files = list(ai_data_path.glob("category-*/[0-9]*.json"))
    
    print(f"📁 Найдено {len(badge_files)} файлов значков")
    
    valid_count = 0
    total_count = len(badge_files)
    
    for file_path in sorted(badge_files):
        if validate_badge_file(file_path, guidebook_content):
            valid_count += 1
    
    print(f"\n📊 Результаты:")
    print(f"✅ Валидных: {valid_count}/{total_count}")
    print(f"❌ С ошибками: {total_count - valid_count}/{total_count}")
    
    if valid_count == total_count:
        print("🎉 Все значки соответствуют Путеводителю!")
    else:
        print("⚠️  Требуется исправление файлов")

if __name__ == "__main__":
    main()
