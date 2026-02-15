// Генератор персонализированных ответов для Vercel
import OpenAI from 'openai';
import { dataLoaderAIData } from './data_loader_ai_data.js';
import { contextManager } from './context_manager.js';
import { getSystemPromptWithContext } from './system_prompt.js';

export class ResponseGenerator {
  constructor() {
    this.openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });
    this.dataLoader = dataLoaderAIData;
    this.contextManager = contextManager;
  }

  // Генерирует ответ на сообщение пользователя
  async generateResponse(userMessage, userId, conversationHistory = []) {
    // Получаем текущий контекст
    let userContext = this.contextManager.getUserContext(userId);
    
    // Дополняем контекст на основе сообщения
    this.contextManager.detectContextFromMessage(userId, userMessage);
    userContext = this.contextManager.getUserContext(userId);
    
    // Определяем тип запроса
    const requestType = this.analyzeRequestType(userMessage, userContext);
    
    // Генерируем ответ в зависимости от типа запроса
    let response;
    switch (requestType) {
      case "badge_explanation":
        response = await this.generateBadgeExplanation(userMessage, userContext);
        break;
      case "badge_level_explanation":
        response = await this.generateBadgeLevelExplanation(userMessage, userContext);
        break;
      case "badge_levels_explanation":
        response = await this.generateBadgeLevelsExplanation(userMessage, userContext);
        break;
      case "creative_ideas":
        response = await this.generateCreativeIdeas(userMessage, userContext);
        break;
      case "recommendations":
        response = await this.generateRecommendations(userMessage, userContext);
        break;
      case "category_info":
        response = await this.generateCategoryInfo(userMessage, userContext);
        break;
      case "philosophy":
        response = await this.generatePhilosophyExplanation(userMessage, userContext);
        break;
      case "where_am_i":
        response = this.generateWhereAmI(userContext);
        break;
      default:
        response = await this.generateGeneralResponse(userMessage, userContext, conversationHistory);
    }
    
    // Очищаем ответ от markdown форматирования
    response = this.cleanMarkdown(response);
    
    // Постобработка для соблюдения стиля
    response = this.postprocessResponse(response);
    
    // Генерируем предложения для дальнейшего общения
    const suggestions = this.generateSuggestions(userContext);
    
    return {
      response: response,
      suggestions: suggestions,
      context_updates: userContext,
      metadata: {
        request_type: requestType,
        timestamp: new Date().toISOString()
      }
    };
  }

  // Анализирует тип запроса пользователя
  analyzeRequestType(message, context) {
    const messageLower = message.toLowerCase();
    const currentView = context.session_data.current_view || '';
    const currentLevel = context.session_data.current_level || '';
    
    console.log(`🔍 analyzeRequestType: message="${message}", currentView="${currentView}", currentCategory="${context.current_category}"`);

    // Запросы вида "где я нахожусь?", "что за экран?"
    const whereTriggers = [
      "где я", "где нахожусь", "где это я", "какой это экран",
      "что за экран", "что за страница", "на каком экране",
      "на какой странице", "где сейчас нахожусь", "что это за страница"
    ];
    if (whereTriggers.some(trigger => messageLower.includes(trigger))) {
      return "where_am_i";
    }

    // Анализ в зависимости от текущего экрана
    if (currentView === 'badge-level' && currentLevel) {
      // На экране уровня значка - фокус на конкретном уровне
      if (["что это за значок", "что за значок", "объясни", "расскажи", "что такое",
           "как получить", "критерии", "подтверждение", "что нужно", "что это"].some(word => messageLower.includes(word))) {
        return "badge_level_explanation";
      } else if (["идеи", "примеры", "варианты"].some(word => messageLower.includes(word))) {
        return "creative_ideas";
      }
    } else if (currentView === 'badge') {
      // На экране значка - фокус на значке
      if (["что это за значок", "что за значок", "объясни", "расскажи", "что такое",
           "как получить", "что это"].some(word => messageLower.includes(word))) {
        return "badge_explanation";
      } else if (["идеи", "примеры", "варианты"].some(word => messageLower.includes(word))) {
        return "creative_ideas";
      } else if (["уровни", "ступени", "базовый", "продвинутый", "экспертный"].some(word => messageLower.includes(word))) {
        return "badge_levels_explanation";
      }
    } else if (currentView === 'category') {
      // На экране категории - фокус на категории
      if (["объясни", "расскажи", "что такое"].some(word => messageLower.includes(word))) {
        return "category_info";
      } else if (["рекомендуй", "посоветуй", "что выбрать"].some(word => messageLower.includes(word))) {
        return "recommendations";
      } else if (["философия", "зачем", "почему", "смысл"].some(word => messageLower.includes(word))) {
        return "philosophy";
      }
    } else if (currentView === 'intro') {
      // На главной странице - философия значков
      if (["где я", "что это", "философия", "принципы", "зачем", "почему", "смысл",
           "награды", "награда", "нарады", "медали", "медаль", "ачивки", "ачивка"].some(word => messageLower.includes(word))) {
        return "philosophy";
      } else if (["категории", "значки", "сколько", "список"].some(word => messageLower.includes(word))) {
        return "category_info";
      }
    } else if (currentView === 'profile') {
      // На экране Личный кабинет — вопросы про прогресс, рефлексию, подтверждение уровней
      if (["мой путь", "достижения", "рефлексия", "подтвердить уровень", "как отметить", "что здесь", "что могу"].some(word => messageLower.includes(word))) {
        return "general";
      }
    }

    // Общие ключевые слова для всех экранов
    if (["что это за значок", "что за значок", "объясни", "расскажи", "что такое", "как получить", "что это"].some(word => messageLower.includes(word))) {
      if (context.current_badge) {
        return "badge_explanation";
      } else if (context.current_category) {
        return "category_info";
      }
    }

    if (["идеи", "как сделать", "примеры", "варианты"].some(word => messageLower.includes(word))) {
      return "creative_ideas";
    }

    if (["рекомендуй", "посоветуй", "что выбрать", "подходящий"].some(word => messageLower.includes(word))) {
      return "recommendations";
    }

    if (["философия", "зачем", "почему", "смысл"].some(word => messageLower.includes(word))) {
      return "philosophy";
    }

    // Специальная обработка для вопросов про ИИ
    if (["ии", "искусственный интеллект", "нейросети", "нейро", "ai"].some(word => messageLower.includes(word))) {
      return "general";
    }

    console.log(`🔍 analyzeRequestType: возвращаем "general"`);
    return "general";
  }

  // Отвечает, где пользователь находится
  generateWhereAmI(context) {
    const viewNames = {
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
    };
    const currentView = context.session_data.current_view || 'chat';
    const viewHuman = viewNames[currentView] || currentView;

    const parts = [`Сейчас ты на экране: ${viewHuman}.`];

    if (context.current_category) {
      const cat = this.dataLoader.getCategory(context.current_category);
      if (cat) {
        parts.push(`Категория: ${cat.emoji} ${cat.title}.`);
      }
    }

    if (context.current_badge) {
      const badge = this.dataLoader.getBadge(context.current_badge);
      if (badge) {
        parts.push(`Значок: ${badge.emoji} ${badge.title}.`);
      }
    }

    const curLevel = context.session_data.current_level;
    const curLevelTitle = context.session_data.current_level_badge_title;
    if (curLevel) {
      let lvlLine = `Уровень: ${curLevel}`;
      if (curLevelTitle) {
        lvlLine += ` — ${curLevelTitle}`;
      }
      parts.push(lvlLine + ".");
    }

    // Дружелюбная подсказка по действиям
    const tips = [];
    if (['intro', 'about-camp'].includes(currentView)) {
      tips.push("Могу кратко рассказать о системе значков или показать категории.");
    }
    if (context.current_category && ['category', 'categories'].includes(currentView)) {
      tips.push("Могу объяснить философию категории или предложить подходящие значки.");
    }
    if (context.current_badge && ['badge', 'badge-level'].includes(currentView)) {
      tips.push("Могу объяснить значок, уровни или предложить идеи, как его получить.");
    }
    if (currentView === 'registration-form') {
      tips.push("Могу помочь заполнить важные поля анкеты.");
    }

    if (tips.length > 0) {
      parts.push("Подсказка: " + tips.join(" "));
    }

    return parts.join("\n");
  }

  // Генерирует объяснение значка
  async generateBadgeExplanation(message, context) {
    if (!context.current_badge) {
      return "Сначала выбери конкретный значок на экране — и я кратко объясню его смысл и как его получить 😊";
    }

    const badge = this.dataLoader.getBadge(context.current_badge);
    if (!badge) {
      return "Не нашла такой значок. Попробуй выбрать его из списка значков на экране.";
    }

    // Формируем информацию о значке
    const badgeInfo = this.formatBadgeInfo(badge);

    // Генерируем объяснение
    const prompt = `Объясни этот значок простыми и понятными словами:

${badgeInfo}

Твое объяснение должно:
- Быть понятным для детей и подростков
- Объяснять ЗАЧЕМ нужен этот навык в жизни
- Давать конкретные примеры применения
- Мотивировать на развитие
- Показывать связь с другими навыками

Используй дружелюбный тон и эмодзи! 🎯`;

    const systemPrompt = getSystemPromptWithContext({
      currentView: context.session_data?.current_view,
      currentCategory: context.current_category,
      currentBadge: badge.title,
      currentLevel: context.session_data?.current_level,
      currentLevelBadgeTitle: context.session_data?.current_level_badge_title,
      userLevel: context.level,
      userInterests: context.interests
    });

    return await this.callOpenAI(prompt, systemPrompt, 800, 0.65);
  }

  // Генерирует креативные идеи
  async generateCreativeIdeas(message, context) {
    if (!context.current_badge) {
      return "Чтобы предложить идеи, выбери конкретный значок — и я подкину 3–5 подходящих вариантов! 💡";
    }

    const badge = this.dataLoader.getBadge(context.current_badge);
    if (!badge) {
      return "Не нашла такой значок. Выбери его из списка, и я подскажу идеи.";
    }

    // Формируем информацию о значке
    const badgeInfo = this.formatBadgeInfo(badge);
    const userContextStr = `Интересы: ${context.interests.join(', ')}, Уровень: ${context.level}`;

    // Генерируем идеи
    const prompt = `Придумай 3-5 креативных и практических идей для получения этого значка:

${badgeInfo}

${userContextStr ? `Контекст пользователя: ${userContextStr}` : ""}

Идеи должны быть:
- Конкретными и выполнимыми
- Интересными и мотивирующими
- Подходящими для лагерной среды
- Учитывающими возраст 8-17 лет
- Связанными с реальной жизнью

Формат: каждая идея с новой строки, начинается с эмодзи и краткого описания.`;

    const systemPrompt = getSystemPromptWithContext({
      currentView: context.session_data?.current_view,
      currentCategory: context.current_category,
      currentBadge: badge.title,
      currentLevel: context.session_data?.current_level,
      currentLevelBadgeTitle: context.session_data?.current_level_badge_title,
      userLevel: context.level,
      userInterests: context.interests
    });

    return await this.callOpenAI(prompt, systemPrompt, 700, 0.75);
  }

  // Генерирует рекомендации
  async generateRecommendations(message, context) {
    // Получаем персонализированные рекомендации
    const recommendations = this.contextManager.getPersonalizedRecommendations(context.user_id, 5);

    if (recommendations.length === 0) {
      const systemPrompt = getSystemPromptWithContext({
        currentView: context.session_data?.current_view,
        currentCategory: context.current_category,
        currentBadge: context.current_badge,
        currentLevel: context.session_data?.current_level,
        currentLevelBadgeTitle: context.session_data?.current_level_badge_title,
        userLevel: context.level,
        userInterests: context.interests
      });

      return await this.callOpenAI("Пользователь просит рекомендации, но у нас нет данных для персонализации", systemPrompt, 500, 0.7);
    }

    // Используем AI для генерации персонализированных рекомендаций
    const recommendationsData = recommendations.map(rec => ({
      title: rec.badge.title,
      emoji: rec.badge.emoji,
      description: rec.badge.description,
      reason: rec.reason
    }));

    // Формируем промпт с рекомендациями
    const recommendationsText = recommendationsData.map(rec => 
      `\n${rec.emoji} ${rec.title}: ${rec.description}\nПричина рекомендации: ${rec.reason}\n`
    ).join('');

    const prompt = `Дай персонализированные рекомендации значков на основе интересов пользователя:${recommendationsText}`;

    const systemPrompt = getSystemPromptWithContext({
      currentView: context.session_data?.current_view,
      currentCategory: context.current_category,
      currentBadge: context.current_badge,
      currentLevel: context.session_data?.current_level,
      currentLevelBadgeTitle: context.session_data?.current_level_badge_title,
      userLevel: context.level,
      userInterests: context.interests
    });

    return await this.callOpenAI(prompt, systemPrompt, 600, 0.7);
  }

  // Генерирует информацию о категории
  async generateCategoryInfo(message, context) {
    console.log(`🏷️ generateCategoryInfo: current_category = "${context.current_category}"`);
    
    if (!context.current_category) {
      return "Выбери категорию на экране — и я кратко объясню её философию и содержание.";
    }

    const category = this.dataLoader.getCategory(context.current_category);
    console.log(`🏷️ Найденная категория:`, category ? `${category.emoji} ${category.title}` : 'НЕ НАЙДЕНА');
    
    if (!category) {
      return "Похоже, такая категория отсутствует. Выбери её из списка.";
    }

    // Формируем подробную информацию о категории для AI
    const badges = category.badges || [];
    const sample = badges.slice(0, 5);
    const items = sample.map(b => `- ${b.emoji} ${b.title}: ${b.description.substring(0, 140)}`).join('\n');
    
    let categoryInfo = `Категория "${category.emoji} ${category.title}":\n`;
    categoryInfo += `Описание: ${category.description || 'Развитие важных навыков'}\n`;
    categoryInfo += `Всего значков: ${badges.length}\n`;
    if (category.introduction) {
      categoryInfo += `Введение: ${category.introduction}\n`;
    }
    categoryInfo += `Примеры значков:\n${items}`;

    const prompt = `Пользователь спрашивает про категорию "${category.emoji} ${category.title}". 
    
${categoryInfo}

Дай краткий, но информативный ответ о философии и содержании этой категории. 
Объясни, какие навыки развивают значки в этой категории и почему они важны.
Используй дружелюбный тон НейроВалюши.`;

    const systemPrompt = getSystemPromptWithContext({
      currentView: context.session_data?.current_view,
      currentCategory: category.id,
      currentBadge: context.current_badge,
      currentLevel: context.session_data?.current_level,
      currentLevelBadgeTitle: context.session_data?.current_level_badge_title,
      userLevel: context.level,
      userInterests: context.interests
    });

    return await this.callOpenAI(prompt, systemPrompt, 600, 0.65);
  }

  // Генерирует объяснение философии
  async generatePhilosophyExplanation(message, context) {
    const currentView = context.session_data.current_view || '';

    if (currentView === 'intro') {
      // На главной странице - используем AI для ответа на философские вопросы
      return await this.explainPhilosophy("intro", "философия системы значков Реального Лагеря", context);
    } else if (context.current_category) {
      const category = this.dataLoader.getCategory(context.current_category);
      if (category) {
        return await this.explainPhilosophy(category.id, category.introduction || category.title, context);
      }
    }

    // Общая философия системы значков
    return `🌟 **Философия системы значков "Реального Лагеря"**

Значки здесь — не награды, а **маршруты развития**! 🗺️

Каждый значок — это не медаль за прошлое, а **маяк, освещающий направления твоего развития**. 

**Главные принципы:**
• 🎯 **Опыт важнее награды** - главная ценность в навыках, которые ты развиваешь
• 🧭 **Ты выбираешь свой путь** - значки помогают найти направление, но выбор за тобой
• 🌱 **Развитие через практику** - навыки развиваются только через реальное применение
• 🤝 **Помощь другим** - обучая других, ты лучше понимаешь материал

**Помни:** значки — это не цель, а средство стать лучшей версией себя! 💪

О какой категории или значке хочешь узнать больше? 😊`;
  }

  // Генерирует общий ответ
  async generateGeneralResponse(message, context, conversationHistory) {
    // Формируем системный промпт с контекстом
    const systemPrompt = getSystemPromptWithContext({
      currentView: context.session_data?.current_view,
      currentCategory: context.current_category,
      currentBadge: context.current_badge,
      currentLevel: context.session_data?.current_level,
      currentLevelBadgeTitle: context.session_data?.current_level_badge_title,
      userLevel: context.level,
      userInterests: context.interests
    });

    // Формируем сообщения для API
    const messages = [
      { role: "system", content: systemPrompt }
    ];

    // Добавляем историю диалога (последние 10 сообщений)
    const recentHistory = conversationHistory.slice(-10);
    for (const msg of recentHistory) {
      messages.push({
        role: msg.role,
        content: msg.content
      });
    }

    // Добавляем текущее сообщение
    messages.push({
      role: "user",
      content: message
    });

    return await this.callOpenAIWithMessages(messages, 1000, 0.7);
  }

  // Объясняет философию
  async explainPhilosophy(categoryId, categoryInfo, context) {
    const prompt = `Ты - мудрый вожатый "Реального Лагеря". 
Объясни философию ${categoryId === 'intro' ? 'системы значков' : `категории ${categoryId}`} простыми и понятными словами.

${categoryId !== 'intro' ? `Информация о категории:\n${categoryInfo}` : ''}

Объяснение должно быть:
- Понятным для детей и подростков
- Мотивирующим и вдохновляющим
- Практичным и применимым
- Использовать примеры из жизни
- Длиной 2-3 абзаца

Используй дружелюбный тон и эмодзи для лучшего восприятия.`;

    const systemPrompt = getSystemPromptWithContext({
      currentView: context.session_data?.current_view,
      currentCategory: categoryId !== 'intro' ? categoryId : null,
      currentBadge: context.current_badge,
      currentLevel: context.session_data?.current_level,
      currentLevelBadgeTitle: context.session_data?.current_level_badge_title,
      userLevel: context.level,
      userInterests: context.interests
    });

    return await this.callOpenAI(prompt, systemPrompt, 500, 0.6);
  }

  // Форматирует информацию о значке
  formatBadgeInfo(badge) {
    const infoParts = [
      `**${badge.emoji} ${badge.title}**`,
      `Описание: ${badge.description}`
    ];

    if (badge.nameExplanation) {
      infoParts.push(`Объяснение названия: ${badge.nameExplanation}`);
    }

    if (badge.skillTips) {
      infoParts.push(`Советы: ${badge.skillTips}`);
    }

    if (badge.examples) {
      infoParts.push(`Примеры: ${badge.examples}`);
    }

    if (badge.philosophy) {
      infoParts.push(`Философия: ${badge.philosophy}`);
    }

    if (badge.howToBecome) {
      infoParts.push(`Как получить: ${badge.howToBecome}`);
    }

    // Добавляем информацию об уровнях
    if (badge.levels.length > 0) {
      infoParts.push("\n**Уровни:**");
      for (const level of badge.levels) {
        infoParts.push(`- ${level.emoji} ${level.title}: ${level.criteria.substring(0, 100)}...`);
      }
    }

    return infoParts.join("\n\n");
  }

  // Генерирует предложения для дальнейшего общения
  generateSuggestions(context) {
    const suggestions = [];

    if (context.current_badge) {
      const badge = this.dataLoader.getBadge(context.current_badge);
      if (badge) {
        suggestions.push(
          `Расскажи подробнее о значке ${badge.title}`,
          `Дай идеи для получения ${badge.title}`,
          `Какие навыки развивает ${badge.title}?`
        );
      }
    }

    if (context.current_category) {
      const category = this.dataLoader.getCategory(context.current_category);
      if (category) {
        suggestions.push(
          `Покажи все значки категории ${category.title}`,
          `Объясни философию ${category.title}`,
          `Рекомендуй значки из ${category.title}`
        );
      }
    }

    // Общие предложения
    suggestions.push(
      "Покажи все категории значков",
      "Рекомендуй значки по моим интересам",
      "Объясни философию системы значков"
    );

    return suggestions.slice(0, 5); // Возвращаем максимум 5 предложений
  }

  // Вызывает OpenAI API
  async callOpenAI(prompt, systemPrompt, maxTokens = 1000, temperature = 0.7) {
    try {
      const completion = await this.openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: prompt }
        ],
        max_tokens: maxTokens,
        temperature: temperature
      });

      return completion.choices[0].message.content.trim();
    } catch (error) {
      console.error("Ошибка OpenAI API:", error);
      return "Извините, произошла ошибка при генерации ответа. Попробуйте еще раз.";
    }
  }

  // Вызывает OpenAI API с массивом сообщений
  async callOpenAIWithMessages(messages, maxTokens = 1000, temperature = 0.7) {
    try {
      const completion = await this.openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: messages,
        max_tokens: maxTokens,
        temperature: temperature
      });

      return completion.choices[0].message.content.trim();
    } catch (error) {
      console.error("Ошибка OpenAI API:", error);
      return "Извините, произошла ошибка при генерации ответа. Попробуйте еще раз.";
    }
  }

  // Очищает текст от markdown форматирования
  cleanMarkdown(text) {
    // Удаляем **жирный текст**
    text = text.replace(/\*\*(.*?)\*\*/g, '$1');
    
    // Удаляем *курсив*
    text = text.replace(/\*(.*?)\*/g, '$1');
    
    // Удаляем ### заголовки
    text = text.replace(/^###\s*/gm, '');
    
    // Удаляем ## заголовки
    text = text.replace(/^##\s*/gm, '');
    
    // Удаляем # заголовки
    text = text.replace(/^#\s*/gm, '');
    
    // Удаляем `код`
    text = text.replace(/`(.*?)`/g, '$1');
    
    // Удаляем лишние переносы строк
    text = text.replace(/\n\s*\n\s*\n/g, '\n\n');
    
    return text.trim();
  }

  // Постобработка ответа
  postprocessResponse(text) {
    if (!text) return text;

    // Убираем повторяющиеся одинаковые эмодзи подряд (2+ -> 1)
    text = text.replace(/([✨💡🎉🚀😄👍💫💪🔥🧠😌🤩😎🤗🤔🥰🥹😅💋🐱])\1+/g, '$1');

    // Мягкая отсечка очень длинных простыней
    const maxLen = 2500;
    if (text.length > maxLen) {
      const snippet = text.substring(0, maxLen);
      const pivot = Math.max(
        snippet.lastIndexOf('.'),
        snippet.lastIndexOf('!'),
        snippet.lastIndexOf('?'),
        snippet.lastIndexOf('\n')
      );
      if (pivot > 200) {
        text = snippet.substring(0, pivot + 1);
      } else {
        text = snippet + '…';
      }
    }

    // Нормализуем лишние пустые строки
    text = text.replace(/\n{3,}/g, '\n\n');
    return text.trim();
  }
}

// Создаем глобальный экземпляр
export const responseGenerator = new ResponseGenerator();
