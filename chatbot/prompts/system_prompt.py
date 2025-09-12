"""
Системный промпт для чат-бота Путеводителя
"""

from .putevoditel_system_prompt_optimized import get_system_prompt_optimized
from pathlib import Path
import json

# Используем оптимизированный системный промпт
SYSTEM_PROMPT = get_system_prompt_optimized()

# Загружаем актуальные факты (адрес, контакты, текущая смена) из файла, если он есть
_FACTS_PATH = Path(__file__).parent / 'facts.json'
try:
    _FACTS = json.loads(_FACTS_PATH.read_text(encoding='utf-8')) if _FACTS_PATH.exists() else None
except Exception:
    _FACTS = None

def get_system_prompt_with_context(
    current_category: str = None,
    current_badge: str = None,
    user_level: str = "beginner",
    user_interests: list = None,
    current_view: str = None,
    current_level: str = None,
    current_level_badge_title: str = None
) -> str:
    """
    Получает системный промпт с дополнительным контекстом
    
    Args:
        current_category: Текущая категория пользователя
        current_badge: Текущий значок пользователя
        user_level: Уровень пользователя
        user_interests: Интересы пользователя
        current_view: Текущий экран приложения
        current_level: Текущий уровень значка
        current_level_badge_title: Название конкретного уровня значка
        
    Returns:
        Системный промпт с контекстом
    """
    context_parts = []
    
    if current_category:
        context_parts.append(f"Пользователь сейчас изучает категорию: {current_category}")
    
    if current_badge:
        context_parts.append(f"Пользователь интересуется значком: {current_badge}")
    
    if user_level:
        context_parts.append(f"Уровень пользователя: {user_level}")
    
    if user_interests:
        context_parts.append(f"Интересы пользователя: {', '.join(user_interests)}")
    
    if current_view:
        view_names = {
            'intro': 'Главная страница',
            'categories': 'Список категорий',
            'category': 'Категория значков',
            'badge': 'Страница значка',
            'badge-level': 'Уровень значка',
            'introduction': 'Введение в путеводитель',
            'additional-material': 'Дополнительные материалы',
            'about-camp': 'Информация о лагере',
            'registration-form': 'Форма регистрации'
        }
        view_name = view_names.get(current_view, current_view)
        context_parts.append(f"Пользователь находится на экране: {view_name}")
    
    if current_level:
        context_parts.append(f"Текущий уровень значка: {current_level}")
    
    if current_level_badge_title:
        context_parts.append(f"Название конкретного уровня значка: {current_level_badge_title}")
    
    # Формируем секцию с актуальными фактами (если доступны)
    facts_section = ""
    if _FACTS:
        facts_lines = []
        addr = _FACTS.get('address') or {}
        contacts = _FACTS.get('contacts') or {}
        season = _FACTS.get('currentSeason') or {}

        # Адрес и маршрут
        if any(addr.get(k) for k in ('campName','base','address','route')):
            facts_lines.append("## Актуальные факты — Адрес и маршрут")
            if addr.get('campName'):
                facts_lines.append(f"- Лагерь: {addr['campName']}")
            if addr.get('base'):
                facts_lines.append(f"- База: {addr['base']}")
            if addr.get('address'):
                facts_lines.append(f"- Адрес: {addr['address']}")
            if addr.get('route'):
                facts_lines.append(f"- Как добраться: {addr['route']}")

        # Контакты
        if contacts:
            facts_lines.append("## Актуальные факты — Контакты")
            for k in ('phone','email','vk','site','telegram','organizer'):
                v = contacts.get(k)
                if v:
                    facts_lines.append(f"- {k}: {v}")

        # Текущая смена
        if any(season.get(k) for k in ('name','dates','price','theme')):
            facts_lines.append("## Актуальные факты — Текущая смена")
            if season.get('name'):
                facts_lines.append(f"- Название: {season['name']}")
            if season.get('dates'):
                facts_lines.append(f"- Даты: {season['dates']}")
            if season.get('price'):
                facts_lines.append(f"- Стоимость: {season['price']}")
            if season.get('theme'):
                facts_lines.append(f"- Тематика: {season['theme']}")

        if facts_lines:
            facts_section = "\n\n" + "\n".join(facts_lines)

    # Формируем секцию контекста экрана/объектов
    context_section = ""
    if context_parts:
        context_section = "\n\n## Текущий контекст:\n" + "\n".join(f"- {part}" for part in context_parts)

    return SYSTEM_PROMPT + facts_section + context_section

    return SYSTEM_PROMPT


def get_badge_explanation_prompt(badge_info: str) -> str:
    """
    Получает промпт для объяснения значка
    
    Args:
        badge_info: Информация о значке
        
    Returns:
        Промпт для объяснения
    """
    return f"""
Объясни этот значок простыми и понятными словами:

{badge_info}

Твое объяснение должно:
- Быть понятным для детей и подростков
- Объяснять ЗАЧЕМ нужен этот навык в жизни
- Давать конкретные примеры применения
- Мотивировать на развитие
- Показывать связь с другими навыками

Используй дружелюбный тон и эмодзи! 🎯
"""


def get_creative_ideas_prompt(badge_info: str, user_context: str = "") -> str:
    """
    Получает промпт для генерации креативных идей
    
    Args:
        badge_info: Информация о значке
        user_context: Контекст пользователя
        
    Returns:
        Промпт для генерации идей
    """
    return f"""
Придумай 3-5 креативных и практических идей для получения этого значка:

{badge_info}

{f"Контекст пользователя: {user_context}" if user_context else ""}

Идеи должны быть:
- Конкретными и выполнимыми
- Интересными и мотивирующими
- Подходящими для лагерной среды
- Учитывающими возраст 8-17 лет
- Связанными с реальной жизнью

Формат: каждая идея с новой строки, начинается с эмодзи и краткого описания.
"""


def get_recommendation_prompt(user_interests: list, user_level: str) -> str:
    """
    Получает промпт для рекомендаций
    
    Args:
        user_interests: Интересы пользователя
        user_level: Уровень пользователя
        
    Returns:
        Промпт для рекомендаций
    """
    return f"""
Пользователь интересуется: {', '.join(user_interests) if user_interests else 'разными направлениями'}
Уровень: {user_level}

Предложи 3-5 подходящих значков с объяснением, почему они подходят именно этому пользователю.

Для каждого значка объясни:
- Что он развивает
- Почему подходит пользователю
- Как начать работу над ним
- Связь с интересами пользователя

Будь конкретной и мотивирующей! 🌟
"""
