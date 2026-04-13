/**
 * Динамические факты о лагере (обновляются регулярно)
 * Источник истины: chatbot/prompts/facts.json. Синхронизация: npm run sync:cf-api-prompts (из корня репо)
 */
import { CAMP_FACTS as GENERATED_CAMP_FACTS } from './generated_camp_facts';

export type CampFacts = {
  address?: {
    campName?: string;
    base?: string;
    address?: string;
    route?: string;
  };
  contacts?: {
    phone?: string;
    email?: string;
    vk?: string;
    site?: string;
    telegram?: string;
    organizer?: string;
  };
  currentSeason?: {
    name?: string;
    dates?: string;
    price?: string;
    theme?: string;
  };
};

export const CAMP_FACTS: CampFacts = GENERATED_CAMP_FACTS;

/**
 * Форматирует факты о лагере в текстовый блок для промпта
 * Соответствует логике из chatbot/prompts/system_prompt.py (строки 78-119)
 */
export function formatCampFacts(facts: CampFacts): string {
  const lines: string[] = [];
  const addr = facts.address || {};
  const contacts = facts.contacts || {};
  const season = facts.currentSeason || {};

  // Адрес и маршрут
  if (addr.campName || addr.base || addr.address || addr.route) {
    lines.push('## Актуальные факты — Адрес и маршрут');
    if (addr.campName) lines.push(`- Лагерь: ${addr.campName}`);
    if (addr.base) lines.push(`- База: ${addr.base}`);
    if (addr.address) lines.push(`- Адрес: ${addr.address}`);
    if (addr.route) lines.push(`- Как добраться: ${addr.route}`);
  }

  // Контакты
  if (
    contacts.phone ||
    contacts.email ||
    contacts.vk ||
    contacts.site ||
    contacts.telegram ||
    contacts.organizer
  ) {
    lines.push('## Актуальные факты — Контакты');
    if (contacts.phone) lines.push(`- phone: ${contacts.phone}`);
    if (contacts.email) lines.push(`- email: ${contacts.email}`);
    if (contacts.vk) lines.push(`- vk: ${contacts.vk}`);
    if (contacts.site) lines.push(`- site: ${contacts.site}`);
    if (contacts.telegram) lines.push(`- telegram: ${contacts.telegram}`);
    if (contacts.organizer) lines.push(`- organizer: ${contacts.organizer}`);
  }

  // Текущая смена
  if (season.name || season.dates || season.price || season.theme) {
    lines.push('## Актуальные факты — Текущая смена');
    if (season.name) lines.push(`- Название: ${season.name}`);
    if (season.dates) lines.push(`- Даты: ${season.dates}`);
    if (season.price) lines.push(`- Стоимость: ${season.price}`);
    if (season.theme) lines.push(`- Тематика: ${season.theme}`);
  }

  return lines.length > 0 ? '\n\n' + lines.join('\n') : '';
}
