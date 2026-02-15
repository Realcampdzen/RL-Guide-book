# План доработки ролей и контуров подтверждений (RBAC + approvals)

**Дата:** 2026-02-11  
**Актуально для:** локальный dev (Vite 3001 + Flask backend 4000) и дальнейший прод  
**Цель документа:** максимально чёткий план задач “что делать” для Codex: роли → доступы → мотивационный traveler → подтверждения значков → staff‑контуры.

---

## 0) SSOT и текущие вводные

### 0.1. Роли (как сейчас в коде)

Источник: `src/types/authRole.ts`.

- `developer` — режим бога (доступ ко всему, “песочница” всегда).
- `traveler` — “урезанный ЛК”: **функции видны, но недоступны**, чтобы мотивировать стать участником смены.
- `participant` — Участник смены (главный игрок).
- `parent` — Родитель (как участник + доп.панели/CTA).
- `counselor` — Вожатый.
- `shift_leader` — Старший вожатый (руководитель смены).

Примечание: роль `organizer` **удалена**, legacy `organizer → shift_leader` маппится в:
- фронт: `src/utils/authStorage.ts`
- бэк: `backend/app.py` (`_normalize_role`)

### 0.2. Принцип “значок/подтверждение”

Требование заказчика (это SSOT для дизайна подтверждений):
- “Подтверждение значка” = подтверждение **конкретного значка**.
- В текущей модели данных, это ближе всего к `BadgeLevelId` (пример: `8.6.1`), т.к. каждый уровень значка трактуется как отдельный “значок”.

В коде сейчас “уровни” живут в `progress: Record<BadgeLevelId, ILevelProgress>` (см. `src/types/userProgress.ts`).

### 0.3. Текущее состояние важных контуров (факт по репо)

#### ИИ‑чат (дорогая функция)
- Front: `src/components/ChatBot.tsx` отправляет `Authorization: Bearer <accessToken>` если он есть.
- Back: `backend/app.py` защищает чат через JWT (`_require_chat_auth()`), лимит по `deviceId` в день.
- Dev-удобство: localhost без токена → роль developer разрешена (добавлено).

#### “Заявки/подтверждения” (пока не approvals, а лента)
- Сейчас есть лишь “входящие заявки” как лента событий по секрету:  
  - Back: `GET /api/webhook/confirmation-events?secret=...` (см. `backend/app.py`)  
  - Front: `ProfileView.tsx` панель “Заявки”
- **Нет** сущности “заявка на значок” (нет `levelId`, нет статуса pending/approved, нет записи результата в прогресс ребёнка).

#### Shifts/Squads (staff flow)
- Back: в `backend/app.py` есть:
  - `GET/POST /api/shifts`
  - `GET/POST /api/shifts/<shiftId>/squads`
  - `POST /api/organizer/generate-code` (для выдачи кода на роль/shiftId)
- Front: `ProfileView.tsx` показывает staff‑панель “Смены и отряды” если `canCreateShiftsAndSquads(role)`.
- **Нет** членства “ребёнок → отряд” как сущности в бекенде.

---

## 1) Целевое поведение по ролям (концепт)

### 1.1. Developer
Должен уметь локально прогнать любой сценарий:
- выдать себе любой значок/уровень/статус;
- выдать и подтвердить любой код/роль;
- видеть все панели и иметь доступ ко всем действиям;
- имитировать участника/родителя/вожатого/старшего вожатого без “залипания” токена на роль.

### 1.2. Traveler (“видно, но нельзя”)
Traveler должен:
- **видеть** все ключевые панели ЛК (Отрядный уголок, Дневник, Движок, Совет, БРО, Крыло, Вожатификатор и т.д.)
- но **не иметь права**:
  - дергать дорогие API (чат, изображения, онлайн‑движки, staff‑операции);
  - отправлять на подтверждение/создавать “заявки”;
  - вступать в смену/отряд/движок онлайн.
- и везде получать “мягкий лок” (disabled UI + CTA “Стать участником смены / Разблокировать по коду”).

### 1.3. Participant
- Все игровые механики как у traveler, но **доступны действия**:
  - чат (после верификации и получения JWT);
  - отправка заявки на подтверждение значка;
  - получение/синхронизация результатов подтверждений;
  - онлайн‑движки.

### 1.4. Parent
- Базовый сценарий как у participant (свой кабинет) + доп. панель “Для родителей”.
- Не должен “подтверждать достижения” ребёнка.
- Может предлагать маршруты развития ребёнка (уже есть UI/интеграции — проверить фактическое поведение).

### 1.5. Counselor / Shift leader
- Доступ к staff‑панелям:
  - inbox заявок на подтверждение;
  - выполнение approve/reject;
  - (в перспективе) управление отрядом (состав, объявления, коммуникации).
- Shift leader дополнительно:
  - создание “вожатского отряда” (локально уже есть);
  - управление сменами/отрядами (staff flow) + выдача кодов.

---

## 2) План реализации — этапы (делать по порядку)

### Этап A — “Feature Gates” для traveler (видно, но disabled)

**Цель:** traveler видит панели, но не может выполнять действия; везде одинаковый UX “замок + причина + CTA”.

#### A1. Ввести единый компонент гейта
Создать компонент (пример):
- `src/components/FeatureGate.tsx`
  - props: `allowed: boolean`, `reason: string`, `ctaLabel?: string`, `onCta?: () => void`
  - режимы:
    - `allowed=true` → рендер children как есть
    - `allowed=false` → поверх children overlay/замена (в зависимости от UX)

#### A2. Определить список “дорогих/закрытых” действий
Минимально (MVP):
- чат (`/api/chat`, Cloudflare endpoint);
- генерация/обработка изображений (`/api/images/generate`);
- онлайн‑движки (backend teams endpoints);
- staff endpoints (shifts/squads, generate-code staff);
- отправка/получение заявок на подтверждение значков (новый этап C).

#### A3. Применить гейты в UI
Точки, где **обязательно** должен быть gate:
- `src/components/ChatBot.tsx` (если traveler → показывать CTA “Разблокировать по коду”).
- `src/components/ImageSourceBlock.tsx` (если нет доступа → disabled + объяснение).
- `src/components/TeamDashboard.tsx` (онлайн‑режим только при токене; traveler может иметь локальный режим).
- `src/components/SquadCornerDashboard.tsx`, `src/components/RealDiaryDashboard.tsx`, `src/components/CouncilDashboard.tsx`, `src/components/WingDashboard.tsx`
  - traveler видит, но:
    - все “submit/approve/send” кнопки disabled
    - поля можно разрешить заполнять локально (если нужно мотивационное “попробуй”), но отправки наружу — нет.

**Acceptance (A):**
- traveler на всех панелях видит “что будет”, но при клике на “дорогие” действия получает единый lock‑UX.
- на локалке developer/DEV может включать/выключать traveler и видеть корректные лочи.

---

### Этап B — Dev UX: быстрые сценарии (локальная проверка)

**Цель:** разработчик может “в 2 клика” симулировать любой пользовательский путь.

#### B1. Dev: “Login as role” (получить JWT без ручного секрета)
Добавить dev‑endpoint в `backend/app.py` (localhost only):
- `POST /api/dev/login`
  - доступ: только `remote_addr` localhost
  - body: `{ role: 'participant'|'parent'|'counselor'|'shift_leader'|'developer', deviceId, campId? }`
  - return: `{ accessToken, role, campId, exp }`

Front (`ProfileView.tsx`):
- в песочнице (developer/DEV) добавить кнопки:
  - “Dev login: Participant”
  - “Dev login: Parent”
  - “Dev login: Counselor”
  - “Dev login: Shift leader”
  - (и “logout”)

#### B2. Dev: массовые операции по прогрессу
Расширить dev‑панели (в `ProfileView.tsx`, только developer):
- “дать значок”:
  - ввод `BadgeLevelId` (уже есть) + статус (locked/in_progress/achieved) + reflection
  - опционально: “дать набор” (например, категория целиком / список ids)
- “сбросить прогресс” (уже есть `resetProgress` — убедиться что доступно из UI).

#### B3. Dev: не смешивать “роль” и “токен”
Текущее правило:
- при переключении роли в песочнице **сбрасывать** `accessToken/campId/exp` (сделано).

**Acceptance (B):**
- на localhost без TELEGRAM/AUTH_GENERATE_SECRET разработчик может получить JWT на любую роль через `/api/dev/login`.
- developer может быстро выставить любой прогресс и проверить UI/гейты.

---

### Этап C — MVP подтверждений значков: “request → inbox → approve → child sync”

**Цель:** сделать настоящий контур “ребёнок отправил → вожатый подтвердил → у ребёнка стало achieved”.

Ключевое ограничение продукта: прогресс оффлайн‑first (localStorage), значит нужна **синхронизация решений** в устройство ребёнка.

#### C1. Модель данных (backend storage)
Создать файл-хранилище (пример):
- `backend/data/badge_requests.json`
  - структура:
    ```json
    {
      "requests": [
        {
          "id": "BR-XXXX",
          "createdAt": "ISO",
          "status": "pending|approved|rejected",
          "levelId": "8.6.1",
          "badgeTitle": "string (optional snapshot)",
          "requestedBy": { "deviceId": "...", "nickname": "..." },
          "campId": "shiftId or ''",
          "squadId": "optional future",
          "evidence": { "reflection": "...", "impact": "...", "link": "..." },
          "resolvedAt": "ISO?",
          "resolvedBy": { "deviceId": "...", "role": "counselor|shift_leader|developer" }
        }
      ]
    }
    ```

#### C2. API (backend/app.py)
Добавить endpoints:

Participant/Parent (создание заявки):
- `POST /api/badges/requests`
  - auth: JWT роли `participant|parent|developer`
  - body: `{ levelId, evidence?, badgeTitle? }`
  - return: `{ request }`

Child “мои заявки”:
- `GET /api/badges/requests/mine`
  - auth: JWT participant|parent|developer
  - return: `{ requests }` отфильтрованные по `deviceId` из JWT

Staff inbox:
- `GET /api/badges/requests/inbox`
  - auth: JWT counselor|shift_leader|developer
  - query: `campId?` (если хотим фильтр по смене)
  - return: `{ requests }` (pending first)

Approve/Reject:
- `POST /api/badges/requests/<id>/approve`
- `POST /api/badges/requests/<id>/reject`
  - auth: JWT counselor|shift_leader|developer
  - body: `{ note? }`

Child sync “выгрузить одобренное”:
- `GET /api/badges/approvals/mine`
  - auth: JWT participant|parent|developer
  - return: список `{ levelId, approvedAt, evidence? }` для применения в local progress

Важно:
- server должен маппить “одобрение” в `levelId` и сохранять историю.
- верифицировать, что `levelId` похож на `^\d+\.\d+(\.\d+)?$` или использовать уже существующие валидаторы.

#### C3. Front UI (ProfileView + отдельная staff-панель)
Минимальный UI:

Для participant/parent:
- в карточке “значка” (или в модалке подтверждения) добавить кнопку:
  - “Отправить на подтверждение вожатому”
  - форма evidence: reflection/impact/link (частично уже есть в разных местах — унифицировать).
- в “песочнице”/developer: отдельная панель “Мои заявки” + “Синхронизировать одобрения”.

Для counselor/shift_leader:
- панель “Заявки” должна стать реальным inbox:
  - вкладка “События (webhook)” (оставить как legacy)
  - вкладка “Подтверждения значков” (новая)
    - список pending
    - approve / reject

#### C4. Применение одобрений в local progress
Сделать функцию:
- `applyApprovedLevel(levelId, evidence?)` → `updateLevelStatus(levelId, 'achieved', reflection?)` + `updateLevelEvidence(...)` при необходимости.

Важно: “каждый уровень = отдельный значок”, значит подтверждаем `levelId`.

**Acceptance (C):**
- participant отправляет заявку на `levelId`.
- counselor видит её в inbox и нажимает approve.
- participant нажимает “Синхронизировать” и видит `levelId` как achieved в своём ЛК.

---

### Этап D — Смена/отряд и членство (минимальный фундамент под 15–30 детей + 2–4 вожатых)

**Цель:** связать participant с отрядом смены; staff сможет фильтровать заявки.

#### D1. Membership storage
Добавить `backend/data/memberships.json`:
```json
{
  "members": [
    { "deviceId": "...", "campId": "shiftId", "squadId": "SQ-...", "role": "participant|counselor", "joinedAt": "ISO" }
  ]
}
```

#### D2. API
- `POST /api/squads/<squadId>/join`
  - auth: participant|developer
  - body: `{}` (берём deviceId из JWT)
  - return: membership
- `GET /api/squads/mine`
  - auth: participant|counselor|shift_leader|developer
  - return: membership + squad meta

Опционально (если нужны join codes):
- `POST /api/squads/<squadId>/generate-join-code` (shift_leader)
- `POST /api/squads/join-by-code` (participant)

#### D3. UI
Participant:
- панель “Мой отряд”:
  - показать текущий отряд (если есть)
  - вступить по коду/ссылке

Counselor:
- панель “Мой отряд”:
  - видеть список детей (минимально: deviceId + nickname snapshot)

Shift leader:
- выдавать коды для вступления в отряды

#### D4. Связка с approvals
- при создании badge request проставлять `campId` и `squadId` (если есть membership)
- staff inbox фильтруется по `campId`/`squadId`.

**Acceptance (D):**
- participant вступает в отряд.
- counselor видит список участников отряда.
- inbox подтверждений фильтруется по смене/отряду.

---

### Этап E — Совет лагеря как сущность (по желанию, после MVP подтверждений)

**Цель:** не просто “кнопка предложить инициативу”, а workflow:
- предложено → обсуждение → решение → протокол → задачи → рассылка.

MVP:
- `initiatives.json` + API submit/list/status.
- UI в `CouncilDashboard.tsx`: список инициатив + статус.

---

## 3) Тест-план (минимальный, но обязательный)

### Локальные проверки (dev)
1) `npm run dev` + `npm run start:backend`
2) Зайти как developer:
   - переключить роль (проверить, что токен сбросился)
   - сделать dev login (после этапа B)
   - выдать себе уровень `8.6.1` и проверить отображение
3) Traveler:
   - открыть панели и убедиться, что кнопки “дорогих” действий залочены, но UI виден
4) Approvals (после этапа C):
   - participant → create request
   - counselor → approve
   - participant → sync approvals → `achieved`

### Авто-проверки
Рекомендуемые команды:
- `npx tsc --noEmit`
- `python -m py_compile backend/app.py`
- `npm run self-check`

---

## 4) Приоритеты (что делать первым)

1) **Этап A (гейты traveler)** — это прямо про продукт (мотивация и ограничения).
2) **Этап C (реальные approvals)** — центральная механика “все действия согласуются с вожатыми”.
3) **Этап B (dev UX)** — ускоряет разработку всего остального.
4) **Этап D (membership)** — даёт структуру лагеря (отряды/вожатые/дети) и фильтры.
5) Этап E — после стабилизации.

