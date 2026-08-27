<script setup lang="ts">
import { computed, ref } from "vue";
import { useI18n } from "vue-i18n";
import TeamBadge from "@/entities/team/ui/TeamBadge.vue";
import WikiLink from "@/shared/ui/WikiLink.vue";
import RaceVideos from "./RaceVideos.vue";

type ResultLink = { name: string; url: string; team: string; teamUrl: string };
type HistoryRace = {
  round: string;
  name: string;
  date: string;
  circuit: string;
  flag: string;
  winner: ResultLink | null;
};
type RaceDetail = {
  round: string;
  results: Array<ResultLink & { position: string; gap: string }>;
};
type SeasonSummary = {
  driver: ResultLink & { points: string };
  constructor: { name: string; url: string; points: string };
};
const props = defineProps<{
  races: HistoryRace[];
  season: string;
  seasons: string[];
  currentSeason: string | number;
  summary: SeasonSummary | null;
  summaryLoading: boolean;
  summaryError: string;
  selectedRace: RaceDetail | null;
  detailsLoading: boolean;
  detailsError: string;
  loading: boolean;
  error: string;
}>();
const emit = defineEmits([
  "retry",
  "retry-summary",
  "select-season",
  "select-race",
  "close-race",
]);
const { t, locale } = useI18n();

const initialCount = 5;
const expanded = ref(false);
const visibleRaces = computed(() =>
  expanded.value ? props.races : props.races.slice(0, initialCount),
);
const formatDate = (date?: string) =>
  date
    ? new Intl.DateTimeFormat(locale.value, {
        day: "numeric",
        month: "long",
        year: "numeric",
        timeZone: "UTC",
      }).format(new Date(`${date}T12:00:00Z`))
    : t("common.unknownDate");
const isCurrentSeason = computed(
  () => String(props.season) === String(props.currentSeason),
);
function selectSeason(event: Event) {
  expanded.value = false;
  emit("select-season", (event.target as HTMLSelectElement).value);
}
function isSelected(race: HistoryRace) {
  return String(props.selectedRace?.round) === String(race.round);
}
function toggleRace(race: HistoryRace) {
  if (isSelected(race)) emit("close-race");
  else emit("select-race", race.round);
}
</script>

<template>
  <section class="border border-white/10 bg-f1-panel">
    <div
      class="flex flex-col gap-4 px-5 py-5 sm:flex-row sm:items-end sm:justify-between sm:px-7"
    >
      <div>
        <p
          class="mb-2 text-[12px] font-extrabold tracking-[.16em] text-zinc-400"
        >
          {{ t("history.eyebrow") }}
        </p>
        <h2 class="font-display text-3xl leading-none font-extrabold uppercase">
          {{ t("history.title") }}
        </h2>
      </div>
      <label class="text-[12px] font-extrabold tracking-[.12em] text-zinc-500">{{ t("common.season")
      }}<span class="relative mt-1 block w-full sm:w-36">
        <select
          class="block w-full appearance-none cursor-pointer border border-white/15 bg-f1-panel py-2 pl-3 pr-10 text-xs font-bold text-white outline-none focus:border-f1-red"
          :value="season"
          :disabled="loading"
          @change="selectSeason"
        >
          <option v-for="year in seasons" :key="year" :value="year">
            {{ year }}
          </option>
        </select>
        <svg
          aria-hidden="true"
          class="pointer-events-none absolute top-1/2 right-3 size-4 -translate-y-1/2 text-zinc-400"
          viewBox="0 0 16 16"
          fill="none"
        >
          <path d="m4 6 4 4 4-4" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" />
        </svg>
      </span></label>
    </div>
    <p
      class="border-t border-white/10 px-5 py-3 text-[12px] leading-5 text-zinc-400 sm:px-7"
    >
      {{
        isCurrentSeason
          ? t("history.currentDescription")
          : t("history.description", { season })
      }}
    </p>
    <div
      class="grid gap-px border-t border-white/10 bg-white/10 sm:grid-cols-2"
    >
      <div class="bg-f1-panel px-5 py-4 sm:px-7">
        <p
          class="mb-3 text-[10px] font-extrabold tracking-[.14em] text-zinc-500"
        >
          {{
            isCurrentSeason
              ? t("history.driverLeader")
              : t("history.driverChampion")
          }}
        </p>
        <p v-if="summaryLoading" class="text-xs text-zinc-400">
          {{ t("history.summaryLoading") }}
        </p>
        <div v-else-if="summary?.driver" class="flex items-center gap-3">
          <TeamBadge :team="summary.driver.team" />
          <div class="min-w-0">
            <WikiLink
              :url="summary.driver.url"
              :label="summary.driver.name"
              class-name="block truncate text-sm font-bold hover:text-f1-red"
            /><WikiLink
              :url="summary.driver.teamUrl"
              :label="summary.driver.team"
              class-name="block truncate text-[12px] text-zinc-500 hover:text-white"
            /><strong class="mt-1 block font-display text-xl">{{ summary.driver.points }}
              <small class="font-sans text-[12px] text-zinc-500">{{
                t("common.points")
              }}</small></strong>
          </div>
        </div>
        <div
          v-else
          class="flex items-center justify-between gap-3 text-xs text-red-100"
        >
          <span>{{ summaryError || t("history.summaryUnavailable") }}</span><button
            v-if="summaryError"
            class="cursor-pointer border border-white/30 px-3 py-2 font-bold"
            type="button"
            @click="emit('retry-summary')"
          >
            {{ t("common.retry") }}
          </button>
        </div>
      </div>
      <div class="bg-f1-panel px-5 py-4 sm:px-7">
        <p
          class="mb-3 text-[10px] font-extrabold tracking-[.14em] text-zinc-500"
        >
          {{
            isCurrentSeason
              ? t("history.constructorLeader")
              : t("history.constructorChampion")
          }}
        </p>
        <p v-if="summaryLoading" class="text-xs text-zinc-400">
          {{ t("history.summaryLoading") }}
        </p>
        <div v-else-if="summary?.constructor" class="flex items-center gap-3">
          <TeamBadge :team="summary.constructor.name" />
          <div class="min-w-0">
            <WikiLink
              :url="summary.constructor.url"
              :label="summary.constructor.name"
              class-name="block truncate text-sm font-bold hover:text-f1-red"
            /><strong class="mt-1 block font-display text-xl">{{ summary.constructor.points }}
              <small class="font-sans text-[10px] text-zinc-500">{{
                t("common.points")
              }}</small></strong>
          </div>
        </div>
        <div
          v-else
          class="flex items-center justify-between gap-3 text-xs text-red-100"
        >
          <span>{{ summaryError || t("history.summaryUnavailable") }}</span><button
            v-if="summaryError"
            class="cursor-pointer border border-white/30 px-3 py-2 font-bold"
            type="button"
            @click="emit('retry-summary')"
          >
            {{ t("common.retry") }}
          </button>
        </div>
      </div>
    </div>
    <div
      v-if="loading"
      class="border-t border-white/10 px-5 py-7 text-sm text-zinc-400 sm:px-7"
    >
      {{ t("history.loading") }}
    </div>
    <div
      v-else-if="error"
      class="flex items-center justify-between gap-4 border-t border-red-500/30 bg-red-950/20 px-5 py-5 text-xs text-red-100 sm:px-7"
    >
      <span>{{ error }}</span><button
        class="shrink-0 border border-white/30 px-3 py-2 font-bold"
        @click="$emit('retry')"
      >
        {{ t("common.retry") }}
      </button>
    </div>
    <template v-else-if="races.length">
      <article
        v-for="race in visibleRaces"
        :key="race.round"
        class="border-t border-white/8"
      >
        <button
          class="grid w-full cursor-pointer grid-cols-[auto_1fr_auto] items-center gap-x-3 px-5 py-4 text-left hover:bg-white/3 focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-f1-red sm:grid-cols-[58px_1fr_auto_auto] sm:gap-x-5 sm:px-7"
          type="button"
          :aria-expanded="isSelected(race)"
          :aria-controls="`race-details-${season}-${race.round}`"
          @click="toggleRace(race)"
        >
          <div class="flex items-center gap-2 block">
            <b class="font-display text-2xl leading-none text-zinc-300">{{
              race.round
            }}</b><span class="text-lg sm:mt-1 sm:block">{{ race.flag }}</span>
          </div>
          <div class="min-w-0">
            <b class="block truncate text-xs">{{ race.name }}</b><span class="mt-1 block truncate text-[12px] text-zinc-500">{{ formatDate(race.date) }} · {{ race.circuit }}</span>
          </div>
          <div v-if="race.winner" class="hidden items-center gap-2 sm:flex">
            <TeamBadge :team="race.winner.team" />
            <div>
              <span
                class="block text-[10px] font-extrabold tracking-[.12em] text-yellow-300"
              >{{ t("common.winner") }}</span><span class="block text-xs font-bold">{{
                race.winner.name
              }}</span><span class="block text-[12px] text-zinc-500">{{
                race.winner.team
              }}</span>
            </div>
          </div>
          <span v-else class="hidden text-[12px] text-zinc-500 sm:block">{{
            t("history.winnerMissing")
          }}</span><span class="font-display text-xl text-f1-red" aria-hidden="true">{{
            isSelected(race) ? "−" : "+"
          }}</span>
          <div
            v-if="race.winner"
            class="col-span-3 mt-3 flex items-center gap-2 border-t border-white/8 pt-3 sm:hidden"
          >
            <TeamBadge :team="race.winner.team" />
            <div>
              <span
                class="block text-[10px] font-extrabold tracking-[.12em] text-yellow-300"
              >{{ t("common.winner") }}</span><span class="block text-xs font-bold">{{
                race.winner.name
              }}</span><span class="block text-[12px] text-zinc-500">{{
                race.winner.team
              }}</span>
            </div>
          </div>
        </button>
        <div
          v-if="isSelected(race)"
          :id="`race-details-${season}-${race.round}`"
          class="border-t border-white/8 bg-black/15 px-5 py-4 sm:px-7"
        >
          <p
            class="mb-3 text-[12px] font-extrabold tracking-[.12em] text-zinc-500"
          >
            {{ t("history.podium") }}
          </p>
          <p v-if="detailsLoading" class="text-xs text-zinc-400">
            {{ t("history.detailsLoading") }}
          </p>
          <div
            v-else-if="detailsError"
            class="flex items-center justify-between gap-4 text-xs text-red-100"
          >
            <span>{{ detailsError }}</span><button
              class="cursor-pointer border border-white/30 px-3 py-2 font-bold"
              type="button"
              @click="emit('select-race', race.round)"
            >
              {{ t("common.retry") }}
            </button>
          </div>
          <div
            v-else-if="selectedRace?.results?.length"
            class="grid gap-2 sm:grid-cols-3"
          >
            <div
              v-for="result in selectedRace.results"
              :key="`${result.position}-${result.name}`"
              class="flex items-center gap-3 border border-white/8 bg-white/3 p-3"
            >
              <b
                class="font-display text-xl"
                :class="{
                  'text-yellow-300': result.position === '1',
                  'text-zinc-300': result.position === '2',
                  'text-amber-700': result.position === '3',
                }"
              >{{ result.position }}</b><TeamBadge :team="result.team" />
              <div class="min-w-0 flex-1">
                <WikiLink
                  :url="result.url"
                  :label="result.name"
                  class-name="block truncate text-xs font-bold hover:text-f1-red"
                /><WikiLink
                  :url="result.teamUrl"
                  :label="result.team"
                  class-name="block truncate text-[12px] text-zinc-500 hover:text-white"
                /><span
                  class="mt-1 block text-[12px] font-extrabold tracking-[.1em] text-zinc-500"
                >{{ t("common.gap") }}</span><small class="block text-[12px] text-zinc-300">{{
                  result.gap
                }}</small>
              </div>
            </div>
          </div>
          <p v-else class="text-xs text-zinc-400">
            {{ t("history.detailsUnavailable") }}
          </p>
          <RaceVideos
            :season="season"
            :round="race.round"
            :race-name="race.name"
          />
        </div>
      </article>
      <div
        v-if="races.length > initialCount"
        class="border-t border-white/10 px-5 py-4 text-center sm:px-7"
      >
        <button
          class="cursor-pointer text-[12px] font-extrabold tracking-[.12em] text-f1-red underline-offset-4 hover:underline focus-visible:rounded-sm focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-f1-red"
          @click="expanded = !expanded"
        >
          {{
            expanded
              ? t("history.collapse")
              : t("history.showMore", { count: races.length - initialCount })
          }}
        </button>
      </div>
    </template>
    <p
      v-else
      class="border-t border-white/10 px-5 py-7 text-center text-xs text-zinc-400 sm:px-7"
    >
      {{
        isCurrentSeason
          ? t("history.currentEmpty")
          : t("history.empty", { season })
      }}
    </p>
  </section>
</template>
