import type { D1Database } from "./push";
import { serverText } from "@/shared/config/i18n/server";

export type NewsEnv = {
  PUSH_DB?: D1Database;
};
type Source = {
  name: string;
  url: string;
  language: string;
  dateFallback?: boolean;
  f1Only?: boolean;
};
type ParsedArticle = {
  source: string;
  sourceUrl: string;
  title: string;
  publishedAt: string;
  language: string;
  imageUrl: string | null;
  description: string | null;
};

const REFRESH_INTERVAL_MS = 15 * 60 * 1_000;
const NEWS_WINDOW_MS = 7 * 24 * 60 * 60 * 1_000;
const MAX_ARTICLES_PER_SOURCE = 12;
const RSS_FETCH_TIMEOUT_MS = 8_000;
const SOURCES: Source[] = [
  {
    name: "Formula 1",
    url: "https://www.formula1.com/en/latest/all.xml",
    language: "en",
    dateFallback: true,
  },
  {
    name: "FIA",
    url: "https://www.fia.com/rss/news",
    language: "en",
    f1Only: true,
  },
  {
    name: "Motorsport.com",
    url: "https://www.motorsport.com/rss/f1/news/",
    language: "en",
  },
  {
    name: "The Race",
    url: "https://www.the-race.com/category/formula-1/feed/",
    language: "en",
  },
  {
    name: "Autosport",
    url: "https://www.autosport.com/rss/feed/f1",
    language: "en",
  },
];

function text(value: string | null | undefined): string {
  return (value || "")
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1")
    .replace(/<[^>]+>/g, "")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .trim();
}
function tag(entry: string, name: string): string | null {
  return (
    entry.match(
      new RegExp(`<${name}(?:\\s[^>]*)?>([\\s\\S]*?)</${name}>`, "i"),
    )?.[1] || null
  );
}
function link(entry: string): string | null {
  const rss = text(tag(entry, "link"));
  if (rss) return rss;
  return entry.match(/<link[^>]+href=["']([^"']+)["'][^>]*>/i)?.[1] || null;
}
function validUrl(value: string | null): string | null {
  if (!value) return null;
  try {
    const url = new URL(value);
    return url.protocol === "https:" ? url.toString() : null;
  } catch {
    return null;
  }
}
function articleId(url: string): string {
  let hash = 5381;
  for (let index = 0; index < url.length; index += 1)
    hash = (hash * 33) ^ url.charCodeAt(index);
  return `news-${(hash >>> 0).toString(36)}`;
}

async function fetchWithTimeout(
  input: RequestInfo | URL,
  init: RequestInit,
  timeoutMs: number,
): Promise<Response> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(input, { ...init, signal: controller.signal });
  } finally {
    clearTimeout(timeout);
  }
}

export function parseFeed(xml: string, source: Source): ParsedArticle[] {
  const blocks =
    xml.match(/<(?:item|entry)(?:\s[^>]*)?>[\s\S]*?<\/(?:item|entry)>/gi) || [];
  const minDate = Date.now() - NEWS_WINDOW_MS;
  return blocks
    .flatMap((block) => {
      const sourceUrl = validUrl(link(block));
      const title = text(tag(block, "title"));
      const rawDate = text(
        tag(block, "pubDate") ||
          tag(block, "published") ||
          tag(block, "updated"),
      );
      const published = new Date(rawDate);
      const publishedAt = Number.isNaN(published.getTime())
        ? source.dateFallback
          ? new Date()
          : null
        : published;
      if (
        !sourceUrl ||
        !title ||
        !publishedAt ||
        publishedAt.getTime() < minDate
      )
        return [];
      if (source.f1Only && !/\b(formula\s*1|f1|grand prix)\b/i.test(title))
        return [];
      const description = text(
        tag(block, "description") ||
          tag(block, "content:encoded") ||
          tag(block, "summary") ||
          tag(block, "content"),
      ).slice(0, 700);
      const image = validUrl(
        block.match(
          /<(?:media:)?(?:thumbnail|content)[^>]+url=["']([^"']+)["']/i,
        )?.[1] ||
          block.match(/<enclosure[^>]+url=["']([^"']+)["'][^>]*>/i)?.[1] ||
          block.match(/<img[^>]+src=["']([^"']+)["']/i)?.[1] ||
          null,
      );
      return [
        {
          source: source.name,
          sourceUrl,
          title: title.slice(0, 300),
          publishedAt: publishedAt.toISOString(),
          language: source.language,
          imageUrl: image,
          description:
            description && description.toLowerCase() !== title.toLowerCase()
              ? description
              : null,
        },
      ];
    })
    .slice(0, MAX_ARTICLES_PER_SOURCE);
}

async function wasRecentlyRefreshed(db: D1Database): Promise<boolean> {
  const row = await db
    .prepare("SELECT MIN(refreshed_at) AS refreshed_at FROM news_feed_state")
    .first<{ refreshed_at: string | null }>();
  return Boolean(
    row?.refreshed_at &&
    Date.now() - new Date(row.refreshed_at).getTime() < REFRESH_INTERVAL_MS,
  );
}

export async function refreshNewsFeed(
  env: NewsEnv,
  force = false,
): Promise<void> {
  const db = env.PUSH_DB;
  if (!db || (!force && (await wasRecentlyRefreshed(db)))) return;
  const responses = await Promise.allSettled(
    SOURCES.map(async (source) => {
      const response = await fetchWithTimeout(
        source.url,
        {
          headers: {
            Accept:
              "application/rss+xml, application/atom+xml, application/xml",
          },
        },
        RSS_FETCH_TIMEOUT_MS,
      );
      if (!response.ok) throw new Error("Feed unavailable");
      return parseFeed(await response.text(), source);
    }),
  );
  const seen = new Set<string>();
  const articles = responses
    .flatMap((result) => (result.status === "fulfilled" ? result.value : []))
    .filter(
      (article) =>
        !seen.has(article.sourceUrl) && (seen.add(article.sourceUrl), true),
  );
  for (const article of articles) {
    await db
      .prepare(
        "INSERT INTO news_items (id, source, source_url, title, summary_uk, description, language, image_url, published_at, fetched_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?) ON CONFLICT(source_url) DO UPDATE SET title = excluded.title, description = excluded.description, image_url = COALESCE(excluded.image_url, news_items.image_url), published_at = excluded.published_at, fetched_at = excluded.fetched_at",
      )
      .bind(
        articleId(article.sourceUrl),
        article.source,
        article.sourceUrl,
        article.title,
        null,
        article.description,
        article.language,
        article.imageUrl,
        article.publishedAt,
        new Date().toISOString(),
      )
      .run();
  }
  for (const source of SOURCES)
    await db
      .prepare(
        "INSERT INTO news_feed_state (source, refreshed_at) VALUES (?, ?) ON CONFLICT(source) DO UPDATE SET refreshed_at = excluded.refreshed_at",
      )
      .bind(source.name, new Date().toISOString())
      .run();
}

export async function refreshNewsFeedSafely(env: NewsEnv): Promise<void> {
  try {
    await refreshNewsFeed(env);
  } catch (cause) {
    console.warn("News feed refresh failed", cause);
  }
}

export async function handleNewsFeed(
  request: Request,
  env: NewsEnv,
): Promise<Response> {
  if (request.method !== "GET")
    return Response.json(
      {
        error: {
          code: "method_not_allowed",
          message: serverText("methodNotAllowed"),
        },
      },
      { status: 405 },
    );
  if (!env.PUSH_DB)
    return Response.json(
      { news: [] },
      { headers: { "Cache-Control": "public, max-age=60" } },
    );
  const cutoff = new Date(Date.now() - NEWS_WINDOW_MS).toISOString();
  const query = () =>
    env
      .PUSH_DB!.prepare(
        "SELECT id, source, source_url, title, summary_uk AS summary, description, language, image_url, published_at FROM news_items WHERE published_at >= ? ORDER BY published_at DESC LIMIT 60",
      )
      .bind(cutoff)
      .all<{
        id: string;
        source: string;
        source_url: string;
        title: string;
        summary: string | null;
        description: string | null;
        language: string;
        image_url: string | null;
        published_at: string;
      }>();
  const result = await query();
  return Response.json(
    {
      news: result.results.map((item) => ({
        id: item.id,
        type: "news",
        source: item.source,
        sourceUrl: item.source_url,
        title: item.title,
        summary: item.summary,
        description: item.description,
        language: item.language,
        imageUrl: item.image_url,
        publishedAt: item.published_at,
      })),
    },
    {
      headers: {
        "Cache-Control": "public, max-age=300, s-maxage=900",
        "Content-Type": "application/json; charset=utf-8",
      },
    },
  );
}
