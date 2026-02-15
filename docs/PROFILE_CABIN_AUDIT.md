# Аудит: элементы и функции личного кабинета (для разработки кабины «Пульт»)

Документ перечисляет **все** элементы интерфейса и функции личного кабинета: откуда берутся данные, где реализованы, какие id/классы критичны для туториала и скролла. При разработке новой версии кабины (profile-desktop / spaceship) ни один пункт не должен исчезнуть.

**Источник кода:** [src/views/ProfileView.tsx](../src/views/ProfileView.tsx), дочерние компоненты, [AppViewRouter.tsx](../src/app/AppViewRouter.tsx) (пропсы).

---

## 1. Верхняя полоса навигации

| Элемент | Откуда данные/логика | Реализация в коде | ID/класс для кабины |
|--------|----------------------|--------------------|----------------------|
| Кнопка «Назад» | Проп `onBack` (из AppViewRouter: `handleBackToCategories`) | `<button onClick={onBack} className="btn-secondary">Назад</button>` | — |
| Кнопка «Показать подсказки» | `userData?.meta?.hasCompletedTutorial`, `startProfileTutorial(false)` (HintOverlayContext) | Условный рендер; туториал по шагам PROFILE_TUTORIAL_STEPS | — |
| Кнопка «Редактировать» / «Закрыть» | Локальный state `showProfileEditor` | Переключает панель редактора профиля | — |

**Обёртка (для layout кабины):** предложенный класс `profile-view-top-bar`.

---

## 2. Блок резервной копии

| Элемент | Откуда данные/логика | Реализация в коде | ID/класс для кабины |
|--------|----------------------|--------------------|----------------------|
| Текст «Прогресс хранится на этом устройстве…» | Статичный + опционально `lastUpdated` | Проп `lastUpdated` из `masterIndex?.lastUpdated` (AppViewRouter → useDataLoader) | `.backup-block` |
| Подпись «Данные актуальны на {lastUpdated}» | Проп `lastUpdated` | Внутри того же блока | — |
| Кнопка «Сделать резервную копию» | `exportData()` из useUserProgress (ProgressContext) | `<button onClick={() => exportData()} className="btn-primary-gold">` | — |
| Кнопка «Восстановить из файла» | `importData(f)`, скрытый `<input type="file" ref={importInputRef}>` | Клик по кнопке триггерит input; onChange вызывает importData | — |

**Обёртка:** предложенный класс `profile-view-backup-strip`.

---

## 3. Паспорт (аватар, ник, ранг, прогресс-бар)

| Элемент | Откуда данные/логика | Реализация в коде | ID/класс для кабины |
|--------|----------------------|--------------------|----------------------|
| Контейнер паспорта | — | `<div id="profile-passport-card" className="passport-card-large">` | **id="profile-passport-card"** (туториал, шаг 1) |
| Аватар (фото или эмодзи) | `profile.avatar` (userData.profile), `isImageAvatar()` | `.avatar-circle` + img или span с emoji | `.avatar-circle` |
| Никнейм | `profile.nickname` | `<h2>{profile.nickname}</h2>` | — |
| Ранг | `getRank(profile?.stats?.totalLevelsAchieved)` (userProgress) | Текст uppercase, цвет #B088FF | — |
| Прогресс-бар (XP) | `xpPercent = (totalLevelsAchieved % 10) * 10`, ширина в % | Два div: фон и заполнение градиентом | — |

**Обёртка:** предложенный класс `profile-view-passport-column`.

---

## 4. Редактор профиля (ник + фото)

| Элемент | Откуда данные/логика | Реализация в коде | ID/класс для кабины |
|--------|----------------------|--------------------|----------------------|
| Панель редактора | Условный рендер при `showProfileEditor` | `.editor-panel.fade-in` | `.editor-panel` |
| Поле «Никнейм» | `nicknameInput` state, `setNickname` | input + placeholder «Никнейм» | `.w-input` |
| Кнопка «Фото» | `uploadInputRef`, FileReader → `setAvatarInput` | Скрытый input accept="image/*" | — |
| Кнопка «Сохранить» | `setNickname(nicknameInput); setAvatar(avatarInput); setShowProfileEditor(false)` | — | — |

---

## 5. Стек дашбордов (порядок и пропсы)

Все дочерние компоненты рендерятся внутри `.dashboards-stack`. Порядок и источники данных:

| № | Компонент | Файл | Ключевые пропсы/данные | Важные id (скролл/туториал) |
|---|-----------|------|-------------------------|-----------------------------|
| 1 | InspectorDashboard | InspectorDashboard.tsx | useUserProgress: userData, updateInspectorTask, setInspectorDay; inspectorMissions | **id="inspector-dashboard"** |
| 2 | Profile4KDashboard | Profile4KDashboard.tsx | userData, badges, badgeTitlesInPath, favoriteBadgeTitles, rank, nickname | — |
| 3 | TeamDashboard | TeamDashboard.tsx | useTeam (myTeam, createTeam, updateTeam…); onSuggestInitiative (открывает модалку инициативы). Блок поддерживает сворачивание/разворачивание по тумблеру в шапке; состояние хранится в localStorage (`putevoditel_profile_team_collapsed`). | **id="team-dashboard"** |
| 4 | CouncilDashboard | CouncilDashboard.tsx | onNavigateToBadge, onScrollToTeam (scroll к #team-dashboard), onSuggestInitiative | — |
| 5 | SquadCornerDashboard | SquadCornerDashboard.tsx | useUserProgress (diaryProgress.squad, фото уголка и т.д.) | — |
| 6 | RealDiaryDashboard | RealDiaryDashboard.tsx | onNavigateToBadge, onScrollToInspector (scroll к #inspector-dashboard) | — |
| 7 | BroInitiation | BroInitiation.tsx | useUserProgress (broProgress и др.) | — |
| 8 | WingDashboard | WingDashboard.tsx | useUserProgress (bro, setWingAvatar, selectWingMentor); onSuggestInitiative; внутри SquadArchitect | — |

**Обёртка:** предложенный класс `profile-view-dashboards-grid` (в кабине — сетка карточек).

---

## 6. Вкладки «В пути / Коллекция / Журнал / Мастерская»

| Элемент | Откуда данные/логика | Реализация в коде | ID/класс для кабины |
|--------|----------------------|--------------------|----------------------|
| Переключатель вкладок | Локальный state `activeTab` (Tab) | `.profile-tabs-nav` + 4 кнопки | **id="profile-tab-active"**, **id="profile-tab-collection"** (туториал шаги 2–3) |
| Подписи кнопок | Жёстко: «В пути», «Коллекция», «Журнал», «Мастерская» | — | — |

---

## 7. Контент вкладки «В пути»

| Элемент | Откуда данные/логика | Реализация в коде | ID/класс для кабины |
|--------|----------------------|--------------------|----------------------|
| Карточки планов значков | userData.badgePlans (approved/in_progress/completed), BadgePlanCard | plan, badgeTitle, onNavigateToBadge, updateBadgePlanChecklist | — |
| Блок «Избранное» | favorites (userData), BadgeIcon, toggleFavorite | .favorites-shelf-container, .shelf-header, .shelf-scroll, .shelf-item, .btn-shelf-remove | — |
| Строки «в пути» (activeLevels) | progress (userData), status === 'in_progress'; badgeLookupMap | .badge-row-complex, .badge-row-main, .badge-row-actions | — |
| Кнопки в строке: избранное, удалить, «Составить план», «Подтвердить» | toggleFavorite, removeRoute, setPlanFormBadge + план-модалка, setProofBadge + proof-модалка | Icons.Star, Icons.Trash, btn-secondary, btn-confirm-main | — |

---

## 8. Контент вкладки «Журнал»

| Элемент | Откуда данные/логика | Реализация в коде | ID/класс для кабины |
|--------|----------------------|--------------------|----------------------|
| Список достигнутых | achievedSorted (progress status === 'achieved', sort by achievedAt) | .journal-view, дата, название значка, рефлексия, кнопка «Отправить в Telegram» | — |

---

## 9. Контент вкладки «Мастерская»

| Элемент | Откуда данные/логика | Реализация в коде | ID/класс для кабины |
|--------|----------------------|--------------------|----------------------|
| Доступ в мастерскую | hasWorkshopAccess (progress: 1.16.1 / 1.16.2 в пути или достигнуты) | Условный рендер | — |
| Блок «Идеи Сообщества» (без доступа) | communityBadges или COMMUNITY_FEED_DEMO_BADGES, toggleCommunityLike; оффлайн/очередь | .workshop-community-feed | — |
| Блок «Мастерская откроется…» + кнопка к 1.16.1 | onNavigateToBadge('1.16.1') | .workshop-locked | — |
| SquadArchitect | diarySquadName, onComplete (showHint); saveSquadArchitectScenario в ProgressContext | Архитектор отряда, сценарии посвящения | — |
| Кузница Смыслов: название, описание, кнопка | workshopForm state, handleWorkshopSubmit, addCustomBadge, updateBadgeSkin, Telegram, generateSocialCard | .workshop-form | — |
| Мои предложения | customBadges, publishBadgeToCommunity | .workshop-my-proposals | — |
| Идеи Сообщества (с доступом) | Аналогично блоку без доступа | .workshop-community-feed | — |

---

## 10. Блок «Пригласить друзей»

| Элемент | Откуда данные/логика | Реализация в коде | ID/класс для кабины |
|--------|----------------------|--------------------|----------------------|
| Текст и кнопка | useTeam: generateInviteUrl(), myTeam; navigator.clipboard.writeText | Отдельный div с заголовком, пояснением, кнопкой «🔗 Пригласить друзей» | — |

**Обёртка:** предложенный класс `profile-view-share-row` (в кабине — в одну строку с шерингом).

---

## 11. Шеринг достижений

| Элемент | Откуда данные/логика | Реализация в коде | ID/класс для кабины |
|--------|----------------------|--------------------|----------------------|
| Контейнер | — | **id="profile-share-center"** className="share-center-v2" | **id="profile-share-center"** (туториал шаг 5) |
| Тумблер «Скрыть ник» | shareHideNickname state | .share-center-toggle, .share-center-toggle-input, .share-center-toggle-track | — |
| Кнопка «Создать карточку» | fetchAiSlogan, fetchPedagogy4k, fetchVibeCheck, generateSocialCard (story + wide), shareOrDownloadSocialCard | .btn-generate | — |
| Превью 9:16 и 16:9, кнопки «Поделиться / скачать» | shareStoryUrl, shareWideUrl, shareStoryResult, shareWideResult | .share-center-results | — |

---

## 12. Чат (Валюша)

| Элемент | Откуда данные/логика | Реализация в коде | ID/класс для кабины |
|--------|----------------------|--------------------|----------------------|
| Триггер открытия чата | — | `<div id="profile-chat-trigger">` + Suspense ChatAvatar, ChatBot | **id="profile-chat-trigger"** (туториал шаг 4) |
| Пропсы чата | onChatToggle, onChatClose, isChatOpen | Передаются в ChatAvatar и ChatBot | — |

---

## 13. Модальные окна (не убирать, не терять)

| Модалка | Условие показа | Ключевые действия | Класс/разметка |
|---------|----------------|-------------------|----------------|
| Rank Up (новый ранг) | showRankUpOverlay (currentLevels > lastSeenRankLevel и ранг изменился) | markRankUpSeen(currentLevels) | .proof-modal-overlay, .proof-modal |
| План получения значка | planFormBadge !== null | setPlanFormBadge, fetchBadgePlan, structureUserPlan, saveBadgePlan, updateBadgePlanStatus, Telegram | — |
| Инициатива в совет лагеря | initiativeModalOpen | fetchCouncilInitiative, копировать / Telegram | — |
| Подтверждение значка (proof) | proofBadge !== null | proofForm (learned, impact, link, фото), updateLevelEvidence, API /api/telegram/notify-achievement, Telegram | — |

---

## 14. Пропсы ProfileView (источник: AppViewRouter)

Чтобы кабина работала так же, как основной профиль, при любом отдельном entry (main-profile-desktop) должен рендериться тот же App → тот же ProfileView с теми же пропсами. Не удалять и не менять контракт:

- onBack  
- badges, categories, lastUpdated  
- ensureBadgeLoaded (через onNavigateToBadge и window.openBadgeById)  
- addCustomBadge, customBadges  
- communityBadges, communityPendingCount, communitySyncing, communityLikedIds, toggleCommunityLike, publishBadgeToCommunity  
- dynamicBroMissions, updateBroMissionsOnServer  
- onChatToggle, onChatClose, isChatOpen  
- onNavigateToBadge  

(updateBadgeSkin приходит из контроллера, в AppViewRouter не проброшен — в коде используется опционально.)

---

## 15. Контексты и провайдеры (без них кабина сломается)

- **ProgressProvider** (ProgressContext): userData, setNickname, setAvatar, exportData, importData, toggleFavorite, removeRoute, markRankUpSeen, completeTutorial, updateLevelEvidence, saveBadgePlan, updateBadgePlanStatus, updateBadgePlanChecklist, updateInspectorTask, setInspectorDay, saveSquadArchitectScenario, broProgress, setWingAvatar, selectWingMentor, diaryProgress и др.
- **TeamProvider** (TeamContext): myTeam, generateInviteUrl, createTeam, updateTeam, joinTeam, leaveTeam, deleteTeam.
- **HintOverlayProvider** (HintOverlayContext): showHint, startTutorial (для туториала и тостов).

Точка входа кабины (main-profile-desktop.tsx) должна оборачивать App в тех же провайдерах, что и main.tsx.

---

## 16. Критичные id (туториал и скролл)

Не удалять и не переименовывать; при изменении разметки сохранять в том же компоненте/блоке:

- `profile-passport-card` — шаг 1 туториала.  
- `profile-tab-active` — шаг 2.  
- `profile-tab-collection` — шаг 3.  
- `profile-chat-trigger` — шаг 4.  
- `profile-share-center` — шаг 5, скролл по hash #share / #share-center.  
- `inspector-dashboard` — скролл из RealDiaryDashboard «К миссиям Инспектора».  
- `team-dashboard` — скролл из CouncilDashboard «к Движку».

---

Этот аудит нужно использовать при верстке кабины: каждый блок и функция должны остаться в новой раскладке, меняется только расположение и стили (в profile-view-spaceship.css и обёртках).
