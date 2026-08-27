<script setup lang="ts">
import { computed, ref } from "vue";
import { useI18n } from "vue-i18n";
import type { FeedItem } from "@/entities/feed/model/types";

const props = defineProps<{
  items: FeedItem[];
  loading: boolean;
  error: string;
}>();
defineEmits<{ retry: [] }>();
const { t } = useI18n();
const filter = ref<"all" | "news" | "event">("all");
const visibleItems = computed(() =>
  filter.value === "all"
    ? props.items
    : props.items.filter((item) => item.type === filter.value),
);
const formatTime = (value: string) =>
  new Intl.DateTimeFormat("uk-UA", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
</script>

<template>
  <section
    id="feed"
    class="border-t border-white/10 pt-10"
    aria-labelledby="feed-title"
  >
    <div class="mb-5 flex flex-wrap items-end justify-between gap-3">
      <div>
        <p class="mb-1 text-[11px] font-extrabold tracking-[.14em] text-f1-red">
          {{ t("feed.eyebrow") }}
        </p>
        <h2
          id="feed-title"
          class="font-display text-4xl font-extrabold uppercase"
        >
          {{ t("feed.title") }}
        </h2>
      </div>
      <div
        class="flex border border-white/15 text-[11px] font-bold"
        role="tablist"
        :aria-label="t('feed.filters')"
      >
        <button
          v-for="option in ['all', 'news', 'event']"
          :key="option"
          class="px-3 py-2 uppercase"
          :class="
            filter === option
              ? 'bg-f1-red text-white'
              : 'text-zinc-400 hover:text-white'
          "
          role="tab"
          :aria-selected="filter === option"
          @click="filter = option as typeof filter"
        >
          {{ t(`feed.${option}`) }}
        </button>
      </div>
    </div>
    <div
      v-if="loading"
      class="border border-white/10 bg-f1-panel p-5 text-sm text-zinc-400"
    >
      {{ t("feed.loading") }}
    </div>
    <div
      v-else-if="error"
      class="flex items-center justify-between gap-4 border border-red-500/40 bg-red-950/30 p-5 text-sm text-red-100"
    >
      <span>{{ error }}</span><button
        class="border border-white/30 px-3 py-2 text-xs font-bold"
        @click="$emit('retry')"
      >
        {{ t("common.retry") }}
      </button>
    </div>
    <div
      v-else-if="!visibleItems.length"
      class="border border-white/10 bg-f1-panel p-5 text-sm text-zinc-400"
    >
      {{ t("feed.empty") }}
    </div>
    <ol v-else class="grid gap-3 sm:grid-cols-2">
      <li
        v-for="item in visibleItems"
        :key="item.id"
        class="overflow-hidden border border-white/10 bg-f1-panel"
      >
        <template v-if="item.type === 'news'">
          <a
            v-if="item.imageUrl"
            class="block aspect-[16/8] overflow-hidden bg-black"
            :href="item.sourceUrl"
            target="_blank"
            rel="noopener noreferrer"
            tabindex="-1"
            aria-hidden="true"
          >
            <img
              class="size-full object-cover transition-transform duration-300 hover:scale-105"
              :src="item.imageUrl"
              alt=""
              loading="lazy"
            />
          </a>
          <div class="p-4">
            <div
              class="mb-2 flex items-center justify-between gap-3 text-[11px] font-bold tracking-wide text-zinc-400"
            >
              <span>{{ item.source }} · {{ item.language.toUpperCase() }}</span><time :datetime="item.publishedAt">{{
                formatTime(item.publishedAt)
              }}</time>
            </div>
            <h3 class="font-display text-2xl leading-none font-bold">
              {{ item.title }}
            </h3>
            <p
              v-if="item.summary || item.description"
              class="mt-3 text-xs leading-5 text-zinc-400"
              v-html="item.summary || item.description"
            />
            <a
              class="mt-3 inline-block text-[11px] font-bold text-f1-red hover:underline"
              :href="item.sourceUrl"
              target="_blank"
              rel="noopener noreferrer"
            >{{ t("feed.readSource") }} ↗</a>
          </div>
        </template>
        <template v-else>
          <div class="p-4">
            <div
              class="mb-2 flex items-center justify-between gap-3 text-[11px] font-bold tracking-wide text-f1-red"
            >
              <span>{{ t("feed.event") }}</span>
              <time :datetime="item.startsAt">
                {{ formatTime(item.startsAt) }}
              </time>
            </div>
            <h3 class="font-display text-3xl leading-none font-bold">
              {{ item.session }}
            </h3>
            <p class="mt-2 text-sm text-zinc-300">
              {{ item.raceName }} · {{ t("feed.round", { round: item.round }) }}
            </p>
          </div>
        </template>
      </li>
    </ol>
  </section>
</template>
