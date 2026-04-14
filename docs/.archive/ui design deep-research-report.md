# Библиотеки и фреймворки для UI личного кабинета AAA MMORPG

## Резюме и ключевые рекомендации

Дата исследования: **10 февраля 2026** (Europe/Vilnius). В отчёте сознательно отмечаю «не указано» там, где ваш запрос не зафиксировал вводные параметры (движок, приоритет платформ, бюджет/лицензии и т. д.).

Если цель — **богатый, “AAA‑ощущающийся” личный кабинет** (XP/квест‑прогресс, live HP/MP/статусы, модалки, меню с переходами, инвентарь, тултипы, списки, дашборды) — то выбор UI‑стека почти всегда упирается в три “оси”:

1) **Рендер‑модель и производительность**: retained‑mode (дерево виджетов + умное кеширование) против immediate‑mode (перерисовка каждый кадр), плюс стоимость апдейтов “каждый тик” (live‑бары).  
2) **Пайплайн для дизайнеров**: визуальные редакторы, экспорт из Figma, поддержка motion‑ассетов (Rive/Lottie/Spine), быстрый iteration/hot‑reload.  
3) **Целевая платформа (особенно консоли)**: сертификация, память, доступность Web‑движка/JS‑рантайма, системные ограничения.

На практике для **AAA MMORPG** чаще всего выигрывают следующие связки (как “дефолтные” рекомендации, если входные данные не уточнены):

- **Unity (PC/консоли):**  
  - Базовый UI: **uGUI + TextMeshPro** (зрелый продакшн‑стандарт для игровых HUD/инвентарей; TMP даёт SDF‑качество и эффекты). citeturn0search1turn0search6turn13search13  
  - Анимации: **DOTween + (опционально) DOTween Pro** для tween‑переходов/микро‑анимаций (меню, ховеры, прогресс‑бар “доливается”). citeturn0search2turn22search16turn0search20  
  - Если нужен “квази‑app” UI с CSS‑подобной стилизацией и UI Builder — рассмотрите **UI Toolkit** (особенно для экранов “личного кабинета”, а не для сверхдинамичного боевого HUD). Unity прямо даёт рекомендации по runtime‑перфомансу (usageHints, dynamic atlas). citeturn22search6turn21search8turn21search5  

- **Unreal Engine (AAA MMORPG):**  
  - База: **UMG (поверх Slate)** — стандарт; оптимизация через **Invalidation Box** (кеш геометрии) и **Retainer Box** (рендер в RT с контролем частоты/фазы + материалы как пост‑эффект). citeturn1search2turn1search1turn1search5  
  - Анимации: встроенные **UMG Widget Animations** + Sequencer‑подходы там, где уместно. citeturn10search5  

- **Собственный движок C++ (PC/консоли):**  
  - Если нужен “AAA‑уровень UI‑системы” без многолетней разработки своего retained‑фреймворка: коммерческие middleware (**NoesisGUI**, **Coherent Gameface**) — часто самый прямой путь. Noesis позиционируется как XAML‑UI middleware и публикует список крупных проектов “Made with Noesis”. citeturn3search0turn20search14turn3search3  
  - Для инструментов/отладки: **Dear ImGui** (быстро, переносимо, renderer‑agnostic, но не про “красивый MMORPG‑кабинет”). citeturn5search2  
  - Для open‑source retained‑слоя “в стиле HTML/CSS”: **RmlUi** (эволюция libRocket). citeturn6search1turn6search0  

- **Веб‑личный кабинет (React/TypeScript):**  
  - UI: **React + Tailwind + Headless UI** (контроль над стилем без навязывания “Material‑вкуса”). citeturn11search3turn11search6  
  - Анимации: **Motion (Framer Motion)** для layout‑transition/микро‑интеракций + **GSAP** для сложных таймлайнов/секвенсов. citeturn8search8turn8search6  
  - Если нужны “игровые” GPU‑эффекты (светящиеся бары, маски, частицы): **PixiJS** (WebGL/WebGPU) + React‑интеграция. citeturn8search1turn8search3  

- **Мобильная версия (iOS/Android):**  
  - В играх на движках — придерживаться “родного” стека движка (Unity uGUI / Unreal UMG) и беречь fill‑rate, меш‑перестройки, частоту обновлений UI. Для TextMeshPro есть отдельные mobile‑шейдеры как менее требовательные варианты. citeturn22search0  
  - Для motion‑ассетов, которые должны выглядеть одинаково: **Rive** (интерактивные state machine‑анимации, Unity runtime) или **Spine** (2D skeletal). citeturn17search2turn9search15  

## Контекст задачи и критерии оценки

**Контекст и цели (явно):**

- Язык/движок/стек: **не указано** (по вашему требованию). Ниже рекомендации даны отдельно для Unity (C#), Unreal (C++/Blueprints), собственного C++ движка (DirectX/Metal/Vulkan) и веб‑версии (React/TypeScript).
- Цель интерфейса: **личный кабинет AAA MMORPG**: анимированные прогресс‑бары (опыт/квесты), live‑бары (HP/MP/статусы), модалки, меню с анимациями, дашборды, вкладки, списки предметов/инвентарь, тултипы и т. д. (зафиксировано в запросе).
- Ограничения по производительности: **не указано**. Поэтому ниже я даю рекомендации “как для тяжёлой AAA‑сцены”: минимизация CPU‑перестроек UI, контроль draw calls/fill‑rate, кеширование, снижение частоты рендера там, где допустимо. Подход “профилируем → изолируем динамику → кешируем”. citeturn20search5turn1search2turn1search1
- Целевые платформы (приоритет): **не указано**. Рассмотрены ПК (Windows), консоли (PlayStation/Xbox/Switch как класс ограничений), мобильные и веб.

**Критерии оценки (что считаю “важным” именно для AAA MMORPG личного кабинета):**

- Платформенность и интеграция (движок, консоли, сборка, toolchain).
- Анимации: timeline/tween, state machines, skeletal UI‑анимация, GPU‑ускорение, шейдеры/маски/пост‑эффекты.
- Масштабирование/адаптив: разные разрешения/аспекты/4K, safe‑area, DPI.
- Производительность: частота перестроек, батчинг/атласы, кеширование геометрии/рендер‑текстуры, аллокации/GC.
- Стилизация: темы/скины, CSS‑подобные подходы, вектор/текст (SDF).
- Интерактивность: drag&drop, hover/focus, ввод с геймпада/клавиатуры/тача.
- Сетевые аспекты: live‑значения, интерполяция, “сервер сказал — UI показал”, минимизация доверия клиенту.
- Инструменты: визуальные редакторы, hot‑reload/живое редактирование, интеграции Figma, документация, экосистема.
- Лицензирование/стоимость: open‑source vs коммерция, per‑title/per‑platform, риски EOL.
- Безопасность/античит: UI как “витрина”, а не источник истины; сервер‑валидация. citeturn19search2turn19search12turn19search16  

## Ландшафт UI‑решений и практические выводы по платформам

Ниже — “карта местности”: что реально используется в продакшене и почему, с привязкой к вашим спискам.

### Unity (C#)

**Unity UI (uGUI)**  
Классический runtime UI Unity. Сильная сторона — предсказуемость и зрелость экосистемы (инвентари, HUD, тултипы). Главный риск для AAA‑перфоманса — **Canvas rebuild** и стоимость “грязных” обновлений при частом дергании свойств (именно то, что делают live‑бары). Unity официально рекомендует **делить Canvas‑ы** (статик отдельно, динамика отдельно), чтобы не ловить CPU‑спайки на огромном монолитном Canvas. citeturn20search5turn13search3turn20search11  

**Unity UI Toolkit (UIElements)**  
Современная система UI с UI Builder, UXML/USS (CSS‑подобная стилизация). Unity отдельно документирует runtime‑перфоманс‑приёмы: usageHints для снижения draw calls/регенерации геометрии и работу dynamic atlas для удержания батчей. Это делает UI Toolkit особенно интересным для “кабинетных” экранов (дашборды, вкладки, списки, настройка персонажа), где важны стили и структура. citeturn22search6turn22search7turn21search8turn21search5  

**TextMeshPro**  
В Unity‑проекте TextMeshPro фактически “обязателен” для AAA‑ощущения текста: SDF‑рендеринг, эффекты (outline/shadow) и набор шейдеров, включая mobile‑варианты. citeturn0search1turn0search6turn22search0  

**DOTween / DOTween Pro**  
Если ваша цель — “красивые анимации меню + прогресс‑баров + модалок” без постоянной возни с Animator Controller, DOTween остаётся одним из самых популярных путей: API‑tween’ы, секвенсы, удобство. Pro‑версия добавляет визуальные инструменты и требует отдельной лицензии. citeturn0search2turn22search16  
Отдельный практический момент: у tween‑подхода есть нюансы с аллокациями/GC; у Demigiant в обсуждениях упоминается переработка/“recycling” как способ снижать GC при создании tween’ов. citeturn0search20  

**Unity Animator / Timeline**  
Это “тяжёлая артиллерия” для сценических UI‑секвенсов (например, вход в личный кабинет: камера/эффекты/панели/переходы). Timeline задуман как линейный sequencing‑инструмент для разных типов треков. citeturn13search7turn13search22  
Для uGUI есть документация про интеграцию UI‑анимаций через систему Animation/Animator (как режим Transition). citeturn13search13  

**NGUI (legacy)**  
Исторически NGUI появился задолго до собственного UI Unity; сегодня это скорее legacy‑вариант: есть проекты, где он живёт, но стартовать AAA MMORPG UI “с нуля” на NGUI обычно нерационально, если нет жёсткой причины (наследие кода/команды). citeturn7search21turn7search1  

**NoesisGUI (Unity plugin)**  
Коммерческий middleware, который **заменяет Unity UI** на XAML‑подход (WPF‑подобная модель: декларативная разметка, биндинги, стили/темы). Noesis публикует туториал по Unity‑интеграции и подчёркивает глубокую связку с ассетами Unity. citeturn3search1turn3search0  
Плюс: Noesis публично показывает “Made with Noesis” список проектов (полезно как сигнал реального продакшн‑использования). citeturn20search14  

**FairyGUI (Unity)**  
Кросс‑движковая UI‑система с собственным редактором и рантаймами; заявляет Unity/Unreal и др. Важный плюс — дизайнер‑ориентированный редактор и подход “пакеты/атласы/компоненты”. citeturn4search1turn4search3  

**Coherent Gameface (Unity)**  
Коммерческий web‑UI middleware (HTML/CSS/JS) с собственным рендером (Renoir) и поддержкой современных графических API (DX11/DX12/Vulkan/Metal и др.). Для AAA часто ценят pipeline (веб‑стек, DevTools, быстрые итерации) и широкую платформенность (включая консоли). citeturn16search2turn16search0turn16search14  

**UIWidgets (Unity)**  
Open‑source пакет, вдохновлённый Flutter: UI строится кодом, сильная сторона — единый декларативный подход и переносимость внутри Unity‑контекста. Позиционируется как способ создавать “эффективные кроссплатформенные приложения” на Unity. citeturn7search0turn7search8  

**Odin Inspector (Unity)**  
Важно: это **не runtime UI для игрока**, а инструмент для улучшения workflow в редакторе Unity (инспекторы, кастомные окна). Полезен для внутреннего “контент‑кабинета” (настройка предметов/квестов/таблиц), но не решает вопрос красивых прогресс‑баров в клиенте. citeturn7search2  

**Xsolla SDK UI (Unity)**  
Это не UI‑фреймворк общего назначения, а готовый модуль (в т.ч. “ready‑to‑use store”), который даёт готовые экраны под аутентификацию/каталог/покупки. Может быть релевантен, если “личный кабинет” включает магазин/платежи. citeturn7search15turn7search3  

### Unreal Engine (C++/Blueprints)

**UMG (Unreal Motion Graphics)**  
Стандартный runtime UI. Для анимаций есть официальная документация по Widget Animations (таймлайн‑трек в виджете). citeturn10search5  

**Slate**  
Фундаментальный UI‑фреймворк Unreal: архитектура и модель данных описаны в документации Epic. Это “нижний уровень”, поверх которого живёт UMG. citeturn1search0  
Отдельно Epic объясняет, что Slate — immediate mode в смысле перерисовки каждый кадр и описывает механизмы “sleep/active timers” (важное понимание CPU‑стоимости UI). citeturn1search6turn1search9  

**Invalidation Box / Global Invalidation**  
Оптимизационный узел для UMG/Slate: кеширование геометрии, уменьшение prepass/tick/paint для закешированных виджетов (особенно заметно на мобилках или сложных UI‑деревьях). citeturn1search2turn1search5  

**Retainer Box**  
Рендерит дочерние виджеты в render target и позволяет контролировать частоту/фазу (то есть UI можно рисовать реже, чем основной кадр), а также применять материал (пост‑эффект) к результату. Это очень практично для “красивых баров” и “магических” переходов, потому что даёт “UI‑постпроцесс” без переписывания всего рендера. citeturn1search1turn15search2  

**NoesisGUI (Unreal plugin)**  
Как и в Unity, Noesis в Unreal — “замена UI”: XAML, векторный рендер, data binding (в т.ч. упоминается интеграция биндинга в Blueprints) и theming. citeturn3search2turn3search4  

**Coherent Gameface (Unreal plugin)**  
HTML/CSS/JS UI напрямую в Unreal, есть официальные гайды “Getting Started” и общий тех‑обзор архитектуры (Cohtml + Renoir). citeturn2search2turn16search10  

**VaRest**  
Не UI‑фреймворк, но часто всплывает рядом с “личным кабинетом” как способ ходить в REST APIs из Blueprints. Важно: репозиторий VaRest помечен как archived (read‑only), что повышает техриски для долгоживущего AAA‑проекта. citeturn10search0turn10search6  

### Собственный движок на C++ (DirectX/Metal/Vulkan)

Здесь выбор обычно бинарный: либо вы строите **свой retained‑UI** (дорого), либо берёте middleware/фреймворк и интегрируете его в ваш render loop и input system.

**Dear ImGui**  
Шикарен для debug/tools UI: быстрый, переносимый, renderer‑agnostic, выдаёт оптимизированные vertex buffers, которые вы сами рисуете в пайплайне. Но для “красивого MMORPG‑кабинета” (скины, сложные анимации, дизайнерский пайплайн) он обычно нецелевая опция. citeturn5search2turn12search9  

**Nuklear**  
Похожий класс: single‑header, minimal‑state immediate‑mode GUI на C, public domain. Рационален для инструментов/встроенных панелей, но “AAA‑визуал” придётся строить вручную. citeturn5search3turn5search7  

**libRocket / RmlUi**  
libRocket — HTML/CSS UI библиотека; репозиторий предупреждает о проблемах (в т.ч. упоминание, что домен проекта был malicious), что косвенно сигналит о слабом “живом” контуре. citeturn6search0  
RmlUi — активная эволюция/форк libRocket с улучшениями и фикcами (в т.ч. performance). citeturn6search1  
Если вы хотите open‑source retained‑UI с HTML/CSS “ощущением” — сегодня логичнее смотреть на RmlUi.

**NanoVG**  
Низкоуровневый векторный 2D‑рендер (API “как canvas”), полезен как строительный блок: рисовать собственные прогресс‑бары, рамки, “свечение”, но это не готовая UI‑библиотека компонент. citeturn6search2  

**MyGUI / SFGUI**  
Это “классические” C++ GUI‑библиотеки. MyGUI позиционируется как кроссплатформенная GUI для игр/3D приложений. citeturn6search10  
SFGUI — GUI библиотека вокруг SFML‑рендера/экосистемы (актуально, если ваш движок строится на SFML‑подобной архитектуре, иначе — редко). citeturn14search2turn14search9  

**bgfx‑интеграции UI**  
bgfx сам по себе — кросс‑платформенный renderer (DX/Metal/Vulkan/Web и др.), и в его примерах есть интеграции ImGui, а также пример NanoVG. Это полезно, если ваш движок хочет абстракцию рендера на много платформ “сразу”. citeturn14search15turn14search10turn14search1  

**NoesisGUI (C++ SDK)**  
Коммерческий вариант “не изобретать UI‑движок”: XAML‑рантайм, инструменты (включая Noesis Studio), лицензирование по бюджетным тирами, заявленная поддержка desktop/mobile и консолей в лицензии. citeturn3search0turn3search3turn17search8  

**Coherent Gameface (C++ SDK)**  
Похожая философия, но через web‑stack: Cohtml (HTML engine) + Renoir (рендер). Документация описывает архитектуру и поддержку множества рендер‑API (DX11/12, Vulkan, Metal). citeturn2search0turn16search2turn2search4  

### Веб‑версия (React/TypeScript)

**React + Motion (Framer Motion)**  
Motion даёт удобные layout‑анимации (FLIP) и переходы, что идеально для “вкладки → вкладка”, “карточка → модалка”, “список → сортировка”. citeturn8search8turn8search5  

**React Spring**  
Физика‑spring анимации, хороша для “живых” отзывчивых UI‑движений (упругие переходы, инерция). citeturn8search2turn8search16  

**GSAP**  
Если UI‑секвенсы сложные (несколько панелей, фазовые эффекты, строгое тайминг‑управление) — GSAP Timeline закрывает тему “режиссуры” анимации. citeturn8search6turn8search13  

**PixiJS (+ React‑обвязки)**  
Pixi позиционируется как высокопроизводительный 2D‑рендер движок на WebGL/WebGPU; технически это ваш “canvas‑рендер” для игровых UI‑эффектов (частицы, маски, фильтры, glow). citeturn8search1turn8search3turn8search10  

**Tailwind CSS + Headless UI**  
Tailwind — utility‑first CSS, Headless UI — доступные (accessible) не‑стилизованные компоненты для React/Vue, чтобы строить свой дизайн‑системный UI без “готового внешнего вида”. citeturn11search3turn11search6turn11search10  

**MUI / Ant Design / Chakra UI**  
Это сильные компонентные библиотеки. Они удобны для быстрых админок/кабинетов, но “MMORPG‑визуал” часто требует глубокого кастома, поэтому их лучше рассматривать либо как основу для внутренних/веб‑кабинетов, либо как набор готовых паттернов. MUI подчёркивает кастомизацию через theming. citeturn11search4turn11search0turn11search1turn11search12  

### Кроссплатформенные motion‑ассеты и специализированные решения

**Scaleform GFx (исторический AAA‑стандарт, legacy)**  
Scaleform был массово используемым middleware, но Autodesk официально прекратил продажу (end of sale) ещё в 2017. Для нового AAA‑MMORPG‑проекта это, как правило, риск (доступность, поддержка, кадры). citeturn5search0turn5search14turn5search5  

**Lottie**  
Lottie — библиотека для рендера After Effects анимаций, экспортированных как JSON; поддерживает Web/iOS/Android и др. Это отличный способ дать UI “дорогую” motion‑графику, но нужно внимательно следить за производительностью конкретного renderer’а (SVG/canvas) и сложностью анимаций. citeturn9search6turn9search0turn9search1  

**Rive**  
Rive делает упор на интерактивные state machines и лёгкий мультиплатформенный runtime; на сайте перечислены платформы и есть Unity runtime с заявленной поддержкой state machine inputs/events. citeturn9search2turn17search2turn17search5  

**Spine**  
Spine — 2D skeletal; рантаймы дают blending, процедурную модификацию скелета; лицензирование рантаймов завязано на лицензировании Spine. citeturn9search15turn17search4turn9search19  

## Сравнительная таблица библиотек и фреймворков

Таблица ниже — практическая: я специально добавил колонку “источник”, чтобы ключевые факты (платформы/модель/лицензия) были привязаны к документации/официальным страницам. Оценки “перф‑риск” и “сложность интеграции” — экспертная градация (low/medium/high) при отсутствии ваших точных вводных.

| Решение | Где уместно | Анимации | Перф‑механика, важное для AAA | Стилизация/темы | Инпут/интерактив | Интеграция (оценка) | Лицензия/цена | Источник |
|---|---|---|---|---|---|---|---|---|
| Unity UI (uGUI) | Unity runtime UI | Animator/Transition | Риск Canvas rebuild; рекомендуется делить Canvas‑ы | Скины/материалы | EventSystem, DnD | medium | встроено | citeturn13search13turn20search5 |
| Unity UI Toolkit | Unity runtime+editor UI | через код/анимации стилей | usageHints, dynamic atlas, батчи | USS (CSS‑подобно) | фокус/навигация | medium | встроено | citeturn22search3turn21search8turn21search5 |
| UI Builder (UI Toolkit) | дизайн/верстка UI Toolkit | — | ускоряет итерации | визуальная сборка UXML/USS | — | low | встроено | citeturn22search6turn22search17 |
| TextMeshPro | текст Unity | шейдер‑эффекты | SDF, mobile‑шейдеры | rich text, outline/shadow | — | low | пакет Unity | citeturn0search1turn22search0 |
| DOTween | tween‑анимации Unity | tween/sequence | возможны GC/аллокации; есть подходы recycling | — | — | low | free | citeturn0search2turn0search20 |
| DOTween Pro | tween + визуал инструменты | визуальные инструменты | как DOTween | — | — | low | платно (one‑time) | citeturn22search16 |
| Unity Animator/Timeline | UI‑секвенсы | timeline/keyframes | удобно для “режиссуры” | — | — | medium | встроено | citeturn13search7turn13search22 |
| NGUI (legacy) | Unity legacy проекты | свои анимации | историческое решение до uGUI | свои скины | свой event flow | high (в новом проекте) | коммерч./legacy | citeturn7search21turn7search1 |
| NoesisGUI (Unity) | Unity AAA UI замена | XAML Storyboard | GPU‑ориентированный XAML‑рантайм | WPF‑подобные стили/темы | биндинги | medium/high | коммерческая | citeturn3search1turn3search3 |
| FairyGUI (Unity) | Unity UI с собственным редактором | таймлайны в редакторе | пакеты/атласы, list/virtualization (в экосистеме) | skins/компоненты | DnD/хит‑тест | medium | рантаймы MIT, editor tiers | citeturn4search1turn4search2turn4search12 |
| Coherent Gameface (Unity) | Unity web‑UI middleware | CSS/JS/Web‑анимации | incremental rendering, multi API (DX/VK/Metal) | CSS | DOM‑события/геймпад (через слои) | high | per title/per platform | citeturn16search2turn16search1turn21search3 |
| UIWidgets | Unity “Flutter‑стиль” UI | декларативные анимации | позиционируется как efficient cross‑platform apps | свой стиль‑слой | свой input | high | open source | citeturn7search0turn7search4 |
| Odin Inspector | Unity editor tooling | — | не runtime UI | инспекторы/окна | — | low | коммерческое | citeturn7search2 |
| Xsolla SDK UI | Unity in‑game store | готовые экраны | не общий UI фреймворк | темы зависят от модуля | формы/магазин | low/medium | SDK/сервис | citeturn7search15turn7search3 |
| UMG | Unreal runtime UI | widget animations | оптимизация через invalidation/retainer | стили + материалы | DnD, геймпад | medium | встроено | citeturn10search5turn1search5 |
| Slate | Unreal базовый UI слой | low‑level | immediate redraw; есть sleep/active timers | C++ DSL/стили | low‑level input | high | встроено | citeturn1search0turn1search6 |
| Invalidation Box | Unreal оптимизация UI | — | кеш геометрии, меньше tick/paint | — | — | low | встроено | citeturn1search2turn1search5 |
| Retainer Box | Unreal эффекты+perf | материал на RT | можно рендерить реже, post‑FX | материал/шейдер | — | low/medium | встроено | citeturn1search1turn15search2 |
| NoesisGUI (Unreal) | Unreal UI замена | XAML Storyboard | XAML‑рантайм, data binding | theming | биндинги/blueprints | medium/high | коммерческая | citeturn3search2turn3search3 |
| Coherent Gameface (Unreal) | Unreal web‑UI | CSS/JS | Cohtml+Renoir; консоли | CSS | DevTools | high | per title/per platform | citeturn2search2turn16search0turn16search1 |
| VaRest | Unreal REST | — | не UI; риск archived | — | — | medium | MIT, archived | citeturn10search0turn10search6 |
| Dear ImGui | C++ tools/debug UI | immediate mode | быстрый, renderer‑agnostic | стили есть, но “инструм.” | мышь/клава | low | MIT | citeturn5search2 |
| Nuklear | C tools/debug UI | immediate mode | single‑header, minimal‑state | базовая | базовая | low | public domain | citeturn5search3 |
| libRocket | C++ HTML/CSS UI (legacy) | CSS‑анимации ограничены | проект с рисками/наследие | CSS subset | DOM‑события | high | open source | citeturn6search0 |
| RmlUi | C++ HTML/CSS UI | transitions/anim (subset) | активный форк libRocket | CSS subset | DOM‑события | medium | MIT | citeturn6search1turn6search19 |
| NanoVG | C++ vector drawing | вручную | низкоуровневый building block | — | — | medium | zlib | citeturn6search2 |
| MyGUI | C++ retained GUI | базовые | “классический” GUI слой | skins | базовая | high | open source | citeturn6search10 |
| bgfx (как база) | кросс‑платф рендер | — | DX/Metal/VK и др.; примеры ImGui/NanoVG | — | — | high | BSD‑2 | citeturn14search15turn14search1turn14search10 |
| SFGUI | SFML‑ориент UI | базовые | нишевый | themes | базовая | high | zlib | citeturn14search2turn14search9 |
| Scaleform GFx | legacy AAA (Flash) | timeline (Flash) | EOL/end‑of‑sale (риск) | Flash authoring | — | very high | недоступно к продаже | citeturn5search0turn5search5 |
| React + Motion | web cabinet | layout/tween/spring | perf зависит от DOM; сильные layout‑переходы | CSS | pointer/keyboard | low | OSS | citeturn8search8turn8search5 |
| React Spring | web cabinet | spring physics | хорош для физичных UI | CSS | pointer | low | OSS | citeturn8search2turn8search16 |
| GSAP | web cabinet | timeline | сильный sequencing | CSS/SVG/canvas | pointer | low | freemium | citeturn8search6 |
| PixiJS | web “game‑like” UI | кодом | GPU рендер WebGL/WebGPU | shaders/filters | pointer/touch | medium | OSS | citeturn8search1turn8search3 |
| Tailwind CSS | web styling | — | utility‑first | design tokens | — | low | OSS | citeturn11search3 |
| Headless UI | web components | transitions | accessible unstyled components | совместим с Tailwind | keyboard/focus | low | OSS | citeturn11search6turn11search10 |
| MUI | web apps/admin | встроенные transitions | зависит от DOM | theming | a11y/focus | low | OSS + paid | citeturn11search4turn11search0 |
| Ant Design | web apps/admin | встроенные | enterprise UI | theme | a11y | low | OSS | citeturn11search1turn11search5 |
| Chakra UI | web apps/design systems | встроенные | component system | theme | accessible comps | low | OSS | citeturn11search12 |
| Lottie | motion assets | timeline (AE) | JSON‑анимации; выбор renderer важен | вектор | события ограничены | medium | OSS | citeturn9search6turn9search0 |
| Rive | интерактив motion | state machines | runtime+renderer; Unity runtime | вектор | интерактивные inputs/events | medium | freemium/tool + runtimes | citeturn9search2turn17search2 |
| Spine | 2D skeletal UI/VFX | skeletal | blending/процедурность | арт‑пайплайн | события/треки | medium | коммерч. лицензия | citeturn9search15turn9search19 |

## Рекомендации под конкретные сценарии AAA MMORPG

Ниже — выбор “1–2 лучших вариантов” для каждого сценария, как вы запросили. Везде предполагаю “AAA‑нагрузку” и требование богатых анимаций.

### Unity AAA MMORPG (PC/консоли)

**Выбор:**  
1) **uGUI + TextMeshPro + DOTween** — самый прагматичный “боевой” набор: быстро, предсказуемо, легко профилировать и оптимизировать через разбиение Canvas‑ов и атласы; TMP даёт AAA‑качество типографики. citeturn20search5turn0search1turn0search2  
2) **NoesisGUI** — если хотите XAML‑модель (стили/темы/биндинг) и готовы к коммерческой лицензии и изменению пайплайна; Noesis демонстрирует крупные shipped проекты в витрине “Made with Noesis”. citeturn3search0turn20search14turn3search3  

**Почему не UI Toolkit как единственный выбор “по умолчанию”:** UI Toolkit очень силён стилями и UI Builder, Unity даёт конкретные runtime‑perf техники (usageHints, dynamic atlas), но для сверхдинамичных HUD‑экранов uGUI всё ещё часто выбирают из‑за зрелости паттернов и экосистемы. citeturn21search8turn22search6  

### Unreal Engine AAA MMORPG

**Выбор:**  
1) **UMG + Invalidation Box + Retainer Box** — стандартный стек, где Invalidation снимает CPU‑стоимость от сложных деревьев, а Retainer даёт “рисовать реже + материалы как UI‑постэффект”. citeturn1search2turn1search1turn10search5  
2) **NoesisGUI (Unreal)** — если важны XAML‑темизация/биндинги и “app‑подобный” личный кабинет; на уровне позиционирования Noesis прямо сравнивают с UMG и подчёркивают преимущества (vector rendering, theming, binding). citeturn3search2turn3search4  

### Собственный C++ движок (PC/консоли)

**Выбор:**  
1) **Coherent Gameface** — если вы хотите UI как web‑приложение (HTML/CSS/JS), плюс широкую поддержку платформ и рендер‑API (DX11/12, Vulkan, Metal) и девтулзы уровня Chrome. В документации прямо перечислены поддерживаемые платформы (включая консоли) и рендер‑API. citeturn16search0turn16search2turn16search14  
2) **NoesisGUI C++ SDK** — если ближе “приложенческий” XAML‑подход и вы хотите сильный пайплайн дизайнерских инструментов (Noesis Studio) и понятную модель лицензирования. citeturn17search8turn3search3turn3search0  

**Отдельно:**  
- **Dear ImGui** оставьте как инструментальную панель/дебаг‑HUD (внутренние окна, профайлеры, редакторные панели). citeturn5search2turn12search9  
- **RmlUi** — разумный open‑source вариант, если вы хотите HTML/CSS‑подобный retained UI без коммерческой лицензии, понимая, что это subset стандартов. citeturn6search1  

### Веб‑версия личного кабинета (React/TypeScript)

**Выбор:**  
1) **React + Motion + Tailwind + Headless UI** — быстрый, управляемый дизайн‑системой путь: Motion закрывает переходы/layout‑анимации, Tailwind/Headless UI — фундамент компонент/доступности без навязанного “скина”. citeturn8search8turn11search3turn11search6  
2) **React + GSAP** — если “режиссура” сложная (много фаз, тайминги, последовательности). GSAP Timeline создан именно для управления набором tween’ов как единым таймлайном. citeturn8search6  

**Когда имеет смысл PixiJS:** если “личный кабинет” должен визуально быть *почти как в клиенте игры* (GPU‑фильтры, маски, частицы, glow‑эффекты в барах). citeturn8search1turn8search3  

### Мобильная версия (iOS/Android)

**Выбор:**  
1) Встроенный UI стека движка (**Unity uGUI** или **Unreal UMG**) + строгая оптимизация (изоляция динамических элементов, кеширование, контроль частоты обновления). Для Unreal RetainerBox/InvalidationBox особенно полезны на мобилках. citeturn1search2turn1search1turn20search5  
2) Motion‑ассеты: **Rive** (интерактив) или **Spine** (skeletal) как способ “дорогой” анимации без тонны ручного UI‑кода. citeturn17search2turn9search15  

## UI/UX паттерны, анимации и эффекты для MMORPG

Ниже — 10 паттернов, которые регулярно встречаются в AAA MMORPG/AAA live‑service UI. Я намеренно описываю не “красиво в вакууме”, а **как это собрать**, чем анимировать и где оптимизировать.

image_group{"layout":"carousel","aspect_ratio":"16:9","query":["MMORPG inventory UI grid tooltip","fantasy game UI health mana bars animated","game UI progress bar particles shader","RPG character stats dashboard UI"],"num_per_query":1}

**Плавные переходы вкладок (Tab transitions) с сохранением контекста**  
- Реализация: анимировать не только opacity, но и позицию/масштаб/blur (если доступно) и обязательно “locked height”, чтобы не трясло layout.  
- Unity: DOTween sequence на RectTransform + CanvasGroup; держать динамику на отдельном Canvas, чтобы не дергать весь UI. citeturn0search2turn20search5  
- Unreal: UMG Widget Animation + при необходимости RetainerBox для эффекта материала/постпроцесса на группу. citeturn10search5turn1search1  
- Web: Motion layout animations (prop `layout`) или GSAP timeline для multi‑phase. citeturn8search8turn8search6  

**Анимированный прогресс‑бар опыта с “пульсом”, искрами, переливом**  
- Ядро: значение (0..1) + визуальный слой эффекта (шейдер/маска/частицы).  
- Unreal: RetainerBox позволяет применить материал к отрендеренному UI — типичный способ добавить “glow/scanline” к бару. citeturn1search1turn15search2  
- Coherent Gameface: CSS‑градиенты/маски + JS обновление; engine описывает поддерживаемые графические API и ориентирован на performance. citeturn16search2turn16search10  
- Web: PixiJS + фильтры/маски (GPU) или SVG/CSS, если достаточно. citeturn8search1turn8search3  

**Live HP/MP бары (частые обновления) без дрожи и без CPU‑спайков**  
- Сетевая часть: UI **не “решает”**, а **показывает**. Сервер — источник истины. Это базовый принцип client‑server архитектуры, где сервер авторитетен по симуляции. citeturn19search2turn19search12  
- Визуально: интерполяция (lerp/spring) к последнему подтвержденному значению, плюс отдельный “damage delay bar”.  
- Оптимизация Unity: изолировать бар на отдельном Canvas; Unity прямо описывает проблему “один Canvas на тысячи элементов → CPU spike”, и рекомендует деление. citeturn20search5turn13search3  
- Оптимизация Unreal: InvalidationBox кеширует и отключает tick/paint закешированным дочерним — полезно, если вокруг бара много “статичного декора”. citeturn1search2turn1search5  

**Модальные окна с “камера‑внутри‑UI” ощущением** (фон затемняется, панель прилетает, focus trap)  
- Web: GSAP timeline (фон → панель → элементы по каскаду). citeturn8search6  
- Headless UI даёт доступные базовые примитивы для диалогов (focus management) при полном контроле стиля. citeturn11search6turn11search10  
- Unreal: UMG + анимация виджета; если нужен постэффект на группу — через RetainerBox материал. citeturn10search5turn1search1  

**Инвентарь grid с drag&drop + snap + split stack**  
- Технически: drag preview, hit‑test, правила “куда можно дропнуть”, серверная валидация (никаких “клиент сказал, что предмет переместился”). Принцип “не доверять клиенту” — стандартная рекомендация сервер‑авторитетного подхода. citeturn19search2turn19search12  
- Реализация:  
  - Unity: uGUI EventSystem + интерфейсы drag handler; pooling ячеек, виртуализация списков.  
  - Unreal: UMG drag&drop + Invalidation/Retainer по необходимости для перф/эффектов. citeturn1search2turn1search1  

**Динамические тултипы с сравнением предметов и “умным” позиционированием**  
- Практика: тултип — отдельный слой; позиционирование по курсору/фокусу; “avoid screen edges”.  
- Типографика: TextMeshPro (SDF) для чёткого текста и эффектов. citeturn0search1turn0search6  

**“Лут‑получен” анимация** (иконка летит в слот, счётчик подпрыгивает)  
- Unity: DOTween sequence (позиция/scale/overshoot). citeturn0search2  
- Web: Motion (spring) или GSAP. citeturn8search5turn8search6  
- Для премиум‑motion: Rive state machine (“получено” → “улетело” → “инкремент”), где дизайнеры управляют логикой состояния. citeturn9search2turn17search2  

**Дашборд персонажа (статы, резисты, перки) с микровзаимодействиями**  
- UI Toolkit в Unity может быть сильным выбором из‑за USS‑стилей и UI Builder (быстрее верстать “приложенческий” экран). citeturn22search6turn22search4  
- Noesis даёт XAML‑стили/темы/биндинги, что хорошо ложится на “модель‑вью‑модель” и сложные экраны. citeturn3search0turn21search10  

**Списки/лог квестов и “бесконечная прокрутка”**  
- Для MMORPG это критично: тысячи предметов/квестов.  
- У любого UI‑стека нужен ответ “виртуализация/пулинг”. FairyGUI и в целом его экосистема подчёркивает designer‑ориентированный процесс и наличие мощных list‑компонентов (в сторонних описаниях и интеграциях, включая виртуальные списки). citeturn4search12turn4search22  
- В web — чаще решается через windowing (не перечисляю конкретные либы, т.к. вы их не запросили, а приоритет — ваш список).

**Экран входа/авторизации внутри клиента + связь с API**  
- В Unreal VaRest исторически использовали для JSON/REST из Blueprints, но из‑за archived‑статуса это риск. citeturn10search0turn10search6  
- В Unity Xsolla SDK может дать готовый UI‑модуль для магазина/аутентификации, если это часть “кабинета”. citeturn7search15turn7search3  

Визуальные примеры/контекст (официальные/индустриальные источники):  
- Интервью/материалы по UI‑дизайну крупной MMORPG: официальный блог по UI‑команде entity["video_game","Final Fantasy XIV","mmorpg 2010"]. citeturn18search13  
- GDC‑сессия о построении новой UI‑системы для entity["video_game","The Division","action rpg 2016"] (уроки по “технологии UI с нуля” полезны для AAA‑мышления). citeturn18search12  
- Витрины middleware как источники UI‑паттернов и эффектов: showreel/кейсы entity["company","Coherent Labs","game ui middleware vendor"] и “Made with Noesis” у entity["company","Noesis Technologies","noesisgui vendor"]. citeturn20search1turn20search14  

## Рабочий процесс дизайнеры↔программисты и интеграция ассетов

Для AAA MMORPG личного кабинета почти всегда побеждает workflow, где дизайнер может быстро “крутить” экраны, а программист — подключать данные, не ломая верстку.

**Figma → runtime UI**

- Для Coherent Gameface существует официальный Figma exporter, который конвертирует Figma‑лейауты в Gameface‑оптимизированный HTML/CSS и автоматизирует позиционирование/стили/ассеты. Это прямое попадание в ваш запрос “быстро делать красивые меню и панели”. citeturn17search3turn17search16  
- Для UI Toolkit у Unity есть UI Builder как визуальный инструмент для UXML/USS. Это “половина мостика” между дизайном и кодом: структура/стили делаются визуально, логика — в C#. citeturn22search6turn22search7  
- Для Noesis есть Noesis Studio как визуальный редактор, который позиционируется как next‑gen tool без обязательного кодинга для сборки интерфейсов. citeturn17search8turn17search13  

**Motion‑ассеты как “премиум‑слой”**

- **Rive**: интерактивность через state machines и runtime‑инпуты, Unity runtime указывает поддержку inputs/events и обновление текста в рантайме — это очень релевантно для UI, где числа/локализация меняются всегда. citeturn17search2turn17search5  
- **Lottie**: экспорт AE→JSON, “красиво, быстро подключить”, но важно заранее договориться об ограничениях: какие эффекты допустимы, какой renderer, какие бюджеты по слоям/маскам, иначе можно получить неожиданные perf‑проблемы. citeturn9search6turn9search1  
- **Spine**: лучший вариант, когда UI‑анимация ближе к “скелету” (например, анимированные рамки, существа‑маскоты, сложные VFX‑элементы), при этом рантаймы дают blending/процедурность. citeturn9search15turn17search4  

**Дизайн‑система для MMORPG (минимальный практический каркас)**

При отсутствии ваших вводных по арт‑стилю (сейчас **не указано**) полезно сразу описать “tokens” и состояния:

- Tokens: цвет (rarity, danger, disabled), типографика (иерархия заголовков, числовые значения), spacing (4/8/12/16…), радиусы, тени/глоу, толщины линий. Tailwind как методология хорошо ложится на token‑мышление (utility‑first). citeturn11search3  
- Состояния: hover/focus/pressed/disabled, rarity states, cooldown states, loading/skeleton. Headless UI помогает не забыть про доступность и focus‑навигацию на вебе. citeturn11search6turn11search10  

## Безопасность, античит, ограничения исследования и вопросы

### Риски UI и античит‑архитектура

Главная мысль: **UI — поверхность атаки, но не источник истины**.

- В client‑server архитектуре “авторитет” обычно у сервера: он определяет состояние мира, а клиент — отображает и отправляет ввод. Это базовая формулировка у Valve (Source networking) и в Unity‑подходах к cheat‑prevention через вынесение критической логики на сервер. citeturn19search2turn19search12  
- Для античита Epic в документации про anti‑cheat интерфейсы также говорит о необходимости валидации игроков/хоста и обмена данными, подразумевая, что доверие к клиенту ограничено. citeturn19search16  

**Практические рекомендации (архитектурно, для ваших live‑баров/инвентаря):**
- HP/XP/валюта/инвентарь: **сервер‑авторитет**, клиент показывает интерполированное значение; любые критические изменения подтверждаются сервером. citeturn19search2turn19search12  
- События UI: клиент может предсказывать (например, “bar goes down”), но должен уметь корректироваться по серверу (rollback небольших расхождений визуально “мягко”). Это логика client prediction как классический компромисс между латентностью и авторитетом сервера. citeturn19search22turn19search18  
- Защита ресурсов: обфускация UI‑логики — не “щит”, а задержка для атакующего; настоящая защита — **серверная валидация** и проверка целостности билдов/контента на уровне античита. citeturn19search12turn19search16  

### Ограничения исследования

- Некоторые утверждения про “AAA‑использование” отдельных middleware опираются на витрины/маркетинговые страницы вендоров (например, “Powered by …”), что полезно как сигнал, но не заменяет внутренних постмортемов. Я пометил такие места источниками. citeturn20search1turn20search14  
- По части некоторых open‑source GUI библиотек (SFGUI, MyGUI и др.) публичные кейсы AAA‑MMORPG ограничены, поэтому оценка их релевантности делается по зрелости репозиториев/позиционированию, а не по AAA‑кейсам. citeturn6search10turn14search2  
- VaRest отмечен как archived — это важное ограничение поддержки. citeturn10search6  

### Что нужно уточнить у вас, чтобы сузить рекомендации

- Какой движок/стек вы используете? **не указано**.  
- Приоритет платформ: PC/консоли/мобильные/веб? **не указано**.  
- Требования по лицензированию/бюджету (готовность к коммерческим middleware per title/per platform)? **не указано**. citeturn16search1turn3search3  
- Нужна ли локализация/RTL и какие языки? **не указано**.  
- Есть ли уже существующий UI/арт‑стиль (референсы, гайд) и насколько строго его держать? **не указано**.  

### Артефакты “на выходе” (по вашему списку)

- Markdown‑отчёт: **выполнено в текущем ответе**.  
- PDF: **не указано** (ваше пожелание не зафиксировано как выбор).  
- CSV/Excel таблица сравнения: **не указано**.  
- Репозиторий с код‑сниппетами: **не указано**.  
- Презентация: **не указано**.