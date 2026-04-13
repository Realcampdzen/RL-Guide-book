/**
 * Shared constants and helpers for shift schedule (Беспорядок дня).
 * Used by RealDiaryDashboard and CounselorSquadDashboard.
 */
import type { MyActivityKey, ShiftScheduleKey } from '../types/userProgress';

export type ScheduleCell = { time?: string; note?: string };
export type ScheduleItem<K extends string> = { key: K; label: string };

export const SHIFT_ITEMS: Array<ScheduleItem<ShiftScheduleKey>> = [
  { key: 'wakeUp', label: 'Подъем' },
  { key: 'exercise', label: 'Зарядка' },
  { key: 'breakfast', label: 'Завтрак' },
  { key: 'morningEvent', label: 'Утреннее событие' },
  { key: 'lunch', label: 'Обед' },
  { key: 'quietTime', label: 'Тихий час' },
  { key: 'afternoonSnack', label: 'Полдник' },
  { key: 'dayEvent', label: 'Дневное событие' },
  { key: 'dinner', label: 'Ужин' },
  { key: 'eveningEvent', label: 'Вечернее событие' },
  { key: 'orlyatskyCircle', label: 'Орлятский круг' },
  { key: 'lightsOut', label: 'Отбой' },
];

export const ACTIVITY_ITEMS: Array<ScheduleItem<MyActivityKey>> = [
  { key: 'morning', label: 'Утро' },
  { key: 'day', label: 'День' },
  { key: 'evening', label: 'Вечер' },
  { key: 'additional', label: 'Дополнительно' },
];

export function hasValues<K extends string>(
  data: Partial<Record<K, ScheduleCell>> | undefined,
  items: Array<ScheduleItem<K>>
): boolean {
  return items.some(({ key }) =>
    Boolean((data?.[key]?.time || '').trim() || (data?.[key]?.note || '').trim())
  );
}
