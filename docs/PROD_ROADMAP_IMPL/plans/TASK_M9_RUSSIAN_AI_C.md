# TASK: M9-RUSSIAN-AI-C — ИИ-картинки: российские провайдеры

**Агент: C (Chat/AI/Data)**  
**Base:** `main @ 833ae10`  
**Branch:** `agent-c/m9-russian-ai`

## Контекст

Генерация ИИ-артов работает через OpenAI (DALL-E / GPT Image). Нужно добавить альтернативные российские провайдеры для пользователей без OpenAI доступа и для снижения стоимости.

## Scope

### 1. Абстракция ImageProvider

В `backend/` создать:
```python
# backend/ai/image_provider.py
class ImageProvider(ABC):
    @abstractmethod
    async def generate(self, prompt: str, style: str) -> str:
        """Returns image URL or base64"""

class OpenAIImageProvider(ImageProvider): ...
class FusionBrainProvider(ImageProvider): ...   # Kandinsky API
class StubProvider(ImageProvider): ...           # Fallback: returns placeholder
```

### 2. Конфигурация провайдера

В `.env` / `backend/app.py`:
```
IMAGE_PROVIDER=openai|fusionbrain|stub
FUSIONBRAIN_API_KEY=...
FUSIONBRAIN_SECRET_KEY=...
```

### 3. Интеграция Fusion Brain (Kandinsky)

- API: `https://api-key.fusionbrain.ai/`  
- Endpoints: POST `/key/api/v1/text2image/run`, GET `/key/api/v1/text2image/status/{uuid}`
- Async polling (status check every 2s)

### 4. Fallback chain

`IMAGE_PROVIDER=auto` → try OpenAI → if fails → try FusionBrain → if fails → StubProvider (placeholder image)

### 5. Обновить backend endpoint `/api/generate-image`

Использовать `ImageProvider` вместо прямого вызова OpenAI.

### 6. Smoke: обновить Flow E

- `E-1`: generate-image с `IMAGE_PROVIDER=stub` → 200 (не timeout)
- Существующий E-тест: guard от timeout

## DoD
- [ ] `ImageProvider` абстракция + 3 реализации
- [ ] `IMAGE_PROVIDER` env var работает
- [ ] FusionBrain интеграция (если есть ключ) или StubProvider
- [ ] Flow E не таймаутит с stub
- [ ] Docs обновлены
