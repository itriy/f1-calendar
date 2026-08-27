<script setup lang="ts">
import { computed, ref, watch } from "vue";
import { useI18n } from "vue-i18n";
import type { JolpicaRace } from "@/entities/race/model/types";
import {
  loadSessionLaps,
  loadWeekendDetails,
  type Lap,
  type WeekendDetails,
} from "@/entities/race/api/weekendDetails";

const props = defineProps<{ race: JolpicaRace }>();
const { t, locale } = useI18n();
const details = ref<WeekendDetails | null>(null);
const loading = ref(false);
const error = ref(false);
const allTabs = ["schedule", "race", "qualifying", "sprint", "stats"] as const;
const tab = ref<(typeof allTabs)[number]>("schedule");
const laps = ref<Lap[]>([]);
const lapsLoading = ref(false);
const lapLimit = ref(50);
const isPast = computed(() =>
  Boolean(
    props.race.date &&
    new Date(
      `${props.race.date}T${props.race.time || "23:59:59Z"}`,
    ).getTime() <= Date.now(),
  ),
);
const tabs = computed(() => (isPast.value ? allTabs : ["schedule"]));
const visibleLaps = computed(() => laps.value.slice(0, lapLimit.value));
const raceResults = computed(() => details.value?.results.R || []);
const selectedResults = computed(() =>
  tab.value === "race"
    ? details.value?.results.R || []
    : tab.value === "qualifying"
      ? details.value?.results.Q || []
      : details.value?.results.SR || [],
);
const fastest = computed(
  () => raceResults.value.find((item) => item.fastestLap) || null,
);
const biggestGain = computed(
  () =>
    [...raceResults.value]
      .filter((item) => item.grid)
      .sort(
        (a, b) => (b.grid || 0) - b.position - ((a.grid || 0) - a.position),
      )[0] || null,
);
const lapUrl = computed(
  () =>
    details.value?.sessions.find((session) => session.code === "R")?.lapsUrl,
);

const formatSession = (value: string) =>
  new Intl.DateTimeFormat(locale.value, {
    weekday: "short",
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
    timeZoneName: "short",
  }).format(new Date(value));
async function load() {
  loading.value = true;
  error.value = false;
  laps.value = [];
  lapLimit.value = 50;
  try {
    details.value = await loadWeekendDetails(props.race);
  } catch {
    details.value = null;
    error.value = true;
  } finally {
    loading.value = false;
  }
}
async function showLaps() {
  if (!lapUrl.value || lapsLoading.value) return;
  lapsLoading.value = true;
  try {
    laps.value = await loadSessionLaps(lapUrl.value);
  } finally {
    lapsLoading.value = false;
  }
}
watch(() => `${props.race.season}-${props.race.round}`, load, {
  immediate: true,
});
watch(
  isPast,
  (past) => {
    if (!past) tab.value = "schedule";
  },
  { immediate: true },
);
</script>

<template>
  <section class="min-w-0 border-t border-white/15 pt-3">
    <div
      class="horizontal-scroll-hidden flex w-full max-w-full gap-4 overflow-x-scroll border-b border-white/15"
      role="tablist"
      :aria-label="t('weekend.tabs')"
    >
      <button
        v-for="item in tabs"
        :key="item"
        class="shrink-0 whitespace-nowrap border-b-2 px-1 pb-2 text-[11px] font-extrabold tracking-wide"
        :class="
          tab === item
            ? 'border-f1-red text-white'
            : 'border-transparent text-white/55 hover:text-white'
        "
        type="button"
        role="tab"
        :aria-selected="tab === item"
        @click="tab = item as typeof tab"
      >
        {{ t(`weekend.${item}`) }}
      </button>
    </div>
    <p v-if="loading" class="mt-3 text-xs text-white/65">
      {{ t("weekend.loading") }}
    </p>
    <p v-else-if="error" class="mt-3 text-xs text-amber-200">
      {{ t("weekend.unavailable") }}
    </p>
    <template v-else-if="details">
      <div v-if="tab === 'schedule'" class="mt-3">
        <p
          v-if="details.altitude !== null"
          class="mb-2 text-[11px] text-white/60"
        >
          {{ t("weekend.altitude", { value: details.altitude }) }}
        </p>
        <ul class="grid gap-1.5">
          <li
            v-for="session in details.sessions"
            :key="session.code"
            class="flex justify-between gap-3"
          >
            <span>{{ session.title }}</span><time class="text-right text-white/70">{{
              session.cancelled
                ? t("weekend.cancelled")
                : formatSession(session.startsAt)
            }}</time>
          </li>
        </ul>
      </div>
      <div v-else-if="tab !== 'stats'" class="mt-3">
        <p v-if="!selectedResults.length" class="text-xs text-white/65">
          {{ t("weekend.resultsUnavailable") }}
        </p>
        <ol v-else class="grid gap-1">
          <li
            v-for="result in selectedResults"
            :key="`${tab}-${result.driver}`"
            class="grid grid-cols-[24px_1fr_auto] gap-2 border-b border-white/8 py-1"
          >
            <b>{{ result.position }}</b><span>{{ result.driver }}
              <small class="text-white/55">{{ result.team }}</small></span><span v-if="result.points > 0" class="text-f1-red">{{ result.points }} {{ t("common.points") }}</span>
          </li>
        </ol>
      </div>
      <div v-else class="mt-3 space-y-3">
        <div class="grid gap-2 sm:grid-cols-3">
          <p class="border border-white/10 p-2">
            <b class="block text-[10px] text-white/55">{{
              t("weekend.winner")
            }}</b>{{ raceResults[0]?.driver || "—" }}
          </p>
          <p class="border border-white/10 p-2">
            <b class="block text-[10px] text-white/55">{{
              t("weekend.fastestLap")
            }}</b>{{ fastest ? `${fastest.driver} · ${fastest.fastestLap}` : "—" }}
          </p>
          <p class="border border-white/10 p-2">
            <b class="block text-[10px] text-white/55">{{
              t("weekend.biggestGain")
            }}</b>{{ biggestGain ? biggestGain.driver : "—" }}
          </p>
        </div>
        <p v-if="details.pitStops.length" class="text-xs text-white/70">
          {{ t("weekend.pitStops") }}:
          <span
            v-for="item in details.pitStops.slice(0, 6)"
            :key="item.driver"
            class="mr-2"
          >{{ item.driver }} {{ item.count }}</span>
        </p>
        <button
          v-if="lapUrl && !laps.length"
          class="border border-white/30 px-3 py-2 text-[11px] font-bold hover:bg-white/10"
          type="button"
          :disabled="lapsLoading"
          @click="showLaps"
        >
          {{ lapsLoading ? t("weekend.lapsLoading") : t("weekend.showLaps") }}
        </button>
        <div v-if="laps.length" class="overflow-x-auto">
          <table class="w-full text-left text-[11px]">
            <thead class="text-white/55">
              <tr>
                <th>{{ t("weekend.lap") }}</th>
                <th>{{ t("weekend.driver") }}</th>
                <th>{{ t("weekend.time") }}</th>
                <th>{{ t("weekend.position") }}</th>
              </tr>
            </thead>
            <tbody>
              <tr
                v-for="lap in visibleLaps"
                :key="`${lap.number}-${lap.driver}`"
                :class="lap.fastest ? 'text-f1-red' : ''"
              >
                <td>{{ lap.number }}</td>
                <td>{{ lap.driver }}</td>
                <td>{{ lap.time }}</td>
                <td>{{ lap.position || "—" }}</td>
              </tr>
            </tbody>
          </table>
          <button
            v-if="lapLimit < laps.length"
            class="mt-2 text-[11px] font-bold text-f1-red hover:underline"
            type="button"
            @click="lapLimit += 50"
          >
            {{ t("weekend.showMore") }}
          </button>
        </div>
      </div>
    </template>
  </section>
</template>
