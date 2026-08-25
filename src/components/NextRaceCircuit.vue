<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, ref, watch } from 'vue'
import { autoUpdate, computePosition, flip, offset, shift } from '@floating-ui/dom'
import type { JolpicaRace, RaceSession } from '../types/f1'
import { loadCircuitMedia, type CircuitMedia } from '../services/circuitWikipedia'
import { useI18n } from 'vue-i18n'

const props = defineProps<{ race: JolpicaRace }>()
const { t } = useI18n()
const expanded = ref(false); const media = ref<CircuitMedia>(null); const mediaLoading = ref(false); const mediaUnavailable = ref(false); const previewOpen = ref(false)
const previewTrigger = ref<HTMLElement | null>(null); const previewPopover = ref<HTMLElement | null>(null); const previewStyle = ref<Record<string, string>>({})
let cleanupPositioning: (() => void) | undefined
const panelId = 'next-race-circuit-details'
const circuit = computed(() => props.race.Circuit)
const sessions = computed(() => ([
  [t('circuit.sessionFp1'), props.race.FirstPractice], [t('circuit.sessionFp2'), props.race.SecondPractice], [t('circuit.sessionFp3'), props.race.ThirdPractice], [t('circuit.sessionQualifying'), props.race.Qualifying], [t('circuit.sessionSprintQualifying'), props.race.SprintQualifying], [t('circuit.sessionSprint'), props.race.Sprint]
] as Array<[string, RaceSession | undefined]>).filter(([, session]) => Boolean(session?.date || session?.time)))
function formatSession(session: RaceSession) {
  if (!session.date || !session.time) return t('circuit.timeUnknown')
  const time = session.time.endsWith('Z') ? session.time : `${session.time}Z`
  const value = new Date(`${session.date}T${time}`)
  return Number.isNaN(value.getTime()) ? t('circuit.timeUnknown') : new Intl.DateTimeFormat('uk-UA', { weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }).format(value)
}
function togglePreview() { if (media.value) previewOpen.value = !previewOpen.value }
function closePreview() { previewOpen.value = false }
function closePreviewOnBlur(event: FocusEvent) {
  const current = event.currentTarget as HTMLElement
  if (!current.contains(event.relatedTarget as Node | null)) closePreview()
}
async function startPositioning() {
  await nextTick()
  if (!previewTrigger.value || !previewPopover.value) return
  const update = async () => {
    if (!previewTrigger.value || !previewPopover.value) return
    const { x, y, strategy } = await computePosition(previewTrigger.value, previewPopover.value, { placement: 'bottom-start', strategy: 'fixed', middleware: [offset(8), flip(), shift({ padding: 12 })] })
    previewStyle.value = { position: strategy, left: `${x}px`, top: `${y}px` }
  }
  cleanupPositioning = autoUpdate(previewTrigger.value, previewPopover.value, update)
}
watch(previewOpen, (open) => { cleanupPositioning?.(); cleanupPositioning = undefined; if (open) void startPositioning() })
onBeforeUnmount(() => cleanupPositioning?.())
async function toggle() {
  expanded.value = !expanded.value
  if (!expanded.value || media.value || mediaUnavailable.value || mediaLoading.value) return
  mediaLoading.value = true
  try { media.value = await loadCircuitMedia(circuit.value); mediaUnavailable.value = !media.value } catch { mediaUnavailable.value = true } finally { mediaLoading.value = false }
}
watch(() => props.race.round, () => { expanded.value = false; media.value = null; mediaUnavailable.value = false; previewOpen.value = false })
</script>

<template>
  <div class="mt-2 border-t border-white/15 pt-2">
    <button type="button" class="flex w-full items-center justify-between gap-3 text-left text-xs font-bold text-white underline decoration-white/50 underline-offset-4 hover:decoration-white" :aria-expanded="expanded" :aria-controls="panelId" @click="toggle"><span>{{ t('circuit.about') }}</span><span aria-hidden="true">{{ expanded ? '−' : '+' }}</span></button>
    <div v-if="expanded" :id="panelId" class="mt-3 grid gap-3 border-t border-white/20 pt-3 text-xs text-white/85 sm:min-w-92">
      <div class="grid grid-cols-[96px_1fr] gap-3"><div @mouseenter="media && (previewOpen = true)" @mouseleave="closePreview" @focusout="closePreviewOnBlur"><button v-if="media" ref="previewTrigger" type="button" class="flex h-18 w-full items-center justify-center overflow-hidden border border-zinc-300 bg-white p-1 text-left shadow-sm focus:outline-2 focus:outline-offset-2 focus:outline-white" :aria-expanded="previewOpen" aria-controls="circuit-media-preview" :aria-label="t('circuit.previewTrigger', { circuit: circuit?.circuitName || t('circuit.unknownCircuit') })" @click="togglePreview" @keydown.esc.prevent="closePreview"><img :src="media.imageUrl" :alt="t('circuit.imageAlt', { circuit: circuit?.circuitName || t('circuit.unknownCircuit') })" class="size-full object-contain" loading="lazy"></button><div v-else class="flex h-18 items-center justify-center border border-zinc-300 bg-white p-1 text-2xl shadow-sm" role="img" :aria-label="t('circuit.imageUnavailable')"><span v-if="mediaLoading" class="text-[12px] text-zinc-600">{{ t('circuit.loading') }}</span><span v-else aria-hidden="true">🏁</span></div><div v-if="media && previewOpen" id="circuit-media-preview" ref="previewPopover" role="tooltip" :style="previewStyle" class="z-30 w-[min(19rem,calc(100vw-2rem))] border border-zinc-300 bg-white p-2 shadow-xl"><img :src="media.imageUrl" :alt="t('circuit.previewImageAlt', { circuit: circuit?.circuitName || t('circuit.unknownCircuit') })" class="max-h-72 w-full object-contain" loading="lazy"><p class="mt-1 text-[12px] text-zinc-700">{{ t('circuit.previewHint') }}</p></div></div><div><p class="font-bold">{{ circuit?.circuitName || t('circuit.unknownCircuit') }}</p><p class="mt-1 text-white/70">{{ circuit?.Location?.locality || t('circuit.unknownCity') }}<span v-if="circuit?.Location?.country"> · {{ circuit.Location.country }}</span></p><p v-if="circuit?.Location?.lat && circuit?.Location?.long" class="mt-1 text-[12px] text-white/60">{{ t('circuit.coordinates', { lat: circuit.Location.lat, long: circuit.Location.long }) }}</p><a v-if="media" class="mt-2 inline-block text-[12px] underline underline-offset-2 hover:text-white" :href="media.sourceUrl" target="_blank" rel="noopener noreferrer">{{ t('circuit.sourceMedia') }} <span aria-hidden="true">↗</span></a><a v-else-if="circuit?.url" class="mt-2 inline-block text-[12px] underline underline-offset-2 hover:text-white" :href="circuit.url" target="_blank" rel="noopener noreferrer">{{ t('circuit.sourceWikipedia') }} <span aria-hidden="true">↗</span></a></div></div>
      <div v-if="sessions.length" class="border-t border-white/15 pt-3"><p class="mb-2 text-[12px] font-extrabold tracking-[.12em] text-white/65">{{ t('circuit.sessions') }}</p><ul class="grid gap-1.5"><li v-for="[label, session] in sessions" :key="label" class="flex justify-between gap-3"><span>{{ label }}</span><time class="text-right text-white/70">{{ formatSession(session!) }}</time></li></ul></div>
    </div>
  </div>
</template>
