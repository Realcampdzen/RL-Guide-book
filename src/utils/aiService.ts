export interface AiSloganContext {
  kind:
    | 'start_route'
    | 'route_manifest_challenge'
    | 'achieved_level'
    | 'favorite'
    | 'progress_summary'
    | 'progress_callout'
    | 'stories_reels_meme';
  badgeTitle?: string;
  levelLabel?: string;
  rank?: string;
  nickname?: string;
  /** For progress_summary: closed levels count */
  totalLevelsAchieved?: number;
  /** For progress_summary: badges in path */
  totalBadgesStarted?: number;
  /** Badge titles in path (for progress card context) */
  badgeTitlesInPath?: string[];
  /** Favorite badge titles (for progress card context) */
  favoriteBadgeTitles?: string[];
}

import { canUseChat } from '../types/authRole';
import { fireOn401, loadAuthStorage } from './authStorage';

function getChatHeaders(chatbotUrl: string): Record<string, string> {
  const h: Record<string, string> = { 'Content-Type': 'application/json' };
  if (chatbotUrl.includes('putevoditel')) {
    const token = loadAuthStorage().accessToken;
    if (token) h['Authorization'] = `Bearer ${token}`;
  }
  return h;
}

function handleChatResponse(response: Response): boolean {
  if (response.status === 401) {
    fireOn401();
    return false;
  }
  return true;
}

export type AiSloganResult = string | { slogan: string; callout: string | null };

/** Skip AI calls for traveler role (no chat access). */
function shouldSkipAiCall(): boolean {
  try {
    const auth = loadAuthStorage();
    return !canUseChat(auth.role);
  } catch {
    return false;
  }
}

export const fetchAiSlogan = async (ctx: AiSloganContext): Promise<AiSloganResult | null> => {
  if (shouldSkipAiCall()) return null;
  const hostname = window.location.hostname;
  const useLocalApi = import.meta.env.DEV || hostname === 'localhost' || hostname === '127.0.0.1';
  const chatbotUrl = useLocalApi
    ? '/api/chat'
    : 'https://real-vibe-ai-studio.pages.dev/api/putevoditel/chat';

  const prompt = (() => {
    switch (ctx.kind) {
      case 'start_route':
        return (
          import.meta.env.VITE_PROMPT_START_ROUTE ||
          `Ты — НейроВалюша, ИИ-проводник Реального Лагеря с реальнолагерным вайбом. Придумай ОДНУ КОРОТКУЮ (до 10 слов) вдохновляющую фразу о том, что игрок выбрал маршрут к значку "${ctx.badgeTitle}". Используй лагерный сленг, космические метафоры (звёзды, путь, орбита) или обращение "Бро". Без кавычек.`
        );
      case 'route_manifest_challenge':
        return (
          import.meta.env.VITE_PROMPT_MANIFEST ||
          `Ты — НейроВалюша. Игрок выбрал маршрут к значку "${ctx.badgeTitle || 'новый значок'}". Придумай ОДНО короткое конкретное задание на сегодня (вызов), один шаг по пути к этому значку, до 10 слов. Тон: лагерный вайб, можно "Бро". Без кавычек.`
        );
      case 'achieved_level':
        return (
          import.meta.env.VITE_PROMPT_ACHIEVED ||
          `Ты — НейроВалюша с лагерным вайбом. Придумай ОДНУ КОРОТКУЮ (до 10 слов) победную или мемную фразу о том, что уровень "${ctx.levelLabel}" значка "${ctx.badgeTitle}" выполнен. Можно с космической метафорой или "Бро". Без кавычек.`
        );
      case 'favorite':
        return (
          import.meta.env.VITE_PROMPT_FAVORITE ||
          `Ты — НейроВалюша. Придумай ОДНУ КОРОТКУЮ (до 10 слов) фразу о том, что значок "${ctx.badgeTitle}" теперь в избранном — мечта и цель, можно с вайбом или "Бро". Без кавычек.`
        );
      case 'progress_summary': {
        const achieved = ctx.totalLevelsAchieved ?? 0;
        const started = ctx.totalBadgesStarted ?? 0;
        const inPath =
          ctx.badgeTitlesInPath && ctx.badgeTitlesInPath.length > 0
            ? ctx.badgeTitlesInPath.join(', ')
            : 'пока нет';
        const inFav =
          ctx.favoriteBadgeTitles && ctx.favoriteBadgeTitles.length > 0
            ? ctx.favoriteBadgeTitles.join(', ')
            : 'пока нет';

        const template =
          import.meta.env.VITE_PROMPT_SUMMARY ||
          `Ты — НейроВалюша, голос Путеводителя Реального Лагеря (педагогика, маршруты развития, рост). Контекст: игрок {{nickname}}, ранг {{rank}}, закрыто уровней {{achieved}}, в пути значков {{started}}. Значки в пути: {{inPath}}. В избранном: {{inFav}}. Учитывай направление и приоритеты (какие сферы/темы выбраны), можно обыграть в слогане.

Верни ровно ДВЕ строки через вертикальную черту (|), без кавычек.
1) Первая строка — слоган для карточки (до 10–12 слов): тон поддерживающий, реальнолагерный вайб, лагерный сленг или космические метафоры (звёзды, орбита, маршрут), можно "Бро". Без соревнования и призывов "обойти" или "кто больше".
2) Вторая строка — короткая подпись про прогресс (до 6–8 слов): отрази ранг и цифры, с лёгким юмором и педагогическим тоном.

Формат ответа: слоган|подпись`;
        return template
          .replace('{{nickname}}', ctx.nickname || 'Искатель')
          .replace('{{rank}}', ctx.rank || 'в пути')
          .replace('{{achieved}}', String(achieved))
          .replace('{{started}}', String(started))
          .replace('{{inPath}}', inPath)
          .replace('{{inFav}}', inFav);
      }
      case 'progress_callout': {
        const achieved = ctx.totalLevelsAchieved ?? 0;
        const started = ctx.totalBadgesStarted ?? 0;
        const template =
          import.meta.env.VITE_PROMPT_CALLOUT ||
          `Ты — НейроВалюша, голос Путеводителя Реального Лагеря. Нужна ОДНА короткая строка (до 6–8 слов) для подписи под карточкой прогресса. Контекст: игрок {{nickname}}, ранг {{rank}}, закрыто уровней {{achieved}}, в пути значков {{started}}. Требования: лёгкий юмор, педагогический тон, лагерный вайб. Не повторяй формулировку «N уровней закрыто, M в пути» — интерпретируй прогресс по-другому (например: «Три значка в пути — выбор сделан», «Стартуем: есть куда расти», «Участник на маршруте»). Без кавычек.`;
        return template
          .replace('{{nickname}}', ctx.nickname || 'Искатель')
          .replace('{{rank}}', ctx.rank || 'в пути')
          .replace('{{achieved}}', String(achieved))
          .replace('{{started}}', String(started));
      }
      case 'stories_reels_meme': {
        const achieved = ctx.totalLevelsAchieved ?? 0;
        const started = ctx.totalBadgesStarted ?? 0;
        const template =
          import.meta.env.VITE_PROMPT_STORIES ||
          `Ты — НейроВалюша с мемным тоном для сторис и рилсов. Контекст: игрок {{nickname}}, ранг {{rank}}, закрыто уровней {{achieved}}, в пути значков {{started}}.

Придумай ОДНУ короткую фразу (6–10 слов) в стиле сторис/рилсов. Разрешённые форматы: «когда…», «пока все… а я…», «этот момент когда», «я и мои N уровней» и подобные. Лагерный/космический вайб, можно «Бро». Ответ — одна строка, без кавычек.`;
        return template
          .replace('{{nickname}}', ctx.nickname || 'Искатель')
          .replace('{{rank}}', ctx.rank || 'в пути')
          .replace('{{achieved}}', String(achieved))
          .replace('{{started}}', String(started));
      }
      default:
        return 'Вперед к новым звездам, Бро!';
    }
  })();

  try {
    const response = await fetch(chatbotUrl, {
      method: 'POST',
      headers: getChatHeaders(chatbotUrl),
      body: JSON.stringify({
        message: prompt,
        user_id: 'social_gen',
        context: { is_social_prompt: true },
      }),
    });

    if (!handleChatResponse(response) || !response.ok) return null;
    const data = await response.json();
    const reply = (data.reply || data.response || '').replace(/["«»]/g, '').trim();
    if (!reply) return null;

    if (ctx.kind === 'progress_summary') {
      const idx = reply.indexOf('|');
      if (idx > 0) {
        const slogan = reply.slice(0, idx).trim();
        const callout = reply.slice(idx + 1).trim() || null;
        return { slogan: slogan || reply, callout };
      }
      return { slogan: reply, callout: null };
    }

    return reply;
  } catch (e) {
    console.error('Failed to fetch AI slogan', e);
    return null;
  }
};

// --- Pedagogy 4K (short characterization for progress card) ---

export type Pedagogy4kInput = {
  badgeTitlesInPath?: string[];
  favoriteBadgeTitles?: string[];
  rank?: string;
  nickname?: string;
};

export const fetchPedagogy4k = async (input: Pedagogy4kInput): Promise<string | null> => {
  if (shouldSkipAiCall()) return null;
  const hostname = window.location.hostname;
  const useLocalApi = import.meta.env.DEV || hostname === 'localhost' || hostname === '127.0.0.1';
  const chatbotUrl = useLocalApi
    ? '/api/chat'
    : 'https://real-vibe-ai-studio.pages.dev/api/putevoditel/chat';

  const inPath =
    input.badgeTitlesInPath && input.badgeTitlesInPath.length > 0
      ? input.badgeTitlesInPath.join(', ')
      : 'пока нет';
  const inFav =
    input.favoriteBadgeTitles && input.favoriteBadgeTitles.length > 0
      ? input.favoriteBadgeTitles.join(', ')
      : 'пока нет';

  const template =
    import.meta.env.VITE_PROMPT_PEDAGOGY_4K ||
    `Ты — НейроВалюша, голос Путеводителя Реального Лагеря с опорой на педагогику и 4К-навыки (критическое мышление, креативность, коммуникация, коллаборация).

Контекст: игрок {{nickname}}, ранг {{rank}}. Значки в пути: {{inPath}}. В избранном: {{inFav}}.

Задача: по этим спискам значков верни ОДНУ короткую фразу (строго 2–5 слов) — обобщающую характеристику деятельности в педагогическом ключе с точки зрения 4К-навыков. Примеры: «Критическое мышление и лидерство», «Фокус на коммуникации и творчестве», «Развиваешь коллаборацию и креативность». Без мемов и сленга, тон поддерживающий.

Запрещено: предложения типа «Вот несколько идей», «Чтобы получить значки», списки, советы, инструкции.
Ответ — только одна фраза из 2–5 слов, как в примерах. Без кавычек.`;

  const message = template
    .replace('{{nickname}}', input.nickname || 'Искатель')
    .replace('{{rank}}', input.rank || 'в пути')
    .replace('{{inPath}}', inPath)
    .replace('{{inFav}}', inFav);

  try {
    const response = await fetch(chatbotUrl, {
      method: 'POST',
      headers: getChatHeaders(chatbotUrl),
      body: JSON.stringify({
        message,
        user_id: 'pedagogy_4k',
        context: { is_social_prompt: true },
      }),
    });

    if (!handleChatResponse(response) || !response.ok) return null;
    const data = await response.json();
    const reply = (data.reply ?? data.response ?? '').replace(/["«»]/g, '').trim();
    if (!reply) return null;

    const wordCount = reply.split(/\s+/).length;
    if (wordCount > 8) return null;

    const lower = reply.toLowerCase();
    const forbiddenStarts = ['вот несколько', 'идеи для', 'чтобы получить'];
    if (forbiddenStarts.some((s) => lower.startsWith(s))) return null;

    return reply.slice(0, 60);
  } catch (e) {
    console.error('Failed to fetch pedagogy 4K', e);
    return null;
  }
};

// --- Vibe Check (meme block for stories/reels) ---

export type VibeCheckInput =
  | {
      variant: 'badge';
      badgeTitle: string;
      categoryTitle: string;
      description?: string;
    }
  | {
      variant: 'profile';
      rank?: string;
      nickname?: string;
      totalLevelsAchieved?: number;
      totalBadgesStarted?: number;
      badgeTitlesInPath?: string[];
      favoriteBadgeTitles?: string[];
    };

export type VibeCheckResult = {
  meme_header: string;
  meme_text: string;
  stat_buff: string;
};

const VIBE_CHECK_SYSTEM =
  import.meta.env.VITE_PROMPT_VIBE_SYSTEM ||
  `Ты — генератор вирусных подписей для приложения детского лагеря "Реальный Лагерь". Твоя целевая аудитория — подростки (Gen Z и Gen Alpha). Твоя задача — взять серьезное описание значка или прогресса и превратить его в смешной, жизненный или мемный мини-контент для сторис.

ТЫ ИСПОЛЬЗУЕШЬ СЛЕНГ: вайб, краш, кринж (аккуратно), имба, соло, база, POV, тюбик, масик, чечик, сигма, рил, жиза, ачивка, aura points.

ТВОЯ ЗАДАЧА СГЕНЕРИРОВАТЬ ОТВЕТ В ФОРМАТЕ JSON (строго одна строка, без переносов):
{"meme_header":"...","meme_text":"...","stat_buff":"..."}

ПРАВИЛА:
- meme_header: короткий заголовок (POV, ЖИЗА, ВОПРОС, тот самый момент) — до 50 символов.
- meme_text: смешная ситуация или панчлайн, до 100 символов. Можно 1–2 эмодзи в тему.
- stat_buff: выдуманный игровой бонус (например: +500 к харизме, Защита от кринжа 80 lvl) — до 50 символов.
- Юмор добрый, но "на грани" — как в популярных пабликах. Без мата и негатива.
- Не используй длинные предложения.`;

const trimField = (s: string, max: number): string =>
  String(s || '')
    .trim()
    .slice(0, max);

export const fetchVibeCheck = async (input: VibeCheckInput): Promise<VibeCheckResult | null> => {
  if (shouldSkipAiCall()) return null;
  const hostname = window.location.hostname;
  const useLocalApi = import.meta.env.DEV || hostname === 'localhost' || hostname === '127.0.0.1';
  const chatbotUrl = useLocalApi
    ? '/api/chat'
    : 'https://real-vibe-ai-studio.pages.dev/api/putevoditel/chat';

  const badgeTemplate =
    import.meta.env.VITE_PROMPT_VIBE_BADGE ||
    `Название значка: {{badgeTitle}}
Категория: {{categoryTitle}}
Описание: {{description}}

Сгенерируй мемный контент для этого значка. Ответь ТОЛЬКО валидным JSON в одну строку: {"meme_header":"...","meme_text":"...","stat_buff":"..."}`;

  const profileTemplate =
    import.meta.env.VITE_PROMPT_VIBE_PROFILE ||
    `Прогресс игрока в Путеводителе: ник {{nickname}}, ранг {{rank}}, закрыто уровней {{achieved}}, в пути значков {{started}}. Значки в пути: {{inPath}}. В избранном: {{inFav}}.

Сгенерируй мемный контент для карточки прогресса. Комментарий в meme_header / meme_text / stat_buff должен отражать направление и приоритеты человека по этим значкам (темы, сферы, «вайб» выбора), а не только ранг и цифры. Ответь ТОЛЬКО валидным JSON в одну строку: {"meme_header":"...","meme_text":"...","stat_buff":"..."}`;

  const inputBlock =
    input.variant === 'badge'
      ? badgeTemplate
          .replace('{{badgeTitle}}', input.badgeTitle)
          .replace('{{categoryTitle}}', input.categoryTitle)
          .replace('{{description}}', input.description || '(не указано)')
      : profileTemplate
          .replace('{{nickname}}', input.nickname || 'Искатель')
          .replace('{{rank}}', input.rank || 'в пути')
          .replace('{{achieved}}', String(input.totalLevelsAchieved ?? 0))
          .replace('{{started}}', String(input.totalBadgesStarted ?? 0))
          .replace(
            '{{inPath}}',
            input.badgeTitlesInPath && input.badgeTitlesInPath.length > 0
              ? input.badgeTitlesInPath.join(', ')
              : 'пока нет'
          )
          .replace(
            '{{inFav}}',
            input.favoriteBadgeTitles && input.favoriteBadgeTitles.length > 0
              ? input.favoriteBadgeTitles.join(', ')
              : 'пока нет'
          );

  const message = `${VIBE_CHECK_SYSTEM}\n\n---\n\nВХОДНЫЕ ДАННЫЕ:\n\n${inputBlock}`;

  try {
    const response = await fetch(chatbotUrl, {
      method: 'POST',
      headers: getChatHeaders(chatbotUrl),
      body: JSON.stringify({
        message,
        user_id: 'vibe_check',
        context: { is_social_prompt: true },
      }),
    });

    if (!handleChatResponse(response) || !response.ok) return null;
    const data = await response.json();
    const raw = (data.reply ?? data.response ?? '').replace(/["«»]/g, '"').trim() || '';
    if (!raw) return null;

    // Try to extract JSON from reply (model might wrap in markdown or add text)
    let jsonStr = raw;
    const braceStart = raw.indexOf('{');
    if (braceStart >= 0) {
      let depth = 0;
      let end = -1;
      for (let i = braceStart; i < raw.length; i++) {
        if (raw[i] === '{') depth++;
        if (raw[i] === '}') {
          depth--;
          if (depth === 0) {
            end = i;
            break;
          }
        }
      }
      if (end > braceStart) jsonStr = raw.slice(braceStart, end + 1);
    }

    const parsed = JSON.parse(jsonStr) as {
      meme_header?: string;
      meme_text?: string;
      stat_buff?: string;
    };
    const meme_header = trimField(parsed.meme_header ?? '', 50);
    const meme_text = trimField(parsed.meme_text ?? '', 120);
    const stat_buff = trimField(parsed.stat_buff ?? '', 50);
    if (!meme_header && !meme_text && !stat_buff) return null;

    return { meme_header, meme_text, stat_buff };
  } catch (e) {
    console.error('Failed to fetch vibe check', e);
    return null;
  }
};

// --- Badge Plan (персонализированный план получения значка) ---

export type BadgePlanInput = {
  badgeId: string;
  badgeTitle: string;
  badgeLevel?: string;
  badgeCriteria?: string;
  badgeNameExplanation?: string;
  badgeSkillTips?: string;
  badgeConfirmation?: string;
  currentDay: number;
  shiftLength?: 21 | 9;
  squadProgramGrid?: string;
  squadPlan3d?: string;
  squadProgram3d?: string;
  campProgram3d?: string;
  priority?: string;
  userPlanDraft?: string; // Текст участника «мой план»
  existingChecklist?: string[]; // Уже сформированные шаги
};

export type BadgePlanResult = {
  planText: string;
  checklistItems: string[];
};

export type StructureUserPlanInput = {
  badgeId: string;
  badgeTitle: string;
  myPlanDraft: string;
};

export type StructureUserPlanResult = {
  checklistItems: string[];
};

const CAMP_PROGRAM_URL = '/ai-data/camp-program-template.json';

const getChatbotUrl = () => {
  const hostname = typeof window !== 'undefined' ? window.location.hostname : '';
  const useLocalApi = import.meta.env.DEV || hostname === 'localhost' || hostname === '127.0.0.1';
  return useLocalApi ? '/api/chat' : 'https://real-vibe-ai-studio.pages.dev/api/putevoditel/chat';
};

/** Проверяет доступность API чат-бота (для локальной разработки). В production возвращает true. */
export const checkPlanApiAvailable = async (): Promise<boolean> => {
  if (shouldSkipAiCall()) return false;
  const hostname = typeof window !== 'undefined' ? window.location.hostname : '';
  const useLocalApi = import.meta.env.DEV || hostname === 'localhost' || hostname === '127.0.0.1';
  if (!useLocalApi) return true;
  try {
    const url = getChatbotUrl();
    const res = await fetch(url, {
      method: 'POST',
      headers: getChatHeaders(url),
      body: JSON.stringify({ message: 'ping', user_id: 'health_check' }),
    });
    if (res.status === 401) fireOn401();
    return res.status > 0 && res.status !== 401;
  } catch {
    return false;
  }
};

/** Извлекает 3–7 конкретных шагов из текста участника */
export const structureUserPlan = async (
  input: StructureUserPlanInput
): Promise<StructureUserPlanResult | null> => {
  const chatbotUrl = getChatbotUrl();
  const template =
    import.meta.env.VITE_PROMPT_STRUCTURE_PLAN ||
    `Ты — НейроВалюша, ИИ-проводник Реального Лагеря. Участник написал свои мысли о том, как получить значок «{{badgeTitle}}».

ТЕКСТ УЧАСТНИКА:
{{myPlanDraft}}

Задача: извлеки из текста 3–7 конкретных шагов (действий), которые участник может выполнить. Сформулируй каждый шаг кратко и понятно.

ФОРМАТ ОТВЕТА (строго): только список шагов, каждый с новой строки в формате:
- Шаг 1: ...
- Шаг 2: ...
(или с номерами 1. ... 2. ...)`;

  const message = template
    .replace('{{badgeTitle}}', input.badgeTitle)
    .replace('{{myPlanDraft}}', input.myPlanDraft);

  try {
    const response = await fetch(chatbotUrl, {
      method: 'POST',
      headers: getChatHeaders(chatbotUrl),
      body: JSON.stringify({
        message,
        user_id: 'structure_plan',
        context: { is_social_prompt: true },
      }),
    });
    if (!handleChatResponse(response)) return null;
    if (!response.ok) {
      const body = await response.text();
      console.error(
        '[structureUserPlan] API error:',
        response.status,
        response.statusText,
        body.slice(0, 200)
      );
      return null;
    }
    const data = await response.json();
    const reply = (data.reply || data.response || '').trim();
    if (!reply) return null;

    const lines = reply
      .split('\n')
      .map((s: string) => s.trim())
      .filter(Boolean);
    const checklistItems: string[] = [];
    for (const line of lines) {
      const dashMatch = line.match(/^[-*]\s*(.+)$/);
      const numMatch = line.match(/^\d+[.)]\s*(.+)$/);
      if (dashMatch || numMatch) {
        const text = (dashMatch?.[1] || numMatch?.[1] || '')
          .replace(/^[Шш]аг\s*\d+[.:]\s*/i, '')
          .trim();
        if (text) checklistItems.push(text);
      }
    }
    return checklistItems.length > 0 ? { checklistItems } : null;
  } catch (e) {
    console.error('Failed to structure user plan', e);
    return null;
  }
};

export const fetchBadgePlan = async (input: BadgePlanInput): Promise<BadgePlanResult | null> => {
  if (shouldSkipAiCall()) return null;
  const hostname = window.location.hostname;
  const useLocalApi = import.meta.env.DEV || hostname === 'localhost' || hostname === '127.0.0.1';
  const base = import.meta.env.BASE_URL || '';
  const chatbotUrl = useLocalApi
    ? '/api/chat'
    : 'https://real-vibe-ai-studio.pages.dev/api/putevoditel/chat';

  const shiftLen = input.shiftLength ?? 21;
  let campProgramSummary = '';
  const campUrl = base + CAMP_PROGRAM_URL.replace(/^\//, '');
  try {
    const resp = await fetch(campUrl);
    if (resp.ok) {
      const data = await resp.json();
      if (data.days && Array.isArray(data.days)) {
        const days = data.days.slice(0, shiftLen);
        campProgramSummary = days
          .slice(Math.max(0, input.currentDay - 2), Math.min(days.length, input.currentDay + 4))
          .map(
            (d: { day: number; theme: string; activities?: string[] }) =>
              `День ${d.day}: ${d.theme} — ${(d.activities || []).join(', ')}`
          )
          .join('\n');
      }
    } else {
      console.warn('[fetchBadgePlan] camp-program fetch non-OK:', resp.status, campUrl);
    }
  } catch (e) {
    console.warn('[fetchBadgePlan] Failed to load camp-program-template:', campUrl, e);
  }

  const squadGridBlock = input.squadProgramGrid?.trim()
    ? `Программа отряда по план-сетке:\n${input.squadProgramGrid}`
    : '(не указана)';
  const squadPlanBlock = input.squadPlan3d?.trim()
    ? `План вожатых на 3 дня:\n${input.squadPlan3d}`
    : input.squadProgram3d?.trim()
      ? `План вожатых на 3 дня:\n${input.squadProgram3d}`
      : '(не указан)';
  const campBlock = input.campProgram3d?.trim()
    ? `Программа лагеря на 3 дня:\n${input.campProgram3d}`
    : '(не указана)';
  const priorityBlock = input.priority || 'оба равны';

  const hasUserProgram = !!(
    input.squadProgramGrid?.trim() ||
    input.squadPlan3d?.trim() ||
    input.campProgram3d?.trim()
  );
  const programHint =
    !hasUserProgram && campProgramSummary
      ? ' Участник не указал детальную программу отряда/лагеря — используй типовую программу ниже и общие формулировки с указанием дня.'
      : !campProgramSummary
        ? ' Программа не загружена — формулируй шаги с указанием дня и общих мероприятий.'
        : '';

  const userBlock = input.userPlanDraft?.trim()
    ? `УЧАСТНИК НАПИСАЛ СВОЙ ПЛАН:\n${input.userPlanDraft}\n\n`
    : '';
  const existingBlock =
    input.existingChecklist && input.existingChecklist.length > 0
      ? `УЖЕ ЕСТЬ ШАГИ (дополни/уточни с учётом программы):\n${input.existingChecklist.map((s, i) => `${i + 1}. ${s}`).join('\n')}\n\n`
      : '';
  const personalizationRule = `КРИТИЧЕСКИ ВАЖНО: каждый шаг должен содержать название мероприятия из программы и день. Привяжи каждый шаг к конкретному дню и мероприятию. Формулируй так: «На [название мероприятия] / в День N — [действие]». Избегай общих фраз («участвуй в делах», «помогай товарищам») — только конкретика: где, когда, что делать.${programHint}`;
  const taskInstruction =
    userBlock || existingBlock
      ? `Дополни и обогати план участника. Переформулируй общие шаги: привяжи их к Дню ${input.currentDay} и мероприятиям из программы ниже. Сохрани идеи участника, добавь конкретику. ${personalizationRule}`
      : `Создай план, привязанный к текущему дню (${input.currentDay}) и мероприятиям из программы. ${personalizationRule}`;

  const levelLabel = input.badgeLevel ? `, уровень ${input.badgeLevel}` : '';
  const badgeContext = [
    input.badgeNameExplanation ? `ОПИСАНИЕ ЗНАЧКА: ${input.badgeNameExplanation}` : '',
    input.badgeCriteria ? `КРИТЕРИИ: ${input.badgeCriteria.slice(0, 1000)}` : '',
    input.badgeSkillTips ? `ПОДСКАЗКИ: ${input.badgeSkillTips}` : '',
    input.badgeConfirmation ? `ПОДТВЕРЖДЕНИЕ: ${input.badgeConfirmation}` : '',
  ]
    .filter(Boolean)
    .join('\n');

  const template =
    import.meta.env.VITE_PROMPT_BADGE_PLAN ||
    `Ты — НейроВалюша, ИИ-проводник Реального Лагеря. Задача: персонализированный план получения значка.

ВАЖНО: Ты получаешь точные данные значка. НЕ придумывай описание — строго опирайся на критерии и описание ниже.

ЗНАЧОК: "{{badgeTitle}}" (уровень {{badgeId}}{{levelLabel}})

{{badgeContext}}

{{userBlock}}{{existingBlock}}КОНТЕКСТ СМЕНЫ:
- Длина смены: {{shiftLen}} дней. СЕГОДНЯ — День {{currentDay}}.
{{campProgramSummary}}
- {{squadGridBlock}}
- {{squadPlanBlock}}
- {{campBlock}}
- Приоритет: {{priorityBlock}}

{{taskInstruction}}

ФОРМАТ ОТВЕТА (строго):
1) Один абзац — идея плана с привязкой к дню {{currentDay}} и мероприятиям.
2) Список шагов (3–7 шт.) в формате:
- Шаг 1: На [мероприятие] / День N — [конкретное действие]
- Шаг 2: ...
Каждый шаг должен указывать ГДЕ и КОГДА выполнить действие.`;

  const message = template
    .replace('{{badgeTitle}}', input.badgeTitle)
    .replace('{{badgeId}}', input.badgeId)
    .replace('{{levelLabel}}', levelLabel)
    .replace('{{badgeContext}}', badgeContext || 'Критерии не указаны.')
    .replace('{{userBlock}}', userBlock)
    .replace('{{existingBlock}}', existingBlock)
    .replace('{{shiftLen}}', String(shiftLen))
    .replace('{{currentDay}}', String(input.currentDay))
    .replace(
      '{{campProgramSummary}}',
      campProgramSummary
        ? `- Программа лагеря (дни ${Math.max(1, input.currentDay - 2)}–${Math.min(shiftLen, input.currentDay + 4)}):\n${campProgramSummary}`
        : ''
    )
    .replace('{{squadGridBlock}}', squadGridBlock)
    .replace('{{squadPlanBlock}}', squadPlanBlock)
    .replace('{{campBlock}}', campBlock)
    .replace('{{priorityBlock}}', priorityBlock)
    .replace('{{taskInstruction}}', taskInstruction);

  try {
    const response = await fetch(chatbotUrl, {
      method: 'POST',
      headers: getChatHeaders(chatbotUrl),
      body: JSON.stringify({
        message,
        user_id: 'badge_plan',
        context: { is_social_prompt: true },
      }),
    });

    if (!response.ok) {
      const body = await response.text();
      console.error(
        '[fetchBadgePlan] API error:',
        response.status,
        response.statusText,
        body.slice(0, 200)
      );
      return null;
    }
    const data = await response.json();
    const reply = (data.reply || data.response || '').trim();
    if (!reply) return null;

    const lines = reply
      .split('\n')
      .map((s: string) => s.trim())
      .filter(Boolean);
    const checklistItems: string[] = [];
    let planText = '';

    for (const line of lines) {
      const dashMatch = line.match(/^[-*]\s*(.+)$/);
      const numMatch = line.match(/^\d+[.)]\s*(.+)$/);
      if (dashMatch || numMatch) {
        const text = (dashMatch?.[1] || numMatch?.[1] || '').trim();
        if (text && !text.toLowerCase().startsWith('шаг')) checklistItems.push(text);
      } else if (!checklistItems.length) {
        planText += (planText ? '\n' : '') + line;
      }
    }

    if (checklistItems.length === 0 && planText) {
      checklistItems.push(planText.slice(0, 120));
    }
    if (!planText && checklistItems.length > 0) {
      planText = checklistItems[0];
    }

    return { planText: planText || reply.slice(0, 500), checklistItems };
  } catch (e) {
    console.error('Failed to fetch badge plan', e);
    return null;
  }
};

// --- Council Initiative (инициатива в Совет Лагеря) ---

export type CouncilInitiativeInput = {
  teamName?: string;
  topicDraft: string;
  currentDay: number;
  shiftLength?: 21 | 9;
  campProgram3d?: string;
};

export type CouncilInitiativeResult = {
  initiativeText: string;
  steps: string[];
};

/** Генерирует текст инициативы для Совета Лагеря (по аналогии с планом по получению значка). */
export const fetchCouncilInitiative = async (
  input: CouncilInitiativeInput
): Promise<CouncilInitiativeResult | null> => {
  if (shouldSkipAiCall()) return null;
  const hostname = typeof window !== 'undefined' ? window.location.hostname : '';
  const useLocalApi = import.meta.env.DEV || hostname === 'localhost' || hostname === '127.0.0.1';
  const base = import.meta.env.BASE_URL || '';
  const chatbotUrl = useLocalApi
    ? '/api/chat'
    : 'https://real-vibe-ai-studio.pages.dev/api/putevoditel/chat';

  const shiftLen = input.shiftLength ?? 21;
  let campProgramSummary = '';
  const campUrl = base + CAMP_PROGRAM_URL.replace(/^\//, '');
  try {
    const resp = await fetch(campUrl);
    if (resp.ok) {
      const data = await resp.json();
      const days = data.days;
      if (Array.isArray(days)) {
        const slice = days.slice(
          Math.max(0, input.currentDay - 2),
          Math.min(days.length, input.currentDay + 4)
        );
        campProgramSummary = slice
          .map(
            (d: { day: number; theme: string; activities?: string[] }) =>
              `День ${d.day}: ${d.theme} — ${(d.activities || []).join(', ')}`
          )
          .join('\n');
      }
    }
  } catch {
    // ignore
  }
  if (input.campProgram3d?.trim()) {
    campProgramSummary = campProgramSummary
      ? `${campProgramSummary}\n\nДополнительно: ${input.campProgram3d}`
      : input.campProgram3d.trim();
  }

  const teamBlock = input.teamName?.trim()
    ? `Инициатива от имени Движка «${input.teamName}».`
    : 'Инициатива от участника (можно указать Движок в личном кабинете).';
  const contextBlock = campProgramSummary
    ? `Программа смены (дни около ${input.currentDay}):\n${campProgramSummary}`
    : 'Программа смены не указана.';

  const template =
    import.meta.env.VITE_PROMPT_COUNCIL ||
    `Ты — НейроВалюша, ИИ-проводник Реального Лагеря. Задача: сформулировать инициативу для Совета Лагеря.

Совет Лагеря — площадка для идей: новые игры, мероприятия, улучшение традиций, идеи от Движков. Цикл: Идеи → Обсуждение → Решения → Задачи → Артефакты.

{{teamBlock}}
Длина смены: {{shiftLen}} дней. Сейчас день {{currentDay}}.

ТЕКСТ УЧАСТНИКА (идея, тема, набросок):
{{topicDraft}}

{{contextBlock}}

Сформулируй короткую инициативу для вынесения в Совет: один абзац — суть предложения (что сделать, зачем, для кого). Затем дай 3–5 конкретных шагов для реализации в формате:
- Шаг 1: ...
- Шаг 2: ...
Каждый шаг — конкретное действие (где, когда, кто может помочь).`;

  const message = template
    .replace('{{teamBlock}}', teamBlock)
    .replace('{{shiftLen}}', String(shiftLen))
    .replace('{{currentDay}}', String(input.currentDay))
    .replace('{{topicDraft}}', input.topicDraft.trim())
    .replace('{{contextBlock}}', contextBlock);

  try {
    const response = await fetch(chatbotUrl, {
      method: 'POST',
      headers: getChatHeaders(chatbotUrl),
      body: JSON.stringify({
        message,
        user_id: 'council_initiative',
        context: { is_social_prompt: true },
      }),
    });

    if (!response.ok) {
      const body = await response.text();
      console.error(
        '[fetchCouncilInitiative] API error:',
        response.status,
        response.statusText,
        body.slice(0, 200)
      );
      return null;
    }
    const data = await response.json();
    const reply = (data.reply || data.response || '').trim();
    if (!reply) return null;

    const lines = reply
      .split('\n')
      .map((s: string) => s.trim())
      .filter(Boolean);
    const steps: string[] = [];
    let initiativeText = '';

    for (const line of lines) {
      const dashMatch = line.match(/^[-*]\s*(.+)$/);
      const numMatch = line.match(/^\d+[.)]\s*(.+)$/);
      if (dashMatch || numMatch) {
        const text = (dashMatch?.[1] || numMatch?.[1] || '')
          .replace(/^[Шш]аг\s*\d+[.:]\s*/i, '')
          .trim();
        if (text) steps.push(text);
      } else if (!steps.length) {
        initiativeText += (initiativeText ? '\n' : '') + line;
      }
    }

    if (!initiativeText && steps.length > 0) initiativeText = steps[0];
    if (!initiativeText) initiativeText = reply.slice(0, 500);

    return { initiativeText, steps };
  } catch (e) {
    console.error('Failed to fetch council initiative', e);
    return null;
  }
};
