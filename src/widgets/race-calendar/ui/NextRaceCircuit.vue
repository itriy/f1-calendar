<script setup lang="ts">
import {
  computed,
  defineAsyncComponent,
  nextTick,
  onBeforeUnmount,
  ref,
  watch,
} from "vue";
import type { JolpicaRace } from "@/entities/race/model/types";
import type { CircuitMedia } from "@/entities/race/api/circuitWikipedia";
import { useI18n } from "vue-i18n";

const WeekendDetails = defineAsyncComponent(
  () => import("./WeekendDetails.vue"),
);

const props = defineProps<{ race: JolpicaRace; forceOpen?: boolean }>();
const { t } = useI18n();
const expanded = ref(false);
const media = ref<CircuitMedia>(null);
const mediaLoading = ref(false);
const mediaUnavailable = ref(false);
const previewOpen = ref(false);
const previewTrigger = ref<HTMLElement | null>(null);
const previewPopover = ref<HTMLElement | null>(null);
const previewStyle = ref<Record<string, string>>({});
let cleanupPositioning: (() => void) | undefined;
const panelId = "next-race-circuit-details";
const circuit = computed(() => props.race.Circuit);
function togglePreview() {
  if (media.value) previewOpen.value = !previewOpen.value;
}
function closePreview() {
  previewOpen.value = false;
}
function closePreviewOnBlur(event: FocusEvent) {
  const current = event.currentTarget as HTMLElement;
  if (!current.contains(event.relatedTarget as Node | null)) closePreview();
}
async function startPositioning() {
  await nextTick();
  if (!previewTrigger.value || !previewPopover.value) return;
  const { autoUpdate, computePosition, flip, offset, shift } =
    await import("@floating-ui/dom");
  if (!previewTrigger.value || !previewPopover.value || !previewOpen.value)
    return;
  const update = async () => {
    if (!previewTrigger.value || !previewPopover.value) return;
    const { x, y, strategy } = await computePosition(
      previewTrigger.value,
      previewPopover.value,
      {
        placement: "bottom-start",
        strategy: "fixed",
        middleware: [offset(8), flip(), shift({ padding: 12 })],
      },
    );
    previewStyle.value = { position: strategy, left: `${x}px`, top: `${y}px` };
  };
  cleanupPositioning = autoUpdate(
    previewTrigger.value,
    previewPopover.value,
    update,
  );
}
watch(previewOpen, (open) => {
  cleanupPositioning?.();
  cleanupPositioning = undefined;
  if (open) void startPositioning();
});
onBeforeUnmount(() => cleanupPositioning?.());
async function toggle() {
  expanded.value = !expanded.value;
  if (
    !expanded.value ||
    media.value ||
    mediaUnavailable.value ||
    mediaLoading.value
  )
    return;
  mediaLoading.value = true;
  try {
    const { loadCircuitMedia } =
      await import("@/entities/race/api/circuitWikipedia");
    media.value = await loadCircuitMedia(circuit.value);
    mediaUnavailable.value = !media.value;
  } catch {
    mediaUnavailable.value = true;
  } finally {
    mediaLoading.value = false;
  }
}
watch(
  () => props.forceOpen,
  (forceOpen) => {
    if (forceOpen && !expanded.value) void toggle();
  },
  { immediate: true },
);
watch(
  () => props.race.round,
  () => {
    expanded.value = false;
    media.value = null;
    mediaUnavailable.value = false;
    previewOpen.value = false;
  },
);
</script>

<template>
  <div class="mt-2 border-t border-white/15 pt-2">
    <button
      type="button"
      class="flex w-full items-center justify-between gap-3 text-left text-xs font-bold text-white decoration-white/50 underline-offset-4 hover:decoration-white cursor-pointer"
      :aria-expanded="expanded"
      :aria-controls="panelId"
      @click="toggle"
    >
      <span class="underline">{{ t("circuit.about") }}</span>
      <span
        class="no-underline text-2xl leading-none font-normal"
        aria-hidden="true"
      >
        {{ expanded ? "−" : "+" }}
      </span>
    </button>
    <div
      v-if="expanded"
      :id="panelId"
      class="mt-3 grid gap-3 border-t border-white/20 pt-3 text-xs text-white/85 sm:min-w-92"
    >
      <div class="grid grid-cols-[96px_1fr] gap-3">
        <div
          @mouseenter="media && (previewOpen = true)"
          @mouseleave="closePreview"
          @focusout="closePreviewOnBlur"
        >
          <button
            v-if="media"
            ref="previewTrigger"
            type="button"
            class="flex h-18 w-full items-center justify-center overflow-hidden border border-zinc-300 bg-white p-1 text-left shadow-sm focus:outline-2 focus:outline-offset-2 focus:outline-white"
            :aria-expanded="previewOpen"
            aria-controls="circuit-media-preview"
            :aria-label="
              t('circuit.previewTrigger', {
                circuit: circuit?.circuitName || t('circuit.unknownCircuit'),
              })
            "
            @click="togglePreview"
            @keydown.esc.prevent="closePreview"
          >
            <img
              :src="media.imageUrl"
              :alt="
                t('circuit.imageAlt', {
                  circuit: circuit?.circuitName || t('circuit.unknownCircuit'),
                })
              "
              class="size-full object-contain"
              loading="lazy"
            />
          </button>
          <div
            v-else
            class="flex h-18 items-center justify-center border border-zinc-300 bg-white p-1 text-2xl shadow-sm"
            role="img"
            :aria-label="t('circuit.imageUnavailable')"
          >
            <span v-if="mediaLoading" class="text-[12px] text-zinc-600">
              {{ t("circuit.loading") }}
            </span>
            <span v-else aria-hidden="true">🏁</span>
          </div>
          <div
            v-if="media && previewOpen"
            id="circuit-media-preview"
            ref="previewPopover"
            role="tooltip"
            :style="previewStyle"
            class="z-30 w-[min(19rem,calc(100vw-2rem))] border border-zinc-300 bg-white p-2 shadow-xl"
          >
            <img
              :src="media.imageUrl"
              :alt="
                t('circuit.previewImageAlt', {
                  circuit: circuit?.circuitName || t('circuit.unknownCircuit'),
                })
              "
              class="max-h-72 w-full object-contain"
              loading="lazy"
            />
            <p class="mt-1 text-[12px] text-zinc-700">
              {{ t("circuit.previewHint") }}
            </p>
          </div>
        </div>
        <div>
          <p class="font-bold">
            {{ circuit?.circuitName || t("circuit.unknownCircuit") }}
          </p>
          <p class="mt-1 text-white/70">
            {{ circuit?.Location?.locality || t("circuit.unknownCity") }}
            <span v-if="circuit?.Location?.country">
              · {{ circuit.Location.country }}
            </span>
          </p>
          <p
            v-if="circuit?.Location?.lat && circuit?.Location?.long"
            class="mt-1 text-[12px] text-white/60"
          >
            {{
              t("circuit.coordinates", {
                lat: circuit.Location.lat,
                long: circuit.Location.long,
              })
            }}
          </p>
          <a
            v-if="media"
            class="mt-2 inline-block text-[12px] underline underline-offset-2 hover:text-white"
            :href="media.sourceUrl"
            target="_blank"
            rel="noopener noreferrer"
          >{{ t("circuit.sourceMedia") }} <span aria-hidden="true">↗</span></a><a
            v-else-if="circuit?.url"
            class="mt-2 inline-block text-[12px] underline underline-offset-2 hover:text-white"
            :href="circuit.url"
            target="_blank"
            rel="noopener noreferrer"
          >{{ t("circuit.sourceWikipedia") }}
            <span aria-hidden="true">↗</span></a>
        </div>
      </div>
      <WeekendDetails class="min-w-0" :race="race" />
    </div>
  </div>
</template>
