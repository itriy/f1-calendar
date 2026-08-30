<script setup lang="ts">
import { computed, onBeforeUnmount, ref, watch } from "vue";
import { useI18n } from "vue-i18n";
import {
  loadFormula1Videos,
  officialYoutubeThumbnailUrl,
  officialYoutubeWatchUrl,
  type Formula1Video,
} from "@/entities/race/api/formula1Videos";

const props = defineProps<{
  season: string | number;
  round: string | number;
  raceName: string;
}>();
const { t } = useI18n();
let controller: AbortController | undefined;
const sourceVideos = ref<Formula1Video[]>([]);
const loading = ref(true);
const expanded = ref(false);
const videos = computed(() =>
  sourceVideos.value
    .map((video) => ({
      ...video,
      thumbnailUrl: officialYoutubeThumbnailUrl(video.id),
      watchUrl: officialYoutubeWatchUrl(video.id),
    }))
    .filter(
      (
        video,
      ): video is typeof video & {
        thumbnailUrl: string;
        watchUrl: string;
      } => Boolean(video.thumbnailUrl && video.watchUrl),
    ),
);

watch(
  () => [props.season, props.round, props.raceName],
  async () => {
    controller?.abort();
    controller = new AbortController();
    loading.value = true;
    expanded.value = false;
    sourceVideos.value = [];
    try {
      sourceVideos.value = await loadFormula1Videos(
        props.season,
        props.round,
        props.raceName,
        controller.signal,
      );
    } finally {
      if (!controller.signal.aborted) loading.value = false;
    }
  },
  { immediate: true },
);

onBeforeUnmount(() => controller?.abort());
</script>

<template>
  <section
    class="mt-5 border-t border-white/8 pt-4"
    :aria-label="t('history.videosTitle')"
  >
    <div class="mb-3 flex items-baseline justify-between gap-3">
      <p class="text-[12px] font-extrabold tracking-[.12em] text-zinc-500">
        {{ t("history.videosTitle") }}
      </p>
      <a
        class="text-[11px] font-bold text-f1-red hover:underline"
        href="https://www.youtube.com/@Formula1"
        target="_blank"
        rel="noopener noreferrer"
      >{{ t("history.youtubeChannel") }}</a>
    </div>
    <div v-if="videos.length" class="grid gap-4 lg:grid-cols-2">
      <article
        v-for="video in expanded ? videos : videos.slice(0, 4)"
        :key="video.id"
        class="overflow-hidden border border-white/8 bg-black/25"
      >
        <a
          class="group relative block aspect-video bg-black"
          :href="video.watchUrl"
          target="_blank"
          rel="noopener noreferrer"
          :aria-label="`${t('history.watchOnYoutube')}: ${video.title}`"
        >
          <img
            class="size-full object-cover opacity-80 transition-opacity group-hover:opacity-100"
            :src="video.thumbnailUrl"
            :alt="video.title"
            loading="lazy"
          />
          <span
            class="absolute inset-0 flex items-center justify-center bg-black/20"
            aria-hidden="true"
          >
            <span
              class="bg-f1-red px-4 py-2 text-[11px] font-extrabold tracking-[.08em] text-white"
            >
              {{ t("history.watchOnYoutube") }}
            </span>
          </span>
        </a>
        <p class="p-3 text-xs font-bold">
          {{
            video.kind === "race-highlights"
              ? t("history.raceHighlights")
              : video.kind === "qualifying-highlights"
                ? t("history.qualifyingHighlights")
                : video.kind === "sprint-highlights"
                  ? t("history.sprintHighlights")
                  : t("history.raceMoment")
          }}
        </p>
      </article>
    </div>
    <button
      v-if="videos.length > 4"
      class="mt-4 cursor-pointer text-[11px] font-extrabold tracking-[.1em] text-f1-red underline-offset-4 hover:underline"
      type="button"
      @click="expanded = !expanded"
    >
      {{
        expanded
          ? t("history.videosCollapse")
          : t("history.videosShowAll", { count: videos.length })
      }}
    </button>
    <div
      v-else-if="loading"
      class="flex items-center gap-3 py-4 text-xs leading-5 text-zinc-400"
      role="status"
      aria-live="polite"
    >
      <span
        class="size-5 shrink-0 animate-spin rounded-full border-2 border-white/20 border-t-f1-red"
        aria-hidden="true"
      />
      {{ t("history.videosLoading") }}
    </div>
    <p v-else class="text-xs leading-5 text-zinc-400">
      {{ t("history.videosUnavailable", { race: raceName }) }}
    </p>
  </section>
</template>
