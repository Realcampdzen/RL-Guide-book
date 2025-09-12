#!/usr/bin/env python3
# -*- coding: utf-8 -*-

import json
import os
import glob
import logging

# Настройка логирования
logging.basicConfig(level=logging.INFO, format='[INFO] %(message)s')
logger = logging.getLogger(__name__)

def load_json_file(file_path):
    """Загружает JSON файл."""
    try:
        with open(file_path, 'r', encoding='utf-8') as f:
            return json.load(f)
    except Exception as e:
        logger.error(f"❌ Ошибка чтения файла {file_path}: {e}")
        return None

def save_json_file(file_path, data):
    """Сохраняет JSON файл."""
    try:
        with open(file_path, 'w', encoding='utf-8') as f:
            json.dump(data, f, ensure_ascii=False, indent=2)
        logger.info(f"📄 Файл {file_path} сохранен")
    except Exception as e:
        logger.error(f"❌ Ошибка сохранения файла {file_path}: {e}")

def update_perfect_parsed_direct():
    """Обновляет perfect_parsed_data.json напрямую с исправленными данными из ai-data"""
    logger.info("🔄 Прямое обновление perfect_parsed_data.json с исправленными данными")
    
    # Загружаем perfect_parsed_data.json
    perfect_data = load_json_file("perfect_parsed_data.json")
    if not perfect_data:
        return
    
    # Находим все ai-data файлы
    ai_data_files = []
    for category_dir in glob.glob("ai-data/category-*"):
        for file_path in glob.glob(f"{category_dir}/*.json"):
            if not file_path.endswith("index.json") and not file_path.endswith("MASTER_INDEX.json"):
                ai_data_files.append(file_path)
    
    logger.info(f"📁 Найдено {len(ai_data_files)} файлов значков")
    
    updated_count = 0
    
    # Проходим по всем ai-data файлам
    for file_path in ai_data_files:
        badge_id = os.path.basename(file_path).replace('.json', '')
        ai_data = load_json_file(file_path)
        
        if not ai_data:
            continue
        
        # Ищем соответствующий значок в perfect_parsed_data.json
        badge_found = False
        
        # Ищем в корневом поле "badges"
        if 'badges' in perfect_data:
            for badge in perfect_data['badges']:
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
                                logger.info(f"  📝 Обновил {field} для значка {badge_id}")
                    
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
                                            logger.info(f"  📝 Обновил criteria для уровня {ai_level_id}")
                                    
                                    # Обновляем confirmation
                                    if 'confirmation' in ai_level and ai_level['confirmation']:
                                        if perfect_level.get('confirmation') != ai_level['confirmation']:
                                            perfect_level['confirmation'] = ai_level['confirmation']
                                            logger.info(f"  📝 Обновил confirmation для уровня {ai_level_id}")
                                    break
                    
                    updated_count += 1
                    break
        
        if not badge_found:
            logger.warning(f"⚠️ Значок {badge_id} не найден в perfect_parsed_data.json")
    
    # Сохраняем обновленный файл
    save_json_file("perfect_parsed_data.json", perfect_data)
    logger.info(f"✅ Обновлено {updated_count} значков в perfect_parsed_data.json")
    
    return updated_count

if __name__ == "__main__":
    logger.info("🔄 ПРЯМОЕ ОБНОВЛЕНИЕ PERFECT_PARSED_DATA.JSON")
    logger.info("=" * 50)
    
    updated = update_perfect_parsed_direct()
    
    logger.info(f"\n🎯 РЕЗУЛЬТАТ:")
    logger.info(f"✅ Обновлено значков: {updated}")
    logger.info("\n📋 СЛЕДУЮЩИЕ ШАГИ:")
    logger.info("1. Проверить отображение в веб-приложении")
    logger.info("2. При необходимости исправить оставшиеся проблемы вручную")
