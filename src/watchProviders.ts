import type { WatchProvider, WatchProvidersResponse } from "./types/watch";

const BROADCAST_INFO_URL =
  "https://www.formula1.com/en/information/f1-broadcast-information.45y3LNsT1D6VoK0ZmX8ciJ";
const MEGOGO_F1_URL = "https://megogo.net/ua/gran-pri-f1-ua";
const CACHE_KEY = "https://f1-calendar.internal/watch-providers/catalog-v1";
const CACHE_TTL_SECONDS = 24 * 60 * 60;

const territoryAliases: Record<string, string[]> = {
  US: ["USA", "United States"],
  GB: ["United Kingdom"],
  IE: ["Republic of Ireland", "Ireland"],
  CZ: ["Czech Republic", "Czechia"],
  KR: ["South Korea"],
  TW: ["Chinese Taipei", "Taiwan"],
  LA: ["Laos"],
  MK: ["Macedonia", "North Macedonia"],
};

const ukraineProviders: WatchProvider[] = [
  {
    name: "SWEET.TV",
    url: "https://sweet.tv/ua-uk/sports",
    kind: "platform",
    descriptionKey: "sweet",
  },
  {
    name: "MEGOGO",
    url: MEGOGO_F1_URL,
    kind: "platform",
    descriptionKey: "megogo",
  },
  {
    name: "Київстар ТБ",
    url: "https://tv.kyivstar.ua/",
    kind: "platform",
    descriptionKey: "kyivstar",
  },
  {
    name: "Vodafone TV",
    url: "https://www.vodafone.ua/tv",
    kind: "platform",
    descriptionKey: "vodafone",
  },
  {
    name: "Ланет.TV",
    url: "https://lanet.tv/",
    kind: "platform",
    descriptionKey: "lanet",
  },
];

function decodeHtml(value: string): string {
  return value
    .replace(/<[^>]+>/g, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/gi, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function validProviderUrl(value: string): string | null {
  try {
    const url = new URL(value.replace(/&amp;/g, "&"));
    return ["https:", "http:"].includes(url.protocol) ? url.toString() : null;
  } catch {
    return null;
  }
}

export function parseBroadcastCatalog(html: string): Array<{
  territory: string;
  providers: WatchProvider[];
}> {
  const rows = html.match(/<tr(?:\s[^>]*)?>[\s\S]*?<\/tr>/gi) || [];
  return rows.flatMap((row) => {
    const cells = row.match(/<td(?:\s[^>]*)?>[\s\S]*?<\/td>/gi) || [];
    if (cells.length < 2) return [];
    const territory = decodeHtml(cells[0]);
    const providers = Array.from(
      cells[1].matchAll(/<a[^>]+href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi),
      (match): WatchProvider | null => {
        const url = validProviderUrl(match[1]);
        const name = decodeHtml(match[2]);
        return url && name ? { name, url, kind: "official" } : null;
      },
    ).filter((provider): provider is WatchProvider => provider !== null);
    return territory && providers.length ? [{ territory, providers }] : [];
  });
}

function territoryNames(countryCode: string): string[] {
  const displayName = new Intl.DisplayNames(["en"], { type: "region" }).of(
    countryCode,
  );
  return [...(territoryAliases[countryCode] || []), displayName || countryCode];
}

export function providersForCountry(
  catalog: ReturnType<typeof parseBroadcastCatalog>,
  countryCode: string,
): WatchProvider[] {
  const names = territoryNames(countryCode).map((name) => name.toLowerCase());
  const matched = catalog.find((entry) => {
    const territory = entry.territory.toLowerCase();
    return names.some((name) => territory === name || territory.includes(name));
  });
  const providers = [...(matched?.providers || [])];
  if (countryCode === "UA") return ukraineProviders;
  return providers.filter(
    (provider, index, all) =>
      all.findIndex((item) => item.url === provider.url) === index,
  );
}

function countryName(countryCode: string): string {
  return (
    new Intl.DisplayNames(["uk"], { type: "region" }).of(countryCode) ||
    countryCode
  );
}

async function loadCatalog(): Promise<
  ReturnType<typeof parseBroadcastCatalog>
> {
  const cache = (globalThis.caches as unknown as { default?: Cache }).default;
  const key = new Request(CACHE_KEY);
  const cached = cache ? await cache.match(key) : null;
  if (cached) return parseBroadcastCatalog(await cached.text());
  const response = await fetch(BROADCAST_INFO_URL, {
    headers: { Accept: "text/html" },
  });
  if (!response.ok) throw new Error("F1 broadcast catalog unavailable");
  const html = await response.text();
  if (cache)
    await cache.put(
      key,
      new Response(html, {
        headers: { "Cache-Control": `public, max-age=${CACHE_TTL_SECONDS}` },
      }),
    );
  return parseBroadcastCatalog(html);
}

export async function handleWatchProviders(
  request: Request,
): Promise<Response> {
  if (request.method !== "GET")
    return Response.json({ error: "method_not_allowed" }, { status: 405 });
  const requestedCountry = (request as Request & { cf?: { country?: unknown } })
    .cf?.country;
  const countryCode =
    typeof requestedCountry === "string" && /^[A-Z]{2}$/.test(requestedCountry)
      ? requestedCountry
      : "UA";
  let providers: WatchProvider[] = [];
  try {
    providers =
      countryCode === "UA"
        ? ukraineProviders
        : providersForCountry(await loadCatalog(), countryCode);
  } catch {
    if (countryCode === "UA") providers = ukraineProviders;
  }
  const body: WatchProvidersResponse = {
    countryCode,
    countryName: countryName(countryCode),
    providers,
  };
  return Response.json(body, {
    headers: {
      "Cache-Control": "private, no-store",
      "Content-Type": "application/json; charset=utf-8",
    },
  });
}

export { BROADCAST_INFO_URL };
