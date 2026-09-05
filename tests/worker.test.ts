import { afterEach, expect, test, vi } from "vitest";
import { handleNewsFeed, handleRaceVideos } from "../src/server/worker";
import type { D1Database, D1Statement } from "../src/server/push";
import refreshWorker from "../src/server/refresh-worker";
import worker from "../src/server/worker";

const assets = { fetch: async () => new Response("asset") };

afterEach(() => vi.unstubAllGlobals());

test("runs scheduled tasks in the dedicated refresh Worker", async () => {
  const waitUntil = vi.fn();

  await refreshWorker.scheduled(
    { scheduledTime: Date.now(), cron: "*/5 * * * *", noRetry: () => {} },
    {},
    { waitUntil },
  );

  expect(waitUntil).toHaveBeenCalledTimes(1);
});

test("serves stored news without refreshing it in the API Worker", async () => {
  const refreshedAt = new Date().toISOString();
  const statement: D1Statement = {
    bind: () => statement,
    first: async <T>() => ({ refreshed_at: refreshedAt }) as T,
    all: async <T>() =>
      ({
        results: [
          {
            id: "news-1",
            source: "Formula 1",
            source_url: "https://example.test/article",
            title: "Fresh news",
            summary: null,
            description: null,
            language: "en",
            image_url: null,
            published_at: refreshedAt,
          },
        ],
      }) as { results: T[] },
    run: async () => ({ success: true }),
  };
  const db: D1Database = { prepare: () => statement };
  const response = await handleNewsFeed(
    new Request("https://example.test/api/f1-feed"),
    { PUSH_DB: db },
  );

  expect(await response.json()).toEqual({
    news: [expect.objectContaining({ id: "news-1", title: "Fresh news" })],
  });
});

test("rebuilds an empty news feed when the scheduled refresh is unavailable", async () => {
  const publishedAt = new Date().toUTCString();
  let stored = false;
  const db: D1Database = {
    prepare: (sql) => {
      const statement: D1Statement = {
        bind: () => statement,
        first: async <T>() => null as T | null,
        all: async <T>() =>
          ({
            results: stored
              ? [
                  {
                    id: "news-recovered",
                    source: "Formula 1",
                    source_url: "https://example.test/recovered",
                    title: "Recovered F1 news",
                    summary: null,
                    description: null,
                    language: "en",
                    image_url: null,
                    published_at: new Date().toISOString(),
                  },
                ]
              : [],
          }) as { results: T[] },
        run: async () => {
          if (sql.startsWith("INSERT INTO news_items")) stored = true;
          return { success: true };
        },
      };
      return statement;
    },
  };
  vi.stubGlobal(
    "fetch",
    vi.fn().mockResolvedValue(
      new Response(
        `<rss><channel><item><title>Recovered F1 news</title><link>https://example.test/recovered</link><pubDate>${publishedAt}</pubDate></item></channel></rss>`,
      ),
    ),
  );

  const response = await handleNewsFeed(
    new Request("https://example.test/api/f1-feed"),
    { PUSH_DB: db },
  );

  expect(await response.json()).toEqual({
    news: [expect.objectContaining({ id: "news-recovered" })],
  });
  expect(response.headers.get("Cache-Control")).toContain("s-maxage=900");
});

test("returns several matching videos only when YouTube identifies the Formula 1 channel", async () => {
  vi.stubGlobal(
    "fetch",
    vi.fn().mockResolvedValue(
      Response.json({
        items: [
          {
            snippet: {
              channelId: "UCB_qr75-ydFVKSF9Dmo6izg",
              title: "Top 10 moments | 2025 Australian Grand Prix",
              resourceId: { videoId: "moment12345" },
            },
          },
          {
            snippet: {
              channelId: "UCB_qr75-ydFVKSF9Dmo6izg",
              title: "Race Highlights | 2025 Australian Grand Prix",
              resourceId: { videoId: "md9-jG4RzXs" },
            },
          },
          {
            snippet: {
              channelId: "UCB_qr75-ydFVKSF9Dmo6izg",
              title: "Qualifying Highlights | 2025 Australian Grand Prix",
              resourceId: { videoId: "Mr7T8TC-cZg" },
            },
          },
          {
            snippet: {
              channelId: "UCB_qr75-ydFVKSF9Dmo6izg",
              title: "F2 Race Highlights | 2025 Australian Grand Prix",
              resourceId: { videoId: "formula2vid" },
            },
          },
          {
            snippet: {
              channelId: "UCB_qr75-ydFVKSF9Dmo6izg",
              title: "Formula 3 Race Highlights | 2025 Australian Grand Prix",
              resourceId: { videoId: "formula3vid" },
            },
          },
          {
            snippet: {
              channelId: "not-the-official-channel",
              title: "Race Highlights | 2025 Australian Grand Prix",
              resourceId: { videoId: "untrusted01" },
            },
          },
        ],
      }),
    ),
  );
  const response = await handleRaceVideos(
    new Request(
      "https://example.test/api/f1-videos?season=2025&round=1&race=Australian%20Grand%20Prix",
    ),
    { ASSETS: assets, YOUTUBE_API_KEY: "server-only-secret" },
  );
  expect(await response.json()).toEqual({
    videos: [
      {
        id: "md9-jG4RzXs",
        title: "Race Highlights | 2025 Australian Grand Prix",
        kind: "race-highlights",
      },
      {
        id: "Mr7T8TC-cZg",
        title: "Qualifying Highlights | 2025 Australian Grand Prix",
        kind: "qualifying-highlights",
      },
      {
        id: "moment12345",
        title: "Top 10 moments | 2025 Australian Grand Prix",
        kind: "race-moment",
      },
    ],
  });
});

test("keeps matching videos from every official search page in category priority order", async () => {
  vi.stubGlobal(
    "fetch",
    vi
      .fn()
      .mockResolvedValueOnce(
        Response.json({
          nextPageToken: "page-2",
          items: [
            {
              snippet: {
                channelId: "UCB_qr75-ydFVKSF9Dmo6izg",
                title: "Top 10 moments | 2025 Australian Grand Prix",
                resourceId: { videoId: "moment12345" },
              },
            },
          ],
        }),
      )
      .mockResolvedValueOnce(
        Response.json({
          items: [
            {
              snippet: {
                channelId: "UCB_qr75-ydFVKSF9Dmo6izg",
                title: "Sprint Highlights | 2025 Australian Grand Prix",
                resourceId: { videoId: "sprint12345" },
              },
            },
          ],
        }),
      ),
  );
  const response = await handleRaceVideos(
    new Request(
      "https://example.test/api/f1-videos?season=2025&round=1&race=Australian%20Grand%20Prix",
    ),
    { ASSETS: assets, YOUTUBE_API_KEY: "server-only-secret" },
  );
  expect(await response.json()).toEqual({
    videos: [
      {
        id: "sprint12345",
        title: "Sprint Highlights | 2025 Australian Grand Prix",
        kind: "sprint-highlights",
      },
      {
        id: "moment12345",
        title: "Top 10 moments | 2025 Australian Grand Prix",
        kind: "race-moment",
      },
    ],
  });
});

test("accepts a current-season upload when its title omits the year", async () => {
  vi.stubGlobal(
    "fetch",
    vi.fn().mockResolvedValue(
      Response.json({
        items: [
          {
            snippet: {
              channelId: "UCB_qr75-ydFVKSF9Dmo6izg",
              title: "Race Highlights | Dutch Grand Prix",
              publishedAt: "2026-08-23T17:00:00Z",
              resourceId: { videoId: "dutch2026ab" },
            },
          },
        ],
      }),
    ),
  );
  const response = await handleRaceVideos(
    new Request(
      "https://example.test/api/f1-videos?season=2026&round=12&race=Dutch%20Grand%20Prix",
    ),
    { ASSETS: assets, YOUTUBE_API_KEY: "server-only-secret" },
  );
  expect(await response.json()).toEqual({
    videos: [
      {
        id: "dutch2026ab",
        title: "Race Highlights | Dutch Grand Prix",
        kind: "race-highlights",
      },
    ],
  });
});

test("searches the official channel when an older race is outside the recent uploads", async () => {
  vi.stubGlobal(
    "fetch",
    vi
      .fn()
      .mockResolvedValueOnce(Response.json({ items: [] }))
      .mockResolvedValueOnce(
        Response.json({
          items: [
            {
              id: { videoId: "austria2026" },
              snippet: {
                channelId: "UCB_qr75-ydFVKSF9Dmo6izg",
                title: "Race Highlights | 2026 Austrian Grand Prix",
                publishedAt: "2026-06-28T17:00:00Z",
              },
            },
          ],
        }),
      ),
  );
  const response = await handleRaceVideos(
    new Request(
      "https://example.test/api/f1-videos?season=2026&round=8&race=Austrian%20Grand%20Prix",
    ),
    { ASSETS: assets, YOUTUBE_API_KEY: "server-only-secret" },
  );
  expect(await response.json()).toEqual({
    videos: [
      {
        id: "austria2026",
        title: "Race Highlights | 2026 Austrian Grand Prix",
        kind: "race-highlights",
      },
    ],
  });
});

test("returns an explicit provider error instead of masking a YouTube failure", async () => {
  vi.stubGlobal(
    "fetch",
    vi.fn().mockResolvedValue(new Response(null, { status: 403 })),
  );
  const response = await handleRaceVideos(
    new Request(
      "https://example.test/api/f1-videos?season=2026&round=12&race=Dutch%20Grand%20Prix",
    ),
    { ASSETS: assets, YOUTUBE_API_KEY: "server-only-secret" },
  );
  expect(response.status).toBe(502);
  expect(await response.json()).toEqual({
    error: {
      code: "provider_unavailable",
      message: "Відео Formula 1 тимчасово недоступні. Спробуйте пізніше.",
    },
  });
});

test("routes DELETE push unsubscribe requests to push validation instead of the API 404 fallback", async () => {
  const db = {
    prepare: () => ({
      bind() {
        return this;
      },
      run: async () => ({ success: true }),
      first: async () => null,
      all: async () => ({ results: [] }),
    }),
  };
  const response = await worker.fetch(
    new Request("https://example.test/api/push/subscription", {
      method: "DELETE",
      headers: { "content-type": "application/json" },
      body: "{}",
    }),
    {
      ASSETS: assets,
      PUSH_DB: db,
      VAPID_PUBLIC_KEY: "public",
      VAPID_PRIVATE_KEY: "private",
    },
  );
  expect(response.status).toBe(400);
  expect(await response.json()).toEqual({
    error: {
      code: "invalid_subscription",
      message: "Некоректна push-підписка.",
    },
  });
});

test("serves crawl directives and the localized sitemap", async () => {
  const robots = await worker.fetch(
    new Request("https://f1-calendar.date/robots.txt"),
    { ASSETS: assets },
  );
  expect(robots.headers.get("content-type")).toContain("text/plain");
  expect(await robots.text()).toContain(
    "Sitemap: https://f1-calendar.date/sitemap.xml",
  );

  const sitemap = await worker.fetch(
    new Request("https://f1-calendar.date/sitemap.xml"),
    { ASSETS: assets },
  );
  const xml = await sitemap.text();
  expect(sitemap.headers.get("content-type")).toContain("application/xml");
  expect(xml).toContain("https://f1-calendar.date/uk/");
  expect(xml).toContain("https://f1-calendar.date/ru/");
  expect(xml).toContain("https://f1-calendar.date/zh-CN/");
  expect(xml).toContain("https://f1-calendar.date/nl-NL/");
  expect(xml).toContain("https://f1-calendar.date/sq-AL/");
  expect(xml.match(/<loc>/g) || []).toHaveLength(11);
});

test("redirects the root and workers.dev pages to canonical localized URLs", async () => {
  const root = await worker.fetch(new Request("https://f1-calendar.date/"), {
    ASSETS: assets,
  });
  expect(root.status).toBe(301);
  expect(root.headers.get("location")).toBe("https://f1-calendar.date/uk/");

  const legacy = await worker.fetch(
    new Request("https://f1-calendar.itriy1.workers.dev/en/?source=test"),
    { ASSETS: assets },
  );
  expect(legacy.status).toBe(301);
  expect(legacy.headers.get("location")).toBe(
    "https://f1-calendar.date/en/?source=test",
  );

  const russian = await worker.fetch(
    new Request("https://f1-calendar.date/ru"),
    { ASSETS: assets },
  );
  expect(russian.status).toBe(301);
  expect(russian.headers.get("location")).toBe("https://f1-calendar.date/ru/");

  const dutch = await worker.fetch(
    new Request("https://f1-calendar.date/nl-NL"),
    { ASSETS: assets },
  );
  expect(dutch.status).toBe(301);
  expect(dutch.headers.get("location")).toBe("https://f1-calendar.date/nl-NL/");

  const albanian = await worker.fetch(
    new Request("https://f1-calendar.date/sq-AL"),
    { ASSETS: assets },
  );
  expect(albanian.status).toBe(301);
  expect(albanian.headers.get("location")).toBe(
    "https://f1-calendar.date/sq-AL/",
  );
});

test("serves the app directly at the local development root", async () => {
  const response = await worker.fetch(new Request("http://localhost:8787/"), {
    ASSETS: assets,
  });

  expect(response.status).toBe(200);
  expect(response.headers.get("location")).toBeNull();
  expect(await response.text()).toBe("asset");
});

test("does not return the SPA shell for unknown document routes", async () => {
  const response = await worker.fetch(
    new Request("https://f1-calendar.date/not-a-page"),
    { ASSETS: assets },
  );
  expect(response.status).toBe(404);
  expect(response.headers.get("content-type")).toContain("text/html");
  expect(response.headers.get("x-robots-tag")).toBe("noindex, nofollow");
  const html = await response.text();
  expect(html).toContain('<meta name="robots" content="noindex, nofollow">');
  expect(html).toContain("404 - сторінку не знайдено");
});

test("returns a localized noindex page for unknown Russian routes", async () => {
  const response = await worker.fetch(
    new Request("https://f1-calendar.date/ru/not-a-page"),
    { ASSETS: assets },
  );
  expect(response.status).toBe(404);
  expect(response.headers.get("x-robots-tag")).toBe("noindex, nofollow");
  expect(await response.text()).toContain("404 - страница не найдена");
});
