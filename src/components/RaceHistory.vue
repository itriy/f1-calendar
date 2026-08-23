<script setup>
import { computed, ref } from 'vue'
import TeamBadge from './TeamBadge.vue'
import WikiLink from './WikiLink.vue'

const props = defineProps({ races: { type: Array, required: true }, season: { type: String, required: true }, seasons: { type: Array, required: true }, currentSeason: { type: [String, Number], required: true }, selectedRace: { type: Object, default: null }, detailsLoading: Boolean, detailsError: { type: String, default: '' }, loading: Boolean, error: { type: String, default: '' } })
const emit = defineEmits(['retry', 'select-season', 'select-race', 'close-race'])

const initialCount = 5
const expanded = ref(false)
const visibleRaces = computed(() => expanded.value ? props.races : props.races.slice(0, initialCount))
const formatDate = (date) => date ? new Intl.DateTimeFormat('uk-UA', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' }).format(new Date(`${date}T12:00:00Z`)) : 'Дата уточнюється'
const isCurrentSeason = computed(() => String(props.season) === String(props.currentSeason))
function selectSeason(event) {
  expanded.value = false
  emit('select-season', event.target.value)
}
function isSelected(race) {
  return String(props.selectedRace?.round) === String(race.round)
}
function toggleRace(race) {
  if (isSelected(race)) emit('close-race')
  else emit('select-race', race.round)
}
</script>

<template>
  <section class="border border-white/10 bg-f1-panel">
    <div class="flex flex-col gap-4 px-5 py-5 sm:flex-row sm:items-end sm:justify-between sm:px-7"><div><p class="mb-2 text-[10px] font-extrabold tracking-[.16em] text-zinc-400">АРХІВ · JOLPICA-F1</p><h2 class="font-display text-3xl leading-none font-extrabold uppercase">Історія етапів</h2></div><label class="text-[9px] font-extrabold tracking-[.12em] text-zinc-500">СЕЗОН<select class="mt-1 block w-full cursor-pointer border border-white/15 bg-f1-panel px-3 py-2 text-xs font-bold text-white outline-none focus:border-f1-red sm:w-36" :value="season" :disabled="loading" @change="selectSeason"><option v-for="year in seasons" :key="year" :value="year">{{ year }}</option></select></label></div>
    <p class="border-t border-white/10 px-5 py-3 text-[10px] leading-5 text-zinc-400 sm:px-7">{{ isCurrentSeason ? 'Усі вже завершені гонки сезону. Останній етап деталізовано окремою карткою вище.' : `Усі завершені гонки сезону ${season} та їхні переможці.` }}</p>
    <div v-if="loading" class="border-t border-white/10 px-5 py-7 text-sm text-zinc-400 sm:px-7">Завантажуємо історію завершених етапів…</div>
    <div v-else-if="error" class="flex items-center justify-between gap-4 border-t border-red-500/30 bg-red-950/20 px-5 py-5 text-xs text-red-100 sm:px-7"><span>{{ error }}</span><button class="shrink-0 border border-white/30 px-3 py-2 font-bold" @click="$emit('retry')">Повторити</button></div>
    <template v-else-if="races.length">
      <article v-for="race in visibleRaces" :key="race.round" class="border-t border-white/8"><button class="grid w-full cursor-pointer grid-cols-[auto_1fr_auto] items-center gap-x-3 px-5 py-4 text-left hover:bg-white/3 focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-f1-red sm:grid-cols-[58px_1fr_auto_auto] sm:gap-x-5 sm:px-7" type="button" :aria-expanded="isSelected(race)" :aria-controls="`race-details-${season}-${race.round}`" @click="toggleRace(race)"><div class="flex items-center gap-2 sm:block"><b class="font-display text-2xl leading-none text-zinc-300">{{ race.round }}</b><span class="text-lg sm:mt-1 sm:block">{{ race.flag }}</span></div><div class="min-w-0"><b class="block truncate text-xs">{{ race.name }}</b><span class="mt-1 block truncate text-[9px] text-zinc-500">{{ formatDate(race.date) }} · {{ race.circuit }}</span></div><div v-if="race.winner" class="hidden items-center gap-2 sm:flex"><TeamBadge :team="race.winner.team" /><div><span class="block text-[8px] font-extrabold tracking-[.12em] text-yellow-300">ПЕРЕМОЖЕЦЬ</span><span class="block text-xs font-bold">{{ race.winner.name }}</span><span class="block text-[9px] text-zinc-500">{{ race.winner.team }}</span></div></div><span v-else class="hidden text-[10px] text-zinc-500 sm:block">Переможця не вказано</span><span class="font-display text-xl text-f1-red" aria-hidden="true">{{ isSelected(race) ? '−' : '+' }}</span><div v-if="race.winner" class="col-span-3 mt-3 flex items-center gap-2 border-t border-white/8 pt-3 sm:hidden"><TeamBadge :team="race.winner.team" /><div><span class="block text-[8px] font-extrabold tracking-[.12em] text-yellow-300">ПЕРЕМОЖЕЦЬ</span><span class="block text-xs font-bold">{{ race.winner.name }}</span><span class="block text-[9px] text-zinc-500">{{ race.winner.team }}</span></div></div></button><div v-if="isSelected(race)" :id="`race-details-${season}-${race.round}`" class="border-t border-white/8 bg-black/15 px-5 py-4 sm:px-7"><p class="mb-3 text-[9px] font-extrabold tracking-[.12em] text-zinc-500">ПОДІУМ · ВІДСТАВАННЯ ВІД ПЕРЕМОЖЦЯ</p><p v-if="detailsLoading" class="text-xs text-zinc-400">Завантажуємо класифікацію етапу…</p><div v-else-if="detailsError" class="flex items-center justify-between gap-4 text-xs text-red-100"><span>{{ detailsError }}</span><button class="cursor-pointer border border-white/30 px-3 py-2 font-bold" type="button" @click="emit('select-race', race.round)">Повторити</button></div><div v-else-if="selectedRace?.results?.length" class="grid gap-2 sm:grid-cols-3"><div v-for="result in selectedRace.results" :key="`${result.position}-${result.name}`" class="flex items-center gap-3 border border-white/8 bg-white/3 p-3"><b class="font-display text-xl" :class="{ 'text-yellow-300': result.position === '1', 'text-zinc-300': result.position === '2', 'text-amber-700': result.position === '3' }">{{ result.position }}</b><TeamBadge :team="result.team" /><div class="min-w-0 flex-1"><WikiLink :url="result.url" :label="result.name" class-name="block truncate text-xs font-bold hover:text-f1-red" /><WikiLink :url="result.teamUrl" :label="result.team" class-name="block truncate text-[9px] text-zinc-500 hover:text-white" /><span class="mt-1 block text-[8px] font-extrabold tracking-[.1em] text-zinc-500">ВІДСТАВАННЯ</span><small class="block text-[10px] text-zinc-300">{{ result.gap }}</small></div></div></div><p v-else class="text-xs text-zinc-400">Класифікація етапу недоступна.</p></div></article>
      <div v-if="races.length > initialCount" class="border-t border-white/10 px-5 py-4 text-center sm:px-7"><button class="cursor-pointer text-[10px] font-extrabold tracking-[.12em] text-f1-red underline-offset-4 hover:underline focus-visible:rounded-sm focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-f1-red" @click="expanded = !expanded">{{ expanded ? 'ЗГОРНУТИ АРХІВ' : `ПОКАЗАТИ ЩЕ ${races.length - initialCount}` }}</button></div>
    </template>
    <p v-else class="border-t border-white/10 px-5 py-7 text-center text-xs text-zinc-400 sm:px-7">{{ isCurrentSeason ? 'Завершених етапів у поточному сезоні поки немає.' : `Для сезону ${season} завершених етапів не знайдено.` }}</p>
  </section>
</template>
