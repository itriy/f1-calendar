<script setup>
import RaceCalendar from './components/RaceCalendar.vue'
import StandingsTable from './components/StandingsTable.vue'
import LastRaceResults from './components/LastRaceResults.vue'
import { formatRaceStartLocal, getRaceStart, useF1Data } from './composables/useF1Data'

const { season, schedule, drivers, constructors, loading, error, updatedAt, upcomingRaces, nextRace, lastRace, resultsLoading, resultsError, load, loadLastResults } = useF1Data()
const countdown = (race) => {
  const start = getRaceStart(race)
  if (!start) return 'Час старту уточнюється'
  const ms = start.getTime() - Date.now()
  if (ms <= 0) return 'Старт уже відбувся'
  const days = Math.floor(ms / 86400000)
  const hours = Math.floor((ms % 86400000) / 3600000)
  const minutes = Math.floor((ms % 3600000) / 60000)
  return days ? `Через ${days} дн. ${hours} год.` : `Через ${hours} год. ${minutes} хв.`
}
</script>

<template>
  <main class="min-h-screen overflow-hidden">
    <nav class="mx-auto flex h-17 w-[min(1180px,calc(100%-28px))] items-center gap-5 border-b border-white/10 sm:h-21 sm:w-[min(1180px,calc(100%-48px))] sm:gap-8"><a class="font-display text-xl font-extrabold tracking-wide" href="#top"><span class="mr-1 inline-block -skew-x-9 bg-f1-red px-1.5">F1</span> CALENDAR</a><div class="mr-auto hidden text-[11px] tracking-widest text-zinc-400 sm:block">СЕЗОН <b class="ml-1 text-white">{{ season }}</b></div><a class="text-xs font-bold" href="#calendar">Календар <span class="pl-1 text-f1-red">↗</span></a></nav>
    <section id="top" class="mx-auto flex min-h-75 w-[min(1180px,calc(100%-28px))] items-start justify-between py-12 sm:min-h-80 sm:w-[min(1180px,calc(100%-48px))] sm:items-end sm:py-16"><div><p class="mb-3 text-[10px] font-extrabold tracking-[.16em] text-zinc-400"><i class="mr-2 inline-block size-2 rounded-full bg-f1-red"></i>ФОРМУЛА 1 · {{ season }} <span v-if="!loading && !error" class="ml-2 text-f1-red">LIVE</span></p><h1 class="font-display text-6xl leading-[.82] font-extrabold uppercase sm:text-8xl">Тримай руку<br>на <em class="not-italic text-f1-red">пульсі</em> гонки.</h1><p class="mt-5 max-w-md text-xs leading-6 text-zinc-400">Актуальний розклад і лідери чемпіонату Формули 1 — в одному місці.</p></div><div v-if="nextRace" class="hidden grid-cols-[auto_auto] gap-x-3 sm:grid"><span class="col-span-2 text-[9px] tracking-widest text-zinc-400">НАСТУПНИЙ ЕТАП</span><strong class="font-display text-7xl leading-none">{{ nextRace.round }}</strong><small class="self-end pb-2 text-zinc-400">з {{ schedule.length }}</small><div class="col-span-2 my-2 h-0.5 bg-f1-red"></div><b class="col-span-2 font-display text-sm tracking-wide">{{ formatRaceStartLocal(nextRace) }}</b></div></section>
    <section v-if="loading" class="mx-auto w-[min(1180px,calc(100%-28px))] border border-white/10 bg-f1-panel p-5 text-center text-sm text-zinc-300 sm:w-[min(1180px,calc(100%-48px))]">Завантажуємо актуальні дані Jolpica-F1…</section>
    <section v-else-if="error" class="mx-auto flex w-[min(1180px,calc(100%-28px))] items-center justify-between gap-4 border border-red-500/40 bg-red-950/30 p-5 text-sm text-red-100 sm:w-[min(1180px,calc(100%-48px))]"><span>{{ error }}</span><button class="shrink-0 border border-white/30 px-3 py-2 text-xs font-bold" @click="load">Повторити</button></section>
    <template v-else>
      <section v-if="nextRace" class="mx-auto grid w-[min(1180px,calc(100%-28px))] grid-cols-[42px_1fr] gap-x-3 bg-f1-red p-5 shadow-2xl sm:flex sm:w-[min(1180px,calc(100%-48px))] sm:items-center sm:gap-5 sm:px-8"><div class="text-3xl sm:text-4xl">{{ nextRace.flag }}</div><div class="mr-auto"><p class="mb-1 text-[9px] font-extrabold tracking-[.14em] opacity-75">НАСТУПНА ГОНКА</p><h2 class="font-display text-2xl font-extrabold uppercase sm:text-3xl">{{ nextRace.raceName }}</h2><span class="text-[11px]">{{ nextRace.Circuit.Location.locality }} · {{ formatRaceStartLocal(nextRace) }}</span></div><div class="col-span-2 mt-3 flex flex-col sm:col-span-1 sm:mt-0"><b class="font-display text-3xl">{{ countdown(nextRace) }}</b><span class="text-[9px]">{{ getRaceStart(nextRace) ? 'до старту за місцевим часом' : 'час старту ще не оголошено' }}</span></div></section>
      <section class="mx-auto grid w-[min(1180px,calc(100%-28px))] grid-cols-1 gap-4 py-10 lg:w-[min(1180px,calc(100%-48px))] lg:grid-cols-[1.42fr_.9fr] lg:gap-6 lg:py-17"><RaceCalendar :races="upcomingRaces" :updated-at="updatedAt" /><div class="space-y-4"><LastRaceResults :race="lastRace" :loading="resultsLoading" :error="resultsError" @retry="loadLastResults" /><StandingsTable :drivers="drivers" :constructors="constructors" /></div></section>
    </template>
    <section class="mx-auto flex w-[min(1180px,calc(100%-28px))] gap-3 border border-white/10 bg-white/3 p-4 text-[10px] leading-5 text-zinc-400 sm:w-[min(1180px,calc(100%-48px))]"><span class="flex size-4 shrink-0 items-center justify-center rounded-full border border-f1-red font-bold text-f1-red">i</span><p class="m-0"><b class="text-zinc-100">Живі дані Jolpica-F1.</b> Календар і таблиці завантажуються у браузері з відкритого API під час кожного відкриття сторінки. Дані можуть оновлюватися із затримкою.</p></section>
    <footer class="mx-auto mt-8 flex w-[min(1180px,calc(100%-28px))] flex-wrap gap-3 border-t border-white/10 py-6 text-[9px] text-zinc-500 sm:mt-10 sm:w-[min(1180px,calc(100%-48px))]"><span class="w-full font-display text-sm font-extrabold text-white sm:mr-auto sm:w-auto"><b class="mr-1 bg-f1-red px-1">F1</b> CALENDAR</span><small>Незалежний неофіційний трекер Формули 1</small><small>© {{ season }}</small></footer>
  </main>
</template>
