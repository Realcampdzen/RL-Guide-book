import type { Fetcher, KVNamespace } from '@cloudflare/workers-types'
import { FORBIDDEN_EMOJIS, NEUROVALYUSHA_MODEL, buildSystemPrompt } from './constants'
import { callOpenAIChat, type OpenAIChatMessage } from './openai'
import { kvGetJson, kvGetText, kvIsDuplicate, kvPutJson, kvPutText } from './kv'
import { appendConversationMemory, getConversationMemory, truncate, type MemoryMessage } from './memory'
import { loadBadgeIndex, scoreBadges, type BadgeIndexEntry } from './guidebook_index'
import { loadBadgeData, type BadgeFields, type BadgeData } from './ai_data_loader'

export type NeuroValyushaBindings = {
  OPENAI_API_KEY?: string
  OPENAI_PROXY_BASE_URL?: string
  OPENAI_PROXY_TOKEN?: string
  NEUROVALYUSHA_KV?: KVNamespace
  ASSETS?: Fetcher

  // OpenAI proxy routing flags (strings in env).
  // Defaults:
  // - VK: proxy OFF unless explicitly enabled (to avoid repeating past VK breakages)
  // - TG: proxy ON when configured (can be overridden)
  NV_VK_USE_PROXY?: string
  NV_TG_USE_PROXY?: string

  // Emergency kill-switches (strings in env). When enabled, bot will not post anything.
  NV_DISABLE_SOCIAL?: string
  NV_DISABLE_VK?: string
  NV_DISABLE_TG?: string

  // VK
  VK_SECRET?: string
  VK_CONFIRMATION_CODE?: string
  VK_GROUP_ID?: string
  VK_ACCESS_TOKEN?: string

  // Auth: JWT verification for /api/putevoditel/chat (same secret as backend verify-code)
  AUTH_JWT_SECRET?: string

  // Telegram
  TELEGRAM_BOT_TOKEN?: string
  TELEGRAM_WEBHOOK_SECRET?: string
  // Optional: limit bot to a specific discussion group (chat id, usually -100...)
  TELEGRAM_DISCUSSION_GROUP_ID?: string
  // Backward-compatible alias (some older envs use this name)
  DISCUSSION_GROUP_ID?: string
  TELEGRAM_CHANNEL_ID?: string
  // Optional: limit bot to a specific channel by username (e.g. "@realcampspb")
  TELEGRAM_CHANNEL_ID_USERNAME?: string
}

type VkCallbackPayload = {
  type?: string
  group_id?: number
  secret?: string
  event_id?: string
  object?: any
}

type TgUpdate = {
  update_id?: number
  message?: TgMessage
  channel_post?: TgMessage
  edited_message?: TgMessage
}

type TgMessage = {
  message_id: number
  date?: number
  chat: { id: number; type?: string; title?: string; username?: string }
  from?: { id: number; is_bot?: boolean; first_name?: string; username?: string }
  text?: string
  caption?: string
  media_group_id?: string
  photo?: Array<{ file_id: string; file_unique_id: string; width: number; height: number; file_size?: number }>
  is_automatic_forward?: boolean
  forward_from_chat?: { id: number; type?: string; title?: string; username?: string }
  forward_from_message_id?: number
  reply_to_message?: TgMessage
}

function nowTs(): number {
  return Date.now()
}

function isNonEmptyString(v: unknown): v is string {
  return typeof v === 'string' && v.trim().length > 0
}

function isTruthyEnvFlag(v: unknown): boolean {
  if (typeof v !== 'string') return false
  const t = v.trim().toLowerCase()
  if (!t) return false
  return t === '1' || t === 'true' || t === 'yes' || t === 'y' || t === 'on'
}

function normalizeOutgoingText(text: string, maxChars: number): string {
  // No markdown formatting; keep it short.
  let cleaned = text
    .replace(/\r\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .replace(/\*\*/g, '')
    .replace(/__/g, '')
    .trim()
  
  // Удаляем запрещённые эмодзи
  for (const emoji of FORBIDDEN_EMOJIS) {
    cleaned = cleaned.replace(new RegExp(emoji.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g'), '')
  }

  // Запрещённая конструкция “не только …, но и …” → заменяем на прямое перечисление (без дополнительного вызова LLM)
  // Пример: "не только про X, но и про Y" -> "и про X, и про Y"
  // Важно: \b (word boundary) в JS не работает для кириллицы, поэтому не используем его.
  cleaned = cleaned.replace(
    /не\s+только\s+([^\n]{1,220}?)\s*[,–—-]?\s*но\s+и\s+([^\n]{1,220}?)(?=\s*(?:[,.!?:;]|\n|$))/giu,
    (_m, left: string, right: string) => {
      const l = String(left || '')
        .trim()
        .replace(/^[\s,–—-]+/, '')
        .replace(/[\s,–—-]+$/, '')
      const r = String(right || '')
        .trim()
        .replace(/^[\s,–—-]+/, '')
        .replace(/[\s,–—-]+$/, '')
      if (!l && !r) return ''
      if (!l) return `и ${r}`
      if (!r) return `и ${l}`
      return `и ${l}, и ${r}`
    },
  )
  
  return truncate(cleaned, maxChars)
}

const VK_MESSAGE_PREFIX = 'Сообщение от НейроVалюши:'

function withVkPrefix(text: string): string {
  const t = (text || '').trim()
  if (!t) return VK_MESSAGE_PREFIX
  if (t.startsWith(VK_MESSAGE_PREFIX)) return t
  return `${VK_MESSAGE_PREFIX} ${t}`
}

function shouldReplyToText(text: string): boolean {
  const t = text.toLowerCase()
  if (t.includes('?') || t.includes('？')) return true
  const keywords = [
    'лагер',
    'вожат',
    '4к',
    '4к ',
    'soft',
    'софт',
    'навык',
    'ии',
    'нейро',
    'проект',
    'кружок',
    'обуч',
    'творч',
    'команд',
    'лидер',
  ]
  return keywords.some((k) => t.includes(k))
}

const BADGE_ID_RE = /\b\d{1,2}\.\d{1,2}(?:\.\d{1,2})?\b/g

function extractBadgeIds(text: string): string[] {
  if (!text) return []
  const matches = text.match(BADGE_ID_RE) || []
  return [...new Set(matches)]
}

function extractBadgeIdsFromMemory(memory: MemoryMessage[]): string[] {
  const ids: string[] = []
  for (const m of memory) {
    if (m.role !== 'assistant') continue
    ids.push(...extractBadgeIds(m.content).map(normalizeBadgeIdShort).filter(Boolean))
  }
  return [...new Set(ids)]
}

function normalizeBadgeIdShort(raw: unknown): string {
  const text = typeof raw === 'string' ? raw.trim() : ''
  if (!text) return ''
  const match = text.match(/\d{1,2}\.\d{1,2}/)
  return match ? match[0] : ''
}

function extractExplicitBadgeId(text: string): string | null {
  const ids = extractBadgeIds(text)
  for (const id of ids) {
    const normalized = normalizeBadgeIdShort(id)
    if (normalized) return normalized
  }
  return null
}

type SocialBadgeIntent = 'mention' | 'explain' | 'how_to_get'

function normalizeForIntent(text: string): string {
  return String(text || '')
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s?]+/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

function classifyBadgeIntent(params: { triggerText: string; hasBadgeHint: boolean }): SocialBadgeIntent {
  const t = normalizeForIntent(params.triggerText)
  const hasQuestion = t.includes('?') || t.includes('？')
  const hasBadgeWord =
    t.includes('значок') || t.includes('значка') || t.includes('значке') || t.includes('значки') || t.includes('бейдж') || t.includes('badge')

  const aboutBadges = hasBadgeWord || params.hasBadgeHint

  // “как получить / что нужно сделать / критерии / подтверждение” → how_to_get
  if (
    aboutBadges &&
    (/(как|что)\s+(получить|заработать|взять|сделать|выполнить)/iu.test(t) ||
      t.includes('критери') ||
      t.includes('услови') ||
      t.includes('подтвержден') ||
      t.includes('что нужно') ||
      t.includes('что надо'))
  ) {
    return 'how_to_get'
  }

  // “что за / расскажи / объясни / зачем / почему” + связь со значком → explain
  if (
    (/(что\s+за|расскажи|объясни|поясни|зачем|почему)/iu.test(t) && aboutBadges) ||
    (hasQuestion && aboutBadges)
  ) {
    return 'explain'
  }

  // По умолчанию: просто уместно упомянуть (если релевантно)
  return 'mention'
}

type SocialBadgeDecision = {
  badgeId: string | null
  badgeTitle: string | null
  fields: Exclude<BadgeFields, 'full'> | null // only minimal/standard for social
  intent: SocialBadgeIntent | null
  reason: string
  score: number | null
  titleHits: number | null
  explicit: boolean
}

async function selectSocialBadgeDecision(params: {
  env: NeuroValyushaBindings
  kv: KVNamespace | undefined
  platform: 'vk' | 'tg'
  triggerText: string
  searchText: string
  threadMemory?: MemoryMessage[]
}): Promise<SocialBadgeDecision> {
  const { env, kv, platform, triggerText, searchText, threadMemory } = params

  const index = await loadBadgeIndex(env)
  if (!index.length) {
    return {
      badgeId: null,
      badgeTitle: null,
      fields: null,
      intent: null,
      reason: 'no_index',
      score: null,
      titleHits: null,
      explicit: false,
    }
  }

  const explicitId = extractExplicitBadgeId(triggerText)
  if (explicitId) {
    const fromIndex = index.find((b) => b.id === explicitId) ?? null
    const intent = classifyBadgeIntent({ triggerText, hasBadgeHint: true })
    const scored = scoreBadges(index, searchText)
    const match = scored.find((x) => x.badge.id === explicitId) ?? null

    return {
      badgeId: explicitId,
      badgeTitle: fromIndex?.title ?? null,
      fields: intent === 'mention' ? 'minimal' : 'standard',
      intent,
      reason: 'explicit_id',
      score: match?.score ?? null,
      titleHits: match?.titleHits ?? null,
      explicit: true,
    }
  }

  const scored = scoreBadges(index, searchText)
  const top = scored[0]
  if (!top || top.score <= 0) {
    return {
      badgeId: null,
      badgeTitle: null,
      fields: null,
      intent: null,
      reason: 'no_match',
      score: top?.score ?? null,
      titleHits: top?.titleHits ?? null,
      explicit: false,
    }
  }

  // “Упоминать значок только если он реально ложится” → достаточно строгий порог (как было)
  const isStrong = top.score >= 8 || (top.score >= 6 && top.titleHits > 0)
  if (!isStrong) {
    return {
      badgeId: null,
      badgeTitle: null,
      fields: null,
      intent: null,
      reason: 'weak_match',
      score: top.score,
      titleHits: top.titleHits,
      explicit: false,
    }
  }

  const avoid = new Set<string>()

  // Глобальная ротация, чтобы не повторяться по кругу
  const recentKey = platform === 'vk' ? 'nv:vk:recentBadges' : 'nv:tg:recentBadges'
  const recent = await getRecentBadgeIds(kv, recentKey)
  for (const id of recent) avoid.add(id)

  // Внутри одной ветки — тоже стараемся не повторять
  if (threadMemory && threadMemory.length) {
    for (const id of extractBadgeIdsFromMemory(threadMemory)) avoid.add(id)
  }

  // Не падаем в “слабые” кандидаты: берём только верхушку списка
  const topSlice = scored.slice(0, 12)
  const minScore = Math.max(5, top.score - 2)

  const strongCandidates = topSlice.filter((x) => x.score >= minScore)
  const pool = strongCandidates.length ? strongCandidates : topSlice

  const picked = pool.find((x) => !avoid.has(x.badge.id))?.badge ?? top.badge
  const pickedMeta = scored.find((x) => x.badge.id === picked.id) ?? null

  const lastAssistant = threadMemory ? [...threadMemory].reverse().find((m) => m.role === 'assistant') ?? null : null
  const lastAssistantHasBadge = Boolean(lastAssistant && extractExplicitBadgeId(lastAssistant.content))
  const triggerNorm = normalizeForIntent(triggerText)
  const triggerHasBadgeWord =
    triggerNorm.includes('значок') ||
    triggerNorm.includes('значка') ||
    triggerNorm.includes('значке') ||
    triggerNorm.includes('значки') ||
    triggerNorm.includes('бейдж') ||
    triggerNorm.includes('badge')

  const intent = classifyBadgeIntent({ triggerText, hasBadgeHint: triggerHasBadgeWord || lastAssistantHasBadge })

  return {
    badgeId: picked.id,
    badgeTitle: picked.title ?? null,
    fields: intent === 'mention' ? 'minimal' : 'standard',
    intent,
    reason: 'scored_pick',
    score: pickedMeta?.score ?? top.score,
    titleHits: pickedMeta?.titleHits ?? top.titleHits,
    explicit: false,
  }
}

function clipOneLine(value: unknown, max: number): string {
  const text = typeof value === 'string' ? value.trim().replace(/\s+/g, ' ') : ''
  if (!text) return ''
  if (text.length <= max) return text
  return `${text.slice(0, max).trim()}…`
}

function formatSocialBadgeContextMinimal(badge: BadgeData): string {
  const parts: string[] = []
  const desc = clipOneLine(badge.description || badge.skillTips || '', 180)
  if (desc) parts.push(`Суть: ${desc}`)
  return parts.join('\n')
}

function formatLevelsShort(levels: BadgeData['levels']): string {
  if (!Array.isArray(levels) || levels.length === 0) return ''
  const items = levels
    .map((l) => {
      const id = typeof l.id === 'string' ? l.id : ''
      const title = typeof l.title === 'string' ? l.title : ''
      return [id, title].filter(Boolean).join(' ')
    })
    .filter(Boolean)
  if (!items.length) return ''
  const joined = items.join('; ')
  return joined.length > 240 ? `${joined.slice(0, 240).trim()}…` : joined
}

function formatSocialBadgeContextStandard(badge: BadgeData, intent: SocialBadgeIntent): string {
  const lines: string[] = []
  lines.push('Памятка: значки — маршруты развития; опыт важнее значка; выбор пути за участником. Не выдумывай критерии/уровни — опирайся только на данные ниже; если данных не хватает — уточни.')
  const description = clipOneLine(badge.description, 220)
  const importance = clipOneLine(badge.importance, 180)
  const skillTips = clipOneLine(badge.skillTips, 200)
  const howToBecome = clipOneLine(badge.howToBecome, 220)
  const philosophy = clipOneLine(badge.philosophy, 180)
  const levels = formatLevelsShort(badge.levels)

  if (description) lines.push(`Описание: ${description}`)
  if (intent === 'how_to_get') {
    if (howToBecome) lines.push(`Как получить: ${howToBecome}`)
    if (levels) lines.push(`Уровни: ${levels}`)
    if (skillTips) lines.push(`Подсказки: ${skillTips}`)
  } else {
    if (importance) lines.push(`Зачем: ${importance}`)
    if (skillTips) lines.push(`Как прокачать: ${skillTips}`)
    if (philosophy) lines.push(`Философия: ${philosophy}`)
    if (levels) lines.push(`Уровни: ${levels}`)
  }

  return lines.join('\n')
}

async function getRecentBadgeIds(kv: KVNamespace | undefined, key: string): Promise<string[]> {
  const list = (await kvGetJson<string[]>(kv, key)) ?? []
  return Array.isArray(list) ? list.filter((x) => typeof x === 'string') : []
}

async function pushRecentBadgeId(kv: KVNamespace | undefined, key: string, badgeId: string): Promise<void> {
  if (!badgeId) return
  const current = await getRecentBadgeIds(kv, key)
  const next = [badgeId, ...current.filter((x) => x !== badgeId)].slice(0, 50)
  await kvPutJson(kv, key, next, { ttlSeconds: 60 * 60 * 24 * 45 }) // 45 дней
}

async function selectBadgeCandidate(params: {
  env: NeuroValyushaBindings
  kv: KVNamespace | undefined
  platform: 'vk' | 'tg'
  searchText: string
  threadMemory?: MemoryMessage[]
}): Promise<BadgeIndexEntry | null> {
  const { env, kv, platform, searchText, threadMemory } = params

  const index = await loadBadgeIndex(env)
  if (!index.length) return null

  const scored = scoreBadges(index, searchText)
  const top = scored[0]
  if (!top || top.score <= 0) return null

  // “Упоминать значок только если он реально ложится” → достаточно строгий порог
  const isStrong = top.score >= 8 || (top.score >= 6 && top.titleHits > 0)
  if (!isStrong) return null

  const avoid = new Set<string>()

  // Глобальная ротация, чтобы не повторяться по кругу
  const recentKey = platform === 'vk' ? 'nv:vk:recentBadges' : 'nv:tg:recentBadges'
  const recent = await getRecentBadgeIds(kv, recentKey)
  for (const id of recent) avoid.add(id)

  // Внутри одной ветки — тоже стараемся не повторять
  if (threadMemory && threadMemory.length) {
    for (const id of extractBadgeIdsFromMemory(threadMemory)) avoid.add(id)
  }

  // Не падаем в “слабые” кандидаты: берём только верхушку списка
  const topSlice = scored.slice(0, 12)
  const minScore = Math.max(5, top.score - 2)

  const strongCandidates = topSlice.filter((x) => x.score >= minScore)
  const pool = strongCandidates.length ? strongCandidates : topSlice

  const picked = pool.find((x) => !avoid.has(x.badge.id))?.badge ?? top.badge
  return picked
}

const NV_SOCIAL_QUALITY_GUIDE =
  'Качество: добавь 1 конкретную мысль/пример по теме. Свяжи с 4K-навыками/софт-скиллами/ИИ (если уместно). Без воды.'

const NV_SOCIAL_STYLE_BANS =
  'Речь: НЕ используй конструкцию «не только …, но и …». Старайся не строить текст на постоянных противопоставлениях.'

const NV_SOCIAL_CTA_PLAYBOOK =
  'CTA: если задаёшь вопрос (максимум 1), сделай его умным и конкретным. Выбери один тип: вопрос-выбор (2 варианта); мини-кейс "как бы вы поступили"; микрозадание на день; просьба поделиться практикой/инструментом; вопрос через призму 4K-навыков. Не задавай банальные "что запомнилось/как вам".'

function buildMessagesForNewPost(
  platform: 'vk' | 'tg',
  postText: string,
  imageUrl?: string | null,
): OpenAIChatMessage[] {
  const clipped = truncate(postText.trim(), 1800)
  const hasImage = isNonEmptyString(imageUrl)

  const userContent: OpenAIChatMessage['content'] = hasImage
    ? [
        ...(clipped
          ? [{ type: 'text' as const, text: `Текст поста:\n${clipped}` }]
          : [
              {
                type: 'text' as const,
                text: 'Это пост с изображением без текста. Проанализируй изображение и напиши полезный комментарий, связанный с темами лагеря (4K навыки, софт-скиллы, ИИ для обучения и творчества).',
              },
            ]),
        { type: 'image_url' as const, image_url: { url: imageUrl!.trim() } },
      ]
    : `Текст поста:\n${clipped}`

  return [
    { role: 'system', content: buildSystemPrompt('social') },
    {
      role: 'system',
      content:
        platform === 'vk'
          ? `СЕЙЧАС: напиши один комментарий к новому посту ВК (1–3 коротких абзаца, 300–700 знаков, 0–3 эмодзи, без markdown).${
              hasImage ? ' Учитывай изображение; если текста нет — опирайся на изображение.' : ''
            } В конце можно 1 вопрос. ${NV_SOCIAL_QUALITY_GUIDE} ${NV_SOCIAL_STYLE_BANS} ${NV_SOCIAL_CTA_PLAYBOOK}`
          : `СЕЙЧАС: напиши один комментарий к новому посту в Telegram (1–3 коротких абзаца, 300–700 знаков, 0–3 эмодзи, без markdown).${
              hasImage ? ' Учитывай изображение; если текста нет — опирайся на изображение.' : ''
            } В конце можно 1 вопрос. ${NV_SOCIAL_QUALITY_GUIDE} ${NV_SOCIAL_STYLE_BANS} ${NV_SOCIAL_CTA_PLAYBOOK}`,
    },
    { role: 'user', content: userContent },
  ]
}

function buildMessagesForReply(
  platform: 'vk' | 'tg',
  memory: MemoryMessage[],
): OpenAIChatMessage[] {
  return [
    { role: 'system', content: buildSystemPrompt('social') },
    {
      role: 'system',
      content:
        platform === 'vk'
          ? `СЕЙЧАС: ответь как комментарий ВК, учитывая контекст переписки выше. 1–3 коротких абзаца, 150–700 знаков, 0–3 эмодзи, без markdown. Не повторяй дословно чужие слова. ${NV_SOCIAL_STYLE_BANS} Если задаёшь вопрос — максимум 1, конкретный, не шаблонный.`
          : `СЕЙЧАС: ответь как комментарий в Telegram, учитывая контекст переписки выше. 1–3 коротких абзаца, 150–700 знаков, 0–3 эмодзи, без markdown. Не повторяй дословно чужие слова. ${NV_SOCIAL_STYLE_BANS} Если задаёшь вопрос — максимум 1, конкретный, не шаблонный.`,
    },
    ...memory.map((m) => ({ role: m.role, content: m.content })),
  ]
}

async function generateValyushaText(
  env: NeuroValyushaBindings,
  messages: OpenAIChatMessage[],
  opts?: {
    temperature?: number
    maxTokens?: number
    platform?: 'vk' | 'tg'
    kv?: KVNamespace
    diagKey?: string
    failMode?: 'fallback' | 'skip' // соцсети: skip (не постить мусор); чат/ручные режимы: fallback
  },
): Promise<string | null> {
  const failMode = opts?.failMode || 'fallback'
  const shouldSkip = failMode === 'skip'
  const fallbackText = 'Классная мысль! 💜 А как вы думаете, какой 4K‑навык тут прокачивается сильнее всего?'

  const apiKey = env.OPENAI_API_KEY
  if (!apiKey) {
    // Для соцсетей лучше "fail closed": не постить ничего, если ключа нет.
    if (shouldSkip) return null
    return 'Спасибо за тему! 💜 Давайте развернём её в сторону 4K‑навыков: что здесь про критическое мышление/креатив/команду?'
  }
  const kv = opts?.kv
  const diagKey = isNonEmptyString(opts?.diagKey)
    ? String(opts?.diagKey)
    : opts?.platform
      ? `nv:${opts.platform}:lastOpenAIError`
      : 'nv:lastOpenAIError'

  // Proxy routing:
  // - VK: по умолчанию БЕЗ прокси (как в d9b44ce), включается только флагом NV_VK_USE_PROXY=1
  // - TG: по умолчанию С прокси (если прокси настроен), можно отключить NV_TG_USE_PROXY=0
  const proxyBaseUrlConfigured = isNonEmptyString(env.OPENAI_PROXY_BASE_URL) ? env.OPENAI_PROXY_BASE_URL : undefined
  const proxyTokenConfigured = isNonEmptyString(env.OPENAI_PROXY_TOKEN) ? env.OPENAI_PROXY_TOKEN : undefined

  const tgOverridePresent = isNonEmptyString(env.NV_TG_USE_PROXY)
  const useProxyForPlatform =
    opts?.platform === 'vk'
      ? isTruthyEnvFlag(env.NV_VK_USE_PROXY)
      : opts?.platform === 'tg'
        ? tgOverridePresent
          ? isTruthyEnvFlag(env.NV_TG_USE_PROXY)
          : true
        : true

  const useProxy = Boolean(proxyBaseUrlConfigured) && useProxyForPlatform
  const proxyBaseUrl = useProxy ? proxyBaseUrlConfigured : undefined
  const proxyToken = useProxy ? proxyTokenConfigured : undefined
  try {
    const raw = await callOpenAIChat({
      apiKey,
      model: NEUROVALYUSHA_MODEL,
      messages,
      temperature: typeof opts?.temperature === 'number' ? opts.temperature : 0.75,
      maxTokens: typeof opts?.maxTokens === 'number' ? opts.maxTokens : 450,
      baseUrl: proxyBaseUrl,
      proxyToken,
    })
    if (raw) return raw
    await kvPutJson(
      kv,
      diagKey,
      {
        ts: nowTs(),
        kind: 'empty_response',
        platform: opts?.platform,
        model: NEUROVALYUSHA_MODEL,
        proxyConfigured: Boolean(proxyBaseUrlConfigured),
        proxyUsed: Boolean(proxyBaseUrl),
      },
      { ttlSeconds: 60 * 60 * 24 * 14 },
    )
    return shouldSkip ? null : fallbackText
  } catch (error) {
    await kvPutJson(
      kv,
      diagKey,
      {
        ts: nowTs(),
        kind: 'error',
        platform: opts?.platform,
        model: NEUROVALYUSHA_MODEL,
        error: clipOneLine(String((error as any)?.message || error), 1200),
        proxyConfigured: Boolean(proxyBaseUrlConfigured),
        proxyUsed: Boolean(proxyBaseUrl),
      },
      { ttlSeconds: 60 * 60 * 24 * 14 },
    )
    return shouldSkip ? null : fallbackText
  }
}

// ---------------- VK ----------------

export function getVkConfirmationResponse(env: NeuroValyushaBindings, payload: VkCallbackPayload): string | null {
  if (payload?.type !== 'confirmation') return null
  return env.VK_CONFIRMATION_CODE || ''
}

export function isValidVkRequest(env: NeuroValyushaBindings, payload: VkCallbackPayload): boolean {
  if (!payload || typeof payload !== 'object') return false

  // If configured, enforce group_id match
  if (isNonEmptyString(env.VK_GROUP_ID) && typeof payload.group_id === 'number') {
    const expected = Number(env.VK_GROUP_ID)
    if (Number.isFinite(expected) && expected > 0 && payload.group_id !== expected) return false
  }

  // If configured, enforce secret match
  if (isNonEmptyString(env.VK_SECRET)) {
    if (!isNonEmptyString(payload.secret)) return false
    if (payload.secret !== env.VK_SECRET) return false
  }

  return true
}

function pickBestVkPhotoUrlFromAttachments(attachments: any): string | null {
  if (!Array.isArray(attachments)) return null
  let bestUrl: string | null = null
  let bestScore = -1

  for (const att of attachments) {
    const type = att?.type
    if (type !== 'photo') continue
    const sizes = att?.photo?.sizes
    if (!Array.isArray(sizes)) continue

    for (const s of sizes) {
      const url = typeof s?.url === 'string' ? s.url.trim() : ''
      if (!url) continue
      const w = typeof s?.width === 'number' && Number.isFinite(s.width) ? s.width : 0
      const h = typeof s?.height === 'number' && Number.isFinite(s.height) ? s.height : 0
      const score = w * h
      if (score > bestScore) {
        bestScore = score
        bestUrl = url
      }
    }
  }

  return bestUrl
}

async function vkTryFetchBestPostPhotoUrl(params: {
  accessToken: string
  ownerId: number
  postId: number
}): Promise<string | null> {
  const { accessToken, ownerId, postId } = params
  try {
    const qs = new URLSearchParams()
    qs.set('posts', `${ownerId}_${postId}`)
    qs.set('extended', '0')
    qs.set('access_token', accessToken)
    qs.set('v', '5.199')

    const res = await fetch('https://api.vk.com/method/wall.getById', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded;charset=UTF-8' },
      body: qs.toString(),
    })
    if (!res.ok) return null
    const text = await res.text().catch(() => '')
    const data = (() => {
      try {
        return JSON.parse(text) as any
      } catch {
        return null
      }
    })()
    const post = Array.isArray(data?.response) ? data.response[0] : null
    return pickBestVkPhotoUrlFromAttachments(post?.attachments)
  } catch {
    return null
  }
}

export async function processVkCallbackEvent(env: NeuroValyushaBindings, payload: VkCallbackPayload): Promise<void> {
  const kv = env.NEUROVALYUSHA_KV
  try {
    const type = payload.type || ''
    const object = payload.object || {}

    if (isTruthyEnvFlag(env.NV_DISABLE_SOCIAL) || isTruthyEnvFlag(env.NV_DISABLE_VK)) {
      await kvPutJson(
        kv,
        'nv:vk:lastDisabled',
        { ts: nowTs(), type, event_id: payload?.event_id, reason: 'disabled' },
        { ttlSeconds: 60 * 60 * 24 * 14 },
      )
      return
    }

    const dedupeId =
      payload.event_id ||
      `${type}:${String(object?.id ?? '')}:${String(object?.post_id ?? '')}:${String(object?.owner_id ?? '')}`
    const dedupeKey = `nv:vk:dedupe:${dedupeId}`
    if (await kvIsDuplicate(kv, dedupeKey, { ttlSeconds: 60 * 60 * 24 })) return

    // Debug breadcrumb: prove the worker actually processed the event (even if it later returns early)
    await kvPutJson(
      kv,
      'nv:vk:lastEvent',
      {
        ts: nowTs(),
        type,
        event_id: payload.event_id,
        object_id: object?.id,
        post_id: object?.post_id,
        owner_id: object?.owner_id,
      },
      { ttlSeconds: 60 * 60 * 24 * 14 },
    )

    if (type === 'wall_post_new') {
      const postId = Number(object?.id)
      const ownerId = Number(object?.owner_id) || (isNonEmptyString(env.VK_GROUP_ID) ? -Number(env.VK_GROUP_ID) : 0)
      const postText = isNonEmptyString(object?.text) ? object.text : ''
      if (!Number.isFinite(postId) || postId <= 0) {
        await kvPutJson(
          kv,
          'nv:vk:lastWallPostNew',
          { ts: nowTs(), ok: false, reason: 'bad_post_id', postId },
          { ttlSeconds: 60 * 60 * 24 * 14 },
        )
        return
      }
      if (!Number.isFinite(ownerId) || ownerId === 0) {
        await kvPutJson(
          kv,
          'nv:vk:lastWallPostNew',
          { ts: nowTs(), ok: false, reason: 'bad_owner_id', ownerId },
          { ttlSeconds: 60 * 60 * 24 * 14 },
        )
        return
      }
      if (!isNonEmptyString(env.VK_ACCESS_TOKEN)) {
        await kvPutJson(
          kv,
          'nv:vk:lastWallPostNew',
          { ts: nowTs(), ok: false, reason: 'missing_vk_access_token', ownerId, postId },
          { ttlSeconds: 60 * 60 * 24 * 14 },
        )
        return
      }

      // Best-effort: include one image for better quality parity with Telegram (still a single OpenAI call)
      let imageUrl: string | null = pickBestVkPhotoUrlFromAttachments(object?.attachments)
      if (!imageUrl) {
        imageUrl = await vkTryFetchBestPostPhotoUrl({ accessToken: env.VK_ACCESS_TOKEN, ownerId, postId })
      }

      const postKey = `nv:vk:post:${ownerId}:${postId}:commented`
      const already = await kvGetText(kv, postKey)
      if (already) {
        await kvPutJson(
          kv,
          'nv:vk:lastWallPostNew',
          { ts: nowTs(), ok: true, skipped: true, reason: 'already_commented', ownerId, postId, existing: already },
          { ttlSeconds: 60 * 60 * 24 * 14 },
        )
        return
      }

      const conversationKey = `nv:vk:conv:${ownerId}:${postId}`

      // Store the post context (as "user" message)
      await appendConversationMemory(kv, conversationKey, {
        role: 'user',
        content: `Пост (ВК): ${truncate(postText || '(без текста)', 1800)}`,
        ts: nowTs(),
      })

      const badgeDecision = await (async (): Promise<SocialBadgeDecision> => {
        try {
          return await selectSocialBadgeDecision({
            env,
            kv,
            platform: 'vk',
            triggerText: postText || '',
            searchText: postText || '',
          })
        } catch (error) {
          await kvPutJson(
            kv,
            'nv:vk:lastBadgeDecisionError',
            {
              ts: nowTs(),
              eventType: 'vk_wall_post_new',
              ownerId,
              postId,
              error: clipOneLine(String((error as any)?.message || error), 1200),
            },
            { ttlSeconds: 60 * 60 * 24 * 14 },
          )
          return {
            badgeId: null,
            badgeTitle: null,
            fields: null,
            intent: null,
            reason: 'error',
            score: null,
            titleHits: null,
            explicit: false,
          }
        }
      })()

      let badgeData: BadgeData | null = null
      if (badgeDecision.badgeId && badgeDecision.fields) {
        try {
          badgeData = await loadBadgeData(env, badgeDecision.badgeId, badgeDecision.fields)
        } catch {
          badgeData = null
        }
      }

      const usedBadgeId = badgeData?.id || badgeDecision.badgeId
      const usedBadgeTitle = (badgeData?.title || badgeDecision.badgeTitle || '').trim()
      const usedIntent = badgeDecision.intent || 'mention'
      const badgeContext =
        badgeData && badgeDecision.fields
          ? badgeDecision.fields === 'minimal'
            ? formatSocialBadgeContextMinimal(badgeData)
            : formatSocialBadgeContextStandard(badgeData, usedIntent)
          : ''

      await kvPutJson(
        kv,
        'nv:vk:lastBadgeDecision',
        {
          ts: nowTs(),
          eventType: 'vk_wall_post_new',
          ownerId,
          postId,
          pickedBadgeId: usedBadgeId,
          fields: badgeDecision.fields,
          intent: usedIntent,
          reason: badgeDecision.reason,
          score: badgeDecision.score,
          titleHits: badgeDecision.titleHits,
          explicit: badgeDecision.explicit,
          hasBadgeData: Boolean(badgeData),
        },
        { ttlSeconds: 60 * 60 * 24 * 14 },
      )

      const badgeSystem: OpenAIChatMessage =
        usedBadgeId && usedBadgeTitle
          ? {
              role: 'system',
              content: `В этом комментарии упомяни ровно один значок Путеводителя (ID + название), он хорошо подходит к теме поста:\n- ${usedBadgeId} «${usedBadgeTitle}»\nНе упоминай другие значки.${
                badgeContext ? `\n\nСправка по значку (для точности, не выдумывай):\n${badgeContext}` : ''
              }`,
            }
          : { role: 'system', content: 'Для этого комментария значок не подходит — НЕ упоминай значки Путеводителя.' }

      const baseMessages = buildMessagesForNewPost('vk', postText || '', imageUrl)
      const last = baseMessages[baseMessages.length - 1]
      const aiMessages =
        last?.role === 'user'
          ? [...baseMessages.slice(0, -1), badgeSystem, last]
          : [...baseMessages, badgeSystem]

      const generated = await generateValyushaText(env, aiMessages, { platform: 'vk', kv, failMode: 'skip' })
      if (!generated) {
        await kvPutJson(
          kv,
          'nv:vk:lastWallPostNew',
          { ts: nowTs(), ok: false, reason: 'openai_failed', ownerId, postId, badgeId: usedBadgeId },
          { ttlSeconds: 60 * 60 * 24 * 14 },
        )
        return
      }
      const comment = normalizeOutgoingText(generated, 1200)
      if (!comment) {
        await kvPutJson(
          kv,
          'nv:vk:lastWallPostNew',
          { ts: nowTs(), ok: false, reason: 'empty_comment', ownerId, postId, badgeId: usedBadgeId },
          { ttlSeconds: 60 * 60 * 24 * 14 },
        )
        return
      }
      const vkComment = withVkPrefix(comment)

    const commentId = await vkCreateComment({
      kv,
      accessToken: env.VK_ACCESS_TOKEN,
      ownerId,
      postId,
      message: vkComment,
      guid: dedupeId,
      replyToCommentId: undefined,
    })

    if (commentId) {
      await kvPutText(kv, postKey, String(commentId), { ttlSeconds: 60 * 60 * 24 * 30 })
      await kvPutText(kv, `nv:vk:myComment:${commentId}`, '1', { ttlSeconds: 60 * 60 * 24 * 60 })
      if (usedBadgeId) await pushRecentBadgeId(kv, 'nv:vk:recentBadges', usedBadgeId)
      await kvPutJson(
        kv,
        'nv:vk:lastWallPostNew',
        { ts: nowTs(), ok: true, ownerId, postId, commentId, badgeId: usedBadgeId },
        { ttlSeconds: 60 * 60 * 24 * 14 },
      )
    } else {
      await kvPutJson(
        kv,
        'nv:vk:lastWallPostNew',
        { ts: nowTs(), ok: false, reason: 'vk_create_comment_failed', ownerId, postId, badgeId: usedBadgeId },
        { ttlSeconds: 60 * 60 * 24 * 14 },
      )
    }

    // Store without the technical VK prefix to keep the LLM context clean.
    await appendConversationMemory(kv, conversationKey, { role: 'assistant', content: comment, ts: nowTs() })
      return
    }

    if (type === 'wall_reply_new') {
    const commentId = Number(object?.id)
    const postId = Number(object?.post_id)
    const ownerId = Number(object?.owner_id) || (isNonEmptyString(env.VK_GROUP_ID) ? -Number(env.VK_GROUP_ID) : 0)
    const fromId = Number(object?.from_id)
    const replyToCommentId = Number(object?.reply_to_comment) || undefined
    const text = isNonEmptyString(object?.text) ? object.text : ''
    if (!Number.isFinite(commentId) || commentId <= 0) return
    if (!Number.isFinite(postId) || postId <= 0) return
    if (!Number.isFinite(ownerId) || ownerId === 0) return
    if (!isNonEmptyString(env.VK_ACCESS_TOKEN)) {
      await kvPutJson(
        kv,
        'nv:vk:lastWallReplyNew',
        { ts: nowTs(), ok: false, reason: 'missing_vk_access_token', ownerId, postId, commentId },
        { ttlSeconds: 60 * 60 * 24 * 14 },
      )
      return
    }

    // Ignore our own comments (community author id is negative group id)
    if (Number.isFinite(fromId) && isNonEmptyString(env.VK_GROUP_ID) && fromId === -Number(env.VK_GROUP_ID)) return

    const isReplyToUs =
      typeof replyToCommentId === 'number' && replyToCommentId > 0
        ? Boolean(await kvGetText(kv, `nv:vk:myComment:${replyToCommentId}`))
        : false

    if (!isReplyToUs && !shouldReplyToText(text)) {
      await kvPutJson(
        kv,
        'nv:vk:lastWallReplyNew',
        { ts: nowTs(), ok: true, skipped: true, reason: 'no_trigger', ownerId, postId, commentId },
        { ttlSeconds: 60 * 60 * 24 * 14 },
      )
      return
    }

    const conversationKey = `nv:vk:conv:${ownerId}:${postId}`
    await appendConversationMemory(kv, conversationKey, {
      role: 'user',
      content: `Комментарий участника (ВК): ${truncate(text || '(без текста)', 1200)}`,
      ts: nowTs(),
    })

    const memory = await getConversationMemory(kv, conversationKey, { limit: 10 })
    const searchText = [text || '', ...memory.map((m) => m.content)].join('\n')
    const badgeDecision = await (async (): Promise<SocialBadgeDecision> => {
      try {
        return await selectSocialBadgeDecision({
          env,
          kv,
          platform: 'vk',
          triggerText: text || '',
          searchText,
          threadMemory: memory,
        })
      } catch (error) {
        await kvPutJson(
          kv,
          'nv:vk:lastBadgeDecisionError',
          {
            ts: nowTs(),
            eventType: 'vk_wall_reply_new',
            ownerId,
            postId,
            commentId,
            error: clipOneLine(String((error as any)?.message || error), 1200),
          },
          { ttlSeconds: 60 * 60 * 24 * 14 },
        )
        return {
          badgeId: null,
          badgeTitle: null,
          fields: null,
          intent: null,
          reason: 'error',
          score: null,
          titleHits: null,
          explicit: false,
        }
      }
    })()

      let badgeData: BadgeData | null = null
      if (badgeDecision.badgeId && badgeDecision.fields) {
        try {
          badgeData = await loadBadgeData(env, badgeDecision.badgeId, badgeDecision.fields)
        } catch {
          badgeData = null
        }
      }

    const usedBadgeId = badgeData?.id || badgeDecision.badgeId
    const usedBadgeTitle = (badgeData?.title || badgeDecision.badgeTitle || '').trim()
    const usedIntent = badgeDecision.intent || 'mention'
    const badgeContext =
      badgeData && badgeDecision.fields
        ? badgeDecision.fields === 'minimal'
          ? formatSocialBadgeContextMinimal(badgeData)
          : formatSocialBadgeContextStandard(badgeData, usedIntent)
        : ''

    await kvPutJson(
      kv,
      'nv:vk:lastBadgeDecision',
      {
        ts: nowTs(),
        eventType: 'vk_wall_reply_new',
        ownerId,
        postId,
        commentId,
        replyToCommentId,
        pickedBadgeId: usedBadgeId,
        fields: badgeDecision.fields,
        intent: usedIntent,
        reason: badgeDecision.reason,
        score: badgeDecision.score,
        titleHits: badgeDecision.titleHits,
        explicit: badgeDecision.explicit,
        hasBadgeData: Boolean(badgeData),
      },
      { ttlSeconds: 60 * 60 * 24 * 14 },
    )

      const aiMessages = [
        ...buildMessagesForReply('vk', memory),
        ...(usedBadgeId && usedBadgeTitle
          ? [
              {
                role: 'system' as const,
                content:
                  usedIntent === 'mention'
                    ? `Если это реально уместно в ответе, можешь упомянуть один значок (ID + название):\n- ${usedBadgeId} «${usedBadgeTitle}»\nЕсли не уместно — не упоминай значки вообще.${
                        badgeContext ? `\n\nСправка по значку (для точности, не выдумывай):\n${badgeContext}` : ''
                      }`
                    : `Похоже, в обсуждении вопрос про значок Путеводителя — ответь предметно и по делу, опираясь на данные ниже (не выдумывай).\nМожно упомянуть один значок (ID + название):\n- ${usedBadgeId} «${usedBadgeTitle}»${
                        badgeContext ? `\n\nСправка по значку:\n${badgeContext}` : ''
                      }`,
              },
            ]
          : [
              {
                role: 'system' as const,
                content: 'Значок к этой реплике не подходит — НЕ упоминай значки Путеводителя.',
              },
            ]),
      ]
      const generated = await generateValyushaText(env, aiMessages, { platform: 'vk', kv, failMode: 'skip' })
      if (!generated) {
        await kvPutJson(
          kv,
          'nv:vk:lastWallReplyNew',
          { ts: nowTs(), ok: false, reason: 'openai_failed', ownerId, postId, replyTo: commentId, badgeId: usedBadgeId },
          { ttlSeconds: 60 * 60 * 24 * 14 },
        )
        return
      }
      const reply = normalizeOutgoingText(generated, 1200)
      if (!reply) {
        await kvPutJson(
          kv,
          'nv:vk:lastWallReplyNew',
          { ts: nowTs(), ok: false, reason: 'empty_reply', ownerId, postId, replyTo: commentId, badgeId: usedBadgeId },
          { ttlSeconds: 60 * 60 * 24 * 14 },
        )
        return
      }
    const vkReply = withVkPrefix(reply)

    const newCommentId = await vkCreateComment({
      kv,
      accessToken: env.VK_ACCESS_TOKEN,
      ownerId,
      postId,
      message: vkReply,
      guid: dedupeId,
      replyToCommentId: commentId,
    })

    if (newCommentId) {
      await kvPutText(kv, `nv:vk:myComment:${newCommentId}`, '1', { ttlSeconds: 60 * 60 * 24 * 60 })
      if (usedBadgeId) await pushRecentBadgeId(kv, 'nv:vk:recentBadges', usedBadgeId)
      await kvPutJson(
        kv,
        'nv:vk:lastWallReplyNew',
        { ts: nowTs(), ok: true, ownerId, postId, replyTo: commentId, commentId: newCommentId, badgeId: usedBadgeId },
        { ttlSeconds: 60 * 60 * 24 * 14 },
      )
    } else {
      await kvPutJson(
        kv,
        'nv:vk:lastWallReplyNew',
        { ts: nowTs(), ok: false, reason: 'vk_create_comment_failed', ownerId, postId, replyTo: commentId, badgeId: usedBadgeId },
        { ttlSeconds: 60 * 60 * 24 * 14 },
      )
    }

    // Store without the technical VK prefix to keep the LLM context clean.
    await appendConversationMemory(kv, conversationKey, { role: 'assistant', content: reply, ts: nowTs() })
      return
    }
  } catch (error) {
    await kvPutJson(
      kv,
      'nv:vk:lastUnhandledError',
      {
        ts: nowTs(),
        type: payload?.type,
        event_id: payload?.event_id,
        error: clipOneLine(String((error as any)?.message || error), 1200),
      },
      { ttlSeconds: 60 * 60 * 24 * 14 },
    )
    return
  }
}

async function vkCreateComment(params: {
  kv?: KVNamespace
  accessToken: string
  ownerId: number
  postId: number
  message: string
  guid: string
  replyToCommentId?: number
}): Promise<number | null> {
  const { kv, accessToken, ownerId, postId, message, guid, replyToCommentId } = params
  const url = new URL('https://api.vk.com/method/wall.createComment')
  const qs = new URLSearchParams()

  qs.set('owner_id', String(ownerId))
  qs.set('post_id', String(postId))
  qs.set('from_group', '1')
  qs.set('message', message)
  qs.set('guid', guid)
  // Reply directly to a comment when possible
  if (typeof replyToCommentId === 'number' && Number.isFinite(replyToCommentId) && replyToCommentId > 0) {
    qs.set('reply_to_comment', String(replyToCommentId))
  }

  qs.set('access_token', accessToken)
  // Use a modern VK API version (match Callback API server settings)
  qs.set('v', '5.199')

  // Send params in POST body (avoid URL length limits)
  const res = await fetch(url.toString(), {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded;charset=UTF-8' },
    body: qs.toString(),
  })

  const text = await res.text().catch(() => '')
  const data = (() => {
    try {
      return JSON.parse(text) as any
    } catch {
      return null
    }
  })()

  const commentId = Number(data?.response?.comment_id)
  if (Number.isFinite(commentId) && commentId > 0) return commentId

  // Store last error for quick debugging (no tokens, no full message)
  const err = data?.error
  if (kv) {
    const safeParams = Array.isArray(err?.request_params)
      ? err.request_params.filter((p: any) => p?.key !== 'access_token' && p?.key !== 'message')
      : undefined

    await kvPutJson(
      kv,
      'nv:vk:lastCreateCommentError',
      {
        ts: nowTs(),
        ownerId,
        postId,
        httpStatus: res.status,
        error_code: err?.error_code,
        error_msg: err?.error_msg,
        request_params: safeParams,
        raw: typeof text === 'string' ? text.slice(0, 2000) : undefined,
      },
      { ttlSeconds: 60 * 60 * 24 * 7 },
    )
  }
  return null
}

async function getTelegramFileUrl(botToken: string, fileId: string): Promise<string | null> {
  try {
    const url = `https://api.telegram.org/bot${botToken}/getFile?file_id=${encodeURIComponent(fileId)}`
    const res = await fetch(url)
    if (!res.ok) return null
    const data = (await res.json().catch(() => null)) as any
    if (!data?.ok || !data?.result?.file_path) return null
    return `https://api.telegram.org/file/bot${botToken}/${data.result.file_path}`
  } catch {
    return null
  }
}

// ---------------- Telegram ----------------

async function getOrUpdateTelegramMediaGroupRootId(params: {
  kv: KVNamespace | undefined
  chatId: number
  mediaGroupId: string
  messageId: number
}): Promise<number> {
  const { kv, chatId, mediaGroupId, messageId } = params
  const key = `nv:tg:mediaRoot:${chatId}:${mediaGroupId}`
  const existingRaw = await kvGetText(kv, key)
  const existing = existingRaw ? Number(existingRaw) : NaN
  const next = Number.isFinite(existing) && existing > 0 ? Math.min(existing, messageId) : messageId
  // Keep for a while to unify replies across album items
  await kvPutText(kv, key, String(next), { ttlSeconds: 60 * 60 * 24 * 60 })
  return next
}

function computeTelegramPostIdentity(msg: TgMessage): string {
  if (isNonEmptyString(msg.media_group_id)) return `mg:${msg.media_group_id}`
  if (typeof msg.forward_from_message_id === 'number' && Number.isFinite(msg.forward_from_message_id)) {
    return `fwd:${msg.forward_from_message_id}`
  }
  return `msg:${msg.message_id}`
}

type TgMediaGroupCtx = {
  text?: string
  photoFileId?: string
  photoScore?: number
  updatedAt?: number
}

function pickLargestTgPhoto(msg: TgMessage): { file_id: string; score: number } | null {
  if (!Array.isArray(msg.photo) || msg.photo.length === 0) return null
  const largest = msg.photo[msg.photo.length - 1]
  const score = typeof largest.file_size === 'number' && Number.isFinite(largest.file_size) ? largest.file_size : largest.width * largest.height
  return { file_id: largest.file_id, score }
}

async function upsertTelegramMediaGroupCtx(params: {
  kv: KVNamespace | undefined
  chatId: number
  mediaGroupId: string
  text: string
  photo: { file_id: string; score: number } | null
}): Promise<void> {
  const { kv, chatId, mediaGroupId, text, photo } = params
  if (!kv) return
  const key = `nv:tg:mediaCtx:${chatId}:${mediaGroupId}`
  const existing = (await kvGetJson<TgMediaGroupCtx>(kv, key)) ?? {}
  const next: TgMediaGroupCtx = { ...existing, updatedAt: nowTs() }

  const t = (text || '').trim()
  if (t) {
    const existingText = typeof existing.text === 'string' ? existing.text : ''
    // Prefer the longer non-empty caption/text (albums sometimes carry caption on only one item)
    if (!existingText || t.length > existingText.length) next.text = t
  }

  if (photo) {
    const existingScore = typeof existing.photoScore === 'number' && Number.isFinite(existing.photoScore) ? existing.photoScore : -1
    if (!existing.photoFileId || photo.score > existingScore) {
      next.photoFileId = photo.file_id
      next.photoScore = photo.score
    }
  }

  await kvPutJson(kv, key, next, { ttlSeconds: 60 * 30 })
}

async function getTelegramMediaGroupCtx(
  kv: KVNamespace | undefined,
  chatId: number,
  mediaGroupId: string,
): Promise<TgMediaGroupCtx | null> {
  return await kvGetJson<TgMediaGroupCtx>(kv, `nv:tg:mediaCtx:${chatId}:${mediaGroupId}`)
}

async function sleep(ms: number): Promise<void> {
  await new Promise<void>((resolve) => setTimeout(resolve, ms))
}

export function isValidTelegramRequest(env: NeuroValyushaBindings, secretHeader: string | undefined): boolean {
  if (!isNonEmptyString(env.TELEGRAM_WEBHOOK_SECRET)) {
    // If secret is not configured, allow (dev), but production should set it.
    return true
  }
  return isNonEmptyString(secretHeader) && secretHeader === env.TELEGRAM_WEBHOOK_SECRET
}

export async function processTelegramUpdate(env: NeuroValyushaBindings, update: TgUpdate): Promise<void> {
  const kv = env.NEUROVALYUSHA_KV
  try {
    const updateId = typeof update?.update_id === 'number' ? update.update_id : null
    const dedupeKey = updateId !== null ? `nv:tg:dedupe:${updateId}` : `nv:tg:dedupe:${nowTs()}`
    if (await kvIsDuplicate(kv, dedupeKey, { ttlSeconds: 60 * 60 * 24 })) return

    const msg = update.message || update.channel_post || update.edited_message
    if (!msg) return
    if (msg.from?.is_bot) return
    if (!isNonEmptyString(env.TELEGRAM_BOT_TOKEN)) return

    const chatId = Number(msg.chat?.id)
    if (!Number.isFinite(chatId)) return

    if (isTruthyEnvFlag(env.NV_DISABLE_SOCIAL) || isTruthyEnvFlag(env.NV_DISABLE_TG)) {
      await kvPutJson(
        kv,
        'nv:tg:lastDisabled',
        { ts: nowTs(), update_id: updateId, chatId, reason: 'disabled' },
        { ttlSeconds: 60 * 60 * 24 * 14 },
      )
      return
    }

    // Optional: hard-limit to a specific discussion group (prevents reacting in DMs/other chats)
    const allowedGroupIdRaw = env.TELEGRAM_DISCUSSION_GROUP_ID || env.DISCUSSION_GROUP_ID
    if (isNonEmptyString(allowedGroupIdRaw)) {
      const allowedGroupId = Number(allowedGroupIdRaw)
      if (Number.isFinite(allowedGroupId) && allowedGroupId !== chatId) return
    }

    const text = (msg.text || msg.caption || '').trim()

    // New channel post forwarded into discussion group (auto-forward)
    if (msg.is_automatic_forward) {
      const originChat: any =
        (msg as any).forward_from_chat || (msg as any).sender_chat || (msg as any).forward_origin?.chat || null
      const originChatId = typeof originChat?.id === 'number' ? originChat.id : null
      const originUsernameRaw = typeof originChat?.username === 'string' ? originChat.username : ''
      const originUsername = originUsernameRaw.trim().replace(/^@/, '').toLowerCase()

      // Optional: limit to a specific channel (id OR @username).
      if (isNonEmptyString(env.TELEGRAM_CHANNEL_ID)) {
        const raw = env.TELEGRAM_CHANNEL_ID.trim()
        const numeric = Number(raw)
        if (Number.isFinite(numeric)) {
          if (originChatId !== null && numeric !== originChatId) {
            await kvPutJson(
              kv,
              'nv:tg:lastAutoForward',
              {
                ts: nowTs(),
                update_id: updateId,
                chatId,
                decision: 'skip_channel_id_mismatch',
                expectedChannelId: numeric,
                originChatId,
              },
              { ttlSeconds: 60 * 60 * 24 * 14 },
            )
            return
          }
        } else {
          const expectedUsername = raw.replace(/^@/, '').toLowerCase()
          if (originUsername && expectedUsername && originUsername !== expectedUsername) {
            await kvPutJson(
              kv,
              'nv:tg:lastAutoForward',
              {
                ts: nowTs(),
                update_id: updateId,
                chatId,
                decision: 'skip_channel_username_mismatch',
                expectedUsername,
                originUsername,
              },
              { ttlSeconds: 60 * 60 * 24 * 14 },
            )
            return
          }
        }
      }

      // Optional: limit to a specific channel by username (handy when you only have @name)
      if (isNonEmptyString(env.TELEGRAM_CHANNEL_ID_USERNAME)) {
        const expected = env.TELEGRAM_CHANNEL_ID_USERNAME.trim().replace(/^@/, '').toLowerCase()
        if (originUsername && expected && originUsername !== expected) {
          await kvPutJson(
            kv,
            'nv:tg:lastAutoForward',
            {
              ts: nowTs(),
              update_id: updateId,
              chatId,
              decision: 'skip_channel_username_mismatch',
              expectedUsername: expected,
              originUsername,
            },
            { ttlSeconds: 60 * 60 * 24 * 14 },
          )
          return
        }
      }

      const postIdentity = computeTelegramPostIdentity(msg)
      const postKey = `nv:tg:post:${chatId}:${postIdentity}:commented`

    const mediaGroupId = isNonEmptyString(msg.media_group_id) ? msg.media_group_id : null
    const isMediaGroup = mediaGroupId !== null

    // For albums: unify all items into a single root so replies map to one thread
    const rootId = isMediaGroup
      ? await getOrUpdateTelegramMediaGroupRootId({
          kv,
          chatId,
          mediaGroupId,
          messageId: msg.message_id,
        })
      : msg.message_id

    // Map this message to the computed root for nested replies
    await kvPutText(kv, `nv:tg:root:${chatId}:${msg.message_id}`, String(rootId), { ttlSeconds: 60 * 60 * 24 * 60 })

    const debugBase = {
      ts: nowTs(),
      update_id: updateId,
      chatId,
      channelId: msg.forward_from_chat?.id,
      message_id: msg.message_id,
      forward_from_message_id: msg.forward_from_message_id,
      media_group_id: msg.media_group_id,
      postIdentity,
      rootId,
    }

    // Albums: buffer caption/text + best photo across items so the single comment can use both
    if (isMediaGroup) {
      await upsertTelegramMediaGroupCtx({
        kv,
        chatId,
        mediaGroupId,
        text,
        photo: pickLargestTgPhoto(msg),
      })
    }

    // Strictly one comment per post identity (album or single post)
    const already = await kvGetText(kv, postKey)
    if (already) {
      await kvPutJson(kv, 'nv:tg:lastAutoForward', { ...debugBase, decision: 'skip_already', existing: already }, { ttlSeconds: 60 * 60 * 24 * 14 })
      return
    }

    // Quick lock to prevent bursts (e.g., albums producing multiple forwarded messages)
    // We reuse the same key with a short TTL; on success it will be overwritten with the sent message_id and long TTL.
    if (await kvIsDuplicate(kv, postKey, { ttlSeconds: 120 })) {
      await kvPutJson(kv, 'nv:tg:lastAutoForward', { ...debugBase, decision: 'skip_locked' }, { ttlSeconds: 60 * 60 * 24 * 14 })
      return
    }

    // For albums: give other items a brief moment to arrive and populate KV context (caption may be on a different item)
    let effectiveText = text
    let photoFileId: string | null = null

    if (isMediaGroup) {
      await sleep(900)
      const ctx = await getTelegramMediaGroupCtx(kv, chatId, mediaGroupId)
      if (ctx?.text) effectiveText = ctx.text
      if (ctx?.photoFileId) photoFileId = ctx.photoFileId
    }

    if (!photoFileId) {
      const picked = pickLargestTgPhoto(msg)
      photoFileId = picked?.file_id ?? null
    }

    // Получаем URL фото (если есть)
    let imageUrl: string | null = null
    if (photoFileId && env.TELEGRAM_BOT_TOKEN) {
      try {
        imageUrl = await getTelegramFileUrl(env.TELEGRAM_BOT_TOKEN, photoFileId)
      } catch {
        imageUrl = null
      }
    }

    // Если нет ни текста, ни изображения - пропускаем
    if (!effectiveText && !imageUrl) {
      await kvPutJson(
        kv,
        'nv:tg:lastAutoForward',
        { ...debugBase, decision: 'skip_no_content', hasImage: Boolean(imageUrl), textChars: effectiveText.length },
        { ttlSeconds: 60 * 60 * 24 * 14 },
      )
      return
    }

    const conversationKey = `nv:tg:conv:${chatId}:${rootId}`

    await appendConversationMemory(kv, conversationKey, {
      role: 'user',
      content: `Пост (Telegram): ${truncate(effectiveText || '(пост с изображением)', 1800)}`,
      ts: nowTs(),
    })

      const badgeDecision = await (async (): Promise<SocialBadgeDecision> => {
        try {
          return await selectSocialBadgeDecision({
            env,
            kv,
            platform: 'tg',
            triggerText: effectiveText || '',
            searchText: effectiveText || '',
          })
        } catch (error) {
          await kvPutJson(
            kv,
            'nv:tg:lastBadgeDecisionError',
            {
              ts: nowTs(),
              eventType: 'tg_auto_forward',
              chatId,
              rootId,
              error: clipOneLine(String((error as any)?.message || error), 1200),
            },
            { ttlSeconds: 60 * 60 * 24 * 14 },
          )
          return {
            badgeId: null,
            badgeTitle: null,
            fields: null,
            intent: null,
            reason: 'error',
            score: null,
            titleHits: null,
            explicit: false,
          }
        }
      })()

      let badgeData: BadgeData | null = null
      if (badgeDecision.badgeId && badgeDecision.fields) {
        try {
          badgeData = await loadBadgeData(env, badgeDecision.badgeId, badgeDecision.fields)
        } catch {
          badgeData = null
        }
      }

    const usedBadgeId = badgeData?.id || badgeDecision.badgeId
    const usedBadgeTitle = (badgeData?.title || badgeDecision.badgeTitle || '').trim()
    const usedIntent = badgeDecision.intent || 'mention'
    const badgeContext =
      badgeData && badgeDecision.fields
        ? badgeDecision.fields === 'minimal'
          ? formatSocialBadgeContextMinimal(badgeData)
          : formatSocialBadgeContextStandard(badgeData, usedIntent)
        : ''

    await kvPutJson(
      kv,
      'nv:tg:lastBadgeDecision',
      {
        ts: nowTs(),
        eventType: 'tg_auto_forward',
        chatId,
        rootId,
        pickedBadgeId: usedBadgeId,
        fields: badgeDecision.fields,
        intent: usedIntent,
        reason: badgeDecision.reason,
        score: badgeDecision.score,
        titleHits: badgeDecision.titleHits,
        explicit: badgeDecision.explicit,
        hasBadgeData: Boolean(badgeData),
      },
      { ttlSeconds: 60 * 60 * 24 * 14 },
    )

      const badgeSystem: OpenAIChatMessage =
        usedBadgeId && usedBadgeTitle
          ? {
              role: 'system',
              content: `В этом комментарии упомяни ровно один значок Путеводителя (ID + название), он хорошо подходит к теме поста:\n- ${usedBadgeId} «${usedBadgeTitle}»\nНе упоминай другие значки.${
                badgeContext ? `\n\nСправка по значку (для точности, не выдумывай):\n${badgeContext}` : ''
              }`,
            }
          : { role: 'system', content: 'Для этого комментария значок не подходит — НЕ упоминай значки Путеводителя.' }

      const baseMessages = buildMessagesForNewPost('tg', effectiveText || '', imageUrl)
      const last = baseMessages[baseMessages.length - 1]
      const aiMessages =
        last?.role === 'user'
          ? [...baseMessages.slice(0, -1), badgeSystem, last]
          : [...baseMessages, badgeSystem]

      const commentRaw = await generateValyushaText(env, aiMessages, {
        temperature: 0.75,
        maxTokens: 450,
        platform: 'tg',
        kv,
        failMode: 'skip',
      })
      if (!commentRaw) {
        await kvPutJson(
          kv,
          'nv:tg:lastAutoForward',
          {
            ...debugBase,
            decision: 'skip_openai_failed',
            hasImage: Boolean(imageUrl),
            textChars: effectiveText.length,
          },
          { ttlSeconds: 60 * 60 * 24 * 14 },
        )
        return
      }
      const comment = normalizeOutgoingText(commentRaw, 1200)
      if (!comment) {
        await kvPutJson(
          kv,
          'nv:tg:lastAutoForward',
          {
            ...debugBase,
            decision: 'skip_empty_comment',
            hasImage: Boolean(imageUrl),
            textChars: effectiveText.length,
          },
          { ttlSeconds: 60 * 60 * 24 * 14 },
        )
        return
      }

    const sent = await tgSendMessage({
      botToken: env.TELEGRAM_BOT_TOKEN,
      chatId,
      text: comment,
      replyToMessageId: rootId,
      kv,
    })

    if (sent?.message_id) {
      // Upgrade lock -> commented marker
      await kvPutText(kv, postKey, String(sent.message_id), { ttlSeconds: 60 * 60 * 24 * 30 })
      await kvPutText(kv, `nv:tg:myMessage:${chatId}:${sent.message_id}`, '1', { ttlSeconds: 60 * 60 * 24 * 60 })
      if (usedBadgeId) await pushRecentBadgeId(kv, 'nv:tg:recentBadges', usedBadgeId)
    }

    await kvPutText(kv, `nv:tg:root:${chatId}:${rootId}`, String(rootId), { ttlSeconds: 60 * 60 * 24 * 60 })
    await appendConversationMemory(kv, conversationKey, { role: 'assistant', content: comment, ts: nowTs() })
    await kvPutJson(
      kv,
      'nv:tg:lastAutoForward',
      {
        ...debugBase,
        decision: sent?.message_id ? 'sent' : 'send_failed',
        sent_message_id: sent?.message_id,
        hasImage: Boolean(imageUrl),
        textChars: effectiveText.length,
        commentChars: comment.length,
        commentPreview: comment.slice(0, 160),
      },
      { ttlSeconds: 60 * 60 * 24 * 14 },
    )
    return
  }

  // Comment in discussion group (reply chain)
  if (msg.reply_to_message) {
    const parentId = msg.reply_to_message.message_id
    const rootId = await resolveTelegramRootId(kv, chatId, msg.reply_to_message)
    const conversationKey = `nv:tg:conv:${chatId}:${rootId}`

    // Mark this message's root id for future nested replies
    await kvPutText(kv, `nv:tg:root:${chatId}:${msg.message_id}`, String(rootId), { ttlSeconds: 60 * 60 * 24 * 60 })

    const isReplyToUs = Boolean(await kvGetText(kv, `nv:tg:myMessage:${chatId}:${parentId}`))
    if (!isReplyToUs && !shouldReplyToText(text)) return

    await appendConversationMemory(kv, conversationKey, {
      role: 'user',
      content: `Комментарий участника (Telegram): ${truncate(text || '(без текста)', 1200)}`,
      ts: nowTs(),
    })

    const memory = await getConversationMemory(kv, conversationKey, { limit: 10 })
    const searchText = [text || '', ...memory.map((m) => m.content)].join('\n')
      const badgeDecision = await (async (): Promise<SocialBadgeDecision> => {
        try {
          return await selectSocialBadgeDecision({
            env,
            kv,
            platform: 'tg',
            triggerText: text || '',
            searchText,
            threadMemory: memory,
          })
        } catch (error) {
          await kvPutJson(
            kv,
            'nv:tg:lastBadgeDecisionError',
            {
              ts: nowTs(),
              eventType: 'tg_reply',
              chatId,
              rootId,
              messageId: msg.message_id,
              error: clipOneLine(String((error as any)?.message || error), 1200),
            },
            { ttlSeconds: 60 * 60 * 24 * 14 },
          )
          return {
            badgeId: null,
            badgeTitle: null,
            fields: null,
            intent: null,
            reason: 'error',
            score: null,
            titleHits: null,
            explicit: false,
          }
        }
      })()

      let badgeData: BadgeData | null = null
      if (badgeDecision.badgeId && badgeDecision.fields) {
        try {
          badgeData = await loadBadgeData(env, badgeDecision.badgeId, badgeDecision.fields)
        } catch {
          badgeData = null
        }
      }

    const usedBadgeId = badgeData?.id || badgeDecision.badgeId
    const usedBadgeTitle = (badgeData?.title || badgeDecision.badgeTitle || '').trim()
    const usedIntent = badgeDecision.intent || 'mention'
    const badgeContext =
      badgeData && badgeDecision.fields
        ? badgeDecision.fields === 'minimal'
          ? formatSocialBadgeContextMinimal(badgeData)
          : formatSocialBadgeContextStandard(badgeData, usedIntent)
        : ''

    await kvPutJson(
      kv,
      'nv:tg:lastBadgeDecision',
      {
        ts: nowTs(),
        eventType: 'tg_reply',
        chatId,
        rootId,
        messageId: msg.message_id,
        parentId,
        pickedBadgeId: usedBadgeId,
        fields: badgeDecision.fields,
        intent: usedIntent,
        reason: badgeDecision.reason,
        score: badgeDecision.score,
        titleHits: badgeDecision.titleHits,
        explicit: badgeDecision.explicit,
        hasBadgeData: Boolean(badgeData),
      },
      { ttlSeconds: 60 * 60 * 24 * 14 },
    )

    const aiMessages = [
      ...buildMessagesForReply('tg', memory),
      ...(usedBadgeId && usedBadgeTitle
        ? [
            {
              role: 'system' as const,
              content:
                usedIntent === 'mention'
                  ? `Если это реально уместно в ответе, можешь упомянуть один значок (ID + название):\n- ${usedBadgeId} «${usedBadgeTitle}»\nЕсли не уместно — не упоминай значки вообще.${
                      badgeContext ? `\n\nСправка по значку (для точности, не выдумывай):\n${badgeContext}` : ''
                    }`
                  : `Похоже, в обсуждении вопрос про значок Путеводителя — ответь предметно и по делу, опираясь на данные ниже (не выдумывай).\nМожно упомянуть один значок (ID + название):\n- ${usedBadgeId} «${usedBadgeTitle}»${
                      badgeContext ? `\n\nСправка по значку:\n${badgeContext}` : ''
                    }`,
            },
          ]
        : [
            {
              role: 'system' as const,
              content: 'Значок к этой реплике не подходит — НЕ упоминай значки Путеводителя.',
            },
          ]),
    ]
      const replyRaw = await generateValyushaText(env, aiMessages, {
        temperature: 0.75,
        maxTokens: 450,
        platform: 'tg',
        kv,
        failMode: 'skip',
      })
    if (!replyRaw) return
    const reply = normalizeOutgoingText(replyRaw, 1200)
    if (!reply) return

    const sent = await tgSendMessage({
      botToken: env.TELEGRAM_BOT_TOKEN,
      chatId,
      text: reply,
      replyToMessageId: msg.message_id,
      kv,
    })

    if (sent?.message_id) {
      await kvPutText(kv, `nv:tg:myMessage:${chatId}:${sent.message_id}`, '1', { ttlSeconds: 60 * 60 * 24 * 60 })
      if (usedBadgeId) await pushRecentBadgeId(kv, 'nv:tg:recentBadges', usedBadgeId)
    }

    await appendConversationMemory(kv, conversationKey, { role: 'assistant', content: reply, ts: nowTs() })
      return
    }
  } catch (error) {
    await kvPutJson(
      kv,
      'nv:tg:lastUnhandledError',
      {
        ts: nowTs(),
        update_id: (update as any)?.update_id,
        error: clipOneLine(String((error as any)?.message || error), 1200),
      },
      { ttlSeconds: 60 * 60 * 24 * 14 },
    )
    return
  }
}

async function resolveTelegramRootId(kv: KVNamespace | undefined, chatId: number, parent: TgMessage): Promise<number> {
  // If parent is the auto-forward (root), use it
  if (parent.is_automatic_forward) {
    if (isNonEmptyString(parent.media_group_id)) {
      const mapped = await kvGetText(kv, `nv:tg:mediaRoot:${chatId}:${parent.media_group_id}`)
      const mappedNum = mapped ? Number(mapped) : NaN
      if (Number.isFinite(mappedNum) && mappedNum > 0) return mappedNum
    }
    return parent.message_id
  }

  // Otherwise try to look up stored root mapping
  const mapped = await kvGetText(kv, `nv:tg:root:${chatId}:${parent.message_id}`)
  const mappedNum = mapped ? Number(mapped) : NaN
  if (Number.isFinite(mappedNum) && mappedNum > 0) return mappedNum

  // Fallback: treat parent as root (best effort)
  return parent.message_id
}

async function tgSendMessage(params: {
  botToken: string
  chatId: number
  text: string
  replyToMessageId?: number
  kv?: KVNamespace
}): Promise<{ message_id: number } | null> {
  const { botToken, chatId, text, replyToMessageId, kv } = params
  const url = `https://api.telegram.org/bot${botToken}/sendMessage`

  const body: any = {
    chat_id: chatId,
    text,
    disable_web_page_preview: true,
  }
  if (typeof replyToMessageId === 'number' && Number.isFinite(replyToMessageId)) {
    body.reply_to_message_id = replyToMessageId
    body.allow_sending_without_reply = true
  }

  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })

  const data = (await res.json().catch(() => null)) as any
  const mid = Number(data?.result?.message_id)
  if (Number.isFinite(mid) && mid > 0) return { message_id: mid }

  // Store last send error for quick debugging (no secrets)
  if (kv) {
    await kvPutJson(
      kv,
      'nv:tg:lastSendError',
      {
        ts: nowTs(),
        chatId,
        replyToMessageId: typeof replyToMessageId === 'number' ? replyToMessageId : undefined,
        httpStatus: res.status,
        error_code: data?.error_code,
        description: data?.description,
        // Avoid storing full generated text; keep only a tiny preview
        textPreview: typeof text === 'string' ? text.slice(0, 160) : undefined,
        raw: typeof data === 'object' && data ? JSON.stringify(data).slice(0, 2000) : undefined,
      },
      { ttlSeconds: 60 * 60 * 24 * 14 },
    )
  }
  return null
}


