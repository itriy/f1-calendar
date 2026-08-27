export type SearchSource = { title: string; url: string; domain: string };
import { i18n } from "@/shared/config/i18n";
export type WikipediaResult = {
  title: string;
  description: string;
  url: string;
};
export type F1SearchResult = {
  answer: string;
  sources: SearchSource[];
  wikipedia: WikipediaResult | null;
};
type SearchError = { error?: { message?: string } };

export async function searchF1(query: string): Promise<F1SearchResult> {
  const response = await fetch("/api/f1-search", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ query }),
  });
  const data = (await response.json().catch(() => null)) as
    (F1SearchResult & SearchError) | null;
  if (!response.ok)
    throw new Error(data?.error?.message || i18n.global.t("services.searchFailed"));
  if (!data?.answer || !Array.isArray(data.sources))
    throw new Error(i18n.global.t("services.searchInvalid"));
  return data;
}
