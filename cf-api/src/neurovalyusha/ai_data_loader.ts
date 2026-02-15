import type { Fetcher, KVNamespace } from '@cloudflare/workers-types'
import { kvGetJson, kvPutJson } from './kv'

export type BadgeFields = 'minimal' | 'standard' | 'full'

export type MasterIndexCategory = {
  id: string
  title?: string
  emoji?: string
  path?: string
}

export type MasterIndex = {
  project?: string
  version?: string
  categories?: MasterIndexCategory[]
}

export type CategoryIndexBadge = {
  id: string
  title?: string
  emoji?: string
  levels?: string[]
}

export type CategoryIndex = {
  categoryId?: string
  title?: string
  badgesData?: CategoryIndexBadge[]
}

export type BadgeLevel = {
  id?: string
  level?: string | number
  title?: string
  emoji?: string
  criteria?: string | string[]
  confirmation?: string | string[]
}

export type BadgeData = {
  id: string
  title?: string
  emoji?: string
  categoryId?: string
  categoryTitle?: string
  description?: string
  skillTips?: string
  nameExplanation?: string
  examples?: string | string[]
  philosophy?: string
  howToBecome?: string
  importance?: string
  levels?: BadgeLevel[]
}

type AiDataEnv = {
  ASSETS?: Fetcher
  NEUROVALYUSHA_KV?: KVNamespace
}

const DEFAULT_TTL_SECONDS = 60 * 10

export function clip(text: string, max: number): string {
  const cleaned = String(text || '').trim()
  if (!cleaned) return ''
  if (cleaned.length <= max) return cleaned
  return `${cleaned.slice(0, max).trim()}...`
}

export async function loadMasterIndex(env: AiDataEnv, params?: { maxAgeSeconds?: number }): Promise<MasterIndex | null> {
  const ttlSeconds = params?.maxAgeSeconds ?? DEFAULT_TTL_SECONDS
  const kv = env.NEUROVALYUSHA_KV
  const cacheKey = 'nv:ai-data:master'

  const cached = await kvGetJson<MasterIndex>(kv, cacheKey)
  if (cached) return cached

  const res = await fetchAsset(env, '/ai-data/MASTER_INDEX.json')
  if (!res.ok) return cached ?? null
  const data = (await res.json().catch(() => null)) as MasterIndex | null
  if (!data || typeof data !== 'object') return cached ?? null

  await kvPutJson(kv, cacheKey, data, { ttlSeconds })
  return data
}

export async function loadCategoryIndex(
  env: AiDataEnv,
  categoryId: string,
  params?: { maxAgeSeconds?: number },
): Promise<CategoryIndex | null> {
  const ttlSeconds = params?.maxAgeSeconds ?? DEFAULT_TTL_SECONDS
  const kv = env.NEUROVALYUSHA_KV
  const normalizedId = String(categoryId || '').trim()
  if (!normalizedId) return null

  const cacheKey = `nv:ai-data:category:${normalizedId}`
  const cached = await kvGetJson<CategoryIndex>(kv, cacheKey)
  if (cached) return cached

  const res = await fetchAsset(env, `/ai-data/category-${normalizedId}/index.json`)
  if (!res.ok) return cached ?? null
  const data = (await res.json().catch(() => null)) as CategoryIndex | null
  if (!data || typeof data !== 'object') return cached ?? null

  await kvPutJson(kv, cacheKey, data, { ttlSeconds })
  return data
}

export async function loadBadgeData(
  env: AiDataEnv,
  badgeId: string,
  fields: BadgeFields = 'standard',
  params?: { maxAgeSeconds?: number },
): Promise<BadgeData | null> {
  const ttlSeconds = params?.maxAgeSeconds ?? DEFAULT_TTL_SECONDS
  const kv = env.NEUROVALYUSHA_KV
  const normalizedId = normalizeBadgeId(badgeId)
  if (!normalizedId) return null

  const cacheKey = `nv:ai-data:badge:${normalizedId}:${fields}`
  const cached = await kvGetJson<BadgeData>(kv, cacheKey)
  if (cached) return cached

  const categoryId = normalizedId.split('.')[0]
  if (!categoryId) return cached ?? null

  const res = await fetchAsset(env, `/ai-data/category-${categoryId}/${normalizedId}.json`)
  if (!res.ok) return cached ?? null

  const raw = (await res.json().catch(() => null)) as BadgeData | null
  if (!raw || typeof raw !== 'object' || !raw.id) return cached ?? null

  const categoryTitle = (await loadCategoryIndex(env, raw.categoryId || categoryId))?.title
  const withCategory: BadgeData = { ...raw, categoryId: raw.categoryId || categoryId, categoryTitle }

  const shaped = applyBadgeFields(withCategory, fields)
  await kvPutJson(kv, cacheKey, shaped, { ttlSeconds })
  return shaped
}

function normalizeBadgeId(raw: string): string {
  const text = String(raw || '').trim()
  if (!text) return ''
  const match = text.match(/\d{1,2}\.\d{1,2}/)
  return match ? match[0] : text
}

function applyBadgeFields(badge: BadgeData, fields: BadgeFields): BadgeData {
  if (fields === 'full') return badge

  const minimal: BadgeData = {
    id: badge.id,
    title: badge.title,
    emoji: badge.emoji,
    categoryId: badge.categoryId,
    categoryTitle: badge.categoryTitle,
    description: clipOptionalText(badge.description, 140),
    skillTips: clipOptionalText(badge.skillTips, 200),
  }

  if (fields === 'minimal') return minimal

  return {
    ...minimal,
    nameExplanation: badge.nameExplanation,
    importance: badge.importance,
    philosophy: badge.philosophy,
    howToBecome: badge.howToBecome,
    examples: clipOptionalText(badge.examples, 100),
    levels: badge.levels,
  }
}

function clipOptionalText(value: unknown, max: number): string | undefined {
  const text = coerceText(value)
  if (!text) return undefined
  const clipped = clip(text, max)
  return clipped || undefined
}

function coerceText(value: unknown): string {
  if (Array.isArray(value)) {
    return value.filter((item) => typeof item === 'string' && item.trim().length > 0).join('\n')
  }
  if (typeof value === 'string') return value
  return ''
}

async function fetchAsset(env: AiDataEnv, pathname: string): Promise<Response> {
  if (env.ASSETS) {
    return await env.ASSETS.fetch(new Request(`http://localhost${pathname}`))
  }
  return await fetch(pathname)
}
