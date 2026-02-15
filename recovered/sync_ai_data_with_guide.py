#!/usr/bin/env python3
"""
Скрипт для синхронизации ai-data/ с Путеводителем.txt
Исправляет несоответствия, удаляет выдуманные значки, добавляет недостающие
"""

import json
import os
import re
import shutil
from pathlib import Path
from typing import Dict, List, Any, Tuple

def load_guide_data() -> Dict[str, Any]:
    """Загружает данные из Путеводителя.txt и парсит их"""
    guide_data = {}
    
    with open('Путеводитель.txt', 'r', encoding='utf-8') as f:
        content = f.read()
    
    # Ищем все значки в формате "X.Y.Z. Уровень – emoji «Название»"
    badge_patterns = [
        r'(\d+\.\d+(?:\.\d+)?)\.\s*(?:Базовый уровень|Продвинутый уровень|Экспертный уровень|Значок)?\s*–\s*([^\s]+)\s*«([^»]+)»',
        r'(\d+\.\d+(?:\.\d+)?)\.\s*([^\s]+)\s*«([^»]+)»',
        r'(\d+\.\d+(?:\.\d+)?)\s*Значок\s*([^\s]+)\s*«([^»]+)»'
    ]
    
    for pattern in badge_patterns:
        badges = re.findall(pattern, content)
        for badge_id, emoji, title in badges:
            guide_data[badge_id] = {
                'id': badge_id,
                'title': title,
                'emoji': emoji
            }
    
    # Ищем детальные описания значков
    detailed_pattern = r'(\d+\.\d+(?:\.\d+)?)\s*Значок\s*([^\s]+)\s*«([^»]+)»\s*\n(.*?)(?=\n\d+\.\d+|\n\n|$)'
    detailed_sections = re.findall(detailed_pattern, content, re.DOTALL)
    
    for badge_id, emoji, title, description in detailed_sections:
        if badge_id not in guide_data:
            guide_data[badge_id] = {}
        
        guide_data[badge_id].update({
            'id': badge_id,
            'title': title,
            'emoji': emoji,
            'description': description.strip()
        })
    
    return guide_data

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

def create_backup():
    """Создает резервную копию ai-data/"""
    if Path('ai-data').exists():
        if Path('ai-data-backup').exists():
            shutil.rmtree('ai-data-backup')
        shutil.copytree('ai-data', 'ai-data-backup')
        print("✅ Создана резервная копия ai-data-backup/")

def fix_ai_data(guide_data: Dict[str, Any], ai_data: Dict[str, Any]):
    """Исправляет ai-data на основе данных из Путеводителя"""
    
    # Создаем резервную копию
    create_backup()
    
    # Статистика изменений
    stats = {
        'fixed_titles': 0,
        'fixed_emojis': 0,
        'removed_fake': 0,
        'added_missing': 0
    }
    
    # 1. Исправляем существующие значки
    for badge_id, ai_badge in ai_data.items():
        if badge_id in guide_data:
            guide_badge = guide_data[badge_id]
            
            # Исправляем название
            if ai_badge.get('title') != guide_badge.get('title'):
                print(f"🔧 Исправляем название {badge_id}: '{ai_badge.get('title')}' → '{guide_badge.get('title')}'")
                ai_badge['title'] = guide_badge['title']
                stats['fixed_titles'] += 1
            
            # Исправляем эмодзи
            if ai_badge.get('emoji') != guide_badge.get('emoji'):
                print(f"🔧 Исправляем эмодзи {badge_id}: '{ai_badge.get('emoji')}' → '{guide_badge.get('emoji')}'")
                ai_badge['emoji'] = guide_badge['emoji']
                stats['fixed_emojis'] += 1
    
    # 2. Удаляем выдуманные значки (которых нет в Путеводителе)
    fake_badges = []
    for badge_id, ai_badge in ai_data.items():
        if badge_id not in guide_data:
            fake_badges.append(badge_id)
            print(f"🗑️ Удаляем выдуманный значок {badge_id}: {ai_badge.get('title', 'Unknown')}")
            stats['removed_fake'] += 1
    
    # Удаляем файлы выдуманных значков
    for badge_id in fake_badges:
        ai_badge = ai_data[badge_id]
        category_id = ai_badge.get('categoryId', badge_id.split('.')[0])
        file_path = Path(f'ai-data/category-{category_id}/{badge_id}.json')
        if file_path.exists():
            file_path.unlink()
        del ai_data[badge_id]
    
    # 3. Добавляем недостающие значки (создаем базовую структуру)
    for badge_id, guide_badge in guide_data.items():
        if badge_id not in ai_data:
            print(f"➕ Добавляем недостающий значок {badge_id}: {guide_badge.get('title', 'Unknown')}")
            
            # Создаем базовую структуру
            category_id = badge_id.split('.')[0]
            new_badge = {
                "id": badge_id,
                "title": guide_badge.get('title', ''),
                "emoji": guide_badge.get('emoji', ''),
                "categoryId": category_id,
                "description": guide_badge.get('description', ''),
                "levels": [
                    {
                        "id": badge_id,
                        "level": "Одноуровневый",
                        "title": guide_badge.get('title', ''),
                        "emoji": guide_badge.get('emoji', ''),
                        "criteria": "Критерии будут добавлены из Путеводителя",
                        "confirmation": "Подтверждение будет добавлено из Путеводителя"
                    }
                ],
                "skillTips": "Советы по развитию навыка будут добавлены",
                "importance": "Важность значка будет добавлена"
            }
            
            ai_data[badge_id] = new_badge
            stats['added_missing'] += 1
    
    return stats

def save_ai_data(ai_data: Dict[str, Any]):
    """Сохраняет исправленные данные в ai-data/"""
    
    # Группируем значки по категориям
    categories = {}
    for badge_id, badge_data in ai_data.items():
        category_id = badge_data.get('categoryId', badge_id.split('.')[0])
        if category_id not in categories:
            categories[category_id] = []
        categories[category_id].append(badge_data)
    
    # Создаем директории и сохраняем файлы
    for category_id, badges in categories.items():
        category_dir = Path(f'ai-data/category-{category_id}')
        category_dir.mkdir(parents=True, exist_ok=True)
        
        for badge in badges:
            badge_id = badge['id']
            file_path = category_dir / f'{badge_id}.json'
            
            with open(file_path, 'w', encoding='utf-8') as f:
                json.dump(badge, f, ensure_ascii=False, indent=2)
    
    print(f"✅ Сохранено {len(ai_data)} значков в ai-data/")

def main():
    print("🔄 Синхронизация ai-data/ с Путеводителем.txt...")
    
    # Загружаем данные
    print("📚 Загрузка данных из Путеводителя.txt...")
    guide_data = load_guide_data()
    print(f"✅ Найдено {len(guide_data)} значков в Путеводителе")
    
    print("🤖 Загрузка данных из ai-data/...")
    ai_data = load_ai_data()
    print(f"✅ Найдено {len(ai_data)} значков в ai-data")
    
    # Исправляем ai-data
    print("🔧 Исправление ai-data...")
    stats = fix_ai_data(guide_data, ai_data)
    
    # Сохраняем исправленные данные
    print("💾 Сохранение исправленных данных...")
    save_ai_data(ai_data)
    
    # Выводим статистику
    print("\n" + "="*60)
    print("📊 СТАТИСТИКА ИЗМЕНЕНИЙ")
    print("="*60)
    print(f"🔧 Исправлено названий: {stats['fixed_titles']}")
    print(f"🔧 Исправлено эмодзи: {stats['fixed_emojis']}")
    print(f"🗑️ Удалено выдуманных значков: {stats['removed_fake']}")
    print(f"➕ Добавлено недостающих значков: {stats['added_missing']}")
    print(f"📈 Итого значков в ai-data: {len(ai_data)}")
    
    print("\n✅ Синхронизация завершена!")
    print("📁 Резервная копия сохранена в ai-data-backup/")

if __name__ == "__main__":
    main()
