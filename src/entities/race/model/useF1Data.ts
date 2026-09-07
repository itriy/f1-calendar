import { computed, onMounted, onUnmounted, ref } from "vue";
import {
  getLastRaceResults,
  getRaceResults,
  getSeasonChampionshipLeaders,
  getSeasons,
  getSeasonData,
  getSeasonRaceWinners,
} from "@/entities/race/api/jolpica";
import { getLiveStandings, getLiveTiming, type LiveStandings, type LiveTimingSnapshot } from "@/entities/race/api/openf1";
import { i18n } from "@/shared/config/i18n";
import { formatDateTime } from "@/shared/lib/dateTime";
import type {
  JolpicaConstructorStanding,
  JolpicaDriverStanding,
  JolpicaRace,
  JolpicaResult,
  StandingDriver,
} from "./types";

const flags: Record<string, string> = {
  Australia: "🇦🇺",
  Austria: "🇦🇹",
  Azerbaijan: "🇦🇿",
  Bahrain: "🇧🇭",
  Belgium: "🇧🇪",
  Brazil: "🇧🇷",
  Canada: "🇨🇦",
  China: "🇨🇳",
  France: "🇫🇷",
  Germany: "🇩🇪",
  Hungary: "🇭🇺",
  Italy: "🇮🇹",
  Japan: "🇯🇵",
  Mexico: "🇲🇽",
  Monaco: "🇲🇨",
  Netherlands: "🇳🇱",
  Qatar: "🇶🇦",
  Singapore: "🇸🇬",
  Spain: "🇪🇸",
  UAE: "🇦🇪",
  UK: "🇬🇧",
  USA: "🇺🇸",
};
const teamColors: Record<string, string> = {
  mercedes: "#27f4d2",
  ferrari: "#e8002d",
  mclaren: "#ff8700",
  red_bull: "#3671c6",
  rb: "#6692ff",
  williams: "#64c4ff",
  aston_martin: "#229971",
  alpine: "#ff87bc",
  haas: "#b6babd",
  audi: "#e9e9e9",
  cadillac: "#d6aa61",
};

type RaceView = JolpicaRace & { flag: string };
type ConstructorView = StandingDriver;
type ResultView = {
  position: string;
  name: string;
  url: string;
  team: string;
  teamUrl: string;
  points: string;
  status: string;
  raceTime: string;
  gap: string;
};
type LastRace = {
  name: string;
  date: string;
  place: string;
  flag: string;
  provisional?: boolean;
  results: ResultView[];
};
type HistoryRace = {
  round: string;
  name: string;
  date: string;
  circuit: string;
  place: string;
  flag: string;
  winner: Pick<ResultView, "name" | "url" | "team" | "teamUrl"> | null;
};
type RaceDetails = {
  round: string;
  name: string;
  results: Array<
    Pick<
      ResultView,
      "position" | "name" | "url" | "team" | "teamUrl" | "points" | "gap"
    >
  >;
};
type SeasonSummary = {
  driver: Pick<StandingDriver, "name" | "url" | "points" | "team" | "teamUrl">;
  constructor: { name: string; url: string; points: string };
  drivers: Array<
    Pick<StandingDriver, "name" | "url" | "points" | "team" | "teamUrl"> & {
      position: string;
    }
  >;
  constructors: Array<{
    position: string;
    name: string;
    url: string;
    points: string;
  }>;
};

const LIVE_STANDINGS_WINDOW_MS = 24 * 60 * 60_000;
const LIVE_STANDINGS_REFRESH_MS = 10_000;
const JOLPICA_RECHECK_MS = 5 * 60_000;

export function isLiveStandingsWindow(
  races: Pick<JolpicaRace, "date" | "time" | "Sprint">[],
  currentTime = Date.now(),
): boolean {
  return races.some((race) =>
    [race, race.Sprint]
      .map(getRaceStart)
      .some((start) =>
        start !== null &&
        currentTime >= start.getTime() &&
        currentTime - start.getTime() < LIVE_STANDINGS_WINDOW_MS,
      ),
  );
}

export function getRaceStart(
  race: Pick<JolpicaRace, "date" | "time"> | null | undefined,
): Date | null {
  if (!race?.date || !race.time) return null;
  const time = /(?:Z|[+-]\d{2}:?\d{2})$/i.test(race.time)
    ? race.time
    : `${race.time}Z`;
  const start = new Date(`${race.date}T${time}`);
  return Number.isNaN(start.getTime()) ? null : start;
}

export function formatRaceStartLocal(
  race: Pick<JolpicaRace, "date" | "time"> | null | undefined,
): string {
  const start = getRaceStart(race);
  if (!start)
    return race?.date
      ? formatDateTime(
          new Date(`${race.date}T12:00:00Z`),
          i18n.global.locale.value,
          {
            day: "numeric",
            month: "long",
          },
        )
      : i18n.global.t("common.dateUnknown");
  return formatDateTime(start, i18n.global.locale.value, {
    weekday: "long",
    day: "numeric",
    month: "long",
    hour: "2-digit",
    minute: "2-digit",
    timeZoneName: "short",
  });
}

export function getUpcomingRaces<T extends Pick<JolpicaRace, "date" | "time">>(
  races: T[],
  currentTime = Date.now(),
): T[] {
  return races.filter((race) => {
    const start = getRaceStart(race);
    if (start) return start.getTime() > currentTime;
    return race.date
      ? new Date(`${race.date}T23:59:59Z`).getTime() > currentTime
      : false;
  });
}

export function useF1Data() {
  const season = ref(String(new Date().getUTCFullYear()));
  const schedule = ref<RaceView[]>([]);
  const drivers = ref<StandingDriver[]>([]);
  const driverStandings = ref<StandingDriver[]>([]);
  const constructors = ref<ConstructorView[]>([]);
  const standingsSource = ref<"jolpica" | "signalr" | "openf1">("jolpica");
  const standingsUpdatedAt = ref("");
  const loading = ref(true);
  const error = ref("");
  const updatedAt = ref("");
  const now = ref(Date.now());
  const lastRace = ref<LastRace | null>(null);
  const resultsLoading = ref(true);
  const resultsError = ref("");
  const raceHistory = ref<HistoryRace[]>([]);
  const historyLoading = ref(true);
  const historyError = ref("");
  const historySeason = ref("");
  const historySeasons = ref<string[]>([]);
  const seasonSummary = ref<SeasonSummary | null>(null);
  const seasonSummaryLoading = ref(true);
  const seasonSummaryError = ref("");
  const selectedHistoryRace = ref<RaceDetails | null>(null);
  const historyDetailsLoading = ref(false);
  const historyDetailsError = ref("");
  let historyRequestId = 0;
  let historyDetailsRequestId = 0;
  let standingsPoll: number | undefined;
  let liveVisibilityHandler: (() => void) | undefined;
  let lastJolpicaCheck = 0;
  let lastOpenF1Check = 0;
  let confirmedDrivers: StandingDriver[] = [];
  let confirmedConstructors: ConstructorView[] = [];
  const updateNow = () => {
    now.value = Date.now();
  };
  const futureRaces = computed(() =>
    getUpcomingRaces(schedule.value, now.value),
  );
  const upcomingRaces = computed(() => futureRaces.value);
  const nextRace = computed(() => upcomingRaces.value[0] ?? null);
  const remainingRounds = computed(() => futureRaces.value.length);
  const t = i18n.global.t;

  function driver(item: JolpicaDriverStanding): StandingDriver {
    const constructor = item.Constructors?.[0];
    return {
      pos: item.position,
      name: `${item.Driver.givenName} ${item.Driver.familyName}`,
      url: item.Driver.url || "",
      team: constructor?.name || "-",
      teamUrl: constructor?.url || "",
      points: item.points,
      code: item.Driver.driverId,
      color: teamColors[constructor?.constructorId || ""] || "#9ba1aa",
    };
  }
  function constructor(item: JolpicaConstructorStanding): ConstructorView {
    return {
      pos: item.position,
      name: item.Constructor.name,
      url: item.Constructor.url || "",
      team: item.Constructor.nationality || "-",
      teamUrl: "",
      points: item.points,
      code: item.Constructor.constructorId,
      color: teamColors[item.Constructor.constructorId] || "#9ba1aa",
    };
  }
  function applyJolpicaStandings(
    driverList: JolpicaDriverStanding[],
    constructorList: JolpicaConstructorStanding[],
    replaceLive = true,
  ) {
    const nextDrivers = driverList.map(driver);
    const nextConstructors = constructorList.slice(0, 5).map(constructor);
    if (
      !replaceLive &&
      standingsSource.value !== "jolpica" &&
      !sameStandings(nextDrivers, driverStandings.value)
    )
      return;
    driverStandings.value = nextDrivers;
    drivers.value = nextDrivers.slice(0, 5);
    constructors.value = nextConstructors;
    confirmedDrivers = nextDrivers;
    confirmedConstructors = nextConstructors;
    standingsSource.value = "jolpica";
    standingsUpdatedAt.value = formatDataUpdatedAt();
  }
  function formatDataUpdatedAt() {
    return formatDateTime(new Date(), i18n.global.locale.value, {
      hour: "2-digit",
      minute: "2-digit",
    });
  }
  function sameStandings(
    next: Array<Pick<StandingDriver, "pos" | "points">>,
    current: Array<Pick<StandingDriver, "pos" | "points">>,
  ) {
    return (
      next.length === current.length &&
      next.every(
        (standing, index) =>
          standing.pos === current[index]?.pos &&
          standing.points === current[index]?.points,
      )
    );
  }
  function normalizedName(value: string) {
    return value.toLowerCase().replace(/[^a-zа-яіїєёáàâäçèéêëìíîïñòóôöùúûüýÿ]+/gi, "");
  }
  function pointsForPosition(position: number, sessionType: LiveTimingSnapshot["sessionType"]) {
    const points = sessionType === "sprint"
      ? [8, 7, 6, 5, 4, 3, 2, 1]
      : [25, 18, 15, 12, 10, 8, 6, 4, 2, 1];
    return points[position - 1] || 0;
  }
  function mergeLiveTiming(live: LiveTimingSnapshot) {
    if (live.stale || live.sessionStatus !== "finished" || live.sessionType === "unknown") return;
    const pointsByDriver = new Map(
      live.results.map((result) => [normalizedName(result.name), pointsForPosition(Number(result.position), live.sessionType)]),
    );
    if (!pointsByDriver.size || !confirmedDrivers.length) return;
    const liveDrivers = confirmedDrivers
      .map((standing) => ({ ...standing, points: String(Number(standing.points) + (pointsByDriver.get(normalizedName(standing.name)) || 0)) }))
      .sort((a, b) => Number(b.points) - Number(a.points))
      .map((standing, index) => ({ ...standing, pos: String(index + 1) }));
    const teamPoints = new Map<string, number>();
    for (const result of live.results) {
      const key = result.team.toLowerCase();
      teamPoints.set(key, (teamPoints.get(key) || 0) + pointsForPosition(Number(result.position), live.sessionType));
    }
    const liveConstructors = confirmedConstructors
      .map((standing) => ({ ...standing, points: String(Number(standing.points) + (teamPoints.get(standing.name.toLowerCase()) || 0)) }))
      .sort((a, b) => Number(b.points) - Number(a.points))
      .map((standing, index) => ({ ...standing, pos: String(index + 1) }));
    if (!sameStandings(liveDrivers, driverStandings.value)) {
      driverStandings.value = liveDrivers;
      drivers.value = liveDrivers.slice(0, 5);
      constructors.value = liveConstructors;
      standingsSource.value = "signalr";
      standingsUpdatedAt.value = formatDataUpdatedAt();
    }
    lastRace.value = {
      name: live.sessionName || t("common.live"),
      date: live.updatedAt.slice(0, 10),
      place: "Live timing",
      flag: "🏁",
      provisional: true,
      results: live.results
        .filter((result) => pointsForPosition(Number(result.position), live.sessionType) > 0)
        .map((result) => ({
          position: result.position,
          name: result.name,
          url: "",
          team: result.team,
          teamUrl: "",
          points: String(pointsForPosition(Number(result.position), live.sessionType)),
          status: result.status,
          raceTime: result.position === "1" ? result.gap || t("data.timeUnknown") : "",
          gap: result.position === "1" ? t("data.winner") : result.gap || t("data.gapUnknown"),
        })),
    };
  }
  function mergeOpenF1Standings(live: LiveStandings) {
    const driversByName = new Map(confirmedDrivers.map((standing) => [normalizedName(standing.name), standing]));
    const constructorsByName = new Map(confirmedConstructors.map((standing) => [standing.name.toLowerCase(), standing]));
    const liveDrivers = live.drivers.map((standing) => ({ ...driversByName.get(normalizedName(standing.name)), ...standing, url: driversByName.get(normalizedName(standing.name))?.url || "", teamUrl: driversByName.get(normalizedName(standing.name))?.teamUrl || "" }));
    const liveConstructors = live.constructors.map((standing) => ({ ...constructorsByName.get(standing.name.toLowerCase()), ...standing, url: constructorsByName.get(standing.name.toLowerCase())?.url || "", team: constructorsByName.get(standing.name.toLowerCase())?.team || "-", teamUrl: "" }));
    if (!liveDrivers.length || !liveConstructors.length || sameStandings(liveDrivers, driverStandings.value)) return;
    driverStandings.value = liveDrivers;
    drivers.value = liveDrivers.slice(0, 5);
    constructors.value = liveConstructors.slice(0, 5);
    standingsSource.value = "openf1";
    standingsUpdatedAt.value = formatDataUpdatedAt();
  }
  async function refreshConfirmedStandings() {
    const data = await getSeasonChampionshipLeaders(season.value);
    const driverList =
      data.drivers.MRData?.StandingsTable?.StandingsLists?.[0]?.DriverStandings;
    const constructorList =
      data.constructors.MRData?.StandingsTable?.StandingsLists?.[0]
        ?.ConstructorStandings;
    if (!driverList || !constructorList) return;
    applyJolpicaStandings(driverList, constructorList, false);
  }
  async function refreshLiveStandings() {
    const inLiveWindow = isLiveStandingsWindow(schedule.value);
    if (inLiveWindow) {
      try {
        const live = await getLiveTiming();
        if (live) mergeLiveTiming(live);
      } catch (cause) {
        console.warn("SignalR live timing unavailable", cause);
      }
    }
    if (Date.now() - lastOpenF1Check >= JOLPICA_RECHECK_MS) {
      lastOpenF1Check = Date.now();
      try {
        const fallback = await getLiveStandings(season.value);
        if (fallback) mergeOpenF1Standings(fallback);
      } catch (cause) {
        console.warn("OpenF1 standings fallback unavailable", cause);
      }
    }
    if (Date.now() - lastJolpicaCheck >= JOLPICA_RECHECK_MS) {
      lastJolpicaCheck = Date.now();
      try {
        await refreshConfirmedStandings();
      } catch (cause) {
        console.warn("Jolpica standings refresh unavailable", cause);
      }
    }
  }
  function startStandingsPolling() {
    if (standingsPoll) return;
    liveVisibilityHandler = () => {
      if (document.visibilityState === "visible") void refreshLiveStandings();
    };
    standingsPoll = window.setInterval(
      liveVisibilityHandler,
      LIVE_STANDINGS_REFRESH_MS,
    );
    document.addEventListener("visibilitychange", liveVisibilityHandler);
    liveVisibilityHandler();
  }
  function normalizeLastRace(race: JolpicaRace): LastRace {
    return {
      name: race.raceName,
      date: race.date || "",
      place: race.Circuit?.Location?.locality || "-",
      flag: flags[race.Circuit?.Location?.country || ""] || "🏁",
      results: (race.Results || [])
        .filter((result) => Number(result.points) > 0)
        .map((result) => {
          const resultTime = result.Time?.time || "";
          const isWinner = result.position === "1";
          const gap = isWinner
            ? t("data.winner")
            : result.status === "Lapped"
              ? t("data.lapDown")
              : resultTime.startsWith("+")
                ? resultTime
                : result.status === "Finished"
                  ? t("data.gapUnknown")
                  : t("data.status", {
                      status: result.status || t("data.statusUnknown"),
                    });
          return {
            position: result.position,
            name: `${result.Driver.givenName} ${result.Driver.familyName}`,
            url: result.Driver.url || "",
            team: result.Constructor?.name || "-",
            teamUrl: result.Constructor?.url || "",
            points: result.points,
            status: result.status || "",
            raceTime: isWinner ? resultTime || t("data.timeUnknown") : "",
            gap,
          };
        }),
    };
  }
  function normalizeRaceWinner(race: JolpicaRace): HistoryRace {
    const winner = race.Results?.[0];
    return {
      round: race.round,
      name: race.raceName,
      date: race.date || "",
      circuit: race.Circuit?.circuitName || t("data.circuitUnknown"),
      place: race.Circuit?.Location?.locality || "-",
      flag: flags[race.Circuit?.Location?.country || ""] || "🏁",
      winner: winner
        ? {
            name: `${winner.Driver.givenName} ${winner.Driver.familyName}`,
            url: winner.Driver.url || "",
            team: winner.Constructor?.name || "-",
            teamUrl: winner.Constructor?.url || "",
          }
        : null,
    };
  }
  function formatResultGap(result: JolpicaResult): string {
    const resultTime = result.Time?.time || "";
    if (result.position === "1") return t("data.winner");
    if (result.status === "Lapped") return t("data.lapDown");
    if (resultTime.startsWith("+")) return resultTime;
    if (result.status === "Finished") return t("data.gapUnknown");
    return t("data.status", {
      status: result.status || t("data.statusUnknown"),
    });
  }
  function normalizeRaceDetails(race: JolpicaRace): RaceDetails {
    return {
      round: race.round,
      name: race.raceName,
      results: (race.Results || [])
        .filter((result) => result.position)
        .map((result) => ({
          position: result.position,
          name: `${result.Driver.givenName} ${result.Driver.familyName}`,
          url: result.Driver.url || "",
          team: result.Constructor?.name || "-",
          teamUrl: result.Constructor?.url || "",
          points: result.points,
          gap: formatResultGap(result),
        })),
    };
  }
  function normalizeSeasonSummary(
    data: Awaited<ReturnType<typeof getSeasonChampionshipLeaders>>,
  ): SeasonSummary {
    const driverStandings =
      data.drivers.MRData?.StandingsTable?.StandingsLists?.[0]
        ?.DriverStandings || [];
    const constructorStandings =
      data.constructors.MRData?.StandingsTable?.StandingsLists?.[0]
        ?.ConstructorStandings || [];
    const driverStanding = driverStandings[0];
    const constructorStanding = constructorStandings[0];
    if (!driverStanding || !constructorStanding)
      throw new Error(t("data.seasonSummaryMissing"));
    const driverTeam = driverStanding.Constructors?.[0];
    return {
      driver: {
        name: `${driverStanding.Driver.givenName} ${driverStanding.Driver.familyName}`,
        url: driverStanding.Driver.url || "",
        points: driverStanding.points,
        team: driverTeam?.name || "-",
        teamUrl: driverTeam?.url || "",
      },
      constructor: {
        name: constructorStanding.Constructor.name,
        url: constructorStanding.Constructor.url || "",
        points: constructorStanding.points,
      },
      drivers: driverStandings.map((standing) => {
        const team = standing.Constructors?.[0];
        return {
          position: standing.position,
          name: `${standing.Driver.givenName} ${standing.Driver.familyName}`,
          url: standing.Driver.url || "",
          points: standing.points,
          team: team?.name || "-",
          teamUrl: team?.url || "",
        };
      }),
      constructors: constructorStandings.map((standing) => ({
        position: standing.position,
        name: standing.Constructor.name,
        url: standing.Constructor.url || "",
        points: standing.points,
      })),
    };
  }
  async function loadLastResults() {
    resultsLoading.value = true;
    resultsError.value = "";
    try {
      const data = await getLastRaceResults();
      const race = data.MRData?.RaceTable?.Races?.[0];
      if (!race?.Results?.length) throw new Error(t("data.lastRaceMissing"));
      lastRace.value = normalizeLastRace(race);
    } catch (cause) {
      console.error(t("data.lastRaceLog"), cause);
      resultsError.value = t("data.lastRaceLoadError");
    } finally {
      resultsLoading.value = false;
    }
  }
  async function loadRaceHistory(
    selectedSeason = historySeason.value || season.value,
  ) {
    const requestId = ++historyRequestId;
    ++historyDetailsRequestId;
    historySeason.value = String(selectedSeason);
    selectedHistoryRace.value = null;
    historyDetailsLoading.value = false;
    historyDetailsError.value = "";
    historyLoading.value = true;
    historyError.value = "";
    try {
      const data = await getSeasonRaceWinners(historySeason.value);
      const races = data.MRData?.RaceTable?.Races;
      if (!Array.isArray(races)) throw new Error(t("data.historyMissing"));
      if (requestId !== historyRequestId) return;
      raceHistory.value = races
        .map(normalizeRaceWinner)
        .sort((a, b) => Number(b.round) - Number(a.round));
    } catch (cause) {
      if (requestId !== historyRequestId) return;
      console.error(t("data.historyLog"), cause);
      historyError.value = t("data.historyLoadError");
    } finally {
      if (requestId === historyRequestId) historyLoading.value = false;
    }
  }
  async function loadHistoryRaceDetails(round: string) {
    if (!round || !historySeason.value) return;
    const requestId = ++historyDetailsRequestId;
    const detailSeason = historySeason.value;
    historyDetailsLoading.value = true;
    historyDetailsError.value = "";
    selectedHistoryRace.value = { round: String(round), name: "", results: [] };
    try {
      const data = await getRaceResults(detailSeason, round);
      const race = data.MRData?.RaceTable?.Races?.[0];
      if (!race?.Results?.length) throw new Error(t("data.raceDetailsMissing"));
      if (requestId !== historyDetailsRequestId) return;
      selectedHistoryRace.value = normalizeRaceDetails(race);
    } catch (cause) {
      if (requestId !== historyDetailsRequestId) return;
      console.error(t("data.detailsLog"), cause);
      historyDetailsError.value = t("data.detailsLoadError");
    } finally {
      if (requestId === historyDetailsRequestId)
        historyDetailsLoading.value = false;
    }
  }
  function closeHistoryRaceDetails() {
    ++historyDetailsRequestId;
    selectedHistoryRace.value = null;
    historyDetailsError.value = "";
  }
  async function loadSeasonSummary(
    selectedSeason = historySeason.value || season.value,
  ) {
    const summarySeason = String(selectedSeason);
    seasonSummaryLoading.value = true;
    seasonSummaryError.value = "";
    seasonSummary.value = null;
    try {
      const data = await getSeasonChampionshipLeaders(summarySeason);
      if (summarySeason !== String(historySeason.value)) return;
      seasonSummary.value = normalizeSeasonSummary(data);
    } catch (cause) {
      if (summarySeason !== String(historySeason.value)) return;
      console.error(t("data.summaryLog"), cause);
      seasonSummaryError.value = t("data.summaryLoadError");
    } finally {
      if (summarySeason === String(historySeason.value))
        seasonSummaryLoading.value = false;
    }
  }
  async function load() {
    loading.value = true;
    error.value = "";
    try {
      const data = await getSeasonData();
      const raceTable = data.schedule.MRData?.RaceTable;
      const driverList =
        data.drivers.MRData?.StandingsTable?.StandingsLists?.[0]
          ?.DriverStandings;
      const constructorList =
        data.constructors.MRData?.StandingsTable?.StandingsLists?.[0]
          ?.ConstructorStandings;
      if (!raceTable?.Races?.length || !driverList || !constructorList)
        throw new Error(t("data.seasonIncomplete"));
      season.value = raceTable.season || season.value;
      historySeason.value = season.value;
      schedule.value = raceTable.Races.map((race) => ({
        ...race,
        flag: flags[race.Circuit?.Location?.country || ""] || "🏁",
      }));
      applyJolpicaStandings(driverList, constructorList);
      updatedAt.value = standingsUpdatedAt.value;
    } catch (cause) {
      console.error(t("data.seasonLog"), cause);
      error.value = t("data.seasonLoadError");
    } finally {
      loading.value = false;
    }
    loadLastResults();
    getSeasons()
      .then((data) => {
        historySeasons.value = (data.MRData?.SeasonTable?.Seasons || [])
          .map((item) => item.season)
          .filter(
            (year) =>
              Number(year) >= 1986 && Number(year) <= Number(season.value),
          )
          .sort((a, b) => Number(b) - Number(a));
      })
      .catch((cause) => console.error(t("data.seasonsLog"), cause));
    loadRaceHistory(season.value);
    loadSeasonSummary(season.value);
    startStandingsPolling();
  }
  let clock: number | undefined;
  onMounted(() => {
    load();
    updateNow();
    clock = window.setInterval(updateNow, 1_000);
    document.addEventListener("visibilitychange", updateNow);
  });
  onUnmounted(() => {
    if (clock) window.clearInterval(clock);
    if (standingsPoll) window.clearInterval(standingsPoll);
    document.removeEventListener("visibilitychange", updateNow);
    if (liveVisibilityHandler)
      document.removeEventListener("visibilitychange", liveVisibilityHandler);
  });
  return {
    season,
    schedule,
    drivers,
    driverStandings,
    constructors,
    standingsSource,
    standingsUpdatedAt,
    loading,
    error,
    updatedAt,
    now,
    upcomingRaces,
    nextRace,
    remainingRounds,
    lastRace,
    resultsLoading,
    resultsError,
    raceHistory,
    historyLoading,
    historyError,
    historySeason,
    historySeasons,
    seasonSummary,
    seasonSummaryLoading,
    seasonSummaryError,
    selectedHistoryRace,
    historyDetailsLoading,
    historyDetailsError,
    load,
    loadLastResults,
    loadRaceHistory,
    loadSeasonSummary,
    loadHistoryRaceDetails,
    closeHistoryRaceDetails,
  };
}
