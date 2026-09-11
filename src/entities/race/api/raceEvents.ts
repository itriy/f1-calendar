import {
  raceHighlights,
  type RacePosition,
  type RaceDriver,
  type RacePit,
} from "../model/raceHighlights";

export type RaceEvent = {
  kind?: "leaderChange" | "pit";
  driver?: string;
  previousDriver?: string;
  laneDuration?: number;
  stopDuration?: number;
  date: string;
  message: string;
  category?: string;
  flag?: string | null;
  scope?: string | null;
  sector?: number | null;
  driver_number?: number | null;
  lap_number?: number | null;
};
type Session = {
  session_key: number;
  session_name: string;
  date_start: string;
  date_end: string;
  is_cancelled?: boolean;
};
export type RaceEvents = {
  status: "ready" | "pending" | "unsupported" | "unavailable";
  events: RaceEvent[];
  partial?: boolean;
};
const cache = new Map<string, RaceEvents>();
const ROOT = "https://api.openf1.org/v1";

async function json<T>(url: string, signal?: AbortSignal): Promise<T> {
  const response = await fetch(url, {
    signal: signal
      ? AbortSignal.any([signal, AbortSignal.timeout(15000)])
      : AbortSignal.timeout(15000),
    headers: { Accept: "application/json" },
  });
  if (!response.ok) throw new Error(`OpenF1 ${response.status}`);
  return response.json() as Promise<T>;
}

export function eventKind(event: RaceEvent): string | null {
  if (event.kind) return event.kind;
  const message = event.message.toUpperCase();
  if (message === "VIRTUAL SAFETY CAR DEPLOYED") return "vsc";
  if (message === "VIRTUAL SAFETY CAR ENDING") return "vscEnding";
  if (message === "SAFETY CAR DEPLOYED") return "safetyCar";
  if (message === "SAFETY CAR IN THIS LAP") return "safetyCarEnding";
  // Only translate unambiguous track/sector flags. Driver flags retain their context.
  if (
    event.scope === "Track" ||
    (event.scope === "Sector" && event.sector != null)
  ) {
    const flags: Record<string, string> = {
      YELLOW: "yellow",
      "DOUBLE YELLOW": "doubleYellow",
      GREEN: "green",
      RED: "red",
      CHEQUERED: "finished",
      CLEAR: "clear",
    };
    const kind = flags[event.flag || ""];
    if (kind) return kind;
  }
  if (
    /PENALTY|UNDER INVESTIGATION|WILL BE INVESTIGATED|SESSION (SUSPENDED|RESUMED)|RED FLAG|SAFETY CAR/.test(
      message,
    )
  )
    return "original";
  return null;
}

export function normalizeRaceEvents(events: RaceEvent[]): RaceEvent[] {
  const seen = new Set<string>();
  return events
    .filter((event) => {
      if (
        !event ||
        typeof event.message !== "string" ||
        !Number.isFinite(Date.parse(event.date)) ||
        !eventKind(event)
      )
        return false;
      const key = JSON.stringify([
        event.date,
        event.message,
        event.scope,
        event.sector,
        event.driver_number,
      ]);
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .sort((a, b) => Date.parse(a.date) - Date.parse(b.date));
}

export async function loadRaceEvents(
  season: string,
  date: string,
  signal?: AbortSignal,
): Promise<RaceEvents> {
  if (Number(season) < 2023) return { status: "unsupported", events: [] };
  if (
    !/^\d{4}-\d{2}-\d{2}$/.test(date) ||
    !Number.isFinite(Date.parse(date)) ||
    date.slice(0, 4) !== season
  )
    return { status: "unavailable", events: [] };
  const key = `${season}-${date}`;
  if (cache.has(key)) return cache.get(key)!;
  const nextDay = new Date(Date.parse(date) + 86400000)
    .toISOString()
    .slice(0, 10);
  const query = new URLSearchParams({
    year: season,
    session_name: "Race",
    "date_start>": `${date}T00:00:00Z`,
    "date_start<": `${nextDay}T00:00:00Z`,
  });
  const sessions = await json<Session[]>(`${ROOT}/sessions?${query}`, signal);
  if (!Array.isArray(sessions)) throw new Error("Invalid OpenF1 sessions");
  const matches = sessions.filter(
    (session) =>
      session.session_name === "Race" &&
      session.date_start?.slice(0, 10) === date &&
      !session.is_cancelled,
  );
  if (matches.length !== 1 || !Number.isFinite(matches[0].session_key))
    return { status: "unavailable", events: [] };
  const session = matches[0];
  const end = Date.parse(session.date_end);
  if (!Number.isFinite(end)) return { status: "unavailable", events: [] };
  if (Date.now() < end + 30 * 60000) return { status: "pending", events: [] };
  const events = await json<RaceEvent[]>(
    `${ROOT}/race_control?session_key=${session.session_key}`,
    signal,
  );
  if (!Array.isArray(events)) throw new Error("Invalid OpenF1 events");
  // Keep the extra batch below the free tier's three requests per second.
  await new Promise<void>((resolve) => setTimeout(resolve, 1100));
  signal?.throwIfAborted();
  const extra = await Promise.allSettled([
    json<RacePosition[]>(
      `${ROOT}/position?session_key=${session.session_key}&position=1`,
      signal,
    ),
    json<RaceDriver[]>(
      `${ROOT}/drivers?session_key=${session.session_key}`,
      signal,
    ),
    json<RacePit[]>(`${ROOT}/pit?session_key=${session.session_key}`, signal),
  ]);
  signal?.throwIfAborted();
  const values = <T>(entry: PromiseSettledResult<T[]>): T[] =>
    entry.status === "fulfilled" && Array.isArray(entry.value)
      ? entry.value
      : [];
  const partial = extra.some(
    (entry) => entry.status === "rejected" || !Array.isArray(entry.value),
  );
  const flags = normalizeRaceEvents(events);
  const start =
    flags.find((event) => event.flag === "GREEN" && event.scope === "Track")
      ?.date || session.date_start;
  const endDate =
    flags.find((event) => event.flag === "CHEQUERED" && event.scope === "Track")
      ?.date || session.date_end;
  const highlights = raceHighlights(
    values(extra[0]),
    values(extra[1]),
    values(extra[2]),
    start,
    endDate,
  );
  const result: RaceEvents = {
    status: "ready",
    events: normalizeRaceEvents([...events, ...highlights]),
    partial,
  };
  // Empty responses may be temporary while the historical feed is being published.
  if (result.events.length && !partial) cache.set(key, result);
  return result;
}
