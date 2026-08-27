<script setup lang="ts">
import { computed, ref, watch } from "vue";
import { useI18n } from "vue-i18n";
import type { JolpicaRace } from "@/entities/race/model/types";
import NextRaceCircuit from "./NextRaceCircuit.vue";

type CalendarRace = JolpicaRace & {
  flag: string;
  FirstPractice?: { date?: string };
};
const props = withDefaults(
  defineProps<{
    races: CalendarRace[];
    pastRaces?: CalendarRace[];
    updatedAt?: string;
    openRaceRound?: string;
  }>(),
  { pastRaces: () => [] },
);
const { t, locale } = useI18n();
const tabs = ["upcoming", "past"] as const;
const activeTab = ref<"upcoming" | "past">("upcoming");
const displayedRaces = computed(() =>
  activeTab.value === "upcoming" ? props.races : props.pastRaces,
);
watch(
  () => props.openRaceRound,
  (round) => {
    if (round) activeTab.value = "upcoming";
  },
);
const format = (date?: string) =>
  date
    ? new Intl.DateTimeFormat(locale.value, {
        day: "numeric",
        month: "long",
      }).format(new Date(`${date}T12:00:00Z`))
    : t("common.unknownDate");
const raceDate = (race: CalendarRace) => {
  const end = race.FirstPractice?.date || race.date;
  return format(race.date) === format(end)
    ? format(race.date)
    : `${format(race.date)} — ${format(end)}`;
};
const raceStart = (race: CalendarRace) => {
  if (!race.date || !race.time) return t("calendar.timeUnknown");
  const time = race.time.endsWith("Z") ? race.time : `${race.time}Z`;
  const start = new Date(`${race.date}T${time}`);
  if (Number.isNaN(start.getTime())) return t("calendar.timeUnknown");
  return new Intl.DateTimeFormat(locale.value, {
    hour: "2-digit",
    minute: "2-digit",
    timeZoneName: "short",
  }).format(start);
};
</script>

<template>
  <section id="calendar" class="border border-white/10 bg-f1-panel">
    <div class="flex items-end justify-between px-5 py-5 sm:px-7">
      <div>
        <p
          class="mb-2 text-[12px] font-extrabold tracking-[.16em] text-zinc-400"
        >
          {{ t("calendar.eyebrow") }}
        </p>
        <h2 class="font-display text-3xl leading-none font-extrabold uppercase">
          {{ t("calendar.title") }}
        </h2>
      </div>
      <span class="text-[12px] font-bold text-zinc-400">{{
        t("calendar.updated", { time: updatedAt })
      }}</span>
    </div>
    <div class="flex border-t border-white/10 px-5 sm:px-7" role="tablist" :aria-label="t('calendar.tabs')">
      <button
        v-for="tab in tabs"
        :key="tab"
        class="border-b-2 px-3 py-3 text-[11px] font-extrabold tracking-wide transition"
        :class="activeTab === tab ? 'border-f1-red text-white' : 'border-transparent text-zinc-500 hover:text-zinc-200'"
        role="tab"
        :aria-selected="activeTab === tab"
        @click="activeTab = tab"
      >
        {{ t(`calendar.${tab}`) }}
      </button>
    </div>
    <article
      v-for="(race, index) in displayedRaces"
      :key="race.round"
      :id="`race-${race.round}`"
      class="grid min-h-18 grid-cols-[36px_35px_1fr_85px_12px] items-center gap-1 border-t border-white/10 px-4 py-2 sm:grid-cols-[47px_42px_1fr_132px] sm:gap-2 sm:px-6"
      :class="{ 'bg-linear-to-r from-red-950/35 to-transparent': activeTab === 'upcoming' && index === 0 }"
    >
      <div class="text-center font-display text-2xl font-extrabold">
        {{ race.round
        }}<small
          class="block font-sans text-[12px] font-semibold tracking-wide text-zinc-500"
        >{{ t("calendar.round") }}</small>
      </div>
      <div class="text-xl">{{ race.flag }}</div>
      <div>
        <b class="block text-[12px] sm:text-xs">{{ race.raceName }}</b><span
          class="block text-[12px] font-semibold tracking-wide text-zinc-500"
        >{{ race.Circuit.Location.locality }}</span>
      </div>
      <div class="text-right text-[12px] font-bold sm:text-[11px]">
        {{ raceDate(race) }}
        <small class="block pt-1 text-[10px] font-bold tracking-wide text-zinc-400"
          >{{ t("calendar.start") }} · {{ raceStart(race) }}</small
        >
        <small
          v-if="activeTab === 'upcoming' && index === 0"
          class="block pt-1 text-[10px] font-bold tracking-wide text-f1-red"
        >{{ t("calendar.nextRace") }}</small>
      </div>
      <div class="col-span-full">
        <NextRaceCircuit :race="race" :force-open="race.round === openRaceRound" />
      </div>
    </article>
    <p v-if="!displayedRaces.length" class="p-6 text-center text-xs text-zinc-400">
      {{ activeTab === "upcoming" ? t("calendar.empty") : t("calendar.pastEmpty") }}
    </p>
  </section>
</template>
