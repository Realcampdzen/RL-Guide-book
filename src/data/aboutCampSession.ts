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
  sessionTitle: 'Осенняя смена',
  dates: 'Даты скоро появятся',
  message: 'Летнюю смену мы вынуждены пропустить, так как не смогли найти базу, которая бы полностью отвечала нашим высоким стандартам качества и безопасности. Но прямо сейчас мы готовим просто пушечную Осеннюю смену!',
  buttonText: 'Следить за анонсом в Telegram',
  prices: [],
};
