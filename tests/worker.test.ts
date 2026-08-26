import { afterEach, expect, test, vi } from "vitest";
import { handleRaceVideos, handleSearch } from "../src/worker";
import worker from "../src/worker";

const assets = { fetch: async () => new Response("asset") };

afterEach(() => vi.unstubAllGlobals());

test("returns several matching videos only when YouTube identifies the Formula 1 channel", async () => {
  vi.stubGlobal(
    "fetch",
    vi.fn().mockResolvedValue(
      Response.json({
        items: [
          {
            id: { videoId: "moment12345" },
            snippet: {
              channelId: "UCB_qr75-ydFVKSF9Dmo6izg",
              title: "Top 10 moments | 2025 Australian Grand Prix",
            },
          },
          {
            id: { videoId: "md9-jG4RzXs" },
            snippet: {
              channelId: "UCB_qr75-ydFVKSF9Dmo6izg",
              title: "Race Highlights | 2025 Australian Grand Prix",
            },
          },
          {
            id: { videoId: "Mr7T8TC-cZg" },
            snippet: {
              channelId: "UCB_qr75-ydFVKSF9Dmo6izg",
              title: "Qualifying Highlights | 2025 Australian Grand Prix",
            },
          },
          {
            id: { videoId: "formula2vid" },
            snippet: {
              channelId: "UCB_qr75-ydFVKSF9Dmo6izg",
              title: "F2 Race Highlights | 2025 Australian Grand Prix",
            },
          },
          {
            id: { videoId: "formula3vid" },
            snippet: {
              channelId: "UCB_qr75-ydFVKSF9Dmo6izg",
              title: "Formula 3 Race Highlights | 2025 Australian Grand Prix",
            },
          },
          {
            id: { videoId: "untrusted01" },
            snippet: {
              channelId: "not-the-official-channel",
              title: "Race Highlights | 2025 Australian Grand Prix",
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
              id: { videoId: "moment12345" },
              snippet: {
                channelId: "UCB_qr75-ydFVKSF9Dmo6izg",
                title: "Top 10 moments | 2025 Australian Grand Prix",
              },
            },
          ],
        }),
      )
      .mockResolvedValueOnce(
        Response.json({
          items: [
            {
              id: { videoId: "sprint12345" },
              snippet: {
                channelId: "UCB_qr75-ydFVKSF9Dmo6izg",
                title: "Sprint Highlights | 2025 Australian Grand Prix",
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

test("returns a friendly configuration state without a Gemini secret", async () => {
  const response = await handleSearch(
    new Request("https://example.test/api/f1-search", {
      method: "POST",
      body: JSON.stringify({ query: "Хто виграв Монако?" }),
    }),
    { ASSETS: assets },
  );
  expect(response.status).toBe(503);
  expect(await response.json()).toEqual({
    error: { code: "not_configured", message: "AI-пошук ще не налаштований." },
  });
});

test("rejects invalid and oversized requests before any provider call", async () => {
  const invalid = await handleSearch(
    new Request("https://example.test/api/f1-search", {
      method: "POST",
      body: "{}",
    }),
    { ASSETS: assets },
  );
  expect(invalid.status).toBe(400);
  const oversized = await handleSearch(
    new Request("https://example.test/api/f1-search", {
      method: "POST",
      body: JSON.stringify({ query: "x".repeat(2_000) }),
    }),
    { ASSETS: assets },
  );
  expect(oversized.status).toBe(413);
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
