#!/usr/bin/env python3
# -*- coding: utf-8 -*-

import json
import os
import glob
import logging
import re

# Настройка логирования
logging.basicConfig(level=logging.INFO, format='[INFO] %(message)s')
logger = logging.getLogger(__name__)

GUIDE_PATH = "Путеводитель.txt"
AI_DATA_DIR = "ai-data"
PERFECT_PARSED_PATH = "perfect_parsed_data.json"

def load_json_file(file_path):
    """Загружает JSON файл."""
    try:
        with open(file_path, 'r', encoding='utf-8') as f:
            return json.load(f)
    except Exception as e:
        logger.error(f"❌ Ошибка при чтении файла {file_path}: {e}")
        return None

def save_json_file(file_path, data):
    """Сохраняет JSON файл."""
    try:
        with open(file_path, 'w', encoding='utf-8') as f:
            json.dump(data, f, ensure_ascii=False, indent=2)
        logger.info(f"📄 Файл {file_path} сохранен")
    except Exception as e:
        logger.error(f"❌ Ошибка при сохранении файла {file_path}: {e}")

def load_guide():
    """Загружает Путеводитель.txt."""
    try:
        with open(GUIDE_PATH, 'r', encoding='utf-8') as f:
            return f.read()
    except Exception as e:
        logger.error(f"❌ Ошибка при чтении {GUIDE_PATH}: {e}")
        return None

def extract_emoji_from_title(title):
    """Извлекает эмодзи из заголовка значка."""
    # Ищем эмодзи в начале заголовка
    emoji_pattern = r'^([^\w\s])'
    match = re.search(emoji_pattern, title)
    if match:
        return match.group(1)
    
    # Ищем эмодзи в середине заголовка (в кавычках)
    emoji_in_quotes = re.search(r'«([^»]*?)([^\w\s])[^»]*»', title)
    if emoji_in_quotes:
        return emoji_in_quotes.group(2)
    
    return None

def find_emoji_in_guide(guide_text, badge_id, title):
    """Ищет эмодзи для значка в Путеводителе."""
    # Ищем строку с номером значка и эмодзи
    patterns = [
        rf"{re.escape(badge_id)}\.?\s*Значок\s*([^\w\s])",
        rf"{re.escape(badge_id)}\.?\s*Значок\s*«[^»]*?([^\w\s])[^»]*»",
        rf"{re.escape(badge_id)}\.?\s*([^\w\s])\s*«[^»]+»",
        rf"{re.escape(badge_id)}\.?\s*([^\w\s])\s*[^«]",
    ]
    
    for pattern in patterns:
        match = re.search(pattern, guide_text)
        if match:
            emoji = match.group(1)
            if len(emoji) <= 2:  # Эмодзи обычно 1-2 символа
                return emoji
    
    # Если не нашли, попробуем извлечь из заголовка
    return extract_emoji_from_title(title)

def find_badge_in_guide_alternative(guide_text, badge_id, title):
    """Альтернативный поиск значка в Путеводителе."""
    # Ищем по номеру значка
    pattern = rf"{re.escape(badge_id)}\.?\s*"
    match = re.search(pattern, guide_text)
    
    if not match:
        return None
    
    start_pos = match.start()
    
    # Ищем конец секции
    next_badge_pattern = r"\n\d+\.\d+\.?\s*"
    next_match = re.search(next_badge_pattern, guide_text[start_pos + 1:])
    
    if next_match:
        end_pos = start_pos + 1 + next_match.start()
    else:
        end_pos = len(guide_text)
    
    badge_section = guide_text[start_pos:end_pos]
    
    # Извлекаем данные
    data = {
        'emoji': '',
        'description': '',
        'importance': '',
        'skillTips': '',
        'examples': '',
        'howToBecome': ''
    }
    
    # Ищем эмодзи
    emoji = find_emoji_in_guide(guide_text, badge_id, title)
    if emoji:
        data['emoji'] = emoji
    
    # Ищем "Цель:"
    goal_match = re.search(r'Цель:\s*([^\n]+(?:\n(?!\n)[^\n]+)*)', badge_section)
    if goal_match:
        data['description'] = f"Цель: {goal_match.group(1).strip()}"
    
    # Ищем "Почему этот значок важен?"
    importance_match = re.search(r'Почему этот значок важен\?\s*\n((?:🔹[^\n]+\n?)+)', badge_section)
    if importance_match:
        data['importance'] = importance_match.group(1).strip()
    
    # Ищем "💡 Как..." (skillTips)
    skill_tips_match = re.search(r'💡\s*([^💡\n]+(?:\n(?!\n)[^💡\n]+)*)', badge_section)
    if skill_tips_match:
        data['skillTips'] = f"💡 {skill_tips_match.group(1).strip()}"
    
    # Ищем "Как закрепить эффект?"
    examples_match = re.search(r'Как закрепить эффект\?\s*\n((?:📌[^\n]+\n?)+)', badge_section)
    if examples_match:
        data['examples'] = examples_match.group(1).strip()
    
    # Ищем "Как получить значок"
    how_to_become_match = re.search(r'Как получить значок[^:]*:\s*\n((?:✅[^\n]+\n?)+)', badge_section)
    if how_to_become_match:
        data['howToBecome'] = how_to_become_match.group(1).strip()
    
    return data

def get_badge_id_from_path(file_path):
    """Извлекает ID значка из пути к файлу."""
    return os.path.basename(file_path).replace('.json', '')

def is_main_badge(badge_id):
    """Проверяет, является ли значок основным (не подуровнем)."""
    parts = badge_id.split('.')
    return len(parts) == 2

def fix_remaining_issues(ai_data, guide_data, badge_id, title):
    """Исправляет оставшиеся проблемы в данных значка."""
    fixed = False
    
    # Исправляем эмодзи
    if not ai_data.get('emoji') and guide_data.get('emoji'):
        ai_data['emoji'] = guide_data['emoji']
        fixed = True
        logger.info(f"  📝 Добавлен эмодзи: {guide_data['emoji']}")
    
    # Исправляем описание
    if not ai_data.get('description') or not ai_data['description'].startswith('Цель:'):
        if guide_data.get('description'):
            ai_data['description'] = guide_data['description']
            fixed = True
            logger.info(f"  📝 Исправлено описание")
    
    # Исправляем важность
    if not ai_data.get('importance') or len(ai_data['importance'].strip()) < 50:
        if guide_data.get('importance'):
            ai_data['importance'] = guide_data['importance']
            fixed = True
            logger.info(f"  📝 Добавлена важность")
    
    # Исправляем советы по навыкам
    if not ai_data.get('skillTips') or len(ai_data['skillTips'].strip()) < 30:
        if guide_data.get('skillTips'):
            ai_data['skillTips'] = guide_data['skillTips']
            fixed = True
            logger.info(f"  📝 Добавлены советы по навыкам")
    
    # Исправляем примеры
    if not ai_data.get('examples') and guide_data.get('examples'):
        ai_data['examples'] = guide_data['examples']
        fixed = True
        logger.info(f"  📝 Добавлены примеры")
    
    # Исправляем как получить
    if not ai_data.get('howToBecome') and guide_data.get('howToBecome'):
        ai_data['howToBecome'] = guide_data['howToBecome']
        fixed = True
        logger.info(f"  📝 Добавлено 'Как получить'")
    
    return fixed

def advanced_fix_remaining_issues():
    """
    Продвинутое исправление оставшихся проблем.
    """
    logger.info("🔧 ПРОДВИНУТОЕ ИСПРАВЛЕНИЕ ОСТАВШИХСЯ ПРОБЛЕМ")
    logger.info("===============================================")
    
    # Загружаем Путеводитель
    guide_text = load_guide()
    if not guide_text:
        return
    
    logger.info("📖 Путеводитель.txt загружен")
    
    # Получаем все ai-data файлы
    ai_data_files = glob.glob(os.path.join(AI_DATA_DIR, '**', '*.json'), recursive=True)
    ai_data_files = [f for f in ai_data_files if not f.endswith('index.json') and not f.endswith('MASTER_INDEX.json')]
    
    # Фильтруем только основные значки
    main_badge_files = []
    for file_path in ai_data_files:
        badge_id = get_badge_id_from_path(file_path)
        if is_main_badge(badge_id):
            main_badge_files.append((file_path, badge_id))
    
    logger.info(f"📁 Найдено {len(main_badge_files)} основных значков для обработки")
    
    fixed_count = 0
    total_fixes = 0
    
    for file_path, badge_id in main_badge_files:
        ai_data = load_json_file(file_path)
        if not ai_data:
            continue
        
        title = ai_data.get('title', 'Без названия')
        logger.info(f"\n🔍 Обрабатываю значок {badge_id}: {title}")
        
        # Пробуем найти данные в Путеводителе альтернативным способом
        guide_data = find_badge_in_guide_alternative(guide_text, badge_id, title)
        
        if not guide_data:
            logger.warning(f"  ⚠️ Данные для значка {badge_id} не найдены в Путеводителе")
            continue
        
        # Исправляем данные
        if fix_remaining_issues(ai_data, guide_data, badge_id, title):
            fixed_count += 1
            total_fixes += 1
            
            # Сохраняем исправленный файл
            save_json_file(file_path, ai_data)
        else:
            logger.info(f"  ✅ Значок {badge_id} уже в порядке")
    
    logger.info(f"\n🎯 РЕЗУЛЬТАТ ИСПРАВЛЕНИЯ:")
    logger.info(f"✅ Исправлено значков: {fixed_count}")
    logger.info(f"📝 Всего исправлений: {total_fixes}")
    
    # Обновляем perfect_parsed_data.json
    logger.info(f"\n🔄 Обновляю perfect_parsed_data.json...")
    update_perfect_parsed_data()
    
    logger.info(f"\n📋 СЛЕДУЮЩИЕ ШАГИ:")
    logger.info("1. Проверить отображение в веб-приложении")
    logger.info("2. Запустить финальную проверку качества")

def update_perfect_parsed_data():
    """Обновляет perfect_parsed_data.json с исправленными данными."""
    perfect_data = load_json_file(PERFECT_PARSED_PATH)
    if not perfect_data:
        return
    
    ai_data_files = glob.glob(os.path.join(AI_DATA_DIR, '**', '*.json'), recursive=True)
    ai_data_files = [f for f in ai_data_files if not f.endswith('index.json') and not f.endswith('MASTER_INDEX.json')]
    
    updated_count = 0
    
    for file_path in ai_data_files:
        badge_id = get_badge_id_from_path(file_path)
        if not is_main_badge(badge_id):
            continue
            
        ai_data = load_json_file(file_path)
        if not ai_data:
            continue
        
        # Ищем соответствующий значок в perfect_parsed_data.json
        if 'badges' in perfect_data:
            for badge in perfect_data['badges']:
                if isinstance(badge, dict) and badge.get('id') == badge_id:
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
                    
                    updated_count += 1
                    break
    
    save_json_file(PERFECT_PARSED_PATH, perfect_data)
    logger.info(f"✅ Обновлено {updated_count} значков в perfect_parsed_data.json")

if __name__ == "__main__":
    advanced_fix_remaining_issues()
