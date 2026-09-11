<script setup lang="ts">
import { computed, ref, watch } from "vue";
import { useI18n } from "vue-i18n";
import {
  eventKind,
  loadRaceEvents,
  type RaceEvent,
  type RaceEvents,
} from "@/entities/race/api/raceEvents";
import { formatDateTime } from "@/shared/lib/dateTime";

const props = defineProps<{ season: string; date: string }>();
const { t, locale } = useI18n();
const result = ref<RaceEvents | null>(null);
const loading = ref(true);
const failed = ref(false);
const expanded = ref(false);
const attempt = ref(0);
const eventGroups = computed(() =>
  result.value
    ? [
        result.value.events.slice(0, 12),
        expanded.value ? result.value.events.slice(12) : [],
      ]
    : [],
);
const icons: Record<string, string> = {
  leaderChange: "🏎️",
  pit: "🛞",
  yellow: "🟡",
  doubleYellow: "🟡",
  green: "🟢",
  clear: "🟢",
  red: "🔴",
  finished: "🏁",
  safetyCar: "🚗",
  safetyCarEnding: "🚗",
  vsc: "🚗",
  vscEnding: "🚗",
  original: "📋",
};
function label(event: RaceEvent) {
  const kind = eventKind(event);
  if (kind === "leaderChange")
    return t("raceEvents.leaderChange", {
      driver: event.driver || "",
      previous: event.previousDriver || "",
    });
  if (kind === "pit")
    return t("raceEvents.pit", { driver: event.driver || "" });
  if (kind === "original") return event.message;
  const text = t(`raceEvents.${kind}`);
  return event.scope === "Sector"
    ? `${text} · ${t("raceEvents.sector", { sector: event.sector ?? "" })}`
    : text;
}
const time = (date: string) =>
  formatDateTime(new Date(date), locale.value, {
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
    timeZone: "UTC",
  });
watch(
  () => [props.season, props.date, attempt.value],
  async (_, __, onCleanup) => {
    const controller = new AbortController();
    onCleanup(() => controller.abort());
    result.value = null;
    loading.value = true;
    failed.value = false;
    expanded.value = false;
    try {
      const data = await loadRaceEvents(
        props.season,
        props.date,
        controller.signal,
      );
      if (!controller.signal.aborted) result.value = data;
    } catch {
      if (!controller.signal.aborted) failed.value = true;
    } finally {
      if (!controller.signal.aborted) loading.value = false;
    }
  },
  { immediate: true },
);
</script>

<template>
  <section
    class="mt-5 border-t border-white/8 pt-4"
    :aria-label="t('raceEvents.title')"
  >
    <div class="mb-3 flex items-baseline justify-between gap-3">
      <h3 class="text-[12px] font-extrabold tracking-[.12em] text-zinc-100">
        {{ t("raceEvents.title") }}
      </h3>
      <a
        href="https://openf1.org/"
        target="_blank"
        rel="noopener noreferrer"
        class="text-[11px] font-bold text-f1-red hover:underline"
      >OpenF1</a>
    </div>
    <p v-if="loading" role="status" class="text-xs text-zinc-400">
      {{ t("raceEvents.loading") }}
    </p>
    <div v-else-if="failed" class="text-xs text-zinc-400" role="status">
      <p>{{ t("raceEvents.error") }}</p>
      <button
        type="button"
        class="mt-2 cursor-pointer text-f1-red hover:underline"
        @click="attempt++"
      >
        {{ t("common.retry") }}
      </button>
    </div>
    <template v-else-if="result?.events.length">
      <p class="mb-3 text-[14px] text-zinc-400">{{ t("raceEvents.note") }}</p>
      <p
        v-if="result.partial"
        class="mb-3 text-xs text-amber-200"
        role="status"
      >
        {{ t("raceEvents.partial") }}
        <button type="button" class="ml-2 underline" @click="attempt++">
          {{ t("common.retry") }}
        </button>
      </p>
      <template v-for="(events, groupIndex) in eventGroups" :key="groupIndex">
        <ol
          v-if="events.length"
          class="grid gap-1"
          :class="{ 'mt-3': groupIndex > 0 }"
          :start="groupIndex > 0 ? 13 : undefined"
        >
          <li
            v-for="(event, index) in events"
            :key="`${event.date}-${index}`"
            class="flex items-start gap-3 border-b border-white/8 py-2 text-xs"
          >
            <time
              :datetime="event.date"
              class="shrink-0 font-mono text-zinc-400"
            >{{ time(event.date) }}</time>
            <span aria-hidden="true">{{
              icons[eventKind(event) || "original"]
            }}</span>
            <div class="min-w-0 break-words">
              <p :lang="eventKind(event) === 'original' ? 'en' : undefined">
                {{ label(event) }}
              </p>
              <p
                v-if="event.stopDuration != null"
                class="mt-1 text-[13px] text-zinc-400"
              >
                {{
                  t("raceEvents.stopDuration", { seconds: event.stopDuration })
                }}
              </p>
              <p
                v-if="event.laneDuration != null"
                class="mt-1 text-[13px] text-zinc-400"
              >
                {{
                  t("raceEvents.laneDuration", { seconds: event.laneDuration })
                }}
              </p>
              <span
                v-if="event.lap_number != null"
                class="mt-1 block text-[13px] text-zinc-500"
              >{{ t("raceEvents.lap", { lap: event.lap_number }) }}</span>
            </div>
          </li>
        </ol>
        <button
          v-if="groupIndex === 0 && result.events.length > 12"
          type="button"
          class="mt-3 cursor-pointer text-xs font-bold text-f1-red hover:underline"
          @click="expanded = !expanded"
        >
          {{ t(expanded ? "raceEvents.less" : "raceEvents.more") }}
        </button>
      </template>
    </template>
    <div v-else class="text-xs text-zinc-400">
      <p>
        {{
          t(
            `raceEvents.${result?.status === "ready" ? "empty" : result?.status || "unavailable"}`,
          )
        }}
      </p>
      <button
        v-if="result?.status !== 'unsupported'"
        type="button"
        class="mt-2 cursor-pointer text-f1-red hover:underline"
        @click="attempt++"
      >
        {{ t("common.retry") }}
      </button>
    </div>
  </section>
</template>
