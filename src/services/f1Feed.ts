import { computed, onMounted, ref, type ComputedRef } from "vue";
import type { JolpicaRace } from "../types/f1";
import type { FeedEventItem, FeedItem, FeedNewsItem } from "../types/feed";
import { i18n } from "../i18n";

const EVENT_WINDOW_MS = 14 * 24 * 60 * 60 * 1_000;

const sessions: Array<[keyof JolpicaRace, string]> = [
  ["FirstPractice", "feed.sessionFp1"],
  ["SecondPractice", "feed.sessionFp2"],
  ["ThirdPractice", "feed.sessionFp3"],
  ["SprintQualifying", "feed.sessionSprintQualifying"],
  ["Sprint", "feed.sessionSprint"],
  ["Qualifying", "feed.sessionQualifying"],
  ["date", "feed.sessionRace"],
];

function sessionDate(value: unknown, race: JolpicaRace): string | null {
  if (value === race.date) {
    if (!race.date || !race.time) return null;
    return `${race.date}T${race.time.endsWith("Z") ? race.time : `${race.time}Z`}`;
  }
  if (!value || typeof value !== "object") return null;
  const session = value as { date?: string; time?: string };
  if (!session.date || !session.time) return null;
  return `${session.date}T${session.time.endsWith("Z") ? session.time : `${session.time}Z`}`;
}

export function calendarEvents(races: JolpicaRace[], now = Date.now()): FeedEventItem[] {
  return races.flatMap((race) =>
    sessions.flatMap(([key, session]) => {
      const startsAt = sessionDate(race[key], race);
      const time = startsAt ? new Date(startsAt).getTime() : NaN;
      if (!startsAt || Number.isNaN(time) || time < now || time > now + EVENT_WINDOW_MS)
        return [];
      return [{
        id: `event-${race.round}-${key}-${startsAt}`,
        type: "event" as const,
        startsAt,
        session: i18n.global.t(session),
        raceName: race.raceName,
        round: race.round,
      }];
    }),
  );
}

export function useF1Feed(schedule: ComputedRef<JolpicaRace[]> | { value: JolpicaRace[] }) {
  const news = ref<FeedNewsItem[]>([]);
  const loading = ref(true);
  const error = ref("");

  const items = computed<FeedItem[]>(() =>
    [...news.value, ...calendarEvents(schedule.value)]
      .sort((a, b) => {
        const left = new Date(a.type === "news" ? a.publishedAt : a.startsAt).getTime();
        const right = new Date(b.type === "news" ? b.publishedAt : b.startsAt).getTime();
        return right - left;
      }),
  );

  async function load() {
    loading.value = true;
    error.value = "";
    try {
      const response = await fetch("/api/f1-feed");
      if (!response.ok) throw new Error("Feed unavailable");
      const body = (await response.json()) as { news?: FeedNewsItem[] };
      news.value = Array.isArray(body.news) ? body.news : [];
    } catch {
      error.value = i18n.global.t("feed.loadError");
    } finally {
      loading.value = false;
    }
  }

  onMounted(load);
  return { items, loading, error, load };
}
