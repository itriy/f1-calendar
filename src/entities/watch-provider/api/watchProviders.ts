import type { WatchProvidersResponse } from "../model/types";
import { i18n } from "@/shared/config/i18n";

export async function loadWatchProviders(
  signal?: AbortSignal,
): Promise<WatchProvidersResponse> {
  const response = await fetch(`/api/watch-providers?locale=${encodeURIComponent(i18n.global.locale.value)}`, { signal });
  if (!response.ok) throw new Error("Watch providers unavailable");
  const body = (await response.json()) as WatchProvidersResponse;
  if (!Array.isArray(body.providers) || typeof body.countryName !== "string")
    throw new Error("Invalid watch providers response");
  return body;
}
