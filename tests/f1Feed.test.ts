import { expect, test } from "vitest";
import {
  calendarEvents,
  sortFeedItems,
} from "../src/entities/feed/api/f1Feed";
import { parseFeed } from "../src/server/newsFeed";

test("keeps only recent, valid RSS articles", () => {
  const recent = new Date().toUTCString();
  const articles = parseFeed(
    `<rss><channel><item><title><![CDATA[Fresh F1 news]]></title><description>A useful article preview.</description><link>https://example.test/fresh</link><pubDate>${recent}</pubDate></item><item><title>Broken</title><link>javascript:bad</link><pubDate>${recent}</pubDate></item></channel></rss>`,
    { name: "Example", url: "https://example.test/feed", language: "en" },
  );
  expect(articles).toEqual([
    expect.objectContaining({
      title: "Fresh F1 news",
      sourceUrl: "https://example.test/fresh",
      description: "A useful article preview.",
    }),
  ]);
});

test("uses fetch time only for sources that explicitly lack article dates", () => {
  const xml =
    "<rss><channel><item><title>Official F1 headline</title><link>https://example.test/f1</link></item></channel></rss>";
  expect(
    parseFeed(xml, {
      name: "F1",
      url: "https://example.test/feed",
      language: "en",
      dateFallback: true,
    }),
  ).toHaveLength(1);
  expect(
    parseFeed(xml, {
      name: "Other",
      url: "https://example.test/feed",
      language: "en",
    }),
  ).toHaveLength(0);
});

test("decodes safe HTML descriptions for rich RSS content", () => {
  const recent = new Date().toUTCString();
  const [article] = parseFeed(
    `<rss><channel><item><title>Schedule</title><link>https://example.test/schedule</link><pubDate>${recent}</pubDate><description>&lt;table&gt;&lt;tr&gt;&lt;td&gt;DATE&lt;/td&gt;&lt;/tr&gt;&lt;/table&gt;&lt;script&gt;alert(1)&lt;/script&gt;</description></item></channel></rss>`,
    { name: "Example", url: "https://example.test/feed", language: "en" },
  );
  expect(article.description).toContain("<table>");
  expect(article.description).not.toContain("script");
});

test("creates future weekend sessions inside the 14-day feed window", () => {
  const now = Date.parse("2026-08-01T10:00:00Z");
  const events = calendarEvents(
    [
      {
        round: "13",
        raceName: "Гран-прі Монако",
        date: "2026-08-03",
        time: "13:00:00Z",
        FirstPractice: { date: "2026-08-02", time: "10:30:00Z" },
        Qualifying: { date: "2026-08-02", time: "14:00:00Z" },
      },
    ],
    now,
  );
  expect(events.map((event) => event.session)).toEqual([
    "Перша практика",
    "Кваліфікація",
    "Гонка",
  ]);
});

test("puts the nearest upcoming event before later events and news", () => {
  const items = sortFeedItems([
    {
      id: "news",
      type: "news",
      source: "Example",
      sourceUrl: "https://example.test/news",
      title: "News",
      summary: null,
      description: null,
      language: "en",
      imageUrl: null,
      publishedAt: "2026-08-01T12:00:00Z",
    },
    {
      id: "later",
      type: "event",
      startsAt: "2026-08-03T14:00:00Z",
      session: "Race",
      raceName: "Example Grand Prix",
      round: "1",
    },
    {
      id: "nearest",
      type: "event",
      startsAt: "2026-08-02T10:00:00Z",
      session: "Practice",
      raceName: "Example Grand Prix",
      round: "1",
    },
  ]);
  expect(items.map((item) => item.id)).toEqual(["nearest", "later", "news"]);
});

test("excludes sessions outside the two-week event window", () => {
  const events = calendarEvents(
    [{ round: "1", raceName: "Test", date: "2026-09-01", time: "12:00:00Z" }],
    Date.parse("2026-08-01T10:00:00Z"),
  );
  expect(events).toEqual([]);
});
