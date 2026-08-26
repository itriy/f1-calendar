import { handlePushApi, sendDueRaceReminders, type D1Database } from "./push";
import { handleNewsFeed, refreshNewsFeed } from "./newsFeed";

type Env = {
  ASSETS: { fetch(request: Request): Promise<Response> };
  PUSH_DB?: D1Database;
  VAPID_PUBLIC_KEY?: string;
  VAPID_PRIVATE_KEY?: string;
  VAPID_SUBJECT?: string;
  GEMINI_API_KEY?: string;
  GEMINI_MODEL?: string;
  YOUTUBE_API_KEY?: string;
};
type ScheduledController = {
  scheduledTime: number;
  cron: string;
  noRetry(): void;
};
type ExecutionContext = { waitUntil(promise: Promise<unknown>): void };

type GeminiResponse = {
  candidates?: Array<{
    content?: { parts?: Array<{ text?: string }> };
    groundingMetadata?: {
      groundingChunks?: Array<{ web?: { title?: string; uri?: string } }>;
    };
  }>;
};

type WikipediaSearch = {
  pages?: Array<{
    title?: string;
    key?: string;
    excerpt?: string;
    description?: string;
  }>;
};
type SearchSource = { title: string; url: string; domain: string };
type Formula1Video = {
  id: string;
  title: string;
  kind:
    | "race-highlights"
    | "qualifying-highlights"
    | "sprint-highlights"
    | "race-moment";
};
type YoutubeSearchResponse = {
  nextPageToken?: string;
  items?: Array<{
    id?: { videoId?: string };
    snippet?: { channelId?: string; title?: string };
  }>;
};

const MAX_BODY_BYTES = 1_024;
const MAX_QUERY_LENGTH = 400;
const RATE_LIMIT = 8;
const RATE_WINDOW_MS = 5 * 60 * 1_000;
const requestLog = new Map<string, number[]>();
const videoRequestLog = new Map<string, number[]>();
const OFFICIAL_FORMULA1_CHANNEL_ID = "UCB_qr75-ydFVKSF9Dmo6izg";
const YOUTUBE_ID = /^[A-Za-z0-9_-]{11}$/;

function json(body: unknown, status = 200): Response {
  return Response.json(body, {
    status,
    headers: {
      "Cache-Control": "no-store",
      "Content-Type": "application/json; charset=utf-8",
    },
  });
}

function error(code: string, message: string, status: number): Response {
  return json({ error: { code, message } }, status);
}

async function readBodyWithinLimit(request: Request): Promise<string | null> {
  const contentLength = Number(request.headers.get("content-length") || 0);
  if (contentLength > MAX_BODY_BYTES) return null;
  if (!request.body) return "";
  const reader = request.body.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      total += value.byteLength;
      if (total > MAX_BODY_BYTES) {
        await reader.cancel();
        return null;
      }
      chunks.push(value);
    }
  } finally {
    reader.releaseLock();
  }
  const merged = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) {
    merged.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return new TextDecoder().decode(merged);
}

function isRateLimited(client: string): boolean {
  const now = Date.now();
  const recent = (requestLog.get(client) || []).filter(
    (time) => now - time < RATE_WINDOW_MS,
  );
  if (recent.length >= RATE_LIMIT) return true;
  recent.push(now);
  requestLog.set(client, recent);
  return false;
}

function isVideoRateLimited(client: string): boolean {
  const now = Date.now();
  const recent = (videoRequestLog.get(client) || []).filter(
    (time) => now - time < RATE_WINDOW_MS,
  );
  if (recent.length >= 30) return true;
  recent.push(now);
  videoRequestLog.set(client, recent);
  return false;
}

function normalizeVideoText(value: string): string {
  return value
    .toLowerCase()
    .replace(/&amp;/g, "and")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function matchingFormula1Video(
  id: unknown,
  title: unknown,
  channelId: unknown,
  season: string,
  race: string,
): Formula1Video | null {
  if (
    typeof id !== "string" ||
    !YOUTUBE_ID.test(id) ||
    typeof title !== "string" ||
    channelId !== OFFICIAL_FORMULA1_CHANNEL_ID
  )
    return null;
  const normalizedTitle = normalizeVideoText(title);
  if (/\b(f2|f3|formula 2|formula 3)\b/.test(normalizedTitle))
    return null;
  const normalizedRace = normalizeVideoText(race)
    .replace(/\bgrand prix\b/g, "")
    .trim();
  const raceWords = normalizedRace.split(" ").filter((word) => word.length > 2);
  if (
    !normalizedTitle.includes(season) ||
    !raceWords.length ||
    !raceWords.every((word) => normalizedTitle.includes(word))
  )
    return null;
  if (/\bqualifying highlights\b/.test(normalizedTitle))
    return { id, title: title.slice(0, 160), kind: "qualifying-highlights" };
  if (/\bsprint (highlights|shootout highlights)\b/.test(normalizedTitle))
    return { id, title: title.slice(0, 160), kind: "sprint-highlights" };
  if (/\brace highlights\b/.test(normalizedTitle))
    return { id, title: title.slice(0, 160), kind: "race-highlights" };
  if (
    /\b(key moments?|top 10|best moments?|overtakes?|battles?|dramatic moments?)\b/.test(
      normalizedTitle,
    )
  )
    return { id, title: title.slice(0, 160), kind: "race-moment" };
  return null;
}

function uniqueVideos(videos: Formula1Video[]): Formula1Video[] {
  const priority: Record<Formula1Video["kind"], number> = {
    "race-highlights": 0,
    "qualifying-highlights": 1,
    "sprint-highlights": 2,
    "race-moment": 3,
  };
  return videos
    .filter(
      (video, index, all) =>
        all.findIndex((item) => item.id === video.id) === index,
    )
    .sort((a, b) => priority[a.kind] - priority[b.kind]);
}

async function findVideosWithYoutubeApi(
  apiKey: string,
  season: string,
  race: string,
): Promise<Formula1Video[]> {
  const videos: Formula1Video[] = [];
  const seenTokens = new Set<string>();
  let pageToken: string | undefined;
  do {
    const params = new URLSearchParams({
      part: "snippet",
      channelId: OFFICIAL_FORMULA1_CHANNEL_ID,
      type: "video",
      videoEmbeddable: "true",
      maxResults: "50",
      order: "date",
      q: `${season} ${race}`,
      key: apiKey,
    });
    if (pageToken) params.set("pageToken", pageToken);
    const response = await fetch(
      `https://www.googleapis.com/youtube/v3/search?${params}`,
    );
    if (!response.ok) throw new Error("YouTube search unavailable");
    const data = (await response.json()) as YoutubeSearchResponse;
    videos.push(
      ...(data.items || [])
        .map((item) =>
          matchingFormula1Video(
            item.id?.videoId,
            item.snippet?.title,
            item.snippet?.channelId,
            season,
            race,
          ),
        )
        .filter((video): video is Formula1Video => video !== null),
    );
    pageToken = data.nextPageToken;
  } while (
    pageToken &&
    !seenTokens.has(pageToken) &&
    (seenTokens.add(pageToken), true)
  );
  return uniqueVideos(videos);
}

function xmlTag(entry: string, tag: string): string | null {
  const match = entry.match(
    new RegExp(`<${tag}[^>]*>([\\s\\S]*?)</${tag}>`, "i"),
  );
  return match?.[1]?.trim() || null;
}

async function findVideosWithOfficialRss(
  season: string,
  race: string,
): Promise<Formula1Video[]> {
  const response = await fetch(
    `https://www.youtube.com/feeds/videos.xml?channel_id=${OFFICIAL_FORMULA1_CHANNEL_ID}`,
  );
  if (!response.ok) throw new Error("YouTube feed unavailable");
  const entries =
    (await response.text()).match(/<entry>[\s\S]*?<\/entry>/gi) || [];
  return uniqueVideos(
    entries
      .map((entry) =>
        matchingFormula1Video(
          xmlTag(entry, "yt:videoId"),
          xmlTag(entry, "title"),
          xmlTag(entry, "yt:channelId"),
          season,
          race,
        ),
      )
      .filter((video): video is Formula1Video => video !== null),
  );
}

async function handleRaceVideos(request: Request, env: Env): Promise<Response> {
  if (request.method !== "GET")
    return error("method_not_allowed", "Метод не підтримується.", 405);
  const client = request.headers.get("CF-Connecting-IP") || "anonymous";
  if (isVideoRateLimited(client))
    return error(
      "rate_limited",
      "Забагато запитів до відео. Спробуйте пізніше.",
      429,
    );
  const url = new URL(request.url);
  const season = url.searchParams.get("season") || "";
  const round = url.searchParams.get("round") || "";
  const race = (url.searchParams.get("race") || "").trim();
  if (
    !/^\d{4}$/.test(season) ||
    Number(season) < 1950 ||
    Number(season) > new Date().getUTCFullYear() ||
    !/^\d{1,2}$/.test(round) ||
    Number(round) < 1 ||
    Number(round) > 30 ||
    race.length < 3 ||
    race.length > 120
  )
    return error("invalid_request", "Некоректні дані етапу.", 400);
  try {
    const primaryVideos = env.YOUTUBE_API_KEY
      ? await findVideosWithYoutubeApi(env.YOUTUBE_API_KEY, season, race)
      : await findVideosWithOfficialRss(season, race);
    const videos =
      primaryVideos.length || !env.YOUTUBE_API_KEY
        ? primaryVideos
        : await findVideosWithOfficialRss(season, race);
    return Response.json(
      { videos },
      {
        headers: {
          "Cache-Control":
            "public, max-age=3600, s-maxage=86400, stale-while-revalidate=604800",
          "Content-Type": "application/json; charset=utf-8",
        },
      },
    );
  } catch {
    return Response.json(
      { videos: [] },
      {
        headers: {
          "Cache-Control": "public, max-age=300",
          "Content-Type": "application/json; charset=utf-8",
        },
      },
    );
  }
}

function safeSource(uri: string, title?: string): SearchSource | null {
  try {
    const url = new URL(uri);
    if (!["https:", "http:"].includes(url.protocol)) return null;
    const domain = url.hostname.replace(/^www\./, "");
    return {
      title: (title || domain).slice(0, 160),
      url: url.toString(),
      domain,
    };
  } catch {
    return null;
  }
}

async function getWikipediaResult(query: string) {
  try {
    const response = await fetch(
      `https://uk.wikipedia.org/w/rest.php/v1/search/title?q=${encodeURIComponent(query)}&limit=1`,
      { headers: { Accept: "application/json" } },
    );
    if (!response.ok) return null;
    const page = ((await response.json()) as WikipediaSearch).pages?.[0];
    if (!page?.title || !page.key) return null;
    return {
      title: page.title.slice(0, 160),
      description: (
        page.description ||
        page.excerpt?.replace(/<[^>]+>/g, "") ||
        ""
      ).slice(0, 500),
      url: `https://uk.wikipedia.org/wiki/${encodeURIComponent(page.key)}`,
    };
  } catch {
    return null;
  }
}

async function handleSearch(request: Request, env: Env): Promise<Response> {
  if (request.method === "OPTIONS")
    return new Response(null, {
      status: 204,
      headers: { Allow: "POST, OPTIONS" },
    });
  if (request.method !== "POST")
    return error("method_not_allowed", "Метод не підтримується.", 405);

  const client = request.headers.get("CF-Connecting-IP") || "anonymous";
  if (isRateLimited(client))
    return error(
      "rate_limited",
      "Забагато запитів. Спробуйте знову за кілька хвилин.",
      429,
    );

  const rawBody = await readBodyWithinLimit(request);
  if (rawBody === null)
    return error("payload_too_large", "Запит завеликий.", 413);

  let query: unknown;
  try {
    query = (JSON.parse(rawBody) as { query?: unknown }).query;
  } catch {
    return error("invalid_request", "Некоректний запит.", 400);
  }
  if (typeof query !== "string")
    return error("invalid_request", "Некоректний запит.", 400);
  const normalizedQuery = query.trim();
  if (normalizedQuery.length < 3 || normalizedQuery.length > MAX_QUERY_LENGTH)
    return error(
      "invalid_query",
      `Запит має містити від 3 до ${MAX_QUERY_LENGTH} символів.`,
      400,
    );
  if (!env.GEMINI_API_KEY)
    return error("not_configured", "AI-пошук ще не налаштований.", 503);

  const prompt = `Ти — пошук для F1 Calendar. Відповідай українською, стисло й лише на теми Формули 1, F2, F3, WEC, команд, пілотів, трас, перегонів та автоспорту. Якщо запит не про автоспорт, поясни, що пошук підтримує лише F1 та суміжний автоспорт. Не вигадуй фактів; спирайся на результати веб-пошуку. Запит користувача: ${normalizedQuery}`;
  const model = env.GEMINI_MODEL || "gemini-3.6-flash";

  try {
    const [geminiResponse, wikipedia] = await Promise.all([
      fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-goog-api-key": env.GEMINI_API_KEY,
          },
          body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }],
            tools: [{ google_search: {} }],
            generationConfig: { temperature: 0.2, maxOutputTokens: 600 },
          }),
        },
      ),
      getWikipediaResult(normalizedQuery),
    ]);
    if (!geminiResponse.ok) {
      if (geminiResponse.status === 429)
        return error(
          "provider_rate_limited",
          "Вичерпано ліміт AI-пошуку. Спробуйте пізніше.",
          429,
        );
      if (geminiResponse.status === 401 || geminiResponse.status === 403)
        return error(
          "provider_auth_failed",
          "Налаштування AI-пошуку відхилено. Зверніться до власника сайту.",
          502,
        );
      if (geminiResponse.status === 404)
        return error(
          "provider_model_unavailable",
          "Налаштована AI-модель недоступна. Зверніться до власника сайту.",
          502,
        );
      return error(
        "provider_unavailable",
        "AI-пошук тимчасово недоступний. Спробуйте пізніше.",
        502,
      );
    }
    const gemini = (await geminiResponse.json()) as GeminiResponse;
    const candidate = gemini.candidates?.[0];
    const answer = candidate?.content?.parts
      ?.map((part) => part.text || "")
      .join("")
      .trim()
      .slice(0, 6_000);
    if (!answer)
      return error(
        "empty_response",
        "AI-пошук не повернув відповіді. Спробуйте змінити запит.",
        502,
      );
    const sources = (candidate?.groundingMetadata?.groundingChunks || [])
      .map((chunk) =>
        chunk.web?.uri ? safeSource(chunk.web.uri, chunk.web.title) : null,
      )
      .filter((source): source is SearchSource => source !== null)
      .filter(
        (source, index, all) =>
          all.findIndex((item) => item.url === source.url) === index,
      )
      .slice(0, 6);
    return json({ answer, sources, wikipedia });
  } catch {
    return error(
      "provider_error",
      "Сталася помилка під час AI-пошуку. Спробуйте ще раз.",
      502,
    );
  }
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    if (url.pathname === "/api/push/subscription")
      return handlePushApi(request, env);
    if (url.pathname === "/api/push/config") return handlePushApi(request, env);
    if (url.pathname === "/api/f1-search") return handleSearch(request, env);
    if (url.pathname === "/api/f1-videos")
      return handleRaceVideos(request, env);
    if (url.pathname === "/api/f1-feed") return handleNewsFeed(request, env);
    if (url.pathname.startsWith("/api/"))
      return error("not_found", "Маршрут API не знайдено.", 404);
    return env.ASSETS.fetch(request);
  },
  async scheduled(
    _controller: ScheduledController,
    env: Env,
    ctx: ExecutionContext,
  ) {
    ctx.waitUntil(Promise.all([sendDueRaceReminders(env), refreshNewsFeed(env)]));
  },
};

export { handleRaceVideos, handleSearch, handleNewsFeed };
