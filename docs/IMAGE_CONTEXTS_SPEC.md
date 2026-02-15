# Спецификация конфига ИИ-изображений по разделам ЛК

Единая точка входа по данным для фичи **«ИИ-изображения во всех кабинетах»** (ROADMAP: Not started). Конфиг задаёт: в каком разделе ЛК какие поля изображений, какой тип (флаг, значок, обложка, аватар, герб и т.д.), допустимые режимы (загрузить / сгенерировать ИИ / загрузить и обработать ИИ) и при необходимости пресеты промптов.

**Потребители:** Agent B (UI), D/E (backend API). По конфигу строятся формы выбора режима и вызовы универсального API генерации/обработки.

## Конфиг (источник истины)

- **В репозитории:** [ai-data/image-contexts.json](../ai-data/image-contexts.json)
- **В рантайме (после sync):** `public/ai-data/image-contexts.json` — приложение и бэкенд читают данные оттуда.

После любых правок в `ai-data/image-contexts.json` выполнять `npm run sync:ai-data` перед сборкой/деплоем.

## Разделы и слоты (кратко)

| sectionId        | Раздел           | Слоты изображений |
|------------------|------------------|-------------------|
| squad-corner     | Отрядный уголок  | photoCorner (уголок), photoFlag (флаг), photoSquad (отрядное фото), photoWithCounselors (с вожатыми) |
| wing             | Крыло            | wingAvatar (аватар Крыла) |
| passport         | Паспорт          | avatar (аватар пользователя) |
| team             | Движок           | flagImage (флаг), gerbImage (герб; API уже есть) |
| workshop         | Мастерская       | customBadgeImage (скин значка), creatorCard (карточка 9:16 при создании) |
| counselor-squad  | Отряд вожатых    | squadAvatar (зарезервирован) |
| bro              | БРО              | broPassportCover (обложка Бропаспорта; зарезервирован) |

Типы изображений: `flag`, `gerb`, `avatar`, `badge_skin`, `cover`, `photo_corner`, `photo_squad`, `photo_flag`, `photo_squad_with_counselors`. Для каждого слота в JSON заданы `aspectRatio`, `allowedModes` (upload / generate / process) и опционально `promptPresetId`.

## Связанные документы

- **Технический контекст:** [.memory-bank/tech_context.md](../.memory-bank/tech_context.md) — § «ИИ-изображения» (провайдеры, три режима, эндпоинты).
- **Видение ЛК:** [STEPA_VISION_LC.md](STEPA_VISION_LC.md) — целевые разделы и форматы (значок, флаг, обложка, аватар).
- **ROADMAP:** [ROADMAP_2026.md](ROADMAP_2026.md) — пункт «ИИ-изображения во всех кабинетах» (Not started).

Конфиг не меняет существующий API герба (`POST /api/teams/gerb-generate`) и ключи в `userProgress`/teams; он только описывает слоты и типы для единообразной реализации UI и будущего универсального API.
