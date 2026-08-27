<script setup lang="ts">
import { onMounted, ref } from "vue";
import { useI18n } from "vue-i18n";
import { loadWatchProviders } from "../services/watchProviders";
import type { WatchProvidersResponse } from "../types/watch";

const { t } = useI18n();
const data = ref<WatchProvidersResponse | null>(null);
const loading = ref(true);
const error = ref(false);

async function load() {
  loading.value = true;
  error.value = false;
  try {
    data.value = await loadWatchProviders();
  } catch {
    error.value = true;
  } finally {
    loading.value = false;
  }
}

onMounted(load);
</script>

<template>
  <section class="border-t border-white/10 pt-10" aria-labelledby="watch-title">
    <div
      class="grid gap-5 border border-white/10 bg-f1-panel p-5 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center sm:p-7"
    >
      <div>
        <p class="mb-1 text-[11px] font-extrabold tracking-[.14em] text-f1-red">
          {{ t("watch.eyebrow") }}
        </p>
        <h2
          id="watch-title"
          class="font-display text-4xl font-extrabold uppercase"
        >
          {{ t("watch.title") }}
        </h2>
        <p class="mt-2 max-w-2xl text-xs leading-5 text-zinc-400">
          {{ t("watch.description") }}
        </p>
      </div>
      <a
        class="shrink-0 border border-white/25 px-4 py-3 text-[11px] font-extrabold tracking-[.1em] hover:border-f1-red hover:text-f1-red"
        href="https://www.formula1.com/"
        target="_blank"
        rel="noopener noreferrer"
      >{{ t("watch.officialSite") }} ↗</a>
    </div>
    <div class="mt-3 grid gap-3 sm:grid-cols-2">
      <a
        class="flex items-center justify-between gap-3 border border-white/10 bg-white/3 p-4 transition-colors hover:border-f1-red"
        href="https://f1tv.formula1.com/"
        target="_blank"
        rel="noopener noreferrer"
      >
        <span><b class="block text-sm">F1 TV</b><small class="mt-1 block text-xs leading-5 text-zinc-400">{{
          t("watch.f1tvDescription")
        }}</small></span><span class="text-f1-red">↗</span>
      </a>
      <div class="border border-white/10 bg-white/3 p-4">
        <p class="text-[11px] font-extrabold tracking-[.12em] text-zinc-400">
          {{
            t("watch.yourCountry", {
              country: data?.countryName || t("watch.countryFallback"),
            })
          }}
        </p>
        <p v-if="loading" class="mt-3 text-xs text-zinc-400">
          {{ t("watch.loading") }}
        </p>
        <template v-else-if="data?.providers.length">
          <a
            v-for="provider in data.providers"
            :key="provider.url"
            class="mt-3 flex items-start justify-between gap-3 text-sm font-bold hover:text-f1-red"
            :href="provider.url"
            target="_blank"
            rel="noopener noreferrer"
          >
            <span><span>
              {{ provider.name }}
              <small
                v-if="provider.kind === 'platform'"
                class="ml-2 text-[10px] font-bold tracking-wide text-zinc-500"
              >{{ t("watch.platform") }}</small></span><small
              v-if="provider.descriptionKey"
              class="mt-1 block text-xs leading-5 font-normal text-zinc-400"
            >{{ t(`watch.providers.${provider.descriptionKey}`) }}</small></span><span>↗</span>
          </a>
        </template>
        <p v-else-if="error" class="mt-3 text-xs text-zinc-400">
          {{ t("watch.unavailable") }}
        </p>
        <p v-else class="mt-3 text-xs text-zinc-400">
          {{ t("watch.noProviders") }}
        </p>
        <a
          class="mt-4 inline-block text-[11px] font-bold text-f1-red hover:underline"
          href="https://www.formula1.com/en/information/f1-broadcast-information.45y3LNsT1D6VoK0ZmX8ciJ"
          target="_blank"
          rel="noopener noreferrer"
        >{{ t("watch.fullList") }} ↗</a>
      </div>
    </div>
  </section>
</template>
