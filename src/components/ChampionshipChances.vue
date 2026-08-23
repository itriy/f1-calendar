<script setup>
import WikiLink from './WikiLink.vue'

defineProps({ contenders: { type: Array, required: true }, remainingRounds: { type: Number, required: true }, maxPointsPerRace: { type: Number, required: true } })
</script>

<template>
  <section class="border border-white/10 bg-f1-panel">
    <div class="px-5 py-5 sm:px-7"><p class="mb-2 text-[10px] font-extrabold tracking-[.16em] text-zinc-400">МОДЕЛЬ · JOLPICA-F1</p><h2 class="font-display text-3xl leading-none font-extrabold uppercase">Шанси на титул</h2></div>
    <template v-if="remainingRounds > 0 && contenders.length">
      <p class="border-y border-white/10 px-5 py-3 text-[10px] leading-5 text-zinc-400 sm:px-7">Детермінована оцінка застосунку: поточний відрив, {{ remainingRounds }} {{ remainingRounds === 1 ? 'етап' : 'етапів' }} та максимум {{ maxPointsPerRace }} очок за гонку. Це не офіційний прогноз і не букмекерські коефіцієнти.</p>
      <div v-for="item in contenders" :key="item.code" class="grid grid-cols-[1fr_auto] items-center gap-4 border-b border-white/8 px-5 py-3 sm:px-7"><div><div class="mb-1 flex justify-between gap-3 text-xs"><WikiLink :url="item.url" :label="item.name" class-name="font-bold hover:text-f1-red hover:underline" /><span class="text-zinc-500">−{{ item.gap }} очок</span></div><div class="h-1.5 overflow-hidden bg-white/10"><div class="h-full bg-f1-red" :style="{ width: `${item.estimate}%` }"></div></div></div><strong class="font-display text-2xl">{{ item.estimate }}<small class="font-sans text-[9px] text-zinc-500">%</small></strong></div>
    </template>
    <p v-else-if="remainingRounds === 0" class="p-6 text-center text-xs text-zinc-400">Сезон завершено — модель шансів більше не розраховується.</p>
    <p v-else class="p-6 text-center text-xs text-zinc-400">Недостатньо даних для розрахунку моделі.</p>
  </section>
</template>
