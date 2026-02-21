# Active Context

## Current Task
**Agent A (сессия 2026-02-21) — ЗАВЕРШЕНО:** Деплой Flask backend на Vercel, подключение Supabase в prod, smoke-тест первого среза работ. Все задачи P1-01..P1-10 и P2-01..P2-04 выполнены.

**Следующий агент:** Выбрать задачу из [PRODUCT_MECHANICS_AND_ROADMAP.md](docs/PRODUCT_MECHANICS_AND_ROADMAP.md) (Фаза 2 продуктовых механик) или новую инициативу из [ROADMAP_2026.md](docs/ROADMAP_2026.md). Перед стартом — проверить [CLAIM_BOARD.md](docs/PROD_ROADMAP_IMPL/CLAIM_BOARD.md).

## Current Goals
1.  **Single source of truth:** All roadmap status and "what's next" live in [docs/ROADMAP_2026.md](../docs/ROADMAP_2026.md). Do not re-implement items marked Done (check Evidence there).
2.  **Memory Bank:** Keep `.memory-bank/` in sync with progress; detail log in `progress.md`, status/Evidence in ROADMAP_2026.
3.  **Next initiative:** др. пункты Not started или новые инициативы. [GAME_CONCEPT_PLAN.md](../GAME_CONCEPT_PLAN.md), [docs/ROADMAP_2026.md](../docs/ROADMAP_2026.md).

## Multi-Agent Swarm (Рой Агентов)
This project is being developed by 4 parallel agents. To avoid conflicts, roles are distributed as follows:

- **Agent 1 (Current Agent): [AGENT B] UX & Navigation.**
  - **Focus:** `src/views/`, `src/components/`, UI/UX consistency.
  - **Current Task:** др. пункты Not started или новые инициативы. См. [docs/ROADMAP_2026.md](../docs/ROADMAP_2026.md).
- **Agent 2: [AGENT A] Data & Domain.** (Focus: `public/ai-data`, progress models).
- **Agent 3: [AGENT C] AI & Communication.** (Focus: `chatbot/`, system prompts, NeuroValyusha personality).
- **Agent 4: [AGENT D/E] Meanings & Infrastructure.** (Focus: "About Camp", GitHub Pages, technical constraints).

### Coordination Rules:
1.  **Claim Before Start:** Before taking a task, open [.cursor/agent orchestration/AGENT_ORCHESTRATION.md](../.cursor/agent%20orchestration/AGENT_ORCHESTRATION.md), check Claim Board, record your agent (A/B/C/D/E), task, date, and logical next step. If task is claimed and not Done — choose another.
2.  **Claim Territory:** Before touching a file outside your focus, check if another agent is working on it.
3.  **Shared Files:** Update `.memory-bank/` and [docs/ROADMAP_2026.md](../docs/ROADMAP_2026.md) to signal progress.
4.  **After Done:** Update Claim Board (status Done), create report in `.cursor/agent orchestration/` (see AGENT_B_SESSION_REPORT.md).
5.  **No Code Bloat:** Use native CSS and Canvas; avoid adding heavy libraries without consensus.

## Immediate Next Steps
- [x] Create `.memory-bank/` structure.
- [x] Update `agent.md` to reference Memory Bank.
- [x] Update `.cursor/rules/cursor_rules.mdc` to enforce Memory Bank usage.
- [x] Create `progress.md` with the current roadmap slices.
- [x] Implement "Slice 2: Social/Viral MVP" (Share Center).
- [x] Implement "Slice 3: Smart Onboarding" (HintOverlayContext, SmartHint, 4-step tutorial in ProfileView). See [docs/ROADMAP_2026.md](../docs/ROADMAP_2026.md) Evidence.
- [x] Sprint 1–3 (Инкубатор, прожектор, социальный мост), карточка прогресса AAA.
- [x] Восстановление подробной анкеты подтверждения значка (proofForm: опыт, влияние, ссылка, фото в UI; Telegram-сообщение; сохранение evidence в progress). [ProfileView.tsx](../src/views/ProfileView.tsx), [docs/ROADMAP_2026.md](../docs/ROADMAP_2026.md).
- [x] **Реальный Отряд:** Done — брендинг, презентация с отрядом, связь с Инспектором.
- [x] **Совет Лагеря:** Done — обзор инициатив/протоколов, связь с Движками.
- [x] **Наполнение Архитектора Отряда:** Done — 16 традиций, duration/materials/counselorTip, копирование, сохранение в userProgress, diarySquadName.
- [x] **Этап 5 — Синхронизация с чатом:** Done — ответы бота на экране ЛК проверены.
- [x] **Значки на флаг отряда (категория 10):** Done — заявки на 10.1/10.2/10.3 в отрядном уголке, секция в SquadCornerDashboard, интеграция с BadgeView/BadgeLevelView. ROADMAP — Done.
- [x] **Этап 6 — устранение хардкода:** Done (ROADMAP).
- [x] **Лента с лайками:** Done — кнопка лайка у каждой идеи в блоке «Идеи Сообщества», сохранение в localStorage.
- [x] **Формат событий и Webhook (Telegram):** Done — EVENTS_AND_WEBHOOKS.md, backend webhook, send_telegram_message.
- [x] **Ответ бота при приёме заявки:** Done — webhook handler вызывает send_telegram_to_chat.
- [x] **Webhook VK:** Done — POST /api/webhook/vk/<secret>, send_vk_message, confirmation и message_new.
- [x] **Песочница для тестирования:** Done — генератор кодов, dev-одобрения, панель входящих заявок; ROADMAP обновлён.
- [x] **Роли, адаптация ЛК (MVP):** Done — отрядные блоки скрыты для traveler, баннер родителя, панель заявок для вожатого/орг., плейсхолдер лимита в чате. ROADMAP — In progress.
- [x] **Подстановка лимита с бэкенда:** Done — GET /api/chat/limits, CHAT_MESSAGES_PER_DAY, отображение в ChatBot. Родитель как участник зафиксирован.
- [x] **Консолидация прогресса:** создан [WORKFLOW_PROGRESS_AND_PLANS.md](../WORKFLOW_PROGRESS_AND_PLANS.md) — разметка этапов WORKFLOW, кабина и панели ЛК, матрица «План ↔ Код»; ROADMAP обновлён (кабина Done, изоляция кабины Not started).
- [x] **Обмен итогами Реального Дневника:** Done — кнопка «Отправить в Telegram» в RealDiaryDashboard, buildPresentationText, t.me/Stivanovv, fallback; ROADMAP Done.
- [x] **Техдолг TypeScript:** Done — исправлены TS-ошибки (BlueNestLanding, SmartHint, WingDashboard, AuthContext, authRole, authStorage, socialGenerator); tsc --noEmit проходит.
- [ ] **ИИ-изображения во всех кабинетах (OpenAI + РФ: Kandinsky, YandexART, GigaChat)** — планирование и реализация. [tech_context](../.memory-bank/tech_context.md) §ИИ-изображения, [STEPA_VISION_LC](../docs/STEPA_VISION_LC.md).
- [ ] **Next:** выбрать следующую задачу из [docs/ROADMAP_2026.md](../docs/ROADMAP_2026.md) (видение: STEPA_VISION_LC, план ролей: FEATURE_AUTH_ROLES_DVIZHKI_PLAN, [WORKFLOW_PROGRESS_AND_PLANS.md](../WORKFLOW_PROGRESS_AND_PLANS.md)) или новая инициатива.

## Active Focus
- [docs/ROADMAP_2026.md](../docs/ROADMAP_2026.md) is the single entry point for "what to do" and "what is already done (do not redo)".
- Песочница Done. Auth flow Done. Роли, авторизация, адаптация ЛК — Done (родитель как участник, лимит с бэкенда). Next: выбор следующей инициативы из видения/планов.
