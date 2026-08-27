import type { WatchProvidersResponse } from "../types/watch";

export async function loadWatchProviders(
  signal?: AbortSignal,
): Promise<WatchProvidersResponse> {
  const response = await fetch("/api/watch-providers", { signal });
  if (!response.ok) throw new Error("Watch providers unavailable");
  const body = (await response.json()) as WatchProvidersResponse;
  if (!Array.isArray(body.providers) || typeof body.countryName !== "string")
    throw new Error("Invalid watch providers response");
  return body;
}
