<script setup lang="ts">
import { useI18n } from 'vue-i18n'
defineProps({ race: { type: Object, default: null }, loading: Boolean, error: { type: String, default: '' } })
defineEmits(['retry'])
import TeamBadge from './TeamBadge.vue'
import WikiLink from './WikiLink.vue'

const { t, locale } = useI18n()
const formatDate = (date?: string) => date ? new Intl.DateTimeFormat(locale.value, { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' }).format(new Date(`${date}T12:00:00Z`)) : t('common.unknownDate')
</script>

<template>
  <section class="border border-white/10 bg-f1-panel">
    <div class="flex items-end justify-between px-5 py-5 sm:px-7"><div><p class="mb-2 text-[10px] font-extrabold tracking-[.16em] text-zinc-400">{{ t('lastRace.eyebrow') }}</p><h2 class="font-display text-3xl leading-none font-extrabold uppercase">{{ t('lastRace.title') }}</h2></div><span v-if="race" class="text-2xl">{{ race.flag }}</span></div>
    <div v-if="loading" class="border-t border-white/10 px-5 py-7 text-sm text-zinc-400 sm:px-7">{{ t('lastRace.loading') }}</div>
    <div v-else-if="error" class="flex items-center justify-between gap-4 border-t border-red-500/30 bg-red-950/20 px-5 py-5 text-xs text-red-100 sm:px-7"><span>{{ error }}</span><button class="shrink-0 border border-white/30 px-3 py-2 font-bold" @click="$emit('retry')">{{ t('common.retry') }}</button></div>
    <template v-else-if="race">
      <div class="border-t border-white/10 px-5 py-4 sm:px-7"><b class="block text-sm">{{ race.name }}</b><span class="mt-1 block text-[10px] text-zinc-400">{{ race.place }} · {{ formatDate(race.date) }}</span></div>
      <div v-if="race.results[0]" class="border-t border-yellow-300/30 bg-yellow-300/8 px-5 py-3 sm:px-7"><p class="mb-1 text-[9px] font-extrabold tracking-[.14em] text-yellow-300">{{ t('common.winner') }}</p><div class="flex items-end justify-between gap-3"><div class="flex items-center gap-2"><TeamBadge :team="race.results[0].team" /><div><WikiLink :url="race.results[0].url" :label="race.results[0].name" class-name="block text-sm hover:underline" /><WikiLink :url="race.results[0].teamUrl" :label="race.results[0].team" class-name="block text-[9px] text-zinc-400 hover:text-white hover:underline" /><small class="mt-1 block text-[9px] text-yellow-100/75">{{ t('lastRace.time', { time: race.results[0].raceTime }) }}</small></div></div><strong class="font-display text-2xl text-yellow-300">{{ race.results[0].points }} <small class="font-sans text-[8px] text-zinc-400">{{ t('common.points') }}</small></strong></div></div>
      <div class="border-t border-white/8 px-5 py-2 text-[9px] font-extrabold tracking-[.12em] text-zinc-500 sm:px-7">{{ t('lastRace.allScorers') }}</div>
      <div v-for="result in race.results" :key="`${result.position}-${result.name}`" class="grid grid-cols-[28px_minmax(0,1fr)_auto] items-center gap-3 border-t border-white/8 px-5 py-2.5 sm:px-7"><b class="font-display text-xl" :class="{ 'text-yellow-300': result.position === '1', 'text-zinc-300': result.position === '2', 'text-amber-700': result.position === '3', 'text-stone-100': !['1', '2', '3'].includes(result.position) }">{{ result.position }}</b><div class="flex min-w-0 items-center gap-2"><TeamBadge :team="result.team" /><div class="min-w-0"><WikiLink :url="result.url" :label="result.name" class-name="block truncate text-xs hover:text-f1-red hover:underline" /><WikiLink :url="result.teamUrl" :label="result.team" class-name="block truncate text-[9px] text-zinc-500 hover:text-white hover:underline" /></div></div><div class="border-l border-white/10 pl-3 text-right"><strong class="block whitespace-nowrap font-display text-lg">{{ result.points }} <small class="font-sans text-[8px] text-zinc-500">{{ t('common.points') }}</small></strong><span class="mt-0.5 block text-[7px] font-extrabold tracking-[.1em] text-zinc-500">{{ t('lastRace.gap') }}</span><small class="block whitespace-nowrap text-[9px] text-zinc-300">{{ result.gap || '—' }}</small></div></div>
      <p v-if="!race.results.length" class="border-t border-white/10 px-5 py-5 text-center text-xs text-zinc-400 sm:px-7">{{ t('lastRace.empty') }}</p>
    </template>
  </section>
</template>
