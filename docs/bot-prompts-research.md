# Исследование промтов и ответов бота НейроВалюши

## Обзор

Полное исследование архитектуры промтов, формирования ответов и обработки вопросов о сменах, датах и ценах в проекте Путеводитель "Реальный Лагерь".

**Дата исследования:** 2025-01-27

---

## Архитектура проекта

Проект содержит две реализации бота:

1. **JavaScript версия** (`backend/`)
   - Используется на Vercel/GitHub Pages
   - Файлы: `backend/system_prompt.js`, `backend/response_generator.js`, `backend/api/index.js`
   - API endpoint: `/api/chat`

2. **Python версия** (`chatbot/`)
   - FastAPI сервер (локально на порту 8000)
   - Файлы: `chatbot/prompts/putevoditel_system_prompt_optimized.py`, `chatbot/core/response_generator.py`, `chatbot/main.py`
   - API endpoint: `/chat`

---

## Структура системных промптов

### JavaScript версия

**Файл:** `backend/system_prompt.js`

- **Основной промпт:** Константа `SYSTEM_PROMPT` (строка 2-434)
- **Функция контекста:** `getSystemPromptWithContext()` (строка 437-480)
- **Размер:** ~4000+ токенов

### Python версия

**Файл:** `chatbot/prompts/putevoditel_system_prompt_optimized.py`

- **Основной промпт:** Константа `PUTEVODITEL_SYSTEM_PROMPT_OPTIMIZED` (строка 8-434)
- **Функция контекста:** `get_system_prompt_with_context()` в `chatbot/prompts/system_prompt.py`
- **Размер:** ~4000 токенов (оптимизированная версия)

---

## Информация о сменах в промптах

### Расположение информации

Информация о сменах находится в трех местах в системном промпте:

#### 1. Секция "💰 Стоимость смен (2025 год)"
- **Строки:** 80-99 (JS), 86-99 (Python)
- **Содержимое:**
  - Осенняя смена 2025 (АКТУАЛЬНО)
  - Летняя смена 2025 (архив)
  - Алгоритм оплаты

#### 2. Секция "🍂 АКТУАЛЬНАЯ СМЕНА - ОСЕНЬ 2025"
- **Строки:** 196-213 (JS), 196-213 (Python)
- **Содержимое:**
  - Название смены
  - Даты
  - Стоимость
  - Возраст
  - Место
  - Особенности смены

#### 3. Примеры ответов
- **Строки:** 415-430 (JS), 416-430 (Python)
- **Содержимое:** Примеры ответов на вопросы о сменах

### Критическое несоответствие в стоимости

Обнаружено несоответствие стоимости между версиями промптов:

| Файл | Строка | Стоимость | Версия |
|------|--------|-----------|--------|
| `backend/system_prompt.js` | 85 | **23 750 рублей** | JS |
| `backend/system_prompt.js` | 201 | **23 750 рублей** | JS |
| `backend/system_prompt.js` | 428 (пример) | **23 750 рублей** | JS |
| `chatbot/prompts/putevoditel_system_prompt_optimized.py` | 91 | **30 500 рублей** | Python |
| `chatbot/prompts/putevoditel_system_prompt_optimized.py` | 201 | **23 750 рублей** | Python |
| `chatbot/prompts/putevoditel_system_prompt_optimized.py` | 426 (пример) | **30 500 рублей** | Python |

**Вывод:** В Python версии есть несоответствие - в основной секции указано 30 500 рублей, но в разделе "АКТУАЛЬНАЯ СМЕНА" и примере ответа указано 23 750 рублей. В JS версии везде 23 750 рублей.

**Рекомендация:** Уточнить актуальную стоимость и синхронизировать все версии.

---

## Поток формирования ответа

### Полный цикл обработки вопроса

```mermaid
graph TD
    A[Пользователь задает вопрос] --> B[ChatBot.tsx отправляет POST /api/chat]
    B --> C[API endpoint получает запрос]
    C --> D[ContextManager.updateWebContext]
    D --> E[ContextManager.getConversationHistory]
    E --> F[ContextManager.addMessageToHistory user]
    F --> G[ResponseGenerator.generateResponse]
    G --> H[ResponseGenerator.analyzeRequestType]
    H --> I{Тип запроса}
    I -->|general| J[generateGeneralResponse]
    I -->|badge_explanation| K[generateBadgeExplanation]
    I -->|category_info| L[generateCategoryInfo]
    I -->|...| M[другие типы]
    J --> N[getSystemPromptWithContext]
    N --> O[Формирование массива messages]
    O --> P[callOpenAIWithMessages]
    P --> Q[OpenAI API генерирует ответ]
    Q --> R[cleanMarkdown]
    R --> S[postprocessResponse]
    S --> T[ContextManager.addMessageToHistory assistant]
    T --> U[Возврат ответа пользователю]
```

### Детальный разбор обработки вопроса о смене

Когда пользователь спрашивает: **"Какая следующая смена?"** или **"Сколько стоит смена?"**

1. **Фронтенд (ChatBot.tsx:152-168)**
   - Отправляет POST на `/api/chat`
   - Формат запроса:
     ```json
     {
       "message": "Какая следующая смена?",
       "user_id": "web_user",
       "context": {
         "current_view": "intro",
         "current_category": null,
         "current_badge": null,
         "current_level": null,
         "current_level_badge_title": null
       }
     }
     ```

2. **API Endpoint (backend/api/index.js:46-91)**
   - Обновляет веб-контекст: `contextManager.updateWebContext(user_id, context)`
   - Получает историю диалога: `contextManager.getConversationHistory(user_id)`
   - Добавляет сообщение пользователя в историю
   - Вызывает генератор ответов: `responseGenerator.generateResponse(message, user_id, conversationHistory)`

3. **ResponseGenerator.generateResponse (backend/response_generator.js:17-77)**
   - Получает контекст пользователя: `contextManager.getUserContext(userId)`
   - Дополняет контекст: `contextManager.detectContextFromMessage(userId, userMessage)`
   - Определяет тип запроса: `analyzeRequestType(userMessage, userContext)`

4. **analyzeRequestType (backend/response_generator.js:80-159)**
   - Анализирует сообщение на ключевые слова
   - Для вопросов о сменах не находит специфичных триггеров
   - Возвращает тип: **"general"** (строка 158)

5. **generateGeneralResponse (backend/response_generator.js:443-476)**
   - Формирует системный промпт: `getSystemPromptWithContext(context)`
   - Системный промпт включает:
     - Базовый `SYSTEM_PROMPT` с информацией о сменах
     - Дополнительный контекст (текущий экран, категория, значок)
   - Формирует массив сообщений:
     ```javascript
     [
       { role: "system", content: systemPrompt },
       ...conversationHistory.slice(-10), // последние 10 сообщений
       { role: "user", content: message }
     ]
     ```
   - Отправляет в OpenAI: `callOpenAIWithMessages(messages, 1000, 0.7)`

6. **OpenAI API (backend/response_generator.js:602-616)**
   - Модель: `gpt-4o-mini`
   - Max tokens: 1000
   - Temperature: 0.7
   - OpenAI использует системный промпт с информацией о сменах для генерации ответа

7. **Постобработка (backend/response_generator.js:59-63)**
   - Очистка markdown: `cleanMarkdown(response)`
   - Постобработка: `postprocessResponse(response)`
   - Возврат ответа пользователю

---

## Ключевые компоненты

### 1. Системный промпт

**JS версия:** `backend/system_prompt.js`

Содержит:
- Личность бота (НейроВалюша)
- Стиль общения
- Информацию о лагере
- **Информацию о сменах (строки 80-99, 196-213)**
- Систему значков
- Примеры ответов

**Python версия:** `chatbot/prompts/putevoditel_system_prompt_optimized.py`

Аналогичная структура, но с несоответствием в стоимости (см. выше).

### 2. ResponseGenerator

**JS версия:** `backend/response_generator.js`

Методы:
- `generateResponse()` - главный метод генерации ответа
- `analyzeRequestType()` - определение типа запроса
- `generateGeneralResponse()` - генерация общего ответа (для вопросов о сменах)
- `callOpenAIWithMessages()` - вызов OpenAI API

**Python версия:** `chatbot/core/response_generator.py`

Аналогичная структура, метод `_generate_general_response()` (строка 561-587).

### 3. ContextManager

**JS версия:** `backend/context_manager.js`

Методы:
- `updateWebContext()` - обновление контекста из веб-интерфейса
- `detectContextFromMessage()` - определение контекста из сообщения
- `getConversationHistory()` - получение истории диалога
- `addMessageToHistory()` - добавление сообщения в историю

**Python версия:** `chatbot/core/context_manager.py`

Аналогичная структура с соответствующими методами.

### 4. API Endpoints

**JS версия:** `backend/api/index.js`
- Endpoint: `/api/chat`
- Метод: POST
- Обрабатывает запросы от фронтенда

**Python версия:** `chatbot/main.py`
- Endpoint: `/chat`
- Метод: POST
- FastAPI обработчик

---

## Как бот отвечает на вопросы о сменах

### Пример вопроса: "Какая следующая смена?"

1. Запрос проходит через `analyzeRequestType()`
2. Не находит специфичных триггеров → тип "general"
3. Вызывается `generateGeneralResponse()`
4. Системный промпт включает секцию:
   ```
   ## 🍂 АКТУАЛЬНАЯ СМЕНА - ОСЕНЬ 2025
   
   ### «Осенний 4К-вайб в Реальном Лагере: навыки будущего + нейросети для обучения и творчества»
   
   **📅 Даты**: с 25.10.2025 по 02.11.2025 (9 дней)
   **💰 Стоимость**: 23 750 рублей (с учётом сертификата СПб)
   ...
   ```
5. OpenAI генерирует ответ на основе промпта
6. Ответ может выглядеть как в примере (строка 416-419):
   ```
   🍂 Сейчас актуальна осенняя смена «Осенний 4К-вайб в Реальном Лагере: навыки будущего + нейросети для обучения и творчества»!  
   📅 Даты: с 25.10.2025 по 02.11.2025 (9 дней)  
   💰 Стоимость: 23 750 рублей (с учётом сертификата СПб)  
   🎯 Тематика: 4К-навыки + нейросети для творчества. Записаться можно у Стёпы или Вали! 😊
   ```

### Пример вопроса: "Сколько стоит смена?"

Аналогичный процесс, но OpenAI использует информацию о стоимости из промпта (строка 85 или 201).

**Важно:** OpenAI не просто копирует текст из промпта, а генерирует ответ в стиле НейроВалюши, используя информацию из промпта как источник данных.

---

## Порты и серверы

| Компонент | Порт | Файл конфигурации |
|-----------|------|-------------------|
| Frontend (Vite) | 3001 | `package.json` (строка 7) |
| Flask API | 4000/5000 | `backend/app.py` (строка 413) |
| FastAPI ChatBot | 8000 | `chatbot/main.py` (строка 309) |
| Vercel API | - | `backend/api/index.js` |

**Примечание:** Порт 3002 не используется в проекте. Возможно, имелось в виду порт 3001 (Frontend).

---

## Синхронизация промптов

### Проблема

JS и Python версии промптов имеют несоответствия:
1. Разница в стоимости (23 750 vs 30 500 рублей)
2. Незначительные различия в тексте (например, "старше 12 лет" vs "от 12 до 17 лет")
3. Различия в примерах ответов

### Рекомендации

1. **Определить единый источник истины** для информации о сменах
2. **Создать скрипт синхронизации** для автоматического обновления промптов
3. **Добавить валидацию** при деплое для проверки соответствия версий
4. **Использовать общий файл данных** (например, JSON) для актуальной информации о сменах

---

## Выводы

1. **Архитектура:** Две версии бота (JS и Python) работают параллельно
2. **Промпты:** Информация о сменах встроена в системный промпт (строки 80-99, 196-213)
3. **Обработка вопросов:** Вопросы о сменах обрабатываются через `generateGeneralResponse()` (тип "general")
4. **Несоответствия:** Обнаружены различия между JS и Python версиями промптов
5. **Рекомендация:** Необходима синхронизация промптов и создание единого источника данных

---

## Файлы для дальнейшего изучения

- `backend/system_prompt.js` - JS системный промпт
- `chatbot/prompts/putevoditel_system_prompt_optimized.py` - Python системный промпт
- `backend/response_generator.js` - JS генератор ответов
- `chatbot/core/response_generator.py` - Python генератор ответов
- `backend/context_manager.js` - JS менеджер контекста
- `chatbot/core/context_manager.py` - Python менеджер контекста
- `backend/api/index.js` - JS API endpoint
- `chatbot/main.py` - Python API endpoint
- `src/components/ChatBot.tsx` - React компонент чата
