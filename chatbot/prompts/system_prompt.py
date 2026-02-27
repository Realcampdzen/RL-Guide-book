"""
Системный промпт для чат-бота Путеводителя
"""

from typing import Optional
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

# Читаемые названия ролей для системного промпта (персонализация ответов)
ROLE_LABELS = {
    'participant': 'Участник смены',
    'parent': 'Родитель',
    'counselor': 'Вожатый',
    'shift_leader': 'Руководитель смены (Старший Вожатый)',
    'organizer': 'Организатор',
    'developer': 'Разработчик',
}

def get_system_prompt_with_context(
    current_category: str = None,
    current_badge: str = None,
    user_level: str = "beginner",
    user_interests: list = None,
    current_view: str = None,
    current_level: str = None,
    current_level_badge_title: str = None,
    user_role: Optional[str] = None,
    nickname: Optional[str] = None,
    squad_name: Optional[str] = None,
    shift_name: Optional[str] = None,
    pending_badge_count: Optional[int] = None,
    pending_badge_titles: Optional[list] = None,
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
        user_role: Роль пользователя из JWT (participant, parent, counselor, shift_leader, organizer, developer)
        nickname: Никнейм участника (из JWT / membership)
        squad_name: Название отряда (из membership lookup)
        shift_name: Название смены (из membership lookup)
        
    Returns:
        Системный промпт с контекстом
    """
    context_parts = []
    
    if user_role:
        role_label = ROLE_LABELS.get(user_role) or user_role or 'Участник смены'
        context_parts.append(f"Роль пользователя: {role_label}")
    
    if nickname:
        context_parts.append(f"Никнейм пользователя: {nickname}")
    
    if squad_name:
        context_parts.append(f"Отряд пользователя: {squad_name}")
    
    if shift_name:
        context_parts.append(f"Смена: {shift_name}")
    
    if pending_badge_count and pending_badge_count > 0:
        titles_str = ", ".join(str(t) for t in (pending_badge_titles or []))
        context_parts.append(
            f"У пользователя есть заявки на проверке ({pending_badge_count} шт.): {titles_str}. "
            "Если спрашивает про статус — скажи что вожатый рассматривает."
        )
    
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
            'profile': 'Личный кабинет',
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
        if user_role:
            context_section += "\n\nАдаптируй тон и содержание ответа под роль: для вожатого или организатора можно упоминать методику, заявки, смены; для родителя — прогресс ребёнка и поддержку; для участника — значки и мотивацию."
        if nickname or squad_name:
            context_section += "\nОбращайся к пользователю по нику если он указан. Упоминай название отряда когда это уместно."

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
