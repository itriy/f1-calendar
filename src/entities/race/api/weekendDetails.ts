import type { JolpicaRace } from "@/entities/race/model/types";

type AlphaSession = {
  code: string;
  title: string;
  timestamp: string;
  local_timestamp: string;
  timezone: string;
  is_cancelled?: boolean;
  results_url?: string;
  laps_url?: string;
};
type AlphaEvent = {
  round: { id: string; number: number; is_cancelled: boolean };
  circuit: { altitude?: number; timezone?: string };
  schedule: AlphaSession[];
};
type AlphaSchedule = { data?: { events?: AlphaEvent[] } };
type AlphaResult = {
  driver: { abbreviation: string; given_name: string; family_name: string };
  team?: { name?: string };
  position?: number;
  points?: number;
  components?: { GRID?: { position?: number }; FLAP?: { time?: string } };
};
type AlphaResults = { data?: { results?: AlphaResult[] } };
type AlphaLaps = {
  data?: {
    laps?: Array<{
      number: number;
      position?: number;
      time_display?: string;
      is_entry_fastest_lap?: boolean;
      driver_id: string;
    }>;
    drivers_by_id?: Record<string, { abbreviation?: string }>;
  };
};

export type WeekendSession = {
  code: string;
  title: string;
  startsAt: string;
  localTimestamp: string;
  timezone: string;
  cancelled: boolean;
  resultsUrl?: string;
  lapsUrl?: string;
};
export type SessionResult = {
  position: number;
  driver: string;
  team: string;
  grid: number | null;
  fastestLap: string | null;
  points: number;
};
export type Lap = {
  number: number;
  position: number | null;
  driver: string;
  time: string;
  fastest: boolean;
};
export type WeekendDetails = {
  sessions: WeekendSession[];
  altitude: number | null;
  results: Partial<Record<"R" | "Q" | "SR", SessionResult[]>>;
  pitStops: Array<{ driver: string; count: number }>;
};

const ALPHA_ROOT = "https://api.jolpi.ca/f1/alpha";
const ERGAST_ROOT = "https://api.jolpi.ca/ergast/f1";
const scheduleCache = new Map<string, Promise<AlphaEvent[]>>();
const detailsCache = new Map<string, Promise<WeekendDetails>>();
const lapCache = new Map<string, Promise<Lap[]>>();

async function json<T>(url: string): Promise<T> {
  const response = await fetch(url, {
    headers: { Accept: "application/json" },
  });
  if (!response.ok) throw new Error(`Jolpica ${response.status}`);
  return response.json() as Promise<T>;
}
function scheduleForSeason(season: string) {
  if (!scheduleCache.has(season))
    scheduleCache.set(
      season,
      json<AlphaSchedule>(
        `${ALPHA_ROOT}/schedules/${encodeURIComponent(season)}/`,
      ).then((body) => body.data?.events || []),
    );
  return scheduleCache.get(season)!;
}
function normalizeResult(item: AlphaResult): SessionResult {
  return {
    position: item.position || 0,
    driver: `${item.driver.given_name} ${item.driver.family_name}`,
    team: item.team?.name || "—",
    grid: item.components?.GRID?.position ?? null,
    fastestLap: item.components?.FLAP?.time ?? null,
    points: item.points || 0,
  };
}
async function pitStops(season: string, round: string) {
  try {
    const body = await json<{
      MRData?: {
        RaceTable?: {
          Races?: Array<{ PitStops?: Array<{ driverId?: string }> }>;
        };
      };
    }>(
      `${ERGAST_ROOT}/${encodeURIComponent(season)}/${encodeURIComponent(round)}/pitstops.json?limit=100`,
    );
    const counts = new Map<string, number>();
    for (const stop of body.MRData?.RaceTable?.Races?.[0]?.PitStops || []) {
      const driver = stop.driverId || "—";
      counts.set(driver, (counts.get(driver) || 0) + 1);
    }
    return [...counts]
      .map(([driver, count]) => ({ driver: driver.toUpperCase(), count }))
      .sort((a, b) => b.count - a.count);
  } catch {
    return [];
  }
}

export function loadWeekendDetails(race: JolpicaRace): Promise<WeekendDetails> {
  const season = race.season || String(new Date().getUTCFullYear());
  const key = `${season}-${race.round}`;
  if (!detailsCache.has(key))
    detailsCache.set(
      key,
      (async () => {
        const event = (await scheduleForSeason(season)).find(
          (item) => item.round.number === Number(race.round),
        );
        if (!event) throw new Error("Weekend unavailable");
        const sessions = event.schedule.map((session) => ({
          code: session.code,
          title: session.title,
          startsAt: session.timestamp,
          localTimestamp: session.local_timestamp,
          timezone: session.timezone,
          cancelled: Boolean(session.is_cancelled || event.round.is_cancelled),
          resultsUrl: session.results_url,
          lapsUrl: session.laps_url,
        }));
        const resultSessions = sessions.filter(
          (session) =>
            ["R", "Q", "SR"].includes(session.code) &&
            new Date(session.startsAt).getTime() <= Date.now() &&
            session.resultsUrl,
        );
        const entries = await Promise.all(
          resultSessions.map(async (session) => {
            try {
              const body = await json<AlphaResults>(session.resultsUrl!);
              return [
                session.code,
                (body.data?.results || [])
                  .map(normalizeResult)
                  .filter((result) => result.position),
              ] as const;
            } catch {
              return [session.code, []] as const;
            }
          }),
        );
        return {
          sessions,
          altitude: event.circuit.altitude ?? null,
          results: Object.fromEntries(entries),
          pitStops: await pitStops(season, race.round),
        };
      })(),
    );
  return detailsCache.get(key)!;
}

export function loadSessionLaps(url: string): Promise<Lap[]> {
  if (!lapCache.has(url))
    lapCache.set(
      url,
      json<AlphaLaps>(url).then((body) => {
        const drivers = body.data?.drivers_by_id || {};
        return (body.data?.laps || [])
          .map((lap) => ({
            number: lap.number,
            position: lap.position ?? null,
            driver: drivers[lap.driver_id]?.abbreviation || "—",
            time: lap.time_display || "—",
            fastest: Boolean(lap.is_entry_fastest_lap),
          }))
          .sort(
            (a, b) => a.number - b.number || a.driver.localeCompare(b.driver),
          );
      }),
    );
  return lapCache.get(url)!;
}
