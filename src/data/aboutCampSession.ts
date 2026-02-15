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
}

export const aboutCampSession: AboutCampSession = {
  sessionTitle: 'Весенняя смена',
  dates: 'с 28 марта по 5 апреля',
  prices: [
    { amount: '25 800', label: 'стоимость путевки с учетом сертификата от г. Санкт-Петербурга на 9 дней', note: '+ сертификат' },
    { amount: '36 500,00 руб.', label: 'полная стоимость путевки на 9 дней без использования сертификата' },
  ],
};
