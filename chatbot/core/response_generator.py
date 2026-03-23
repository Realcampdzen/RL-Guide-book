"""
Генератор персонализированных ответов
"""
from typing import List
from datetime import datetime

from models.conversation import Message, UserContext, ChatResponse
from models.badge import Badge
from core.openai_client import OpenAIClient
from core.data_loader import DataLoader
from core.context_manager import ContextManager
from prompts.system_prompt import (
    get_system_prompt_with_context,
    get_badge_explanation_prompt,
    get_creative_ideas_prompt
)


class ResponseGenerator:
    """Генератор ответов чат-бота"""
    
    def __init__(
        self,
        openai_client: OpenAIClient,
        data_loader: DataLoader,
        context_manager: ContextManager
    ):
        """
        Инициализация генератора ответов
        
        Args:
            openai_client: Клиент OpenAI
            data_loader: Загрузчик данных
            context_manager: Менеджер контекста
        """
        self.openai_client = openai_client
        self.data_loader = data_loader
        self.context_manager = context_manager

    def _prompt_kwargs(self, context: UserContext) -> dict:
        """Extracts common kwargs for get_system_prompt_with_context from session_data."""
        sd = context.session_data
        return dict(
            user_level=context.level,
            user_interests=context.interests,
            current_view=sd.get('current_view'),
            current_level=sd.get('current_level'),
            current_level_badge_title=sd.get('current_level_badge_title'),
            user_role=sd.get('user_role'),
            nickname=sd.get('nickname'),
            squad_name=sd.get('squad_name'),
            shift_name=sd.get('shift_name'),
            pending_badge_count=sd.get('pending_badge_count'),
            pending_badge_titles=sd.get('pending_badge_titles'),
            cabinet_section=sd.get('cabinet_section'),
            cabinet_section_label=sd.get('cabinet_section_label'),
            cabinet_tab=sd.get('cabinet_tab'),
            cabinet_tab_label=sd.get('cabinet_tab_label'),
        )
    
    def generate_response(
        self,
        user_message: str,
        user_id: str,
        conversation_history: List[Message]
    ) -> ChatResponse:
        """
        Генерирует ответ на сообщение пользователя
        
        Args:
            user_message: Сообщение пользователя
            user_id: ID пользователя
            conversation_history: История диалога
            
        Returns:
            Ответ бота
        """
        # Получаем текущий контекст (включая веб-контекст)
        user_context = self.context_manager.get_user_context(user_id)
        
        # Дополняем контекст на основе сообщения (не перезаписываем веб-контекст)
        self.context_manager.detect_context_from_message(user_id, user_message)
        
        # Получаем обновленный контекст после анализа сообщения
        user_context = self.context_manager.get_user_context(user_id)
        
        # Определяем тип запроса
        request_type = self._analyze_request_type(user_message, user_context)
        
        # Генерируем ответ в зависимости от типа запроса
        if request_type == "badge_plan":
            response = self._generate_badge_plan(user_message)
        elif request_type == "badge_explanation":
            response = self._generate_badge_explanation(user_message, user_context)
        elif request_type == "badge_level_explanation":
            response = self._generate_badge_level_explanation(user_message, user_context)
        elif request_type == "badge_levels_explanation":
            response = self._generate_badge_levels_explanation(user_message, user_context)
        elif request_type == "creative_ideas":
            response = self._generate_creative_ideas(user_message, user_context)
        elif request_type == "recommendations":
            response = self._generate_recommendations(user_message, user_context)
        elif request_type == "category_info":
            response = self._generate_category_info(user_message, user_context)
        elif request_type == "philosophy":
            response = self._generate_philosophy_explanation(user_message, user_context)
        elif request_type == "where_am_i":
            response = self._generate_where_am_i(user_context)
        else:
            response = self._generate_general_response(user_message, user_context, conversation_history)
        
        # Очищаем ответ от markdown форматирования
        response = self._clean_markdown(response)
        # Постобработка для соблюдения стиля (эмодзи, аккуратные переносы, мягкое ограничение длины)
        response = self._postprocess_response(response)
        
        # Генерируем предложения для дальнейшего общения
        suggestions = self._generate_suggestions(user_context)
        
        return ChatResponse(
            response=response,
            suggestions=suggestions,
            context_updates=user_context,
            metadata={
                "request_type": request_type,
                "timestamp": datetime.now().isoformat()
            }
        )
    
    def _analyze_request_type(self, message: str, context: UserContext) -> str:
        """Анализирует тип запроса пользователя с учетом контекста экрана"""
        # Запрос на генерацию плана получения значка (из модалки «Составить план») — полный промпт уже в message
        if (("Задача: составить персонализированный план" in message or "составить персонализированный план получения значка" in message.lower() or "персонализированный план получения значка" in message.lower()) and "ЗНАЧОК:" in message and "ФОРМАТ ОТВЕТА" in message):
            return "badge_plan"

        message_lower = message.lower()
        current_view = context.session_data.get('current_view', '')
        current_level = context.session_data.get('current_level', '')

        # Запросы вида "где я нахожусь?", "что за экран?"
        where_triggers = [
            "где я", "где нахожусь", "где это я", "какой это экран",
            "что за экран", "что за страница", "на каком экране",
            "на какой странице", "где сейчас нахожусь", "что это за страница"
        ]
        if any(tr in message_lower for tr in where_triggers):
            return "where_am_i"

        
        # Анализ в зависимости от текущего экрана
        if current_view == 'badge-level' and current_level:
            # На экране уровня значка - фокус на конкретном уровне
            if any(word in message_lower for word in [
                "что это за значок", "что за значок", "объясни", "расскажи", "что такое",
                "как получить", "критерии", "подтверждение", "что нужно", "что это"
            ]):
                return "badge_level_explanation"
            elif any(word in message_lower for word in ["идеи", "примеры", "варианты"]):
                return "creative_ideas"
        
        elif current_view == 'badge':
            # На экране значка - фокус на значке
            if any(word in message_lower for word in [
                "что это за значок", "что за значок", "объясни", "расскажи", "что такое",
                "как получить", "что это"
            ]):
                return "badge_explanation"
            elif any(word in message_lower for word in ["идеи", "примеры", "варианты"]):
                return "creative_ideas"
            elif any(word in message_lower for word in ["уровни", "ступени", "базовый", "продвинутый", "экспертный"]):
                return "badge_levels_explanation"
        
        elif current_view == 'category':
            # На экране категории - фокус на категории
            if any(word in message_lower for word in ["объясни", "расскажи", "что такое"]):
                return "category_info"
            elif any(word in message_lower for word in ["рекомендуй", "посоветуй", "что выбрать"]):
                return "recommendations"
            elif any(word in message_lower for word in ["философия", "зачем", "почему", "смысл"]):
                return "philosophy"
        
        elif current_view == 'intro':
            # На главной странице - философия значков
            if any(word in message_lower for word in ["где я", "что это", "философия", "принципы", "зачем", "почему", "смысл", "награды", "награда", "нарады", "медали", "медаль", "ачивки", "ачивка"]):
                return "philosophy"
            elif any(word in message_lower for word in ["категории", "значки", "сколько", "список"]):
                return "category_info"
        
        elif current_view == 'introduction':
            # На экране введения - общая информация
            if any(word in message_lower for word in ["подробнее", "больше", "расскажи"]):
                return "category_info"
        
        elif current_view == 'profile':
            # На экране Личный кабинет — вопросы про прогресс, рефлексию, подтверждение уровней
            if any(word in message_lower for word in ["мой путь", "достижения", "рефлексия", "подтвердить уровень", "как отметить", "что здесь", "что могу"]):
                return "general"
        
        # Общие ключевые слова для всех экранов
        if any(word in message_lower for word in [
            "что это за значок", "что за значок", "объясни", "расскажи", "что такое", "как получить", "что это"
        ]):
            if context.current_badge:
                return "badge_explanation"
            elif context.current_category:
                return "category_info"
        
        if any(word in message_lower for word in ["идеи", "как сделать", "примеры", "варианты"]):
            return "creative_ideas"
        
        if any(word in message_lower for word in ["рекомендуй", "посоветуй", "что выбрать", "подходящий"]):
            return "recommendations"
        
        if any(word in message_lower for word in ["философия", "зачем", "почему", "смысл"]):
            return "philosophy"
        
        # Специальная обработка для вопросов про ИИ
        if any(word in message_lower for word in ["ии", "искусственный интеллект", "нейросети", "нейро", "ai"]):
            return "general"
        
        return "general"

    def _generate_where_am_i(self, context: UserContext) -> str:
        """Отвечает, где пользователь находится, по данным веб-контекста."""
        from prompts.system_prompt import CABINET_SECTION_DESCRIPTIONS
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
        current_view = context.session_data.get('current_view') or 'chat'
        view_human = view_names.get(current_view, current_view)

        parts = [f"Сейчас ты на экране: {view_human}."]

        # Контекст Личного кабинета (раздел + таб)
        cab_section = context.session_data.get('cabinet_section')
        cab_section_label = context.session_data.get('cabinet_section_label')
        cab_tab_label = context.session_data.get('cabinet_tab_label')
        if cab_section:
            loc = cab_section_label or cab_section
            if cab_tab_label:
                loc += f" → {cab_tab_label}"
            parts.append(f"Раздел кабинета: {loc}.")
            desc = CABINET_SECTION_DESCRIPTIONS.get(cab_section)
            if desc:
                parts.append(f"Это {desc}.")
        else:
            if context.current_category:
                cat = self.data_loader.get_category(context.current_category)
                if cat:
                    parts.append(f"Категория: {cat.emoji} {cat.title}.")

            if context.current_badge:
                badge = self.data_loader.get_badge(context.current_badge)
                if badge:
                    parts.append(f"Значок: {badge.emoji} {badge.title}.")

            cur_level = context.session_data.get('current_level')
            cur_level_title = context.session_data.get('current_level_badge_title')
            if cur_level:
                lvl_line = f"Уровень: {cur_level}"
                if cur_level_title:
                    lvl_line += f" — {cur_level_title}"
                parts.append(lvl_line + ".")

        # Дружелюбная подсказка по действиям
        tips = []
        if current_view in ('intro', 'about-camp'):
            tips.append("Могу кратко рассказать о системе значков или показать категории.")
        if context.current_category and current_view in ('category', 'categories'):
            tips.append("Могу объяснить философию категории или предложить подходящие значки.")
        if context.current_badge and current_view in ('badge', 'badge-level'):
            tips.append("Могу объяснить значок, уровни или предложить идеи, как его получить.")
        if current_view == 'registration-form':
            tips.append("Могу помочь заполнить важные поля анкеты.")
        if current_view == 'profile' and not cab_section:
            tips.append("Могу подсказать про прогресс, Мой путь, рефлексию и подтверждение уровней.")
        if cab_section:
            tips.append("Спроси меня, что делать в этом разделе, и я подскажу!")

        if tips:
            parts.append("Подсказка: " + " ".join(tips))

        return "\n".join(parts)
    
    def _generate_badge_explanation(self, message: str, context: UserContext) -> str:
        """Генерирует объяснение значка"""
        if not context.current_badge:
            return "Сначала выбери конкретный значок на экране — и я кратко объясню его смысл и как его получить 😊"
        
        badge = self.data_loader.get_badge(context.current_badge)
        if not badge and context.current_badge and context.current_badge.count('.') >= 2:
            base_id = '.'.join(context.current_badge.split('.')[:2])
            badge = self.data_loader.get_badge(base_id)
        if not badge:
            # Фоллбек по названию из веб-контекста
            web_badge = context.session_data.get('web_badge') or {}
            title = (web_badge.get('title') or '').strip()
            if title:
                for b in self.data_loader.get_all_badges():
                    if b.title.strip().lower() == title.lower():
                        badge = b
                        break
        if not badge:
            return "Не нашла такой значок. Попробуй выбрать его из списка значков на экране."
        
        # Формируем информацию о значке
        badge_info = self._format_badge_info(badge)
        
        # Генерируем объяснение
        prompt = get_badge_explanation_prompt(badge_info)
        
        sys_prompt = get_system_prompt_with_context(
            current_badge=badge.title,
            user_level=context.level,
            user_interests=context.interests,
            current_view=context.session_data.get('current_view'),
            current_level=context.session_data.get('current_level'),
            current_level_badge_title=context.session_data.get('current_level_badge_title'),
            user_role=context.session_data.get('user_role'),
            nickname=context.session_data.get('nickname'),
            squad_name=context.session_data.get('squad_name'),
            shift_name=context.session_data.get('shift_name'),
            pending_badge_count=context.session_data.get('pending_badge_count'),
            pending_badge_titles=context.session_data.get('pending_badge_titles'),
        )
        return self.openai_client.generate_response(
            messages=[Message(role="user", content=prompt, metadata={})],
            system_prompt=sys_prompt,
            user_context=context,
            max_tokens=800,
            temperature=0.65
        )
    
    def _generate_creative_ideas(self, message: str, context: UserContext) -> str:
        """Генерирует креативные идеи"""
        if not context.current_badge:
            return "Чтобы предложить идеи, выбери конкретный значок — и я подкину 3–5 подходящих вариантов! 💡"
        
        badge = self.data_loader.get_badge(context.current_badge)
        if not badge and context.current_badge and context.current_badge.count('.') >= 2:
            base_id = '.'.join(context.current_badge.split('.')[:2])
            badge = self.data_loader.get_badge(base_id)
        if not badge:
            web_badge = context.session_data.get('web_badge') or {}
            title = (web_badge.get('title') or '').strip()
            if title:
                for b in self.data_loader.get_all_badges():
                    if b.title.strip().lower() == title.lower():
                        badge = b
                        break
        if not badge:
            return "Не нашла такой значок. Выбери его из списка, и я подскажу идеи."
        
        # Формируем информацию о значке
        badge_info = self._format_badge_info(badge)
        user_context_str = f"Интересы: {', '.join(context.interests)}, Уровень: {context.level}"
        
        # Генерируем идеи
        prompt = get_creative_ideas_prompt(badge_info, user_context_str)
        
        sys_prompt = get_system_prompt_with_context(
            current_badge=badge.title,
            user_level=context.level,
            user_interests=context.interests,
            current_view=context.session_data.get('current_view'),
            current_level=context.session_data.get('current_level'),
            current_level_badge_title=context.session_data.get('current_level_badge_title'),
            user_role=context.session_data.get('user_role'),
            nickname=context.session_data.get('nickname'),
            squad_name=context.session_data.get('squad_name'),
            shift_name=context.session_data.get('shift_name'),
            pending_badge_count=context.session_data.get('pending_badge_count'),
            pending_badge_titles=context.session_data.get('pending_badge_titles'),
        )
        return self.openai_client.generate_response(
            messages=[Message(role="user", content=prompt, metadata={})],
            system_prompt=sys_prompt,
            user_context=context,
            max_tokens=700,
            temperature=0.75
        )

    def _generate_badge_plan(self, message: str) -> str:
        """Генерация плана получения значка: message уже содержит полный промпт с контекстом значка и форматом ответа."""
        system = (
            "Ты — НейроВалюша, ИИ-проводник Реального Лагеря. "
            "Твоя задача — строго следовать инструкции в сообщении пользователя и вернуть ответ в указанном формате (описание + список шагов). "
            "Не отвечай заглушками и не проси выбрать значок — вся информация о значке уже в сообщении."
        )
        return self.openai_client.generate_response(
            messages=[Message(role="user", content=message, metadata={})],
            system_prompt=system,
            user_context=UserContext(user_id="badge_plan", session_data={}),
            max_tokens=2400,
            temperature=0.6
        )
    
    def _generate_badge_level_explanation(self, message: str, context: UserContext) -> str:
        """Генерирует объяснение конкретного уровня значка"""
        if not context.current_badge:
            return "Сначала выбери значок — тогда расскажу про уровни и критерии."
        
        badge = self.data_loader.get_badge(context.current_badge)
        if not badge and context.current_badge and context.current_badge.count('.') >= 2:
            base_id = '.'.join(context.current_badge.split('.')[:2])
            badge = self.data_loader.get_badge(base_id)
        if not badge:
            web_badge = context.session_data.get('web_badge') or {}
            title = (web_badge.get('title') or '').strip()
            if title:
                for b in self.data_loader.get_all_badges():
                    if b.title.strip().lower() == title.lower():
                        badge = b
                        break
        if not badge:
            return "Похоже, такого значка нет. Выбери его из списка на экране."
        
        current_level = context.session_data.get('current_level', '')
        if not current_level:
            return "Выбери конкретный уровень значка — и я объясню, что нужно для него."
        
        # Ищем информацию о конкретном уровне
        level_info = None
        for level in badge.levels:
            if level.level == current_level:
                level_info = level
                break
        
        if not level_info:
            return f"Не удалось найти уровень ‘{current_level}’ у значка ‘{badge.title}’. Выбери доступный уровень на экране."
        
        # Используем AI для генерации объяснения уровня
        level_badge_title = context.session_data.get('current_level_badge_title') or level_info.title
        prompt = f"Объясни значок '{level_badge_title}' ({current_level} уровень). Критерии: {level_info.criteria}. Способы подтверждения: {level_info.confirmation}"
        sys_prompt = get_system_prompt_with_context(
            current_badge=level_badge_title,
            user_level=context.level,
            user_interests=context.interests,
            current_view=context.session_data.get('current_view') or '',
            current_level=context.session_data.get('current_level'),
            current_level_badge_title=context.session_data.get('current_level_badge_title') or '',
            user_role=context.session_data.get('user_role'),
            nickname=context.session_data.get('nickname'),
            squad_name=context.session_data.get('squad_name'),
            shift_name=context.session_data.get('shift_name'),
            pending_badge_count=context.session_data.get('pending_badge_count'),
            pending_badge_titles=context.session_data.get('pending_badge_titles'),
        )
        return self.openai_client.generate_response(
            messages=[Message(role="user", content=prompt, metadata={})],
            system_prompt=sys_prompt,
            user_context=context,
            max_tokens=800,
            temperature=0.65
        )
    
    def _generate_badge_levels_explanation(self, message: str, context: UserContext) -> str:
        """Генерирует объяснение всех уровней значка"""
        if not context.current_badge:
            return "Чтобы показать уровни — выбери значок."
        
        badge = self.data_loader.get_badge(context.current_badge)
        if not badge and context.current_badge and context.current_badge.count('.') >= 2:
            base_id = '.'.join(context.current_badge.split('.')[:2])
            badge = self.data_loader.get_badge(base_id)
        if not badge:
            web_badge = context.session_data.get('web_badge') or {}
            title = (web_badge.get('title') or '').strip()
            if title:
                for b in self.data_loader.get_all_badges():
                    if b.title.strip().lower() == title.lower():
                        badge = b
                        break
        if not badge:
            return "Не нашла такой значок. Выбери его в списке — и покажу уровни."
        
        if not badge.levels:
            return f"У значка {badge.title} уровней нет — он безуровневый."
        
        # Используем AI для генерации объяснения всех уровней
        levels_data = []
        for level in badge.levels:
            levels_data.append({
                "level": level.level,
                "title": level.title,
                "emoji": level.emoji,
                "criteria": level.criteria,
                "confirmation": level.confirmation
            })
        
        # Формируем промпт с информацией о всех уровнях
        levels_text = ""
        for level in levels_data:
            levels_text += f"\n{level['level']} уровень: {level['emoji']} {level['title']}\nКритерии: {level['criteria']}\nПодтверждение: {level['confirmation']}\n"
        
        prompt = f"Объясни все уровни значка '{badge.emoji} {badge.title}':{levels_text}"
        sys_prompt = get_system_prompt_with_context(
            current_badge=badge.title,
            user_level=context.level,
            user_interests=context.interests,
            current_view=context.session_data.get('current_view') or '',
            current_level=context.session_data.get('current_level'),
            current_level_badge_title=context.session_data.get('current_level_badge_title') or '',
            user_role=context.session_data.get('user_role'),
            nickname=context.session_data.get('nickname'),
            squad_name=context.session_data.get('squad_name'),
            shift_name=context.session_data.get('shift_name'),
            pending_badge_count=context.session_data.get('pending_badge_count'),
            pending_badge_titles=context.session_data.get('pending_badge_titles'),
        )
        return self.openai_client.generate_response(
            messages=[Message(role="user", content=prompt, metadata={})],
            system_prompt=sys_prompt,
            user_context=context,
            max_tokens=900,
            temperature=0.65
        )
    
    def _generate_recommendations(self, message: str, context: UserContext) -> str:
        """Генерирует рекомендации значков"""
        # Получаем персонализированные рекомендации
        recommendations = self.context_manager.get_personalized_recommendations(context.user_id, limit=5)
        
        if not recommendations:
            return self.openai_client.generate_response(
                messages=[Message(role="user", content="Пользователь просит рекомендации, но у нас нет данных для персонализации", metadata={})],
                system_prompt=get_system_prompt_with_context(
                    user_level=context.level,
                    user_interests=context.interests,
                    current_view=context.session_data.get('current_view', ''),
                    current_level=context.session_data.get('current_level', ''),
                    current_level_badge_title=context.session_data.get('current_level_badge_title', ''),
                    user_role=context.session_data.get('user_role'),
                    nickname=context.session_data.get('nickname'),
                    squad_name=context.session_data.get('squad_name'),
                    shift_name=context.session_data.get('shift_name'),
                )
            )
        
        # Используем AI для генерации персонализированных рекомендаций
        recommendations_data = []
        for rec in recommendations[:5]:
            badge = rec["badge"]
            recommendations_data.append({
                "title": badge.title,
                "emoji": badge.emoji,
                "description": badge.description,
                "reason": rec["reason"]
            })
        
        # Формируем промпт с рекомендациями
        recommendations_text = ""
        for rec in recommendations_data:
            recommendations_text += f"\n{rec['emoji']} {rec['title']}: {rec['description']}\nПричина рекомендации: {rec['reason']}\n"
        
        prompt = f"Дай персонализированные рекомендации значков на основе интересов пользователя:{recommendations_text}"
        return self.openai_client.generate_response(
            messages=[Message(role="user", content=prompt, metadata={})],
            system_prompt=get_system_prompt_with_context(
                user_level=context.level,
                user_interests=context.interests,
                current_view=context.session_data.get('current_view') or '',
                current_level=context.session_data.get('current_level'),
                current_level_badge_title=context.session_data.get('current_level_badge_title') or '',
                user_role=context.session_data.get('user_role'),
                nickname=context.session_data.get('nickname'),
                squad_name=context.session_data.get('squad_name'),
                shift_name=context.session_data.get('shift_name'),
            )
        )
    
    def _generate_category_info(self, message: str, context: UserContext) -> str:
        """Генерирует краткую информацию о категории"""
        if not context.current_category:
            return "Выбери категорию на экране — и я кратко объясню её философию и содержание."
        
        category = self.data_loader.get_category(context.current_category)
        if not category:
            return "Похоже, такая категория отсутствует. Выбери её из списка."
        
        # Используем AI для генерации ответа о категории
        # Если нет введения, формируем контекст из данных значков категории
        if category.introduction:
            cat_context = category.introduction
        else:
            badges = category.badges or []
            sample = badges[:5]
            items = "\n".join([f"- {b.emoji} {b.title}: {b.description[:140]}" for b in sample])
            cat_context = (
                f"В категории {category.title} всего значков: {len(badges)}. "
                f"Примеры значков:\n{items}\n"
            )
        prompt = f"Объясни категорию '{category.emoji} {category.title}': {cat_context}"
        sys_prompt = get_system_prompt_with_context(
            current_category=category.id,
            user_level=context.level,
            user_interests=context.interests,
            current_view=context.session_data.get('current_view') or '',
            current_level=context.session_data.get('current_level'),
            current_level_badge_title=context.session_data.get('current_level_badge_title') or '',
            user_role=context.session_data.get('user_role'),
            nickname=context.session_data.get('nickname'),
            squad_name=context.session_data.get('squad_name'),
            shift_name=context.session_data.get('shift_name'),
            pending_badge_count=context.session_data.get('pending_badge_count'),
            pending_badge_titles=context.session_data.get('pending_badge_titles'),
        )
        return self.openai_client.generate_response(
            messages=[Message(role="user", content=prompt, metadata={})],
            system_prompt=sys_prompt,
            user_context=context,
            max_tokens=700,
            temperature=0.65
        )
    
    def _generate_philosophy_explanation(self, message: str, context: UserContext) -> str:
        """Генерирует объяснение философии"""
        current_view = context.session_data.get('current_view', '')
        
        if current_view == 'intro':
            # На главной странице - используем AI для ответа на философские вопросы
            return self.openai_client.explain_philosophy(
                "intro",
                "философия системы значков Реального Лагеря",
                context
            )
        
        elif context.current_category:
            category = self.data_loader.get_category(context.current_category)
            if category:
                return self.openai_client.explain_philosophy(
                    category.id,
                    category.introduction or category.title,
                    context
                )
        
        # Общая философия системы значков
        return """
🌟 **Философия системы значков "Реального Лагеря"**

Значки здесь — не награды, а **маршруты развития**! 🗺️

Каждый значок — это не медаль за прошлое, а **маяк, освещающий направления твоего развития**. 

**Главные принципы:**
• 🎯 **Опыт важнее награды** - главная ценность в навыках, которые ты развиваешь
• 🧭 **Ты выбираешь свой путь** - значки помогают найти направление, но выбор за тобой
• 🌱 **Развитие через практику** - навыки развиваются только через реальное применение
• 🤝 **Помощь другим** - обучая других, ты лучше понимаешь материал

**Помни:** значки — это не цель, а средство стать лучшей версией себя! 💪

О какой категории или значке хочешь узнать больше? 😊
"""
    
    def _generate_general_response(
        self,
        message: str,
        context: UserContext,
        conversation_history: List[Message]
    ) -> str:
        """Генерирует краткий общий ответ"""
        # Формируем системный промпт с контекстом
        system_prompt = get_system_prompt_with_context(
            current_category=context.current_category or "",
            current_badge=context.current_badge or "",
            **self._prompt_kwargs(context),
        )
        
        # Дополнительные указания по стилю даются в системном промпте; без жёстких ограничений длины здесь
        
        # Не добавляем подробное описание значков/категорий в общий ответ,
        # чтобы бот не уводил разговор, если пользователь не спрашивал
        
        return self.openai_client.generate_response(
            messages=conversation_history,
            system_prompt=system_prompt,
            user_context=context
        )
    
    def _format_badge_info(self, badge: Badge) -> str:
        """Форматирует информацию о значке"""
        info_parts = [
            f"**{badge.emoji} {badge.title}**",
            f"Описание: {badge.description}"
        ]
        
        if badge.nameExplanation:
            info_parts.append(f"Объяснение названия: {badge.nameExplanation}")
        
        if badge.skillTips:
            info_parts.append(f"Советы: {badge.skillTips}")
        
        if badge.examples:
            info_parts.append(f"Примеры: {badge.examples}")
        
        if badge.philosophy:
            info_parts.append(f"Философия: {badge.philosophy}")
        
        if badge.howToBecome:
            info_parts.append(f"Как получить: {badge.howToBecome}")
        
        # Добавляем информацию об уровнях
        if badge.levels:
            info_parts.append("\n**Уровни:**")
            for level in badge.levels:
                info_parts.append(f"- {level.emoji} {level.title}: {level.criteria[:100]}...")
        
        return "\n\n".join(info_parts)
    
    def _get_contextual_info(self, context: UserContext) -> str:
        """Получает контекстную информацию"""
        info_parts = []
        
        # Добавляем информацию о текущем экране
        current_view = context.session_data.get('current_view')
        if current_view:
            view_names = {
                'intro': 'Главная страница',
                'categories': 'Список категорий',
                'category': 'Категория значков',
                'badge': 'Страница значка',
                'badge-level': 'Уровень значка',
                'introduction': 'Введение в путеводитель',
                'additional-material': 'Дополнительные материалы'
            }
            view_name = view_names.get(current_view, current_view)
            info_parts.append(f"Пользователь находится на экране: {view_name}")
        
        if context.current_badge:
            badge = self.data_loader.get_badge(context.current_badge)
            if badge:
                info_parts.append(f"Текущий значок: {badge.emoji} {badge.title}")
                info_parts.append(f"Описание: {badge.description}")
                
                # Добавляем информацию о текущем уровне
                current_level = context.session_data.get('current_level')
                if current_level:
                    info_parts.append(f"Текущий уровень значка: {current_level}")
        
        if context.current_category:
            category = self.data_loader.get_category(context.current_category)
            if category:
                info_parts.append(f"Текущая категория: {category.emoji} {category.title}")
                if category.introduction:
                    info_parts.append(f"О категории: {category.introduction[:200]}...")
        
        return "\n".join(info_parts)
    
    def _generate_suggestions(self, context: UserContext) -> List[str]:
        """Генерирует предложения для дальнейшего общения"""
        suggestions = []
        
        if context.current_badge:
            badge = self.data_loader.get_badge(context.current_badge)
            if badge:
                suggestions.extend([
                    f"Расскажи подробнее о значке {badge.title}",
                    f"Дай идеи для получения {badge.title}",
                    f"Какие навыки развивает {badge.title}?"
                ])
        
        if context.current_category:
            category = self.data_loader.get_category(context.current_category)
            if category:
                suggestions.extend([
                    f"Покажи все значки категории {category.title}",
                    f"Объясни философию {category.title}",
                    f"Рекомендуй значки из {category.title}"
                ])
        
        # Общие предложения
        suggestions.extend([
            "Покажи все категории значков",
            "Рекомендуй значки по моим интересам",
            "Объясни философию системы значков"
        ])
        
        return suggestions[:5]  # Возвращаем максимум 5 предложений
    
    def _clean_markdown(self, text: str) -> str:
        """Очищает текст от markdown форматирования"""
        import re
        
        # Удаляем **жирный текст**
        text = re.sub(r'\*\*(.*?)\*\*', r'\1', text)
        
        # Удаляем *курсив*
        text = re.sub(r'\*(.*?)\*', r'\1', text)
        
        # Удаляем ### заголовки
        text = re.sub(r'^###\s*', '', text, flags=re.MULTILINE)
        
        # Удаляем ## заголовки
        text = re.sub(r'^##\s*', '', text, flags=re.MULTILINE)
        
        # Удаляем # заголовки
        text = re.sub(r'^#\s*', '', text, flags=re.MULTILINE)
        
        # Удаляем `код`
        text = re.sub(r'`(.*?)`', r'\1', text)
        
        # Удаляем лишние переносы строк
        text = re.sub(r'\n\s*\n\s*\n', '\n\n', text)
        
        return text.strip()

    def _postprocess_response(self, text: str) -> str:
        """Постобработка ответа: мягкая нормализация эмодзи и переносов, без жёсткого урезания."""
        if not text:
            return text
        import re

        # Убираем повторяющиеся одинаковые эмодзи подряд (2+ -> 1)
        text = re.sub(r'([✨💡🎉🚀😄👍💫💪🔥🧠😌🤩😎🤗🤔🥰🥹😅💋🐱])\1+', r'\1', text)

        # Мягкая отсечка очень длинных простыней (оставляем простор для развёрнутых ответов)
        max_len = 2500
        if len(text) > max_len:
            snippet = text[:max_len]
            pivot = max(snippet.rfind('.'), snippet.rfind('!'), snippet.rfind('?'), snippet.rfind('\n'))
            if pivot > 200:
                text = snippet[:pivot+1]
            else:
                text = snippet + '…'

        # Нормализуем лишние пустые строки
        text = re.sub(r'\n{3,}', '\n\n', text)
        return text.strip()
