<script setup>
defineProps({ races: { type: Array, required: true }, updatedAt: { type: String, default: '' } })
const format = (date) => new Intl.DateTimeFormat('uk-UA', { day: 'numeric', month: 'long' }).format(new Date(`${date}T12:00:00Z`))
const raceDate = (race) => { const end = race.FirstPractice?.date || race.date; return format(race.date) === format(end) ? format(race.date) : `${format(race.date)} — ${format(end)}` }
</script>

<template>
  <section id="calendar" class="border border-white/10 bg-f1-panel">
    <div class="flex items-end justify-between px-5 py-5 sm:px-7"><div><p class="mb-2 text-[10px] font-extrabold tracking-[.16em] text-zinc-400">КАЛЕНДАР · JOLPICA-F1</p><h2 class="font-display text-3xl leading-none font-extrabold uppercase">Наступні гонки</h2></div><span class="text-[10px] font-bold text-zinc-400">Оновлено {{ updatedAt }}</span></div>
    <article v-for="(race, index) in races" :key="race.round" class="grid min-h-18 grid-cols-[36px_35px_1fr_85px_12px] items-center gap-1 border-t border-white/10 px-4 py-2 sm:grid-cols-[47px_42px_1fr_132px_20px] sm:gap-2 sm:px-6" :class="{ 'bg-linear-to-r from-red-950/35 to-transparent': index === 0 }">
      <div class="text-center font-display text-2xl font-extrabold">{{ race.round }}<small class="block font-sans text-[8px] font-semibold tracking-wide text-zinc-500">етап</small></div><div class="text-xl">{{ race.flag }}</div>
      <div><b class="block text-[10px] sm:text-xs">{{ race.raceName }}</b><span class="block text-[8px] font-semibold tracking-wide text-zinc-500">{{ race.Circuit.Location.locality }}</span></div>
      <div class="text-right text-[9px] font-bold sm:text-[11px]">{{ raceDate(race) }}<small v-if="index === 0" class="block pt-1 text-[7px] font-bold tracking-wide text-f1-red">НАСТУПНА ГОНКА</small></div><span class="text-right text-zinc-400">→</span>
    </article>
    <p v-if="!races.length" class="p-6 text-center text-xs text-zinc-400">Наступних гонок у календарі немає.</p>
  </section>
</template>
