type Env = {
  ASSETS: { fetch(request: Request): Promise<Response> }
  GEMINI_API_KEY?: string
  GEMINI_MODEL?: string
}

type GeminiResponse = {
  candidates?: Array<{
    content?: { parts?: Array<{ text?: string }> }
    groundingMetadata?: { groundingChunks?: Array<{ web?: { title?: string; uri?: string } }> }
  }>
}

type WikipediaSearch = { pages?: Array<{ title?: string; key?: string; excerpt?: string; description?: string }> }
type SearchSource = { title: string; url: string; domain: string }

const MAX_BODY_BYTES = 1_024
const MAX_QUERY_LENGTH = 400
const RATE_LIMIT = 8
const RATE_WINDOW_MS = 5 * 60 * 1_000
const requestLog = new Map<string, number[]>()

function json(body: unknown, status = 200): Response {
  return Response.json(body, { status, headers: { 'Cache-Control': 'no-store', 'Content-Type': 'application/json; charset=utf-8' } })
}

function error(code: string, message: string, status: number): Response {
  return json({ error: { code, message } }, status)
}

async function readBodyWithinLimit(request: Request): Promise<string | null> {
  const contentLength = Number(request.headers.get('content-length') || 0)
  if (contentLength > MAX_BODY_BYTES) return null
  if (!request.body) return ''
  const reader = request.body.getReader()
  const chunks: Uint8Array[] = []
  let total = 0
  try {
    while (true) {
      const { done, value } = await reader.read()
      if (done) break
      total += value.byteLength
      if (total > MAX_BODY_BYTES) {
        await reader.cancel()
        return null
      }
      chunks.push(value)
    }
  } finally {
    reader.releaseLock()
  }
  const merged = new Uint8Array(total)
  let offset = 0
  for (const chunk of chunks) { merged.set(chunk, offset); offset += chunk.byteLength }
  return new TextDecoder().decode(merged)
}

function isRateLimited(client: string): boolean {
  const now = Date.now()
  const recent = (requestLog.get(client) || []).filter((time) => now - time < RATE_WINDOW_MS)
  if (recent.length >= RATE_LIMIT) return true
  recent.push(now)
  requestLog.set(client, recent)
  return false
}

function safeSource(uri: string, title?: string): SearchSource | null {
  try {
    const url = new URL(uri)
    if (!['https:', 'http:'].includes(url.protocol)) return null
    const domain = url.hostname.replace(/^www\./, '')
    return { title: (title || domain).slice(0, 160), url: url.toString(), domain }
  } catch {
    return null
  }
}

async function getWikipediaResult(query: string) {
  try {
    const response = await fetch(`https://uk.wikipedia.org/w/rest.php/v1/search/title?q=${encodeURIComponent(query)}&limit=1`, { headers: { Accept: 'application/json' } })
    if (!response.ok) return null
    const page = ((await response.json()) as WikipediaSearch).pages?.[0]
    if (!page?.title || !page.key) return null
    return { title: page.title.slice(0, 160), description: (page.description || page.excerpt?.replace(/<[^>]+>/g, '') || '').slice(0, 500), url: `https://uk.wikipedia.org/wiki/${encodeURIComponent(page.key)}` }
  } catch {
    return null
  }
}

async function handleSearch(request: Request, env: Env): Promise<Response> {
  if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: { Allow: 'POST, OPTIONS' } })
  if (request.method !== 'POST') return error('method_not_allowed', 'Метод не підтримується.', 405)

  const client = request.headers.get('CF-Connecting-IP') || 'anonymous'
  if (isRateLimited(client)) return error('rate_limited', 'Забагато запитів. Спробуйте знову за кілька хвилин.', 429)

  const rawBody = await readBodyWithinLimit(request)
  if (rawBody === null) return error('payload_too_large', 'Запит завеликий.', 413)

  let query: unknown
  try { query = (JSON.parse(rawBody) as { query?: unknown }).query } catch { return error('invalid_request', 'Некоректний запит.', 400) }
  if (typeof query !== 'string') return error('invalid_request', 'Некоректний запит.', 400)
  const normalizedQuery = query.trim()
  if (normalizedQuery.length < 3 || normalizedQuery.length > MAX_QUERY_LENGTH) return error('invalid_query', `Запит має містити від 3 до ${MAX_QUERY_LENGTH} символів.`, 400)
  if (!env.GEMINI_API_KEY) return error('not_configured', 'AI-пошук ще не налаштований.', 503)

  const prompt = `Ти — пошук для F1 Calendar. Відповідай українською, стисло й лише на теми Формули 1, F2, F3, WEC, команд, пілотів, трас, перегонів та автоспорту. Якщо запит не про автоспорт, поясни, що пошук підтримує лише F1 та суміжний автоспорт. Не вигадуй фактів; спирайся на результати веб-пошуку. Запит користувача: ${normalizedQuery}`
  const model = env.GEMINI_MODEL || 'gemini-3.6-flash'

  try {
    const [geminiResponse, wikipedia] = await Promise.all([
      fetch(`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`, {
        method: 'POST', headers: { 'Content-Type': 'application/json', 'x-goog-api-key': env.GEMINI_API_KEY },
        body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }], tools: [{ google_search: {} }], generationConfig: { temperature: 0.2, maxOutputTokens: 600 } })
      }),
      getWikipediaResult(normalizedQuery)
    ])
    if (!geminiResponse.ok) {
      if (geminiResponse.status === 429) return error('provider_rate_limited', 'Вичерпано ліміт AI-пошуку. Спробуйте пізніше.', 429)
      if (geminiResponse.status === 401 || geminiResponse.status === 403) return error('provider_auth_failed', 'Налаштування AI-пошуку відхилено. Зверніться до власника сайту.', 502)
      if (geminiResponse.status === 404) return error('provider_model_unavailable', 'Налаштована AI-модель недоступна. Зверніться до власника сайту.', 502)
      return error('provider_unavailable', 'AI-пошук тимчасово недоступний. Спробуйте пізніше.', 502)
    }
    const gemini = await geminiResponse.json() as GeminiResponse
    const candidate = gemini.candidates?.[0]
    const answer = candidate?.content?.parts?.map((part) => part.text || '').join('').trim().slice(0, 6_000)
    if (!answer) return error('empty_response', 'AI-пошук не повернув відповіді. Спробуйте змінити запит.', 502)
    const sources = (candidate?.groundingMetadata?.groundingChunks || []).map((chunk) => chunk.web?.uri ? safeSource(chunk.web.uri, chunk.web.title) : null).filter((source): source is SearchSource => source !== null).filter((source, index, all) => all.findIndex((item) => item.url === source.url) === index).slice(0, 6)
    return json({ answer, sources, wikipedia })
  } catch {
    return error('provider_error', 'Сталася помилка під час AI-пошуку. Спробуйте ще раз.', 502)
  }
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url)
    if (url.pathname === '/api/f1-search') return handleSearch(request, env)
    if (url.pathname.startsWith('/api/')) return error('not_found', 'Маршрут API не знайдено.', 404)
    return env.ASSETS.fetch(request)
  }
}

export { handleSearch }
