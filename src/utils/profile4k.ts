/**
 * Профиль 4К — маппинг достижений на навыки: Коллаборация, Критическое мышление, Креативность, Коммуникация.
 */

import type { ILevelProgress } from '../types/userProgress';

export type Skill4K = 'collaboration' | 'critical' | 'creativity' | 'communication';

const SKILL_LABELS: Record<Skill4K, string> = {
  collaboration: 'Коллаборация',
  critical: 'Критическое мышление',
  creativity: 'Креативность',
  communication: 'Коммуникация'
};

const SKILL_EMOJI: Record<Skill4K, string> = {
  collaboration: '🤝',
  critical: '🧠',
  creativity: '🎨',
  communication: '💬'
};

/** Маппинг categoryId (первая часть badgeId) → навыки 4К */
const CATEGORY_TO_4K: Record<string, Skill4K[]> = {
  '1': ['creativity', 'critical'],       // За личные достижения
  '2': ['creativity', 'communication'],  // За легендарные дела
  '3': ['creativity', 'communication'],  // Медиа значки
  '4': ['collaboration'],                // За лагерные дела
  '5': ['collaboration', 'communication'], // За отрядные дела
  '6': ['critical'],                     // Гармония и порядок
  '7': ['creativity'],                   // За творческие достижения
  '8': ['collaboration', 'communication'], // Движки
  '9': ['communication', 'collaboration'], // Бро
  '10': ['collaboration'],               // Флаг отряда
  '11': ['critical'],                    // Осознанность
  '12': ['creativity', 'critical'],      // ИИ
  '13': ['collaboration', 'critical', 'creativity', 'communication'], // Софт-скиллз
  '14': ['collaboration', 'communication']  // Инспектор
};

export const ALL_SKILLS: Skill4K[] = ['collaboration', 'critical', 'creativity', 'communication'];

function getBaseId(rawId: string): string {
  const clean = String(rawId || '').trim();
  if (!clean) return '';
  const parts = clean.split('.').filter(Boolean);
  return parts.length >= 2 ? `${parts[0]}.${parts[1]}` : clean;
}

/**
 * Возвращает навыки 4К для значка по его ID.
 * По getBaseId извлекает categoryId (например, "13.11.1" → baseId "13.11" → categoryId "13").
 */
export function getBadge4kSkills(badgeId: string): Skill4K[] {
  const baseId = getBaseId(badgeId);
  const categoryId = baseId.split('.')[0] || baseId;
  return CATEGORY_TO_4K[categoryId] || ALL_SKILLS;
}

export function getSkillLabel(skill: Skill4K): string {
  return SKILL_LABELS[skill];
}

export function getSkillEmoji(skill: Skill4K): string {
  return SKILL_EMOJI[skill];
}

export type Profile4KRaw = Record<Skill4K, number>;

const ZERO_PROFILE: Profile4KRaw = {
  collaboration: 0,
  critical: 0,
  creativity: 0,
  communication: 0
};

/**
 * Подсчёт вклада по прогрессу и избранному.
 * Веса: achieved=2, in_progress=1, favorite=0.5
 */
export function compute4kProfile(params: {
  progress: Record<string, ILevelProgress>;
  favorites: string[];
}): Profile4KRaw {
  const raw: Profile4KRaw = { ...ZERO_PROFILE };

  for (const [levelId, p] of Object.entries(params.progress || {})) {
    if (p.status !== 'in_progress' && p.status !== 'achieved') continue;
    const weight = p.status === 'achieved' ? 2 : 1;
    const skills = getBadge4kSkills(levelId);
    for (const s of skills) {
      raw[s] = (raw[s] || 0) + weight;
    }
  }

  const seenFav = new Set<string>();
  for (const favId of params.favorites || []) {
    const baseId = favId.split('.').slice(0, 2).join('.') || favId;
    if (seenFav.has(baseId)) continue;
    seenFav.add(baseId);
    const skills = getBadge4kSkills(favId);
    for (const s of skills) {
      raw[s] = (raw[s] || 0) + 0.5;
    }
  }

  return raw;
}

/**
 * Нормализация к 0–100 (относительно максимума).
 * Если все нули — возвращаем нули.
 */
export function normalize4kProfile(raw: Profile4KRaw): Record<Skill4K, number> {
  const max = Math.max(...ALL_SKILLS.map(s => raw[s] || 0), 1);
  const result: Record<Skill4K, number> = {} as Record<Skill4K, number>;
  for (const s of ALL_SKILLS) {
    result[s] = Math.round(((raw[s] || 0) / max) * 100);
  }
  return result;
}

// --- Программа Реального Лагеря 2026 ---

export type ProgramTrack2026 = 'soft_skills' | 'counseling' | 'ai_creativity';

const PROGRAM_TRACK_LABELS: Record<ProgramTrack2026, string> = {
  soft_skills: '4r soft skills интенсив',
  counseling: 'Обучение вожатскому мастерству',
  ai_creativity: 'Нейросети для обучения и творчества'
};

const PROGRAM_TRACK_EMOJI: Record<ProgramTrack2026, string> = {
  soft_skills: '🎯',
  counseling: '👑',
  ai_creativity: '🤖'
};

/** Маппинг categoryId → треки программы 2026 (8,9,10,14 = counseling; 12 = ai_creativity; 13 = soft_skills) */
export const CATEGORY_TO_PROGRAM_2026: Record<string, ProgramTrack2026> = {
  '8': 'counseling',
  '9': 'counseling',
  '10': 'counseling',
  '12': 'ai_creativity',
  '13': 'soft_skills',
  '14': 'counseling'
};

export const ALL_PROGRAM_TRACKS: ProgramTrack2026[] = ['soft_skills', 'counseling', 'ai_creativity'];

/** Возвращает строку с ID категорий программы 2026 (например "8, 9, 10, 12, 13, 14") */
export const getProgram2026CategoryIds = (): string =>
  Object.keys(CATEGORY_TO_PROGRAM_2026)
    .sort((a, b) => Number(a) - Number(b))
    .join(', ');

/**
 * Возвращает трек программы 2026 для значка по categoryId.
 * Категории 1–7, 11 не входят в программу 2026 (возвращается null).
 */
export function getBadgeProgram2026Track(badgeId: string): ProgramTrack2026 | null {
  const baseId = getBaseId(badgeId);
  const categoryId = baseId.split('.')[0] || baseId;
  return CATEGORY_TO_PROGRAM_2026[categoryId] ?? null;
}

export function getProgramTrackLabel(track: ProgramTrack2026): string {
  return PROGRAM_TRACK_LABELS[track];
}

export function getProgramTrackEmoji(track: ProgramTrack2026): string {
  return PROGRAM_TRACK_EMOJI[track];
}

export type ProgramProfileRaw = Record<ProgramTrack2026, number>;

const ZERO_PROGRAM: ProgramProfileRaw = {
  soft_skills: 0,
  counseling: 0,
  ai_creativity: 0
};

/**
 * Подсчёт вклада по программе 2026.
 * Веса: achieved=2, in_progress=1, favorite=0.5
 * Учитываются только badges из категорий 8, 9, 10, 12, 13, 14.
 */
export function computeProgram2026Profile(params: {
  progress: Record<string, ILevelProgress>;
  favorites: string[];
}): ProgramProfileRaw {
  const raw: ProgramProfileRaw = { ...ZERO_PROGRAM };

  for (const [levelId, p] of Object.entries(params.progress || {})) {
    if (p.status !== 'in_progress' && p.status !== 'achieved') continue;
    const track = getBadgeProgram2026Track(levelId);
    if (!track) continue;
    const weight = p.status === 'achieved' ? 2 : 1;
    raw[track] = (raw[track] || 0) + weight;
  }

  const seenFav = new Set<string>();
  for (const favId of params.favorites || []) {
    const baseId = favId.split('.').slice(0, 2).join('.') || favId;
    if (seenFav.has(baseId)) continue;
    seenFav.add(baseId);
    const track = getBadgeProgram2026Track(favId);
    if (!track) continue;
    raw[track] = (raw[track] || 0) + 0.5;
  }

  return raw;
}

/**
 * Нормализация профиля программы 2026 к 0–100 (относительно максимума).
 */
export function normalizeProgram2026Profile(raw: ProgramProfileRaw): Record<ProgramTrack2026, number> {
  const max = Math.max(...ALL_PROGRAM_TRACKS.map(t => raw[t] || 0), 1);
  const result: Record<ProgramTrack2026, number> = {} as Record<ProgramTrack2026, number>;
  for (const t of ALL_PROGRAM_TRACKS) {
    result[t] = Math.round(((raw[t] || 0) / max) * 100);
  }
  return result;
}
