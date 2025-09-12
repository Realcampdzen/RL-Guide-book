#!/usr/bin/env python3
# -*- coding: utf-8 -*-

import json
import os
import glob
import logging

# Настройка логирования
logging.basicConfig(level=logging.INFO, format='[INFO] %(message)s')
logger = logging.getLogger(__name__)

PERFECT_PARSED_PATH = "perfect_parsed_data.json"
AI_DATA_DIR = "ai-data"

def load_json_file(file_path):
    """Загружает JSON файл."""
    try:
        with open(file_path, 'r', encoding='utf-8') as f:
            return json.load(f)
    except FileNotFoundError:
        logger.error(f"❌ Файл не найден: {file_path}")
        return None
    except json.JSONDecodeError:
        logger.error(f"❌ Ошибка декодирования JSON в файле: {file_path}")
        return None
    except Exception as e:
        logger.error(f"❌ Непредвиденная ошибка при чтении файла {file_path}: {e}")
        return None

def save_json_file(file_path, data):
    """Сохраняет JSON файл."""
    try:
        with open(file_path, 'w', encoding='utf-8') as f:
            json.dump(data, f, ensure_ascii=False, indent=2)
        logger.info(f"📄 Файл {file_path} сохранен")
    except Exception as e:
        logger.error(f"❌ Ошибка при сохранении файла {file_path}: {e}")

def get_badge_id_from_path(file_path):
    """Извлекает ID значка из пути к файлу."""
    return os.path.basename(file_path).replace('.json', '')

def is_main_badge(badge_id):
    """Проверяет, является ли значок основным (не подуровнем)."""
    # Основной значок имеет формат X.Y (например, 7.1, 7.8)
    # Подуровень имеет формат X.Y.Z (например, 7.1.1, 7.8.2)
    parts = badge_id.split('.')
    return len(parts) == 2

def find_badge_in_perfect_parsed(perfect_data, badge_id):
    """Ищет значок в perfect_parsed_data.json."""
    # Ищем в корневом поле "badges"
    if 'badges' in perfect_data:
        for badge in perfect_data['badges']:
            if isinstance(badge, dict) and badge.get('id') == badge_id:
                return badge
    return None

def add_missing_main_badges():
    """
    Добавляет отсутствующие основные значки в perfect_parsed_data.json.
    """
    logger.info("🔄 ДОБАВЛЕНИЕ ОТСУТСТВУЮЩИХ ОСНОВНЫХ ЗНАЧКОВ")
    logger.info("==================================================")
    
    perfect_data = load_json_file(PERFECT_PARSED_PATH)
    if not perfect_data:
        return

    # Получаем все ai-data файлы
    ai_data_files = glob.glob(os.path.join(AI_DATA_DIR, '**', '*.json'), recursive=True)
    ai_data_files = [f for f in ai_data_files if not f.endswith('index.json') and not f.endswith('MASTER_INDEX.json')]
    
    # Фильтруем только основные значки
    main_badge_files = []
    for file_path in ai_data_files:
        badge_id = get_badge_id_from_path(file_path)
        if is_main_badge(badge_id):
            main_badge_files.append((file_path, badge_id))
    
    logger.info(f"📁 Найдено {len(main_badge_files)} основных значков в ai-data")

    added_count = 0
    existing_count = 0

    for file_path, badge_id in main_badge_files:
        ai_data = load_json_file(file_path)
        if not ai_data:
            continue
        
        # Проверяем, есть ли уже такой значок в perfect_parsed_data.json
        existing_badge = find_badge_in_perfect_parsed(perfect_data, badge_id)
        
        if existing_badge:
            logger.info(f"✅ Значок {badge_id} уже существует в perfect_parsed_data.json")
            existing_count += 1
        else:
            # Создаем новый значок на основе ai-data
            new_badge = {
                "id": badge_id,
                "title": ai_data.get("title", ""),
                "emoji": ai_data.get("emoji", ""),
                "category_id": ai_data.get("categoryId", ""),
                "description": ai_data.get("description", ""),
                "importance": ai_data.get("importance", ""),
                "skillTips": ai_data.get("skillTips", ""),
                "examples": ai_data.get("examples", ""),
                "philosophy": ai_data.get("philosophy", ""),
                "howToBecome": ai_data.get("howToBecome", ""),
                "nameExplanation": ai_data.get("nameExplanation", "")
            }
            
            # Добавляем в массив badges
            if 'badges' not in perfect_data:
                perfect_data['badges'] = []
            
            perfect_data['badges'].append(new_badge)
            logger.info(f"➕ Добавлен новый значок {badge_id}: {ai_data.get('title', '')}")
            added_count += 1

    save_json_file(PERFECT_PARSED_PATH, perfect_data)
    
    logger.info(f"\n🎯 РЕЗУЛЬТАТ:")
    logger.info(f"✅ Уже существовало: {existing_count}")
    logger.info(f"➕ Добавлено новых: {added_count}")
    logger.info(f"📊 Всего основных значков: {len(main_badge_files)}")
    
    logger.info("\n📋 СЛЕДУЮЩИЕ ШАГИ:")
    logger.info("1. Проверить отображение в веб-приложении")
    logger.info("2. Убедиться, что все основные значки теперь отображаются")

if __name__ == "__main__":
    add_missing_main_badges()
