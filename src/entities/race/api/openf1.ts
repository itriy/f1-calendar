import type { StandingDriver } from "@/entities/race/model/types";

export type LiveResult = {
  position: string;
  name: string;
  team: string;
  driverNumber: string;
  status: string;
  gap: string;
};

export type LiveTimingSnapshot = {
  source: "signalr";
  sessionStatus: "inactive" | "live" | "finished";
  sessionName: string;
  sessionType: "race" | "sprint" | "unknown";
  updatedAt: string;
  stale: boolean;
  results: LiveResult[];
};

export type LiveStandings = {
  drivers: Array<
    Pick<StandingDriver, "pos" | "name" | "team" | "points" | "code" | "color">
  >;
  constructors: Array<
    Pick<StandingDriver, "pos" | "name" | "points" | "code" | "color">
  >;
};

export async function getLiveTiming(): Promise<LiveTimingSnapshot | null> {
  const response = await fetch("/api/live-f1", {
    headers: { Accept: "application/json" },
  });
  if (!response.ok) throw new Error(`Live timing ${response.status}`);
  return (await response.json()) as LiveTimingSnapshot | null;
}

export async function getLiveStandings(season: string): Promise<LiveStandings | null> {
  const response = await fetch(`/api/live-standings?season=${encodeURIComponent(season)}`, {
    headers: { Accept: "application/json" },
  });
  if (!response.ok) throw new Error(`OpenF1 standings ${response.status}`);
  return (await response.json()) as LiveStandings | null;
}
