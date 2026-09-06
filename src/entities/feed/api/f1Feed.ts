import { computed, onMounted, ref, type ComputedRef } from "vue";
import type { JolpicaRace } from "@/entities/race/model/types";
import type { FeedEventItem, FeedItem, FeedNewsItem } from "../model/types";
import { i18n } from "@/shared/config/i18n";

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

export function calendarEvents(
  races: JolpicaRace[],
  now = Date.now(),
): FeedEventItem[] {
  return races
    .flatMap((race) =>
      sessions.flatMap(([key, session]) => {
        const startsAt = sessionDate(race[key], race);
        const time = startsAt ? new Date(startsAt).getTime() : NaN;
        if (
          !startsAt ||
          Number.isNaN(time) ||
          time < now ||
          time > now + EVENT_WINDOW_MS
        )
          return [];
        return [
          {
            id: `event-${race.round}-${key}-${startsAt}`,
            type: "event" as const,
            startsAt,
            session: i18n.global.t(session),
            raceName: race.raceName,
            round: race.round,
          },
        ];
      }),
    )
    .sort(
      (left, right) =>
        new Date(left.startsAt).getTime() - new Date(right.startsAt).getTime(),
    );
}

export function sortFeedItems(items: FeedItem[]): FeedItem[] {
  return [...items].sort((left, right) => {
    if (left.type === "event" && right.type === "event")
      return (
        new Date(left.startsAt).getTime() - new Date(right.startsAt).getTime()
      );
    if (left.type === "event") return -1;
    if (right.type === "event") return 1;
    return (
      new Date(right.publishedAt).getTime() -
      new Date(left.publishedAt).getTime()
    );
  });
}

export function useF1Feed(
  schedule: ComputedRef<JolpicaRace[]> | { value: JolpicaRace[] },
) {
  const news = ref<FeedNewsItem[]>([]);
  const loading = ref(true);
  const error = ref("");

  const items = computed<FeedItem[]>(() =>
    sortFeedItems([...news.value, ...calendarEvents(schedule.value)]),
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
