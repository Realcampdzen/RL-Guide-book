/**
 * User roles for Путеводитель.
 * See docs/FEATURE_AUTH_ROLES_DVIZHKI_PLAN.md
 */
export type UserRole = 'traveler' | 'participant' | 'parent' | 'counselor' | 'educator' | 'shift_leader' | 'camp_director' | 'developer';

export const DEFAULT_ROLE: UserRole = 'traveler';

/** Roles that have access to chat/ИИ */
export const CHAT_ALLOWED_ROLES: UserRole[] = ['participant', 'parent', 'counselor', 'educator', 'shift_leader', 'camp_director', 'developer'];

export function canUseChat(role: UserRole): boolean {
  return CHAT_ALLOWED_ROLES.includes(role);
}

/** Отрядные/лагерные панели видны всем, включая traveler (доступ ограничивается гейтами действий). */
export function canSeeOtradBlocks(role: UserRole): boolean {
  return Boolean(role);
}

/** Режим только просмотра. Родитель играет как участник (свой кабинет), не как наблюдатель; не используется для основного ЛК. */
export function isReadOnlyRole(_role: UserRole): boolean {
  return false;
}

/** Traveler видит панели, но не может выполнять внешние/дорогие действия. */
export function isTraveler(role: UserRole): boolean {
  return role === 'traveler';
}

/** Доступ к внешним "дорогим" операциям (чат/онлайн API/генерации). */
export function canUseExpensiveActions(role: UserRole): boolean {
  return role !== 'traveler';
}

/** Отправка заявки на подтверждение уровня: участник (и developer). Родитель в M2 — read-only к прогрессу ребёнка. */
export function canRequestBadgeApproval(role: UserRole): boolean {
  return role === 'participant' || role === 'developer';
}

/** Staff (или developer) может разбирать входящие заявки. */
export function canModerateBadgeApprovals(role: UserRole): boolean {
  return role === 'counselor' || role === 'educator' || role === 'shift_leader' || role === 'camp_director' || role === 'developer';
}

/** Показывать панель «Входящие заявки» без песочницы: родитель + staff роли + разработчик. */
export function showEventsPanelForRole(role: UserRole): boolean {
  return role === 'parent' || role === 'counselor' || role === 'educator' || role === 'shift_leader' || role === 'camp_director' || role === 'developer';
}

/** Может создавать отряд из вожатых (приглашать вожатых в свой отряд): руководитель смены, начальник лагеря, разработчик. */
export function canCreateCounselorSquad(role: UserRole): boolean {
  return role === 'shift_leader' || role === 'camp_director' || role === 'developer';
}

/** Может создавать смены и отряды, выдавать коды (staff flow): руководитель смены, начальник лагеря и разработчик. */
export function canCreateShiftsAndSquads(role: UserRole): boolean {
  return role === 'shift_leader' || role === 'camp_director' || role === 'developer';
}

/** Подписи ролей для UI (переключатель ролей, панель «Сгенерировать код»). */
export const ROLE_LABELS: Record<UserRole, string> = {
  traveler: 'Путешественник',
  participant: 'Участник смены',
  parent: 'Родитель',
  counselor: 'Вожатый',
  educator: 'Педагог',
  shift_leader: 'Старший Вожатый',
  camp_director: 'Начальник Лагеря',
  developer: 'Разработчик'
};

/** Подпись под названием роли (для отображения в две строки: крупно название, мелко подпись). */
export const ROLE_SUBTITLES: Partial<Record<UserRole, string>> = {
  shift_leader: 'руководитель смены',
  educator: 'кружковод, руководитель мастерской',
  camp_director: 'создай кабинет Лагеря, взаимодействуй и получай обратную связь и статистику от всех участников',
};

/** Явный порядок ролей для списков (селекты, переключатель). */
export const ROLE_ORDER: UserRole[] = ['traveler', 'participant', 'parent', 'counselor', 'educator', 'shift_leader', 'camp_director', 'developer'];

/** Единый источник отображения роли: заголовок и опциональная подпись (для двухстрочного вывода). */
export function getRoleDisplay(role: UserRole): { title: string; subtitle?: string } {
  const title = ROLE_LABELS[role];
  const subtitle = ROLE_SUBTITLES[role];
  return subtitle ? { title, subtitle } : { title };
}
