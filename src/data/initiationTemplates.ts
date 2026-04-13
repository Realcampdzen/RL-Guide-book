// ---------------------------------------------------------------------------
// Initiation Constructor — Templates, Block Library & Tips
// Based on research from the Вожатификатор book (9 real camp initiation ceremonies)
// ---------------------------------------------------------------------------

export type BlockType = 'trial' | 'legend' | 'oath' | 'symbol' | 'bonfire' | 'custom';

export const BLOCK_TYPE_META: Record<BlockType, { label: string; emoji: string; color: string }> = {
  trial: { label: 'Испытание', emoji: '🎯', color: '#f59e0b' },
  legend: { label: 'Легенда', emoji: '📖', color: '#8b5cf6' },
  oath: { label: 'Клятва', emoji: '🤝', color: '#ef4444' },
  symbol: { label: 'Вручение символа', emoji: '🎗️', color: '#10b981' },
  bonfire: { label: 'Огонёк / Костёр', emoji: '🔥', color: '#f97316' },
  custom: { label: 'Своё', emoji: '✨', color: '#6366f1' },
};

export interface InitiationBlock {
  id: string;
  type: BlockType;
  title: string;
  description: string;
  emoji: string;
  materials?: string;
  location?: string;
  duration?: string;
  sourceTemplate?: string; // id шаблона-источника
}

export interface InitiationTemplate {
  id: string;
  name: string;
  squadName: string;
  emoji: string;
  color: string;
  description: string;
  symbol: string;
  durationDays: number;
  timeOfDay: string;
  blocks: InitiationBlock[];
}

// ---------------------------------------------------------------------------
// 9 Templates
// ---------------------------------------------------------------------------

export const INITIATION_TEMPLATES: InitiationTemplate[] = [
  {
    id: 'brosvyashchenie',
    name: 'Бросвящение',
    squadName: 'Сто Лет Лета',
    emoji: '🟣',
    color: '#8b00ff',
    description:
      'Легендарное посвящение 1-го отряда. 2 дня: формирование Крыльев, стажировка в отрядах, общелагерное дело, финальный костёр с Присягой и Капустой.',
    symbol: 'Фиолетовый Брогалстук',
    durationDays: 2,
    timeOfDay: 'весь день → вечер',
    blocks: [
      {
        id: 'bro_wings',
        type: 'custom',
        title: 'Формирование Крыльев',
        description:
          'Отряд самостоятельно делится на 6 мини-команд (Крыльев). Каждое выбирает Брофлаг и шьёт Крылатый Брогалстук.',
        emoji: '🦅',
        sourceTemplate: 'brosvyashchenie',
      },
      {
        id: 'bro_mentor',
        type: 'custom',
        title: 'Выбор Наставника',
        description:
          'Крыло выбирает Наставника из Бро-вожатых. Вручают ему Крылатый Брогалстук. Начинается стажировка.',
        emoji: '👑',
        sourceTemplate: 'brosvyashchenie',
      },
      {
        id: 'bro_activity',
        type: 'trial',
        title: 'Отрядное Дело в отряде Наставника',
        description:
          'Каждое Крыло придумывает и проводит полноценное Отрядное Дело в отряде своего Наставника.',
        emoji: '🎯',
        duration: '3-4 часа',
        sourceTemplate: 'brosvyashchenie',
      },
      {
        id: 'bro_camp_event',
        type: 'trial',
        title: 'Общелагерное Дело',
        description:
          'Все Крылья совместно готовят и проводят Общелагерное Дело (например, игру по станциям).',
        emoji: '🏕️',
        duration: '2-3 часа',
        sourceTemplate: 'brosvyashchenie',
      },
      {
        id: 'bro_dances',
        type: 'custom',
        title: 'Бротанцы и кричалки',
        description: 'Традиционные танцы и кричалки отряда у костра — GO-BRO, Ёлочки-пенёчки.',
        emoji: '💃',
        sourceTemplate: 'brosvyashchenie',
      },
      {
        id: 'bro_oath',
        type: 'oath',
        title: 'Присяга на верность лагерю',
        description:
          'Шуточно-торжественная Присяга и Кодекс Бротана. Вожатый начинает фразу — отряд заканчивает «Бро!»',
        emoji: '🤝',
        sourceTemplate: 'brosvyashchenie',
      },
      {
        id: 'bro_bonfire',
        type: 'bonfire',
        title: 'Костёр на Заливе',
        description: 'Финальный Огонёк у костра. Наставники подводят итоги, вспоминают опыт.',
        emoji: '🔥',
        location: 'Залив / клуб',
        sourceTemplate: 'brosvyashchenie',
      },
      {
        id: 'bro_symbol',
        type: 'symbol',
        title: 'Фиолетовые галстуки и Брозначки',
        description:
          'Новобранцы получают фиолетовые галстуки и Брозначки. Наставники — Чёрные Брозначки.',
        emoji: '🎗️',
        materials: 'Галстуки, значки',
        sourceTemplate: 'brosvyashchenie',
      },
      {
        id: 'bro_kapusta',
        type: 'custom',
        title: 'Капуста (массовые обнимашки)',
        description: 'Финальное объятие всем лагерем — «Самая большая в мире Капуста!»',
        emoji: '🤗',
        sourceTemplate: 'brosvyashchenie',
      },
    ],
  },
  {
    id: 'laiksvyashchenie',
    name: 'Лайксвящение',
    squadName: 'Лайк',
    emoji: '❤️',
    color: '#ef4444',
    description:
      'Посвящение 2-го отряда: 4 физических испытания с боевой раскраской на лице, легенда у костра, клятва Лайкотряду.',
    symbol: 'Двуцветный Лайкогалстук (белый + фиолетовый)',
    durationDays: 1,
    timeOfDay: 'вечер',
    blocks: [
      {
        id: 'laik_web',
        type: 'trial',
        title: 'Паутина',
        description:
          'Проползти под верёвкой, натянутой между колышками (3-5 метров), не касаясь. Отметка: жёлтые полукруги над бровями.',
        emoji: '🕸️',
        materials: 'Верёвка, колышки, жёлтая краска',
        sourceTemplate: 'laiksvyashchenie',
      },
      {
        id: 'laik_rope',
        type: 'trial',
        title: 'Перелезть через верёвку',
        description:
          'Перебраться через верёвку, не касаясь. Действовать сообща! Отметка: синяя полоска по носу.',
        emoji: '🧗',
        materials: 'Верёвка, синяя краска',
        sourceTemplate: 'laiksvyashchenie',
      },
      {
        id: 'laik_rock',
        type: 'trial',
        title: 'Скала',
        description:
          'Пройти по табуреткам/скамейкам в полной тишине. 3 попытки. Отметка: красная полоска на подбородке.',
        emoji: '🪨',
        materials: 'Табуретки/скамейки, красная краска',
        sourceTemplate: 'laiksvyashchenie',
      },
      {
        id: 'laik_mines',
        type: 'trial',
        title: 'Минное поле',
        description:
          'Поле из клеток 6×6 на асфальте. У вожатого — секретная схема. Проходить в тишине. Отметка: зелёные полоски под скулами.',
        emoji: '💣',
        materials: 'Мел, зелёная краска',
        sourceTemplate: 'laiksvyashchenie',
      },
      {
        id: 'laik_circle',
        type: 'trial',
        title: 'Командный круг',
        description: 'Все вместе садятся на колени друг другу и держатся без рук 7 секунд.',
        emoji: '⭕',
        sourceTemplate: 'laiksvyashchenie',
      },
      {
        id: 'laik_march',
        type: 'custom',
        title: 'В одной упряжке',
        description: 'Руки перевязывают общей верёвкой, выдвигаются в лес к костровому месту.',
        emoji: '🔗',
        materials: 'Верёвка',
        sourceTemplate: 'laiksvyashchenie',
      },
      {
        id: 'laik_legend',
        type: 'legend',
        title: 'Легенда об основании Лайкотряда',
        description:
          'История о ребятах, которые в дождь ушли в город за «хорошим настроением» и спасли весь лагерь. Волшебство на пляже.',
        emoji: '📖',
        sourceTemplate: 'laiksvyashchenie',
      },
      {
        id: 'laik_oath',
        type: 'oath',
        title: 'Клятва Лайкотряду',
        description:
          '«Торжественно клянусь, что лайк в моей крови! Огонь в глазах не тронут ни ветры, ни дожди!»',
        emoji: '🤝',
        sourceTemplate: 'laiksvyashchenie',
      },
      {
        id: 'laik_hats',
        type: 'symbol',
        title: 'Повязывание Лайкогалстуков',
        description: 'Вожатые и капитан торжественно повязывают всем двуцветные галстуки.',
        emoji: '🎗️',
        materials: 'Двуцветные галстуки',
        sourceTemplate: 'laiksvyashchenie',
      },
    ],
  },
  {
    id: 'prosvetlenie',
    name: 'Просветление Аватара',
    squadName: 'Аватар',
    emoji: '🟡',
    color: '#eab308',
    description:
      'Уникальное посвящение 3-го отряда. Длится всю смену — каждый находит свои «воплощения». 8 испытаний + сакральная церемония с золотыми нитями.',
    symbol: 'Золотая нить на правой руке',
    durationDays: 1,
    timeOfDay: 'вечер',
    blocks: [
      {
        id: 'av_rain',
        type: 'trial',
        title: 'Испытание дождём',
        description:
          'Аватары собирают «космические силы» против водной стихии за право солнца появиться на небе.',
        emoji: '🌧️',
        sourceTemplate: 'prosvetlenie',
      },
      {
        id: 'av_zen',
        type: 'trial',
        title: 'Испытание дзен',
        description:
          '10 минут полной тишины с помощью «аватарской утки Дзен». Учимся слушать и видеть тишину.',
        emoji: '🧘',
        duration: '15 мин',
        sourceTemplate: 'prosvetlenie',
      },
      {
        id: 'av_forbidden',
        type: 'trial',
        title: 'Испытание запрещёнкой',
        description:
          'Передача мягкого медвежонка по кругу — видеть в нём что-то новое, думать шире.',
        emoji: '🧸',
        materials: 'Мягкая игрушка',
        sourceTemplate: 'prosvetlenie',
      },
      {
        id: 'av_compliments',
        type: 'trial',
        title: 'Бревно в глазу',
        description:
          'Комплименты по кругу + воздушные поцелуи в обратную сторону. Видеть достоинства, не недостатки.',
        emoji: '💐',
        sourceTemplate: 'prosvetlenie',
      },
      {
        id: 'av_lineup',
        type: 'trial',
        title: 'Идеальное построение',
        description: 'Построение по 3 за 5 секунд. Аватар строится тройками — уникальная фишка.',
        emoji: '🎖️',
        sourceTemplate: 'prosvetlenie',
      },
      {
        id: 'av_shrimp',
        type: 'trial',
        title: 'Аватарская креветка',
        description: '«Стань креветкой. Будь креветкой.» — идеальная чистота как философия.',
        emoji: '🦐',
        sourceTemplate: 'prosvetlenie',
      },
      {
        id: 'av_cry',
        type: 'custom',
        title: 'Аватарский клич',
        description:
          'Знание кричалок, девиза, танца-кримпа. «Дхармачакраправартана — крутим колесо учения Аватара!»',
        emoji: '📣',
        sourceTemplate: 'prosvetlenie',
      },
      {
        id: 'av_hugs',
        type: 'trial',
        title: 'Обнимашкопокалипсис',
        description:
          'Весь отряд за руки в тишине идёт по лагерю и обнимает всё, что встретит — людей, деревья, вожатскую.',
        emoji: '🤗',
        sourceTemplate: 'prosvetlenie',
      },
      {
        id: 'av_ceremony',
        type: 'bonfire',
        title: 'Церемония Просветления',
        description:
          'В лесу, в кругу, в тишине. Рука на Легендарном Дневнике. Называют свои воплощения.',
        emoji: '🔥',
        location: 'лес на территории лагеря',
        sourceTemplate: 'prosvetlenie',
      },
      {
        id: 'av_thread',
        type: 'symbol',
        title: 'Золотые нити',
        description:
          'На правой руке завязываются сакральные золотые ниточки, связывающие друг с другом.',
        emoji: '🎗️',
        materials: 'Золотые нити/ленты',
        sourceTemplate: 'prosvetlenie',
      },
    ],
  },
  {
    id: 'velikaya_sila',
    name: 'Посвящение Великой Силы',
    squadName: 'Великая Сила',
    emoji: '💚',
    color: '#22c55e',
    description:
      '4-й отряд: испытания силы воли, физической силы и воображения. Сдвинуть корпус на 1 см, не съесть конфету за весь день.',
    symbol: 'Запись в Легендарном дневнике',
    durationDays: 1,
    timeOfDay: 'весь день',
    blocks: [
      {
        id: 'vs_willpower',
        type: 'trial',
        title: 'Сила воли',
        description: 'Весь день носить сладость на шее, не съедая. Кто выстоял — прошёл этап.',
        emoji: '🍬',
        materials: 'Конфеты, ниточки',
        duration: 'весь день',
        sourceTemplate: 'velikaya_sila',
      },
      {
        id: 'vs_building',
        type: 'trial',
        title: 'Сдвинуть корпус на 1 см',
        description:
          'Всем отрядом упереться в стену корпуса и «сдвинуть» его. Великая Сила Единства!',
        emoji: '🏢',
        sourceTemplate: 'velikaya_sila',
      },
      {
        id: 'vs_time',
        type: 'trial',
        title: 'Управление временем',
        description: '«Сдвинуть время на 1 минуту силой мысли» — коллективная концентрация.',
        emoji: '⏱️',
        sourceTemplate: 'velikaya_sila',
      },
      {
        id: 'vs_chaos',
        type: 'trial',
        title: 'Сила Хаоса',
        description: 'ТАЙНО перелезть через забор и сразу обратно! Никому ни слова!',
        emoji: '🤫',
        sourceTemplate: 'velikaya_sila',
      },
      {
        id: 'vs_future',
        type: 'custom',
        title: 'Путешествие во времени',
        description:
          '«Переместиться в конец смены» — найти отрядную клятву и записать в Легендарный дневник.',
        emoji: '🚀',
        sourceTemplate: 'velikaya_sila',
      },
    ],
  },
  {
    id: 'razvedvlenie',
    name: 'Разведвление',
    squadName: 'Разведка',
    emoji: '🔍',
    color: '#3b82f6',
    description:
      '5-й отряд: самое длительное посвящение. Узлы, ухограф, скрытность, палатки. «Невозможно пройти за один день.»',
    symbol: 'Узел на шее (репик)',
    durationDays: 3,
    timeOfDay: 'весь день',
    blocks: [
      {
        id: 'rz_knots',
        type: 'trial',
        title: 'Узельная техника',
        description:
          'Изучить 5 узлов: прямой, восьмёрка, австрийский проводник, грипвайн, академический. Носят на шее.',
        emoji: '🪢',
        materials: 'Репики (верёвки 6мм)',
        duration: '2-3 дня',
        sourceTemplate: 'razvedvlenie',
      },
      {
        id: 'rz_telegraph',
        type: 'trial',
        title: 'Ухограф',
        description:
          'Передать секретное сообщение через самодельный «телефон» (стаканы + верёвка). Нить ВСЕГДА натянута!',
        emoji: '📡',
        materials: 'Стаканы, нитка, спички',
        sourceTemplate: 'razvedvlenie',
      },
      {
        id: 'rz_invisible',
        type: 'trial',
        title: 'Операция «Нас здесь не было»',
        description:
          'Убрать комнату так, будто никто не живёт. Одна палата не убралась = не засчитывается всем.',
        emoji: '🫥',
        sourceTemplate: 'razvedvlenie',
      },
      {
        id: 'rz_lineup',
        type: 'trial',
        title: 'Построение за 30 секунд',
        description: 'Весь отряд выбегает из корпуса за 30 секунд. Можно обуваться на улице.',
        emoji: '⏱️',
        sourceTemplate: 'razvedvlenie',
      },
      {
        id: 'rz_lights_out',
        type: 'trial',
        title: 'Отбой за 1 минуту',
        description:
          'По внезапной команде: забежать, переодеться, лечь — полная иллюзия сна за 60 секунд.',
        emoji: '😴',
        sourceTemplate: 'razvedvlenie',
      },
      {
        id: 'rz_tent',
        type: 'trial',
        title: 'Установка палатки',
        description:
          'Дети собирают палатку самостоятельно. Вожатый подсказывает только когда «сильно тупят».',
        emoji: '⛺',
        materials: 'Палатка, шатёр',
        sourceTemplate: 'razvedvlenie',
      },
      {
        id: 'rz_chants',
        type: 'custom',
        title: 'Кричалки Разведки',
        description: '«Come on, ЮС! Разведка здесь. Четыре-три, огонь внутри!»',
        emoji: '📣',
        sourceTemplate: 'razvedvlenie',
      },
      {
        id: 'rz_spy',
        type: 'trial',
        title: 'ТАЙНО выяснить отчество',
        description: 'Шпионское задание: тайно узнать отчества 3-х вожатых. Главное — СКРЫТНО.',
        emoji: '🕵️',
        sourceTemplate: 'razvedvlenie',
      },
    ],
  },
  {
    id: 'kotosvyashchenie',
    name: 'Котосвящение',
    squadName: 'Котики',
    emoji: '🐱',
    color: '#f472b6',
    description:
      '6-й отряд: 9 кошачьих испытаний (по числу жизней). Все в полной тишине. Котосвященная ленточка связывает руки.',
    symbol: 'Аквагрим-усы',
    durationDays: 1,
    timeOfDay: 'тихий час',
    blocks: [
      {
        id: 'kot_fall',
        type: 'trial',
        title: 'Падение',
        description:
          'Кошки всегда на лапках! Падение спиной назад со стола на руки вожатым. Доверие.',
        emoji: '😺',
        location: 'стол у 3 корпуса',
        sourceTemplate: 'kotosvyashchenie',
      },
      {
        id: 'kot_grip',
        type: 'trial',
        title: 'Цепкость',
        description: 'Пройти строй на поребрике, держась за ребят. Цепкие когти!',
        emoji: '🐾',
        location: 'поребрик',
        sourceTemplate: 'kotosvyashchenie',
      },
      {
        id: 'kot_ribbon',
        type: 'trial',
        title: 'Бережливость',
        description: 'Котосвященная ленточка связывает руки — не порвать до конца церемонии!',
        emoji: '🎀',
        materials: 'Ленточки',
        sourceTemplate: 'kotosvyashchenie',
      },
      {
        id: 'kot_chants',
        type: 'trial',
        title: 'Сообразительность',
        description: 'По пути вспомнить и прокричать все кричалки отряда. Мяукать чётко и громко!',
        emoji: '📣',
        sourceTemplate: 'kotosvyashchenie',
      },
      {
        id: 'kot_obstacle',
        type: 'trial',
        title: 'Ловкость',
        description: 'Полоса препятствий — связаны ленточкой! Ловкость + командная работа.',
        emoji: '🏃',
        location: 'лазалка у площади',
        sourceTemplate: 'kotosvyashchenie',
      },
      {
        id: 'kot_whiskers',
        type: 'symbol',
        title: 'Усы',
        description: 'Нарисовать соседу усы аквагримом, не порвав ленточку. Теперь вы — Котики!',
        emoji: '😸',
        materials: 'Аквагрим',
        sourceTemplate: 'kotosvyashchenie',
      },
    ],
  },
  {
    id: 'vsyosvyashchenie',
    name: 'ВСЁсвящение',
    squadName: 'Команда ВСЁ',
    emoji: '🌟',
    color: '#a855f7',
    description:
      '7-й отряд: Огонёк + Капсула Времени. Вечер, доверительная атмосфера, свиток в будущее для следующей смены.',
    symbol: 'Подарки от вожатых',
    durationDays: 1,
    timeOfDay: 'вечер',
    blocks: [
      {
        id: 'vse_ogonyok',
        type: 'bonfire',
        title: 'Огонёк',
        description:
          'Тёплая атмосфера. Разговор: «Какие запоминающиеся события произошли на смене?» Каждый высказывается.',
        emoji: '🔥',
        sourceTemplate: 'vsyosvyashchenie',
      },
      {
        id: 'vse_scroll',
        type: 'custom',
        title: 'Свиток в будущее',
        description:
          'Группы составляют памятку: Нужно знать… Понимать… Уметь… Любить… Уважать… Свитки объединяются в один.',
        emoji: '📜',
        materials: 'Бумага, ручки',
        sourceTemplate: 'vsyosvyashchenie',
      },
      {
        id: 'vse_capsule',
        type: 'custom',
        title: 'Капсула времени',
        description:
          'Свиток запечатывают в Капсулу и закапывают в лесу. Место — всегда одно, чтобы следующие нашли.',
        emoji: '⏳',
        materials: 'Ёмкость для капсулы',
        location: 'лес возле корпуса',
        sourceTemplate: 'vsyosvyashchenie',
      },
      {
        id: 'vse_orlyatka',
        type: 'oath',
        title: 'Орлятка',
        description:
          'Стоя в кругу: название отряда, девиз, кричалки, приветствия. Поют отрядную песню.',
        emoji: '🤝',
        sourceTemplate: 'vsyosvyashchenie',
      },
      {
        id: 'vse_gifts',
        type: 'symbol',
        title: 'Посвящение и подарки',
        description: 'Вожатые объявляют посвящение и дарят памятные подарки каждому.',
        emoji: '🎁',
        materials: 'Подарки от вожатых',
        sourceTemplate: 'vsyosvyashchenie',
      },
    ],
  },
  {
    id: 'yunikosvyashchenie',
    name: 'Юникосвящение',
    squadName: 'Юники',
    emoji: '🧸',
    color: '#f59e0b',
    description:
      '9-й отряд (малыши): весёлые конкурсы — кто прочитает быстрее, прыгнет дальше, завяжет больше узлов. Смех и радость!',
    symbol: 'Звания-титулы',
    durationDays: 1,
    timeOfDay: 'день',
    blocks: [
      {
        id: 'yun_reader',
        type: 'trial',
        title: 'Лучший диктор',
        description:
          '2-3 ребёнка получают одинаковые тексты. Кто больше прочитает за 1 минуту — побеждает!',
        emoji: '📰',
        materials: 'Тексты, секундомер',
        sourceTemplate: 'yunikosvyashchenie',
      },
      {
        id: 'yun_name',
        type: 'trial',
        title: 'Самое длинное имя',
        description: 'Построиться и найти обладателя самого длинного имени!',
        emoji: '📝',
        sourceTemplate: 'yunikosvyashchenie',
      },
      {
        id: 'yun_jump',
        type: 'trial',
        title: 'Прыгунята',
        description: '2-3 ребёнка соревнуются — кто прыгнет дальше!',
        emoji: '🦘',
        sourceTemplate: 'yunikosvyashchenie',
      },
      {
        id: 'yun_knots',
        type: 'trial',
        title: 'Морской волк',
        description: 'Каждый получает ленту — кто завяжет больше узлов. Звание «Морской волк»!',
        emoji: '⛵',
        materials: 'Туалетная бумага / ленты',
        sourceTemplate: 'yunikosvyashchenie',
      },
      {
        id: 'yun_laugh',
        type: 'trial',
        title: 'Самый весёлый смех',
        description:
          'Конкурс на самого смешливого. Снять на видео и показать — пускай ещё посмеются!',
        emoji: '😂',
        sourceTemplate: 'yunikosvyashchenie',
      },
    ],
  },
  {
    id: 'den_leta',
    name: 'День Лета (общелагерное)',
    squadName: 'Весь лагерь',
    emoji: '☀️',
    color: '#f97316',
    description:
      'Общелагерный праздник: Бропаспорта утром, игра по станциям (элементы всех посвящений), вечерний огонёк-концерт-бросвящение.',
    symbol: 'Бропаспорт',
    durationDays: 1,
    timeOfDay: 'весь день',
    blocks: [
      {
        id: 'dl_passport',
        type: 'custom',
        title: 'Раздача Бропаспортов',
        description: 'Утром: Крылья раздают всем Бропаспорта с 13 индивидуальными заданиями.',
        emoji: '📋',
        materials: 'Бропаспорта (A4)',
        sourceTemplate: 'den_leta',
      },
      {
        id: 'dl_tasks',
        type: 'trial',
        title: 'Индивидуальные задания',
        description:
          'До обеда: выбрать Наставника, Бродело для вожатых, убрать мусор, «20 поверженных комаров».',
        emoji: '✅',
        duration: 'до обеда',
        sourceTemplate: 'den_leta',
      },
      {
        id: 'dl_stations',
        type: 'trial',
        title: 'Игра по станциям',
        description:
          'После полдника: 12 станций с элементами из Посвящений всех отрядов — Обнимашкопокалипсис, Ухограф, Бротанцы и др.',
        emoji: '🎯',
        duration: '2-3 часа',
        sourceTemplate: 'den_leta',
      },
      {
        id: 'dl_evening',
        type: 'bonfire',
        title: 'Огонёк-концерт в клубе',
        description:
          'Свечи на полу, песни, видео, обращение к каждому отряду, вручение Брогалстуков, вожатский гимн.',
        emoji: '🔥',
        location: 'клуб',
        sourceTemplate: 'den_leta',
      },
      {
        id: 'dl_kapusta',
        type: 'custom',
        title: 'Самая большая в мире Капуста',
        description: 'Финал: «Все люди летом» под гитару + массовые обнимашки всем лагерем.',
        emoji: '🤗',
        sourceTemplate: 'den_leta',
      },
    ],
  },
];

// ---------------------------------------------------------------------------
// Collected block library (all blocks from all templates, for the block picker)
// ---------------------------------------------------------------------------

export const BLOCK_LIBRARY: InitiationBlock[] = INITIATION_TEMPLATES.flatMap((t) => t.blocks);

// ---------------------------------------------------------------------------
// Tips from Вожатификатор & Badge 5.9
// ---------------------------------------------------------------------------

export const TIPS: string[] = [
  'Посвящение должно быть добровольным — всегда!',
  'Придумай физический символ — галстук, значок, нить, ленту или жест.',
  'Создай «Книгу Посвящений» для передачи традиций будущим сменам.',
  'Сними видео или фото для истории лагеря.',
  'Сделай посвящение важной вехой смены, а не проходным событием.',
  'Лучшее время: середина смены, когда отряд уже сплочён.',
  'Тишина — мощный инструмент. Несколько испытаний в тишине создают мощную атмосферу.',
  'Испытания должны быть командными, а не индивидуальными.',
  'Финал у костра или на Огоньке — самый запоминающийся формат.',
  'Название посвящения должно быть уникальным и запоминающимся — оно станет традицией.',
];
