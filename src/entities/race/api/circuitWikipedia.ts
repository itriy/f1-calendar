import type { JolpicaRace } from "@/entities/race/model/types";

type PageSummary = { thumbnail?: { source?: string } };
export type CircuitMedia = { imageUrl: string; sourceUrl: string } | null;
export type WikipediaArticle = {
  title: string;
  sourceUrl: string;
  summaryUrl: string;
};

/** Jolpica's Circuit.url is the sole authority for choosing an article. */
export function getCircuitWikipediaArticle(
  circuit?: JolpicaRace["Circuit"],
): WikipediaArticle | null {
  try {
    const source = new URL(circuit?.url || "");
    if (
      source.protocol !== "https:" ||
      !source.hostname.endsWith(".wikipedia.org") ||
      !source.pathname.startsWith("/wiki/")
    )
      return null;
    const encodedTitle = source.pathname.slice("/wiki/".length);
    if (!encodedTitle) return null;
    const title = decodeURIComponent(encodedTitle);
    if (!title.trim()) return null;
    source.search = "";
    source.hash = "";
    return {
      title,
      sourceUrl: source.href,
      summaryUrl: `${source.origin}/api/rest_v1/page/summary/${encodeURIComponent(title)}`,
    };
  } catch {
    return null;
  }
}

export async function loadCircuitMedia(
  circuit?: JolpicaRace["Circuit"],
): Promise<CircuitMedia> {
  const article = getCircuitWikipediaArticle(circuit);
  if (!article) return null;
  const response = await fetch(article.summaryUrl, {
    headers: { Accept: "application/json" },
  });
  if (!response.ok) return null;
  const summary = (await response.json()) as PageSummary;
  const imageUrl = summary.thumbnail?.source;
  return imageUrl ? { imageUrl, sourceUrl: article.sourceUrl } : null;
}
