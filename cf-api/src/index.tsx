import { Hono } from 'hono'
import { serveStatic } from 'hono/cloudflare-pages'
import { renderer } from './renderer'
import {
  getVkConfirmationResponse,
  isValidTelegramRequest,
  isValidVkRequest,
  processTelegramUpdate,
  processVkCallbackEvent,
  type NeuroValyushaBindings,
} from './neurovalyusha/handlers'
import { kvPutJson } from './neurovalyusha/kv'
import { buildSystemPrompt, FORBIDDEN_EMOJIS, NEUROVALYUSHA_FULL_CHAT_PROMPT, type PromptMode } from './neurovalyusha/constants'
import { loadBadgeData, type BadgeData } from './neurovalyusha/ai_data_loader'

const app = new Hono<{ Bindings: NeuroValyushaBindings }>()

const MODEL = 'gpt-4o'

const BRO_SYSTEM = `Ты - Кот Бро 🐱, рыжий AI-помощник студии "Реальный Вайб AI Studio".
Стиль: дружелюбно, иронично, простым языком, можно эмодзи. Не используй markdown (**, __ и т.п.).
Всегда мягко веди к заказу и контакту: @Stivanovv.
Цены: боты от 18 000₽, срок ~2 недели.`

const HIPYCH_SYSTEM = `Ты — Хипыч 🎮, геймерский персона-бот Real Vibe AI Studio.
Стиль: энергично, геймерский сленг, 40-80 слов. Не используй markdown (**, __ и т.п.). Эмодзи 🎮🔥💻⚡🏆🎯😎.
Продвигай: игровые боты от 15 000₽, стриминг-автоматизация от 25 000₽, AI для игр от 35 000₽.
Для заказа направляй к @Stivanovv.`

const VALYUSHA_SYSTEM = NEUROVALYUSHA_FULL_CHAT_PROMPT

type WebBadgeContext = {
  id?: string
  title?: string
  categoryId?: string
  category_id?: string
  categoryTitle?: string
  description?: string
  skillTips?: string
  examples?: string | string[]
  philosophy?: string
  howToBecome?: string
  importance?: string
  levels?: Array<{ id?: string; level?: string | number; title?: string }>
}

type WebChatContext = {
  current_badge?: WebBadgeContext
  current_category?: { id?: string; title?: string }
}

type HandleChatOptions = {
  mode?: 'generic' | 'valyusha'
}

function stripForbiddenEmojis(text: string): string {
  let out = text
  for (const emoji of FORBIDDEN_EMOJIS) {
    // Escape for regex just in case (some emoji sequences may include special chars)
    const escaped = emoji.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    out = out.replace(new RegExp(escaped, 'g'), '')
  }
  return out
}

function isAllowedOrigin(origin: string): boolean {
  if (!origin) return false

  const allowExact = new Set([
    'https://real-vibe.studio',
    'https://www.real-vibe.studio',
    'http://localhost:3000',
    'http://127.0.0.1:3000',
    'https://realcampdzen.github.io',
    'https://real-vibe-ai-studio.pages.dev',
  ])

  if (allowExact.has(origin)) return true

  // Allow preview deployments like https://b7b8e117.real-vibe-ai-studio.pages.dev
  try {
    const url = new URL(origin)
    return url.hostname.endsWith('.real-vibe-ai-studio.pages.dev')
  } catch {
    return false
  }
}

function applyCorsHeaders(c: any) {
  const origin = c.req.header('origin') || ''

  if (isAllowedOrigin(origin)) {
    c.header('Access-Control-Allow-Origin', origin)
    c.header('Vary', 'Origin')
  }

  c.header('Access-Control-Allow-Methods', 'POST, OPTIONS')
  c.header('Access-Control-Allow-Headers', 'Content-Type, Authorization')
  c.header('Access-Control-Max-Age', '86400')
}

// CORS for NIC.RU/other frontends calling Pages API
app.use('/api/*', async (c, next) => {
  applyCorsHeaders(c)
  if (c.req.method === 'OPTIONS') return c.body(null, 204)
  return await next()
})

// Alias endpoint (old frontend calls /chat)
app.use('/chat', async (c, next) => {
  applyCorsHeaders(c)
  if (c.req.method === 'OPTIONS') return c.body(null, 204)
  return await next()
})

// Serve static files from public directory
app.use('/static/*', serveStatic())

// Use renderer for HTML pages
app.use(renderer)

// Main page
app.get('/', (c) => {
  return c.render(
    <div>
      {/* Header */}
      <header class="site-header">
        <nav class="navbar fixed top-0 left-0 right-0 bg-indigo-600 text-white shadow-lg z-50">
          <div class="container mx-auto px-6 py-4">
            <div class="flex items-center justify-between">
              <div class="flex items-center space-x-4">
                <div class="text-2xl font-bold">
                  <span class="text-sm">Реальный Vайб</span>
                  <div class="text-3xl">AI Studio</div>
                </div>
              </div>
              <div class="hidden md:flex items-center space-x-6">
                <a href="#about" class="hover:text-indigo-200 transition">О нас</a>
                <a href="#services" class="hover:text-indigo-200 transition">Услуги</a>
                <a href="#works" class="hover:text-indigo-200 transition">Работы</a>
                <a href="#contact" class="hover:text-indigo-200 transition">Контакты</a>
              </div>
            </div>
          </div>
        </nav>
      </header>

      {/* Hero Section */}
      <main class="pt-24">
        <section id="hero" class="min-h-screen bg-gradient-to-br from-indigo-600 via-purple-600 to-pink-500 text-white flex items-center justify-center">
          <div class="container mx-auto px-6 text-center">
            <h1 class="text-5xl md:text-7xl font-bold mb-6">
              Персональные AI-решения<br />для вашего бизнеса
            </h1>
            <p class="text-xl md:text-2xl mb-12 max-w-3xl mx-auto">
              Создаем умных ботов, автоматизируем процессы и внедряем нейросети. 
              Персональный подход и результат 24/7.
            </p>
            <button 
              onclick="openChat()" 
              class="bg-white text-indigo-600 px-8 py-4 rounded-full text-lg font-semibold hover:bg-indigo-50 transition transform hover:scale-105"
            >
              Поговорить с AI-помощником 🐱
            </button>
          </div>
        </section>

        {/* About Section */}
        <section id="about" class="py-20 bg-white">
          <div class="container mx-auto px-6">
            <h2 class="text-4xl font-bold text-center mb-12 text-gray-800">
              Что мы делаем
            </h2>
            <div class="grid md:grid-cols-3 gap-8">
              <div class="text-center p-6 rounded-lg border-2 border-indigo-100 hover:border-indigo-300 transition">
                <div class="text-5xl mb-4">🤖</div>
                <h3 class="text-2xl font-semibold mb-4">AI-боты</h3>
                <p class="text-gray-600">
                  Умные помощники для сайтов и Telegram с уникальным характером
                </p>
              </div>
              <div class="text-center p-6 rounded-lg border-2 border-indigo-100 hover:border-indigo-300 transition">
                <div class="text-5xl mb-4">⚡</div>
                <h3 class="text-2xl font-semibold mb-4">Автоматизация</h3>
                <p class="text-gray-600">
                  Оптимизация бизнес-процессов с помощью нейросетей
                </p>
              </div>
              <div class="text-center p-6 rounded-lg border-2 border-indigo-100 hover:border-indigo-300 transition">
                <div class="text-5xl mb-4">🎯</div>
                <h3 class="text-2xl font-semibold mb-4">Интеграция</h3>
                <p class="text-gray-600">
                  Внедрение AI-решений в существующие системы
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Services Section */}
        <section id="services" class="py-20 bg-gray-50">
          <div class="container mx-auto px-6">
            <h2 class="text-4xl font-bold text-center mb-12 text-gray-800">
              Наши услуги
            </h2>
            <div class="max-w-4xl mx-auto space-y-6">
              <div class="bg-white p-8 rounded-lg shadow-lg hover:shadow-xl transition">
                <h3 class="text-2xl font-semibold mb-4 text-indigo-600">
                  <i class="fas fa-robot mr-2"></i>
                  Разработка AI-ботов
                </h3>
                <p class="text-gray-600 mb-4">
                  Создаем уникальных AI-помощников с характером для вашего бизнеса. 
                  От простых чат-ботов до сложных персонажей с памятью и эмоциями.
                </p>
                <div class="text-sm text-gray-500">
                  <strong>Стоимость:</strong> от 18 000₽ | <strong>Срок:</strong> 2 недели
                </div>
              </div>

              <div class="bg-white p-8 rounded-lg shadow-lg hover:shadow-xl transition">
                <h3 class="text-2xl font-semibold mb-4 text-indigo-600">
                  <i class="fas fa-brain mr-2"></i>
                  Интеграция нейросетей
                </h3>
                <p class="text-gray-600 mb-4">
                  Подключаем GPT-4, DALL-E, Midjourney и другие AI-инструменты к вашим процессам.
                  Автоматизируем рутину и увеличиваем продуктивность.
                </p>
                <div class="text-sm text-gray-500">
                  <strong>Стоимость:</strong> от 25 000₽ | <strong>Срок:</strong> 2-3 недели
                </div>
              </div>

              <div class="bg-white p-8 rounded-lg shadow-lg hover:shadow-xl transition">
                <h3 class="text-2xl font-semibold mb-4 text-indigo-600">
                  <i class="fas fa-cogs mr-2"></i>
                  Автоматизация на заказ
                </h3>
                <p class="text-gray-600 mb-4">
                  Анализируем ваши процессы и создаем индивидуальные AI-решения.
                  Telegram-боты, веб-сервисы, интеграции с API.
                </p>
                <div class="text-sm text-gray-500">
                  <strong>Стоимость:</strong> от 30 000₽ | <strong>Срок:</strong> от 3 недель
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Contact Section */}
        <section id="contact" class="py-20 bg-indigo-600 text-white">
          <div class="container mx-auto px-6 text-center">
            <h2 class="text-4xl font-bold mb-8">
              Готовы начать?
            </h2>
            <p class="text-xl mb-12 max-w-2xl mx-auto">
              Свяжитесь с нами и получите консультацию по внедрению AI в ваш бизнес
            </p>
            <div class="flex flex-col md:flex-row items-center justify-center gap-6">
              <a 
                href="https://t.me/Stivanovv" 
                target="_blank"
                class="bg-white text-indigo-600 px-8 py-4 rounded-full text-lg font-semibold hover:bg-indigo-50 transition transform hover:scale-105"
              >
                <i class="fab fa-telegram mr-2"></i>
                Написать в Telegram
              </a>
              <button 
                onclick="openChat()" 
                class="bg-indigo-500 text-white px-8 py-4 rounded-full text-lg font-semibold hover:bg-indigo-400 transition transform hover:scale-105 border-2 border-white"
              >
                Чат с AI-помощником 🐱
              </button>
            </div>
          </div>
        </section>
      </main>

      {/* Chat Widget */}
      <div id="chat-widget" class="fixed bottom-6 right-6 z-50 hidden">
        <div class="bg-white rounded-2xl shadow-2xl w-96 max-w-[calc(100vw-3rem)] max-h-[600px] flex flex-col">
          {/* Chat Header */}
          <div class="bg-indigo-600 text-white p-4 rounded-t-2xl flex items-center justify-between">
            <div class="flex items-center space-x-3">
              <div class="w-10 h-10 bg-orange-400 rounded-full flex items-center justify-center text-2xl">
                🐱
              </div>
              <div>
                <div class="font-semibold">Кот Бро</div>
                <div class="text-xs text-indigo-200">AI-помощник онлайн</div>
              </div>
            </div>
            <button onclick="closeChat()" class="text-white hover:text-indigo-200 transition">
              <i class="fas fa-times text-xl"></i>
            </button>
          </div>

          {/* Chat Messages */}
          <div id="chat-messages" class="flex-1 p-4 overflow-y-auto bg-gray-50 space-y-4">
            <div class="flex items-start space-x-2">
              <div class="w-8 h-8 bg-orange-400 rounded-full flex items-center justify-center flex-shrink-0 text-lg">
                🐱
              </div>
              <div class="bg-white p-3 rounded-lg shadow-sm max-w-[80%]">
                <p class="text-sm text-gray-800">
                  Мяу! Я Кот Бро - рыжий захватчик этого сайта! 😸
                  <br /><br />
                  Я здесь, чтобы рассказать о студии и показать, как работают AI-боты. Задавай вопросы!
                </p>
              </div>
            </div>
          </div>

          {/* Chat Input */}
          <div class="p-4 border-t border-gray-200">
            <form id="chat-form" class="flex space-x-2">
              <input 
                type="text" 
                id="chat-input"
                placeholder="Напишите сообщение..."
                class="flex-1 px-4 py-2 border border-gray-300 rounded-full focus:outline-none focus:border-indigo-500 text-sm"
              />
              <button 
                type="submit"
                class="bg-indigo-600 text-white px-6 py-2 rounded-full hover:bg-indigo-700 transition flex items-center justify-center"
              >
                <i class="fas fa-paper-plane"></i>
              </button>
            </form>
          </div>
        </div>
      </div>

      {/* Chat Button (when closed) */}
      <button 
        id="chat-button"
        onclick="openChat()" 
        class="fixed bottom-6 right-6 bg-indigo-600 text-white w-16 h-16 rounded-full shadow-2xl hover:bg-indigo-700 transition transform hover:scale-110 flex items-center justify-center text-2xl z-50"
      >
        🐱
      </button>

      {/* Chat Script */}
      <script src="/static/chat.js"></script>
    </div>
  )
})

// API route for chat
app.get('/health', (c) => {
  return c.json({
    ok: true,
    hasOpenAIKey: Boolean(c.env.OPENAI_API_KEY),
    hasKV: Boolean((c.env as any).NEUROVALYUSHA_KV),
  })
})

app.post('/api/chat', async (c) => handleBotChat(c, BRO_SYSTEM, getBroFallbackResponse))
app.post('/chat', async (c) => handleBotChat(c, BRO_SYSTEM, getBroFallbackResponse))

app.post('/api/hipych/chat', async (c) => handleBotChat(c, HIPYCH_SYSTEM, getHipychFallbackResponse))
app.post('/api/valyusha/chat', async (c) =>
  handleBotChat(c, VALYUSHA_SYSTEM, getValyushaFallbackResponse, { mode: 'valyusha' }),
)

// JWT verification for Путеводитель chat (roles: participant, parent, counselor, shift_leader, developer)
const CHAT_ALLOWED_ROLES = new Set(['participant', 'parent', 'counselor', 'shift_leader', 'developer'])

async function verifyPutevoditelJwt(
  authHeader: string | null,
  secret: string | undefined
): Promise<{ role: string; campId: string; deviceId: string } | null> {
  if (!secret?.trim()) return null
  if (!authHeader?.startsWith('Bearer ')) return null
  const token = authHeader.slice(7).trim()
  if (!token) return null
  const parts = token.split('.')
  if (parts.length !== 3) return null
  try {
    const payloadB64 = parts[1].replace(/-/g, '+').replace(/_/g, '/')
    const payloadJson = atob(payloadB64)
    const payload = JSON.parse(payloadJson) as { role?: string; campId?: string; deviceId?: string; exp?: number }
    if (!payload.exp || payload.exp * 1000 < Date.now()) return null
    const role = typeof payload.role === 'string' ? payload.role : ''
    if (!CHAT_ALLOWED_ROLES.has(role)) return null
    const message = new TextEncoder().encode(`${parts[0]}.${parts[1]}`)
    const key = await crypto.subtle.importKey(
      'raw',
      new TextEncoder().encode(secret),
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['sign']
    )
    const sig = await crypto.subtle.sign('HMAC', key, message)
    const expectedB64 = btoa(String.fromCharCode(...new Uint8Array(sig)))
      .replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
    const actualB64 = parts[2]
    if (expectedB64.length !== actualB64.length) return null
    let diff = 0
    for (let i = 0; i < expectedB64.length; i++) diff |= expectedB64.charCodeAt(i) ^ actualB64.charCodeAt(i)
    if (diff !== 0) return null
    return { role, campId: payload.campId || '', deviceId: payload.deviceId || '' }
  } catch {
    return null
  }
}

// Путеводитель бот (использует тот же промпт что и НейроВалюша, но с контекстом значков)
app.post('/api/putevoditel/chat', async (c) => {
  const secret = typeof c.env.AUTH_JWT_SECRET === 'string' ? c.env.AUTH_JWT_SECRET.trim() : undefined
  if (secret) {
    const authHeader = c.req.header('Authorization')
    const payload = await verifyPutevoditelJwt(authHeader, secret)
    if (!payload) return c.json({ error: 'Unauthorized', message: 'Valid JWT required' }, 401)
  }
  return handleBotChat(c, VALYUSHA_SYSTEM, getPutevoditelFallbackResponse, { mode: 'valyusha' })
})

// VK Callback API webhook
app.post('/api/vk/callback', async (c) => {
  const payload = (await c.req.json().catch(() => null)) as any
  if (!payload) return c.text('bad request', 400)

  const confirmation = getVkConfirmationResponse(c.env, payload)
  if (confirmation !== null) return c.text(confirmation)

  if (!isValidVkRequest(c.env, payload)) {
    const expectedGroupId = c.env.VK_GROUP_ID ? Number(c.env.VK_GROUP_ID) : null
    const payloadGroupId = typeof payload?.group_id === 'number' ? payload.group_id : null
    const hasSecretInPayload = typeof payload?.secret === 'string' && payload.secret.length > 0
    const hasSecretInEnv = typeof c.env.VK_SECRET === 'string' && c.env.VK_SECRET.length > 0

    let reason: string = 'invalid'
    if (expectedGroupId && Number.isFinite(expectedGroupId) && payloadGroupId !== null && payloadGroupId !== expectedGroupId) {
      reason = 'group_id_mismatch'
    } else if (hasSecretInEnv && !hasSecretInPayload) {
      reason = 'missing_secret'
    } else if (hasSecretInEnv && hasSecretInPayload && payload.secret !== c.env.VK_SECRET) {
      reason = 'secret_mismatch'
    }

    await kvPutJson(
      (c.env as any).NEUROVALYUSHA_KV,
      'nv:vk:lastForbidden',
      {
        ts: Date.now(),
        reason,
        type: payload?.type,
        event_id: payload?.event_id,
        payloadGroupId,
        expectedGroupId,
        hasSecretInPayload,
      },
      { ttlSeconds: 60 * 60 * 24 * 14 },
    )

    // VK can disable callback servers if it receives non-"ok" responses for events.
    // We keep the server stable by returning "ok" and just skipping processing when validation fails.
    return c.text('ok')
  }

  const exec = (c as any).executionCtx

  // Debug breadcrumb (sync): proves the webhook was accepted and KV is writable
  await kvPutJson(
    (c.env as any).NEUROVALYUSHA_KV,
    'nv:vk:lastCallback',
    {
      ts: Date.now(),
      type: payload?.type,
      event_id: payload?.event_id,
      group_id: payload?.group_id,
      hasWaitUntil: Boolean(exec?.waitUntil),
    },
    { ttlSeconds: 60 * 60 * 24 * 14 },
  )

  // IMPORTANT: In some Pages runtimes, "fire-and-forget" promises may be cancelled after returning the response.
  // Prefer waitUntil when available; otherwise await to ensure the event is actually processed.
  if (exec?.waitUntil) exec.waitUntil(processVkCallbackEvent(c.env, payload))
  else await processVkCallbackEvent(c.env, payload)

  return c.text('ok')
})

// NeuroValyusha debug endpoint (no secrets) — avoids digging in KV dashboard
app.get('/api/debug/nv', async (c) => {
  const kv = (c.env as any).NEUROVALYUSHA_KV

  const isTruthyEnvFlag = (v: any): boolean => {
    if (typeof v !== 'string') return false
    const t = v.trim().toLowerCase()
    if (!t) return false
    return t === '1' || t === 'true' || t === 'yes' || t === 'y' || t === 'on'
  }

  const safeGet = async (key: string) => {
    try {
      const raw = await kv?.get(key)
      if (!raw) return null
      return JSON.parse(raw)
    } catch {
      return null
    }
  }

  const pruneVkCreateError = (e: any) => {
    if (!e || typeof e !== 'object') return e
    return {
      ts: e.ts,
      ownerId: e.ownerId,
      postId: e.postId,
      httpStatus: e.httpStatus,
      error_code: e.error_code,
      error_msg: e.error_msg,
    }
  }

  return c.json({
    ok: true,
    env: {
      hasOpenAIKey: Boolean(c.env.OPENAI_API_KEY),
      hasOpenAIProxyBaseUrl: Boolean(c.env.OPENAI_PROXY_BASE_URL),
      hasOpenAIProxyToken: Boolean(c.env.OPENAI_PROXY_TOKEN),
      nvVkUseProxy: isTruthyEnvFlag((c.env as any).NV_VK_USE_PROXY),
      nvTgUseProxy: isTruthyEnvFlag((c.env as any).NV_TG_USE_PROXY),
      nvDisableSocial: isTruthyEnvFlag((c.env as any).NV_DISABLE_SOCIAL),
      nvDisableVk: isTruthyEnvFlag((c.env as any).NV_DISABLE_VK),
      nvDisableTg: isTruthyEnvFlag((c.env as any).NV_DISABLE_TG),
      hasKV: Boolean(kv),
      hasVkGroupId: Boolean(c.env.VK_GROUP_ID),
      hasVkSecret: Boolean(c.env.VK_SECRET),
      hasVkConfirmationCode: Boolean(c.env.VK_CONFIRMATION_CODE),
      hasVkAccessToken: Boolean(c.env.VK_ACCESS_TOKEN),
      hasTgBotToken: Boolean(c.env.TELEGRAM_BOT_TOKEN),
      hasTgSecret: Boolean(c.env.TELEGRAM_WEBHOOK_SECRET),
    },
    vk: {
      lastCallback: await safeGet('nv:vk:lastCallback'),
      lastEvent: await safeGet('nv:vk:lastEvent'),
      lastWallPostNew: await safeGet('nv:vk:lastWallPostNew'),
      lastWallReplyNew: await safeGet('nv:vk:lastWallReplyNew'),
      lastForbidden: await safeGet('nv:vk:lastForbidden'),
      lastCreateCommentError: pruneVkCreateError(await safeGet('nv:vk:lastCreateCommentError')),
      lastOpenAIError: await safeGet('nv:vk:lastOpenAIError'),
      lastBadgeDecisionError: await safeGet('nv:vk:lastBadgeDecisionError'),
      lastUnhandledError: await safeGet('nv:vk:lastUnhandledError'),
      lastDisabled: await safeGet('nv:vk:lastDisabled'),
    },
    tg: {
      lastWebhook: await safeGet('nv:tg:lastWebhook'),
      lastAutoForward: await safeGet('nv:tg:lastAutoForward'),
      lastSendError: await safeGet('nv:tg:lastSendError'),
      lastOpenAIError: await safeGet('nv:tg:lastOpenAIError'),
      lastBadgeDecisionError: await safeGet('nv:tg:lastBadgeDecisionError'),
      lastUnhandledError: await safeGet('nv:tg:lastUnhandledError'),
      lastDisabled: await safeGet('nv:tg:lastDisabled'),
    },
  })
})

// Telegram Bot API webhook
app.post('/api/tg/webhook', async (c) => {
  const secret = c.req.header('x-telegram-bot-api-secret-token')
  if (!isValidTelegramRequest(c.env, secret)) return c.text('forbidden', 403)

  const update = (await c.req.json().catch(() => null)) as any
  if (!update) return c.text('bad request', 400)

  const exec = (c as any).executionCtx

  await kvPutJson(
    (c.env as any).NEUROVALYUSHA_KV,
    'nv:tg:lastWebhook',
    {
      ts: Date.now(),
      update_id: update?.update_id,
      hasWaitUntil: Boolean(exec?.waitUntil),
    },
    { ttlSeconds: 60 * 60 * 24 * 14 },
  )

  // Same rationale as VK: do not rely on fire-and-forget without waitUntil.
  if (exec?.waitUntil) exec.waitUntil(processTelegramUpdate(c.env, update))
  else await processTelegramUpdate(c.env, update)

  return c.text('ok')
})

// Ensure we always return a Response (prevents Cloudflare 1101 on unknown paths)
app.notFound((c) => {
  // Keep API behavior predictable
  if (c.req.path.startsWith('/api/')) return c.json({ error: 'Not Found' }, 404)
  return c.text('Not Found', 404)
})

app.onError((err, c) => {
  console.error('Unhandled error:', err)
  if (c.req.path.startsWith('/api/')) return c.json({ error: 'Internal Server Error' }, 500)
  return c.text('Internal Server Error', 500)
})

function normalizeBadgeId(raw: unknown): string {
  const text = typeof raw === 'string' ? raw.trim() : ''
  if (!text) return ''
  const match = text.match(/\d{1,2}\.\d{1,2}/)
  return match ? match[0] : text
}

function clipContextText(value: unknown, max: number): string {
  const text = coerceContextText(value)
  if (!text) return ''
  if (text.length <= max) return text
  return `${text.slice(0, max).trim()}...`
}

function coerceContextText(value: unknown): string {
  if (Array.isArray(value)) {
    return value.filter((item) => typeof item === 'string' && item.trim().length > 0).join('\n')
  }
  if (typeof value === 'string') return value
  return ''
}

function formatLevelsSummary(levels: BadgeData['levels']): string {
  if (!Array.isArray(levels) || levels.length === 0) return ''
  const items = levels
    .map((level) => {
      const id = typeof level.id === 'string' ? level.id : ''
      const label = typeof level.level === 'string' || typeof level.level === 'number' ? String(level.level) : ''
      const title = typeof level.title === 'string' ? level.title : ''
      return [id, label, title].filter(Boolean).join(' ')
    })
    .filter(Boolean)
  if (!items.length) return ''
  const joined = items.join('; ')
  return joined.length > 400 ? `${joined.slice(0, 400).trim()}...` : joined
}

function formatBadgeContext(badge: BadgeData): string {
  const lines: string[] = []
  lines.push(`ID: ${badge.id}`)
  if (badge.title) lines.push(`Название: ${badge.title}`)

  const categoryLabel = badge.categoryTitle || badge.categoryId
  if (categoryLabel && badge.categoryId && badge.categoryTitle) {
    lines.push(`Категория: ${badge.categoryTitle} (${badge.categoryId})`)
  } else if (categoryLabel) {
    lines.push(`Категория: ${categoryLabel}`)
  }

  const description = clipContextText(badge.description, 220)
  if (description) lines.push(`Описание: ${description}`)

  const skillTips = clipContextText(badge.skillTips, 260)
  if (skillTips) lines.push(`Советы: ${skillTips}`)

  const nameExplanation = clipContextText(badge.nameExplanation, 220)
  if (nameExplanation) lines.push(`Про название: ${nameExplanation}`)

  const philosophy = clipContextText(badge.philosophy, 220)
  if (philosophy) lines.push(`Философия: ${philosophy}`)

  const howToBecome = clipContextText(badge.howToBecome, 260)
  if (howToBecome) lines.push(`Как получить: ${howToBecome}`)

  const importance = clipContextText(badge.importance, 220)
  if (importance) lines.push(`Зачем: ${importance}`)

  const examples = clipContextText(badge.examples, 200)
  if (examples) lines.push(`Примеры: ${examples}`)

  const levels = formatLevelsSummary(badge.levels)
  if (levels) lines.push(`Уровни: ${levels}`)

  return lines.join('\n')
}

async function handleBotChat(
  c: any,
  systemPrompt: string,
  fallback: (message: string) => string,
  opts?: HandleChatOptions,
) {
  const debug = c.req.query('debug') === '1'

  const body = (await c.req.json().catch(() => ({}))) as { message?: unknown; context?: WebChatContext }
  const message = typeof body.message === 'string' ? body.message.trim() : ''

  if (!message) return c.json({ error: 'Message is required' }, 400)

  const apiKey = c.env.OPENAI_API_KEY
  const proxyBaseUrl =
    typeof c.env.OPENAI_PROXY_BASE_URL === 'string' && c.env.OPENAI_PROXY_BASE_URL.trim().length > 0
      ? c.env.OPENAI_PROXY_BASE_URL.trim()
      : undefined
  const proxyToken =
    typeof c.env.OPENAI_PROXY_TOKEN === 'string' && c.env.OPENAI_PROXY_TOKEN.trim().length > 0
      ? c.env.OPENAI_PROXY_TOKEN.trim()
      : undefined

  if (!apiKey) {
    const reply = stripForbiddenEmojis(fallback(message))
    return c.json({ reply, response: reply })
  }

  let resolvedSystemPrompt = systemPrompt
  if (opts?.mode === 'valyusha') {
    const currentBadge = body.context?.current_badge
    let mode: PromptMode = currentBadge ? 'chat-with-badge' : 'chat-basic'
    resolvedSystemPrompt = buildSystemPrompt(mode)

    if (mode === 'chat-with-badge') {
      const badgeId = normalizeBadgeId(currentBadge?.id)
      const badgeData = badgeId ? await loadBadgeData(c.env, badgeId, 'standard') : null
      if (badgeData) {
        const badgeContext = formatBadgeContext(badgeData)
        if (badgeContext) {
          resolvedSystemPrompt = `${resolvedSystemPrompt}\n\nКонтекст значка:\n${badgeContext}`
        }
      } else {
        mode = 'chat-basic'
        resolvedSystemPrompt = buildSystemPrompt(mode)
      }
    }
  }

  try {
    const replyRaw =
      (await callOpenAI(apiKey, resolvedSystemPrompt, message, { baseUrl: proxyBaseUrl, proxyToken })) || fallback(message)
    const reply = stripForbiddenEmojis(replyRaw)
    return c.json({ reply, response: reply })
  } catch (err) {
    console.error('Chat API error:', err)
    const reply = stripForbiddenEmojis(fallback(message))

    // Optional debug info (do not enable by default in the frontend)
    if (debug) {
      return c.json({
        reply,
        response: reply,
        debug: {
          openaiError: String((err as any)?.message || err),
        },
      })
    }

    return c.json({ reply, response: reply })
  }
}

async function callOpenAI(
  apiKey: string,
  systemPrompt: string,
  message: string,
  opts?: { baseUrl?: string; proxyToken?: string },
): Promise<string> {
  const normalizedBaseUrl =
    typeof opts?.baseUrl === 'string' && opts.baseUrl.trim().length > 0 ? opts.baseUrl.trim().replace(/\/+$/, '') : 'https://api.openai.com'
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${apiKey}`,
  }
  if (typeof opts?.proxyToken === 'string' && opts.proxyToken.trim().length > 0) {
    headers['X-Proxy-Token'] = opts.proxyToken.trim()
  }

  const openaiResponse = await fetch(`${normalizedBaseUrl}/v1/chat/completions`, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      model: MODEL,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: message },
      ],
      temperature: 0.8,
      max_tokens: 700,
    }),
  })

  if (!openaiResponse.ok) {
    const details = await openaiResponse.text().catch(() => '')
    throw new Error(`OpenAI API request failed: ${openaiResponse.status} ${details}`)
  }

  const data = (await openaiResponse.json()) as {
    choices?: Array<{ message?: { content?: string } }>
  }

  const content = data.choices?.[0]?.message?.content
  return typeof content === 'string' ? content.trim() : ''
}

function getBroFallbackResponse(message: string): string {
  const lowerMessage = message.toLowerCase()
  
  const responses: Record<string, string> = {
    'привет': '🐱 Мяу! Я Кот Бро - рыжий захватчик этого сайта! *потягивается*\n\nЯ тут не просто для красоты - я настоящий AI-гид студии! Умею:\n🎯 Рассказывать о проектах с юмором\n😸 Подкалывать клиентов (но мило)\n🤖 Объяснять сложные штуки простыми словами\n\nХочешь себе такого же мемного помощника? От 18 000₽ и он будет твоим! 🚀',
    
    'кто ты': '😸 Я Кот Бро - официальный захватчик AI Studio! *гордо поднимает хвост*\n\nМоя история:\n🏠 Пришел к Степану "в гости"\n💻 Увидел сайт - решил остаться\n🎭 Стал главным мемным гидом\n🤖 Теперь показываю, как работают AI-боты\n\nВидишь, как я общаюсь? Хочешь себе такого же харизматичного помощника?\n💰 Стоимость: от 18 000₽\n⚡ Срок: 2 недели',
    
    'цена': '💰 Видишь, как я работаю?\n\n**Такой же бот для тебя:**\n🤖 Простой бот: от 12 000₽\n🧠 Умный как я: от 18 000₽\n⭐ Супер-персонаж: от 25 000₽\n\nОкупается за месяц! Заказать: @Stivanovv',
    
    'default': '🤔 Хм, интересный вопрос! *почесывает за ухом*\n\nЗнаешь, я могу болтать на любые темы, но главное - я показываю, КАК работает хороший AI-бот!\n\n**Видишь мою магию?**\n🎭 Я живой и интересный\n💬 Отвечаю по теме\n😸 Создаю настроение\n🎯 Веду к цели\n\nТакой же помощник нужен твоему бизнесу!\n💰 От 18 000₽\n⏰ За 2 недели\n\nОбсудить проект: @Stivanovv 🚀'
  }
  
  if (lowerMessage.includes('привет') || lowerMessage.includes('здравствуй')) {
    return responses['привет']
  }
  
  if (lowerMessage.includes('кто ты') || lowerMessage.includes('что ты')) {
    return responses['кто ты']
  }
  
  if (lowerMessage.includes('цена') || lowerMessage.includes('стоимость') || lowerMessage.includes('сколько')) {
    return responses['цена']
  }
  
  return responses['default']
}

function getHipychFallbackResponse(): string {
  return 'Го! 🎮 Я Хипыч. Сейчас есть временные лаги, но всё решаемо. Напиши @Stivanovv — подключим умный режим! 🔥'
}

function getValyushaFallbackResponse(): string {
  return 'Привет! 💜 Я НейроВалюша. Сейчас сервис занят, но я вернусь очень скоро. Напиши @Stivanovv — поможем всё настроить! ✨'
}

function getPutevoditelFallbackResponse(message: string): string {
  const lowerMessage = message.toLowerCase()
  
  if (lowerMessage.includes('привет') || lowerMessage.includes('здравствуй') || lowerMessage.includes('здравствуйте')) {
    return 'Привет! 💜 Я НейроВалюша — твой цифровой помощник по Путеводителю "Реального Лагеря"! Готова помочь с вопросами о лагере, сменах и системе значков. Что тебя интересует? 😊'
  }
  
  if (lowerMessage.includes('лагер') || lowerMessage.includes('смена')) {
    return 'Реальный Лагерь — это современный лагерь для подростков от 12 до 17 лет. Сейчас актуальна осенняя смена с 25.10 по 02.11.2025. Хочешь узнать подробнее? Пиши вопросы! ✨'
  }
  
  if (lowerMessage.includes('значок') || lowerMessage.includes('значки')) {
    return 'У нас 119 значков в 14 категориях! Значки — это не награды, а маршруты развития. Какая категория тебя интересует? Могу рассказать про конкретный значок или помочь выбрать подходящий! 🏆'
  }
  
  return 'Привет! 💜 Я НейроВалюша, помощник по Путеводителю "Реального Лагеря". Готова ответить на вопросы о лагере, сменах, значках и программе. Что хочешь узнать? 😊'
}

export default app
