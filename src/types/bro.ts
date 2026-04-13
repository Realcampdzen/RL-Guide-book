export interface BroDeed {
  id: string;
  text: string;
  description: string;
}

export interface BroDayMission {
  day: number;
  title: string;
  emoji: string;
  deeds: BroDeed[];
}

export const broMissions: BroDayMission[] = [
  {
    day: 1,
    title: 'Теория и Основы',
    emoji: '📘',
    deeds: [
      {
        id: 'b1_lecture',
        text: 'Прослушать лекцию по лагерной педагогике',
        description: 'Основы общения с детьми и принципы Бро-Движения.',
      },
      {
        id: 'b1_cases',
        text: 'Участие в обсуждении вожатских кейсов',
        description: 'Разбор реальных ситуаций из жизни отряда.',
      },
      {
        id: 'b1_chants',
        text: 'Знать и громко кричать отрядные кричалки',
        description: 'Голос отряда — это его энергия!',
      },
    ],
  },
  {
    day: 2,
    title: 'Культура и Дух',
    emoji: '🎭',
    deeds: [
      {
        id: 'b2_dances',
        text: 'Знать и танцевать отрядные танцы',
        description: 'Движение в ритме Бро-Движения.',
      },
      {
        id: 'b2_traditions',
        text: 'Знать отрядные традиции',
        description: 'История и ритуалы, которые нас объединяют.',
      },
      {
        id: 'b2_meme',
        text: 'Знать и понимать отрядный мем',
        description: 'Юмор — важная часть нашей идентичности.',
      },
    ],
  },
  {
    day: 3,
    title: 'Действие и Артефакт',
    emoji: '🔥',
    deeds: [
      {
        id: 'b3_activity',
        text: 'Провести собственное отрядное дело',
        description: 'Практика лидерства и организации.',
      },
      {
        id: 'b3_artifact',
        text: 'Оформить физический Бропаспорт',
        description: 'Создать красивый артефакт с твердой обложкой.',
      },
      {
        id: 'b3_approval',
        text: 'Получить подписи вожатых и админа',
        description: 'Финальный апрув твоего пути в Бро-Движение.',
      },
    ],
  },
];
