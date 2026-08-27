<script setup lang="ts">
import { ref } from "vue";
import { useI18n } from "vue-i18n";
import { searchF1, type F1SearchResult } from "@/features/f1-search/api/f1Search";

const { t } = useI18n();
const query = ref("");
const loading = ref(false);
const error = ref("");
const result = ref<F1SearchResult | null>(null);

async function submit() {
  const value = query.value.trim();
  if (value.length < 3) {
    error.value = t("aiSearch.validation");
    return;
  }

  loading.value = true;
  error.value = "";
  result.value = null;
  try {
    result.value = await searchF1(value);
  } catch (cause) {
    error.value = cause instanceof Error ? cause.message : t("aiSearch.error");
  } finally {
    loading.value = false;
  }
}
</script>

<template>
  <section id="ai-search" class="border border-white/10 bg-f1-panel">
    <div class="px-5 py-5 sm:px-7">
      <p class="mb-2 text-[12px] font-extrabold tracking-[.16em] text-zinc-400">
        {{ t("aiSearch.eyebrow") }}
      </p>
      <h2 class="font-display text-3xl leading-none font-extrabold uppercase">
        {{ t("aiSearch.title") }}
      </h2>
      <p class="mt-3 max-w-2xl text-xs leading-5 text-zinc-400">
        {{ t("aiSearch.description") }}
      </p>
    </div>

    <form
      class="flex gap-2 border-y border-white/10 p-4 sm:px-7"
      @submit.prevent="submit"
    >
      <label class="sr-only" for="ai-search-query">{{
        t("aiSearch.label")
      }}</label>
      <input
        id="ai-search-query"
        v-model="query"
        class="min-w-0 flex-1 border border-white/15 bg-black/20 px-3 py-2.5 text-xs text-white outline-none placeholder:text-zinc-500 focus:border-f1-red"
        type="search"
        :placeholder="t('aiSearch.placeholder')"
        :disabled="loading"
        maxlength="400"
      />
      <button
        class="shrink-0 bg-f1-red px-4 py-2 text-xs font-extrabold text-white disabled:cursor-wait disabled:opacity-60"
        type="submit"
        :disabled="loading"
      >
        {{ loading ? t("aiSearch.loading") : t("aiSearch.submit") }}
      </button>
    </form>

    <p
      v-if="error"
      class="border-b border-red-500/30 bg-red-950/20 px-5 py-4 text-xs text-red-100 sm:px-7"
      role="alert"
    >
      {{ error }}
    </p>
    <p
      v-else-if="loading"
      class="border-b border-white/10 px-5 py-4 text-xs text-zinc-400 sm:px-7"
      aria-live="polite"
    >
      {{ t("aiSearch.loading") }}
    </p>
    <div
      v-else-if="result"
      class="grid gap-px bg-white/10 lg:grid-cols-[1.35fr_.65fr]"
    >
      <article class="bg-f1-panel px-5 py-5 sm:px-7">
        <h3
          class="mb-3 text-[12px] font-extrabold tracking-[.14em] text-f1-red"
        >
          {{ t("aiSearch.answer") }}
        </h3>
        <p class="whitespace-pre-line text-sm leading-6 text-zinc-200">
          {{ result.answer }}
        </p>
        <div
          v-if="result.sources.length"
          class="mt-5 border-t border-white/10 pt-4"
        >
          <h3
            class="mb-2 text-[12px] font-extrabold tracking-[.14em] text-zinc-500"
          >
            {{ t("aiSearch.sources") }}
          </h3>
          <ul class="space-y-2">
            <li v-for="source in result.sources" :key="source.url">
              <a
                class="text-xs text-zinc-300 hover:text-f1-red hover:underline"
                :href="source.url"
                target="_blank"
                rel="noopener noreferrer"
              >{{ source.title }}
                <small class="text-zinc-500">{{ source.domain }}</small></a>
            </li>
          </ul>
        </div>
      </article>
      <aside v-if="result.wikipedia" class="bg-f1-panel px-5 py-5 sm:px-7">
        <h3
          class="mb-3 text-[12px] font-extrabold tracking-[.14em] text-zinc-500"
        >
          {{ t("aiSearch.wikipedia") }}
        </h3>
        <a
          class="text-sm font-bold hover:text-f1-red hover:underline"
          :href="result.wikipedia.url"
          target="_blank"
          rel="noopener noreferrer"
        >{{ result.wikipedia.title }}</a>
        <p
          v-if="result.wikipedia.description"
          class="mt-2 text-xs leading-5 text-zinc-400"
        >
          {{ result.wikipedia.description }}
        </p>
      </aside>
    </div>
  </section>
</template>
