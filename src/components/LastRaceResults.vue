<script setup>
defineProps({ race: { type: Object, default: null }, loading: Boolean, error: { type: String, default: '' } })
defineEmits(['retry'])
import TeamBadge from './TeamBadge.vue'

const formatDate = (date) => date ? new Intl.DateTimeFormat('uk-UA', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' }).format(new Date(`${date}T12:00:00Z`)) : 'Дата уточнюється'
</script>

<template>
  <section class="border border-white/10 bg-f1-panel">
    <div class="flex items-end justify-between px-5 py-5 sm:px-7"><div><p class="mb-2 text-[10px] font-extrabold tracking-[.16em] text-zinc-400">РЕЗУЛЬТАТИ · JOLPICA-F1</p><h2 class="font-display text-3xl leading-none font-extrabold uppercase">Останній етап</h2></div><span v-if="race" class="text-2xl">{{ race.flag }}</span></div>
    <div v-if="loading" class="border-t border-white/10 px-5 py-7 text-sm text-zinc-400 sm:px-7">Завантажуємо результати останньої гонки…</div>
    <div v-else-if="error" class="flex items-center justify-between gap-4 border-t border-red-500/30 bg-red-950/20 px-5 py-5 text-xs text-red-100 sm:px-7"><span>{{ error }}</span><button class="shrink-0 border border-white/30 px-3 py-2 font-bold" @click="$emit('retry')">Повторити</button></div>
    <template v-else-if="race">
      <div class="border-t border-white/10 px-5 py-4 sm:px-7"><b class="block text-sm">{{ race.name }}</b><span class="mt-1 block text-[10px] text-zinc-400">{{ race.place }} · {{ formatDate(race.date) }}</span></div>
      <div v-if="race.results[0]" class="border-t border-yellow-300/30 bg-yellow-300/8 px-5 py-3 sm:px-7"><p class="mb-1 text-[9px] font-extrabold tracking-[.14em] text-yellow-300">ПЕРЕМОЖЕЦЬ</p><div class="flex items-end justify-between gap-3"><div class="flex items-center gap-2"><TeamBadge :team="race.results[0].team" /><div><b class="block text-sm">{{ race.results[0].name }}</b><small class="block text-[9px] text-zinc-400">{{ race.results[0].team }}</small></div></div><strong class="font-display text-2xl text-yellow-300">{{ race.results[0].points }} <small class="font-sans text-[8px] text-zinc-400">очок</small></strong></div></div>
      <div class="border-t border-white/8 px-5 py-2 text-[9px] font-extrabold tracking-[.12em] text-zinc-500 sm:px-7">УСІ ПІЛОТИ З ОЧКАМИ</div>
      <div v-for="result in race.results" :key="`${result.position}-${result.name}`" class="grid grid-cols-[28px_1fr_auto] items-center gap-3 border-t border-white/8 px-5 py-2.5 sm:px-7"><b class="font-display text-xl" :class="{ 'text-yellow-300': result.position === '1' }">{{ result.position }}</b><div class="flex items-center gap-2"><TeamBadge :team="result.team" /><div><b class="block text-xs">{{ result.name }}</b><small class="block text-[9px] text-zinc-500">{{ result.team }}</small></div></div><strong class="font-display text-lg">{{ result.points }} <small class="font-sans text-[8px] text-zinc-500">очок</small></strong></div>
      <p v-if="!race.results.length" class="border-t border-white/10 px-5 py-5 text-center text-xs text-zinc-400 sm:px-7">У Jolpica немає пілотів з нарахованими очками для цього етапу.</p>
    </template>
  </section>
</template>
