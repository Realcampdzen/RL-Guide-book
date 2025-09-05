"""
Системный промпт для чат-бота Путеводителя
"""

from .putevoditel_system_prompt import get_system_prompt

# Используем новый комплексный системный промпт
SYSTEM_PROMPT = get_system_prompt()

def get_system_prompt_with_context(
    current_category: str = None,
    current_badge: str = None,
    user_level: str = "beginner",
    user_interests: list = None
) -> str:
    """
    Получает системный промпт с дополнительным контекстом
    
    Args:
        current_category: Текущая категория пользователя
        current_badge: Текущий значок пользователя
        user_level: Уровень пользователя
        user_interests: Интересы пользователя
        
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
    
    if context_parts:
        context_section = "\n\n## Текущий контекст:\n" + "\n".join(f"- {part}" for part in context_parts)
        return SYSTEM_PROMPT + context_section
    
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
