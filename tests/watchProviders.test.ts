import { afterEach, expect, test, vi } from "vitest";
import {
  handleWatchProviders,
  parseBroadcastCatalog,
  providersForCountry,
} from "../src/server/watchProviders";

afterEach(() => vi.unstubAllGlobals());

const catalogHtml = `
  <table>
    <tr><td>Ukraine</td><td><a href="https://www.setanta.com.ua/">Setanta Ukraine</a></td></tr>
    <tr><td>United Kingdom &amp; Republic of Ireland</td><td><a href="https://www.skysports.com/f1/">Sky Sports</a><a href="https://www.channel4.com/tv-guide">Channel 4</a></td></tr>
  </table>
`;

test("parses official broadcaster links from the Formula 1 catalog", () => {
  expect(parseBroadcastCatalog(catalogHtml)).toEqual([
    {
      territory: "Ukraine",
      providers: [
        {
          name: "Setanta Ukraine",
          url: "https://www.setanta.com.ua/",
          kind: "official",
        },
      ],
    },
    {
      territory: "United Kingdom & Republic of Ireland",
      providers: [
        {
          name: "Sky Sports",
          url: "https://www.skysports.com/f1/",
          kind: "official",
        },
        {
          name: "Channel 4",
          url: "https://www.channel4.com/tv-guide",
          kind: "official",
        },
      ],
    },
  ]);
});

test("uses the verified Ukrainian viewing platforms instead of the rights holder", () => {
  const providers = providersForCountry(
    parseBroadcastCatalog(catalogHtml),
    "UA",
  );
  expect(providers.map((provider) => provider.name)).toEqual([
    "SWEET.TV",
    "MEGOGO",
    "Київстар ТБ",
    "Vodafone TV",
    "Ланет.TV",
  ]);
});

test("matches a combined official territory for Great Britain", () => {
  expect(
    providersForCountry(parseBroadcastCatalog(catalogHtml), "GB").map(
      (provider) => provider.name,
    ),
  ).toEqual(["Sky Sports", "Channel 4"]);
});

test("does not CDN-cache a country-specific response", async () => {
  vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(catalogHtml)));
  const request = Object.assign(
    new Request("https://example.test/api/watch-providers"),
    { cf: { country: "UA" } },
  );
  const response = await handleWatchProviders(request);
  expect(response.headers.get("cache-control")).toBe("private, no-store");
  expect(
    (await response.json()).providers.map(
      (provider: { name: string }) => provider.name,
    ),
  ).toEqual(["SWEET.TV", "MEGOGO", "Київстар ТБ", "Vodafone TV", "Ланет.TV"]);
});
