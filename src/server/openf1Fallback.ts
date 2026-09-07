import type { LiveStandings } from "@/entities/race/api/openf1";

const API_ROOT = "https://api.openf1.org/v1";
type ChampionshipDriver = { meeting_key: number; session_key: number; driver_number: number; position_current: number; points_current: number };
type ChampionshipTeam = { meeting_key: number; session_key: number; team_name: string; position_current: number; points_current: number };
type DriverProfile = { session_key: number; driver_number: number; full_name: string; team_name: string; team_colour?: string };
let cached: { season: string; expiresAt: number; data: LiveStandings | null } | null = null;

async function getJson<T>(path: string): Promise<T> {
  const response = await fetch(`${API_ROOT}${path}`, { headers: { Accept: "application/json", "User-Agent": "F1Calendar/1.0" } });
  if (!response.ok) throw new Error(`OpenF1 ${response.status}`);
  return response.json() as Promise<T>;
}
function sameSession<T extends { session_key: number; meeting_key: number }>(items: T[], sessionKey: number, meetingKey: number) {
  return items.length > 0 && items.every((item) => item.session_key === sessionKey && item.meeting_key === meetingKey);
}
function displayName(fullName: string) {
  return fullName.split(" ").map((part, index, all) => index === all.length - 1 ? `${part.slice(0, 1)}${part.slice(1).toLowerCase()}` : part).join(" ");
}
async function load(): Promise<LiveStandings | null> {
  const drivers = await getJson<ChampionshipDriver[]>("/championship_drivers?session_key=latest");
  const current = drivers[0];
  if (!current || !sameSession(drivers, current.session_key, current.meeting_key)) return null;
  const constructors = await getJson<ChampionshipTeam[]>("/championship_teams?session_key=latest");
  if (!sameSession(constructors, current.session_key, current.meeting_key)) return null;
  const profiles = await getJson<DriverProfile[]>(`/drivers?session_key=${current.session_key}`);
  const byNumber = new Map(profiles.filter((profile) => profile.session_key === current.session_key).map((profile) => [profile.driver_number, profile]));
  const classified = drivers.filter((standing) => byNumber.has(standing.driver_number));
  if (!classified.length) return null;
  return {
    drivers: classified.sort((a, b) => a.position_current - b.position_current).map((standing) => {
      const profile = byNumber.get(standing.driver_number)!;
      return { pos: String(standing.position_current), name: displayName(profile.full_name), team: profile.team_name, points: String(standing.points_current), code: String(standing.driver_number), color: profile.team_colour ? `#${profile.team_colour}` : "#9ba1aa" };
    }),
    constructors: [...constructors].sort((a, b) => a.position_current - b.position_current).map((standing) => ({ pos: String(standing.position_current), name: standing.team_name, points: String(standing.points_current), code: standing.team_name.toLowerCase().replace(/[^a-z0-9]+/g, "-"), color: "#9ba1aa" })),
  };
}
export async function handleOpenF1Fallback(request: Request): Promise<Response> {
  if (request.method !== "GET") return new Response(null, { status: 405 });
  const season = new URL(request.url).searchParams.get("season") || "";
  if (!/^\d{4}$/.test(season)) return new Response(null, { status: 400 });
  if (cached?.season === season && cached.expiresAt > Date.now()) return Response.json(cached.data, { headers: { "Cache-Control": "public, max-age=15, s-maxage=30" } });
  try {
    const data = await load();
    cached = { season, data, expiresAt: Date.now() + 30_000 };
    return Response.json(data, { headers: { "Cache-Control": "public, max-age=15, s-maxage=30" } });
  } catch (cause) {
    console.warn("OpenF1 fallback unavailable", cause);
    return Response.json({ error: "provider_unavailable" }, { status: 503, headers: { "Cache-Control": "no-store", "Retry-After": "60" } });
  }
}
