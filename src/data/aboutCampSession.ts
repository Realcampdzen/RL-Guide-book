/**
 * Данные текущей смены лагеря для About Camp.
 * Обновлять при смене сезона.
 */
export interface SessionPrice {
  amount: string;
  label: string;
  note?: string;
}

export interface AboutCampSession {
  sessionTitle: string;
  dates: string;
  prices: SessionPrice[];
  message?: string;
  buttonText?: string;
}

export const aboutCampSession: AboutCampSession = {
  // Мы сбрасываем заголовок, чтобы AboutCampView не ломался от split(' ')
  sessionTitle: 'Следующая смена',
  dates: 'Даты уточняются',
  message:
    'Здесь скоро появится информация о следующей смене! А пока подписывайтесь на нас, чтобы не пропустить анонс.',
  buttonText: 'Следить за анонсами в Telegram',
  prices: [],
};
