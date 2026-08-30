import { handlePushApi, type D1Database } from "./push";
import { handleNewsFeed } from "./newsFeed";
import { handleWatchProviders } from "./watchProviders";
import { serverText } from "@/shared/config/i18n/server";
import {
  SITE_ORIGIN,
  canonicalUrl,
  localeFromPathname,
  localePath,
  seoLocales,
} from "@/shared/config/seo";
import type { SupportedLocale } from "@/shared/config/i18n";

type Env = {
  ASSETS: { fetch(request: Request): Promise<Response> };
  PUSH_DB?: D1Database;
  VAPID_PUBLIC_KEY?: string;
  VAPID_PRIVATE_KEY?: string;
  VAPID_SUBJECT?: string;
  YOUTUBE_API_KEY?: string;
};

type Formula1Video = {
  id: string;
  title: string;
  kind:
    | "race-highlights"
    | "qualifying-highlights"
    | "sprint-highlights"
    | "race-moment";
};
type YoutubePlaylistResponse = {
  nextPageToken?: string;
  items?: Array<{
    snippet?: {
      channelId?: string;
      title?: string;
      publishedAt?: string;
      resourceId?: { videoId?: string };
    };
  }>;
};
type YoutubeSearchResponse = {
  items?: Array<{
    id?: { videoId?: string };
    snippet?: { channelId?: string; title?: string; publishedAt?: string };
  }>;
};

const RATE_WINDOW_MS = 5 * 60 * 1_000;
const videoRequestLog = new Map<string, number[]>();
const OFFICIAL_FORMULA1_CHANNEL_ID = "UCB_qr75-ydFVKSF9Dmo6izg";
const YOUTUBE_ID = /^[A-Za-z0-9_-]{11}$/;
const MAX_YOUTUBE_PLAYLIST_PAGES = 3;
const WORKERS_DEV_HOST = "f1-calendar.itriy1.workers.dev";

function robotsTxt(): Response {
  return new Response(
    `User-agent: *\nAllow: /\nSitemap: ${SITE_ORIGIN}/sitemap.xml\n`,
    {
      headers: {
        "Cache-Control": "public, max-age=3600",
        "Content-Type": "text/plain; charset=utf-8",
      },
    },
  );
}

function sitemapXml(): Response {
  const urls = seoLocales
    .map((locale) => `  <url><loc>${canonicalUrl(locale)}</loc></url>`)
    .join("\n");
  return new Response(
    `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls}\n</urlset>\n`,
    {
      headers: {
        "Cache-Control": "public, max-age=3600",
        "Content-Type": "application/xml; charset=utf-8",
      },
    },
  );
}

const notFoundCopy: Record<
  SupportedLocale,
  { title: string; heading: string; description: string; action: string }
> = {
  uk: {
    title: "Сторінку не знайдено",
    heading: "404 — сторінку не знайдено",
    description:
      "Можливо, посилання застаріло або сторінки ніколи не існувало.",
    action: "На головну",
  },
  en: {
    title: "Page not found",
    heading: "404 — page not found",
    description: "The link may be outdated, or this page never existed.",
    action: "Go to home page",
  },
  de: {
    title: "Seite nicht gefunden",
    heading: "404 — Seite nicht gefunden",
    description:
      "Der Link ist möglicherweise veraltet oder die Seite existierte nie.",
    action: "Zur Startseite",
  },
  es: {
    title: "Página no encontrada",
    heading: "404 — página no encontrada",
    description:
      "Es posible que el enlace esté desactualizado o que la página no exista.",
    action: "Ir al inicio",
  },
  fr: {
    title: "Page introuvable",
    heading: "404 — page introuvable",
    description:
      "Le lien est peut-être obsolète ou cette page n'a jamais existé.",
    action: "Retour à l’accueil",
  },
  it: {
    title: "Pagina non trovata",
    heading: "404 — pagina non trovata",
    description:
      "Il link potrebbe non essere aggiornato oppure la pagina non è mai esistita.",
    action: "Torna alla home",
  },
  ja: {
    title: "ページが見つかりません",
    heading: "404 — ページが見つかりません",
    description: "リンクが古いか、このページは存在しません。",
    action: "ホームへ戻る",
  },
  "zh-CN": {
    title: "找不到页面",
    heading: "404 — 找不到页面",
    description: "链接可能已失效，或该页面从未存在。",
    action: "返回首页",
  },
};

function notFound(locale: SupportedLocale = "uk"): Response {
  const copy = notFoundCopy[locale];
  const homePath = localePath(locale);
  return new Response(
    `<!doctype html><html lang="${locale}"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>${copy.title} | F1 Calendar</title><style>body{margin:0;background:#09090b;color:#fafafa;font-family:Arial,sans-serif}main{box-sizing:border-box;display:grid;min-height:100vh;place-content:center;padding:2rem;text-align:center}p{max-width:34rem;color:#a1a1aa;line-height:1.6}a{display:inline-block;margin-top:1rem;background:#e10600;color:#fff;padding:.8rem 1.1rem;font-weight:700;text-decoration:none}</style></head><body><main><h1>${copy.heading}</h1><p>${copy.description}</p><a href="${homePath}">${copy.action}</a></main></body></html>`,
    {
      status: 404,
      headers: { "Content-Type": "text/html; charset=utf-8" },
    },
  );
}

function redirect(url: URL, pathname: string): Response {
  const destination = new URL(url);
  const useCanonicalOrigin =
    url.hostname === WORKERS_DEV_HOST ||
    url.hostname === new URL(SITE_ORIGIN).hostname;
  if (useCanonicalOrigin) {
    destination.protocol = "https:";
    destination.hostname = new URL(SITE_ORIGIN).hostname;
    destination.port = "";
  }
  destination.pathname = pathname;
  return Response.redirect(destination.toString(), useCanonicalOrigin ? 301 : 302);
}

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
  publishedAt?: unknown,
): Formula1Video | null {
  if (
    typeof id !== "string" ||
    !YOUTUBE_ID.test(id) ||
    typeof title !== "string" ||
    channelId !== OFFICIAL_FORMULA1_CHANNEL_ID
  )
    return null;
  const normalizedTitle = normalizeVideoText(title);
  if (/\b(f2|f3|formula 2|formula 3)\b/.test(normalizedTitle)) return null;
  const normalizedRace = normalizeVideoText(race)
    .replace(/\bgrand prix\b/g, "")
    .trim();
  const raceWords = normalizedRace.split(" ").filter((word) => word.length > 2);
  const isCurrentSeason =
    normalizedTitle.includes(season) ||
    (typeof publishedAt === "string" && publishedAt.startsWith(season));
  if (
    !isCurrentSeason ||
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
  let pageCount = 0;
  do {
    const params = new URLSearchParams({
      part: "snippet",
      playlistId: `UU${OFFICIAL_FORMULA1_CHANNEL_ID.slice(2)}`,
      maxResults: "50",
      key: apiKey,
    });
    if (pageToken) params.set("pageToken", pageToken);
    const response = await fetch(
      `https://www.googleapis.com/youtube/v3/playlistItems?${params}`,
    );
    if (!response.ok) {
      console.error("YouTube playlist request failed", response.status);
      throw new Error("YouTube playlist unavailable");
    }
    const data = (await response.json()) as YoutubePlaylistResponse;
    videos.push(
      ...(data.items || [])
        .map((item) =>
          matchingFormula1Video(
            item.snippet?.resourceId?.videoId,
            item.snippet?.title,
            item.snippet?.channelId,
            season,
            race,
            item.snippet?.publishedAt,
          ),
        )
        .filter((video): video is Formula1Video => video !== null),
    );
    pageToken = data.nextPageToken;
    pageCount += 1;
  } while (
    pageToken &&
    !seenTokens.has(pageToken) &&
    pageCount < MAX_YOUTUBE_PLAYLIST_PAGES &&
    (seenTokens.add(pageToken), true)
  );
  return uniqueVideos(videos);
}

async function findVideosWithYoutubeSearch(
  apiKey: string,
  season: string,
  race: string,
): Promise<Formula1Video[]> {
  const params = new URLSearchParams({
    part: "snippet",
    channelId: OFFICIAL_FORMULA1_CHANNEL_ID,
    type: "video",
    videoEmbeddable: "true",
    maxResults: "50",
    order: "relevance",
    q: `${season} ${race}`,
    key: apiKey,
  });
  const response = await fetch(
    `https://www.googleapis.com/youtube/v3/search?${params}`,
  );
  if (!response.ok) {
    console.error("YouTube search request failed", response.status);
    throw new Error("YouTube search unavailable");
  }
  const data = (await response.json()) as YoutubeSearchResponse;
  return uniqueVideos(
    (data.items || [])
      .map((item) =>
        matchingFormula1Video(
          item.id?.videoId,
          item.snippet?.title,
          item.snippet?.channelId,
          season,
          race,
          item.snippet?.publishedAt,
        ),
      )
      .filter((video): video is Formula1Video => video !== null),
  );
}

async function handleRaceVideos(request: Request, env: Env): Promise<Response> {
  if (request.method !== "GET")
    return error("method_not_allowed", serverText("methodNotAllowed"), 405);
  const client = request.headers.get("CF-Connecting-IP") || "anonymous";
  if (isVideoRateLimited(client))
    return error("rate_limited", serverText("videoRateLimited"), 429);
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
    return error("invalid_request", serverText("invalidRaceData"), 400);
  if (!env.YOUTUBE_API_KEY)
    return error("not_configured", serverText("videoNotConfigured"), 503);
  try {
    const playlistVideos = await findVideosWithYoutubeApi(
      env.YOUTUBE_API_KEY,
      season,
      race,
    );
    const videos = playlistVideos.length
      ? playlistVideos
      : await findVideosWithYoutubeSearch(env.YOUTUBE_API_KEY, season, race);
    return Response.json(
      { videos },
      {
        headers: {
          "Cache-Control": videos.length
            ? "public, max-age=3600, s-maxage=86400, stale-while-revalidate=604800"
            : "public, max-age=300",
          "Content-Type": "application/json; charset=utf-8",
        },
      },
    );
  } catch (cause) {
    console.error("YouTube videos unavailable", cause);
    return error("provider_unavailable", serverText("videoUnavailable"), 502);
  }
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    const isApi = url.pathname.startsWith("/api/");
    if (url.hostname === WORKERS_DEV_HOST && !isApi)
      return redirect(url, url.pathname);
    if (url.pathname === "/api/push/subscription")
      return handlePushApi(request, env);
    if (url.pathname === "/api/push/config") return handlePushApi(request, env);
    if (url.pathname === "/api/f1-videos")
      return handleRaceVideos(request, env);
    if (url.pathname === "/api/f1-feed") return handleNewsFeed(request, env);
    if (url.pathname === "/api/watch-providers")
      return handleWatchProviders(request);
    if (url.pathname.startsWith("/api/"))
      return error("not_found", serverText("apiNotFound"), 404);
    if (url.pathname === "/robots.txt") return robotsTxt();
    if (url.pathname === "/sitemap.xml") return sitemapXml();
    if (url.pathname === "/") return redirect(url, localePath("uk"));

    const locale = localeFromPathname(url.pathname);
    if (locale && url.pathname === `/${locale}`)
      return redirect(url, localePath(locale));
    if (locale && url.pathname === localePath(locale))
      return env.ASSETS.fetch(request);

    if (!url.pathname.includes(".")) return notFound(locale || "uk");
    return env.ASSETS.fetch(request);
  },
};

export { handleRaceVideos, handleNewsFeed, robotsTxt, sitemapXml };
