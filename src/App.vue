<script setup lang="ts">
import { computed, nextTick, ref } from "vue";
import { useI18n } from "vue-i18n";
import ChampionshipChances from "./components/ChampionshipChances.vue";
import RaceCalendar from "./components/RaceCalendar.vue";
import StandingsTable from "./components/StandingsTable.vue";
import LastRaceResults from "./components/LastRaceResults.vue";
import RaceHistory from "./components/RaceHistory.vue";
// import RaceReminders from "./components/RaceReminders.vue";
import RaceRemindersModal from "./components/RaceRemindersModal.vue";
import ReminderTrigger from "./components/ReminderTrigger.vue";
import NewsFeed from "./components/NewsFeed.vue";
import WatchProviders from "./components/WatchProviders.vue";
// import AiSearch from "./components/AiSearch.vue";
import { useF1Feed } from "./services/f1Feed";
import {
  formatRaceStartLocal,
  getRaceStart,
  useF1Data,
} from "./composables/useF1Data";
import {
  estimateChampionshipChances,
  MAX_POINTS_PER_RACE,
} from "./utils/championship";

const {
  season,
  schedule,
  drivers,
  driverStandings,
  constructors,
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
} = useF1Data();
const { t } = useI18n();
const weekendDetailsRound = ref("");
const showWeekendDetails = async (round: string) => {
  weekendDetailsRound.value = round;
  await nextTick();
  document
    .getElementById(`race-${round}`)
    ?.scrollIntoView({ behavior: "smooth", block: "start" });
};
const {
  items: feedItems,
  loading: feedLoading,
  error: feedError,
  load: loadFeed,
} = useF1Feed(computed(() => schedule.value));
const contenders = computed(() =>
  estimateChampionshipChances(driverStandings.value, remainingRounds.value),
);
const pastRaces = computed(() =>
  schedule.value
    .filter((race) => {
      const start = getRaceStart(race);
      if (start) return start.getTime() <= now.value;
      return race.date
        ? new Date(`${race.date}T23:59:59Z`).getTime() <= now.value
        : false;
    })
    .reverse(),
);
const selectHistorySeason = (selectedSeason) => {
  loadRaceHistory(selectedSeason);
  loadSeasonSummary(selectedSeason);
};
const roundsLabel = (rounds: number) =>
  rounds === 0
    ? t("app.seasonComplete")
    : t("app.roundsRemaining", {
        rounds,
        label: rounds === 1 ? t("app.round") : t("app.rounds"),
      });
const countdown = (
  race: { date?: string; time?: string } | null,
  currentTime = Date.now(),
) => {
  const start = getRaceStart(race);
  if (!start) return t("app.startUnknown");
  const ms = start.getTime() - currentTime;
  if (ms <= 0) return t("app.startPassed");
  const days = Math.floor(ms / 86400000);
  const hours = Math.floor((ms % 86400000) / 3600000);
  const minutes = Math.floor((ms % 3600000) / 60000);
  return days
    ? t("app.countdownDays", { days, hours })
    : t("app.countdownHours", { hours, minutes });
};
</script>

<template>
  <main class="min-h-screen">
    <header
      class="sticky top-0 z-50 border-b border-white/10 bg-[#0d0d0f]/95 backdrop-blur-md"
    >
      <nav
        class="mx-auto flex h-17 w-[min(90rem,calc(100%-1.75rem))] items-center gap-5 sm:h-21 sm:w-[min(90rem,calc(100%-3rem))] sm:gap-8"
      >
        <a class="font-display text-xl font-extrabold tracking-wide" href="#top"><span class="mr-1 inline-block -skew-x-9 bg-f1-red px-1.5">F1</span>
          CALENDAR</a>
        <div
          class="mr-auto hidden text-[11px] tracking-widest text-zinc-400 sm:block"
        >
          {{ t("common.season") }} <b class="ml-1 text-white">{{ season }}</b>
        </div>
        <a class="text-xs font-bold" href="#calendar">{{ t("app.calendar") }} <span class="pl-1 text-f1-red">↗</span></a>
        <ReminderTrigger />
      </nav>
    </header>
    <section
      id="top"
      class="mx-auto flex min-h-75 w-[min(90rem,calc(100%-1.75rem))] items-start justify-between py-12 sm:min-h-80 sm:w-[min(90rem,calc(100%-3rem))] sm:items-end sm:py-16"
    >
      <div>
        <p
          class="mb-3 text-[12px] font-extrabold tracking-[.16em] text-zinc-400"
        >
          <i class="mr-2 inline-block size-2 rounded-full bg-f1-red"></i>{{ t("app.formulaOne") }} · {{ season }}
          <span v-if="!loading && !error" class="ml-2 text-f1-red">{{
            t("common.live")
          }}</span>
        </p>
        <h1
          class="font-display text-6xl leading-[.82] font-extrabold uppercase sm:text-8xl"
        >
          {{ t("app.headlineStart") }}<br />{{ t("app.headlineMiddle") }}
          <em class="not-italic text-f1-red">{{
            t("app.headlineEmphasis")
          }}</em>
          {{ t("app.headlineEnd") }}
        </h1>
        <p class="mt-5 max-w-md text-xs leading-6 text-zinc-400">
          {{ t("app.intro") }}
        </p>
      </div>
      <div v-if="nextRace" class="hidden sm:block">
        <span class="text-[12px] tracking-widest text-zinc-400">{{
          t("app.nextRound")
        }}</span>
        <div class="flex items-baseline gap-2">
          <strong class="font-display text-7xl leading-none">{{
            nextRace.round
          }}</strong>
          <span class="font-display text-3xl text-zinc-400">/ {{ schedule.length }}</span>
        </div>
        <div class="my-2 h-0.5 bg-f1-red"></div>
        <b class="block font-display text-sm tracking-wide">{{
          formatRaceStartLocal(nextRace)
        }}</b><a
          class="mt-2 inline-block text-[12px] font-bold text-f1-red hover:underline focus-visible:rounded-sm focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-f1-red"
          href="#calendar"
        >{{ roundsLabel(remainingRounds) }}</a>
      </div>
    </section>
    <section
      v-if="loading"
      class="mx-auto w-[min(90rem,calc(100%-1.75rem))] border border-white/10 bg-f1-panel p-5 text-center text-sm text-zinc-300 sm:w-[min(90rem,calc(100%-3rem))]"
    >
      {{ t("app.loading") }}
    </section>
    <section
      v-else-if="error"
      class="mx-auto flex w-[min(90rem,calc(100%-1.75rem))] items-center justify-between gap-4 border border-red-500/40 bg-red-950/30 p-5 text-sm text-red-100 sm:w-[min(90rem,calc(100%-3rem))]"
    >
      <span>{{ error }}</span><button
        class="shrink-0 border border-white/30 px-3 py-2 text-xs font-bold"
        @click="load"
      >
        {{ t("common.retry") }}
      </button>
    </section>
    <template v-else>
      <section
        v-if="nextRace"
        class="mx-auto grid w-[min(90rem,calc(100%-1.75rem))] grid-cols-[42px_1fr] gap-x-3 bg-f1-red p-5 shadow-2xl sm:flex sm:w-[min(90rem,calc(100%-3rem))] sm:items-center sm:gap-5 sm:px-8"
      >
        <div class="text-3xl sm:text-4xl">{{ nextRace.flag }}</div>
        <div class="mr-auto">
          <p
            class="mb-1 text-[12px] font-extrabold tracking-[.14em] opacity-75"
          >
            {{ t("app.nextRace") }}
          </p>
          <h2
            class="font-display text-2xl font-extrabold uppercase sm:text-3xl"
          >
            {{ nextRace.raceName }}
          </h2>
          <span class="text-[11px]">{{
            nextRace.Circuit?.Location?.locality ||
              t("common.unknownLocation")
          }}
            · {{ formatRaceStartLocal(nextRace) }}</span>
        </div>
        <div class="col-span-2 mt-3 flex flex-col sm:col-span-1 sm:mt-0">
          <b class="font-display text-3xl">{{ countdown(nextRace, now) }}</b><span class="text-[12px]">{{
            getRaceStart(nextRace)
              ? t("app.nextRaceTime")
              : t("app.nextRaceTimeUnknown")
          }}</span>
          <a
            class="mt-3 inline-flex w-fit items-center border border-white/70 px-3 py-2 text-[11px] font-extrabold tracking-wide text-white transition hover:bg-white hover:text-f1-red focus-visible:outline-2 focus-visible:outline-offset-3 focus-visible:outline-white"
            :href="`#race-${nextRace.round}`"
            @click.prevent="showWeekendDetails(nextRace.round)"
          >
            {{ t("app.weekendDetails") }} <span class="ml-2">↓</span>
          </a>
        </div>
      </section>
      <section
        v-else
        class="mx-auto w-[min(90rem,calc(100%-1.75rem))] border border-white/10 bg-f1-panel p-5 text-center text-sm text-zinc-400 sm:w-[min(90rem,calc(100%-3rem))]"
      >
        {{ t("app.seasonFinished", { season }) }}
      </section>
      <section
        class="mx-auto grid w-[min(90rem,calc(100%-1.75rem))] grid-cols-1 gap-4 py-10 lg:w-[min(90rem,calc(100%-3rem))] lg:grid-cols-[1.42fr_.9fr] lg:gap-6 lg:py-17"
      >
        <RaceCalendar
          :races="upcomingRaces"
          :past-races="pastRaces"
          :updated-at="updatedAt"
          :open-race-round="weekendDetailsRound"
        />
        <div class="space-y-4">
          <ChampionshipChances
            :contenders="contenders"
            :remaining-rounds="remainingRounds"
            :max-points-per-race="MAX_POINTS_PER_RACE"
          /><LastRaceResults
            :race="lastRace"
            :loading="resultsLoading"
            :error="resultsError"
            @retry="loadLastResults"
          /><StandingsTable :drivers="drivers" :constructors="constructors" />
        </div>
      </section>
      <section
        class="mx-auto w-[min(90rem,calc(100%-1.75rem))] pb-10 lg:w-[min(90rem,calc(100%-3rem))]"
      >
        <RaceHistory
          :races="raceHistory"
          :season="historySeason"
          :seasons="historySeasons"
          :current-season="season"
          :summary="seasonSummary"
          :summary-loading="seasonSummaryLoading"
          :summary-error="seasonSummaryError"
          :loading="historyLoading"
          :error="historyError"
          :selected-race="selectedHistoryRace"
          :details-loading="historyDetailsLoading"
          :details-error="historyDetailsError"
          @retry="loadRaceHistory"
          @retry-summary="loadSeasonSummary"
          @select-season="selectHistorySeason"
          @select-race="loadHistoryRaceDetails"
          @close-race="closeHistoryRaceDetails"
        />
      </section>
      <section
        class="mx-auto w-[min(90rem,calc(100%-1.75rem))] pb-10 lg:w-[min(90rem,calc(100%-3rem))]"
      >
        <WatchProviders />
      </section>
      <section
        class="mx-auto w-[min(90rem,calc(100%-1.75rem))] pb-10 lg:w-[min(90rem,calc(100%-3rem))]"
      >
        <NewsFeed
          :items="feedItems"
          :loading="feedLoading"
          :error="feedError"
          @retry="loadFeed"
        />
      </section>
      <section
        class="mx-auto grid w-[min(90rem,calc(100%-1.75rem))] grid-cols-1 gap-4 pb-10 lg:w-[min(90rem,calc(100%-3rem))] lg:grid-cols-2"
      >
<!--        <RaceReminders />-->
        <!-- <AiSearch /> -->
      </section>
    </template>
    <section
      class="mx-auto flex w-[min(90rem,calc(100%-1.75rem))] gap-3 border border-white/10 bg-white/3 p-4 text-[12px] leading-5 text-zinc-400 sm:w-[min(90rem,calc(100%-3rem))]"
    >
      <span
        class="flex size-4 shrink-0 items-center justify-center rounded-full border border-f1-red font-bold text-f1-red"
      >i</span>
      <p class="m-0">
        <b class="text-zinc-100">{{ t("app.liveDataTitle") }}</b>
        {{ t("app.liveDataDescription") }}
      </p>
    </section>
    <footer
      class="mx-auto mt-8 flex w-[min(90rem,calc(100%-1.75rem))] flex-wrap gap-3 border-t border-white/10 py-6 text-[12px] text-zinc-500 sm:mt-10 sm:w-[min(90rem,calc(100%-3rem))]"
    >
      <span
        class="w-full font-display text-sm font-extrabold text-white sm:mr-auto sm:w-auto"
      >
        <b class="mr-1 bg-f1-red px-1">F1</b> CALENDAR
      </span>
      <small>{{ t("app.footer") }}</small><small>© {{ season }}</small>
    </footer>
  </main>
  <RaceRemindersModal />
</template>
