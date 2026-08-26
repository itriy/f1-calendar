<script setup lang="ts">
import { useI18n } from "vue-i18n";
import WikiLink from "./WikiLink.vue";
import type { TitleContender } from "../utils/championship";

defineProps<{
  contenders: TitleContender[];
  remainingRounds: number;
  maxPointsPerRace: number;
}>();
const { t } = useI18n();
</script>

<template>
  <section class="border border-white/10 bg-f1-panel">
    <div class="px-5 py-5 sm:px-7">
      <p class="mb-2 text-[12px] font-extrabold tracking-[.16em] text-zinc-400">
        {{ t("chances.eyebrow") }}
      </p>
      <h2 class="font-display text-3xl leading-none font-extrabold uppercase">
        {{ t("chances.title") }}
      </h2>
    </div>
    <template v-if="remainingRounds > 0 && contenders.length">
      <p
        class="border-y border-white/10 px-5 py-3 text-[12px] leading-5 text-zinc-400 sm:px-7"
      >
        {{
          t("chances.description", {
            rounds: remainingRounds,
            roundLabel:
              remainingRounds === 1 ? t("chances.round") : t("chances.rounds"),
            points: maxPointsPerRace,
          })
        }}
      </p>
      <div
        v-for="item in contenders"
        :key="item.code"
        class="grid grid-cols-[1fr_auto] items-center gap-4 border-b border-white/8 px-5 py-3 sm:px-7"
      >
        <div>
          <div class="mb-1 flex justify-between gap-3 text-xs">
            <WikiLink
              :url="item.url"
              :label="item.name"
              class-name="font-bold hover:text-f1-red hover:underline"
            /><span class="text-zinc-500">{{
              t("chances.gap", { points: item.gap })
            }}</span>
          </div>
          <div class="h-1.5 overflow-hidden bg-white/10">
            <div
              class="h-full bg-f1-red"
              :style="{ width: `${item.estimate}%` }"
            ></div>
          </div>
        </div>
        <strong class="font-display text-2xl">{{ item.estimate
        }}<small class="font-sans text-[12px] text-zinc-500">%</small></strong>
      </div>
    </template>
    <p
      v-else-if="remainingRounds === 0"
      class="p-6 text-center text-xs text-zinc-400"
    >
      {{ t("chances.finished") }}
    </p>
    <p v-else class="p-6 text-center text-xs text-zinc-400">
      {{ t("chances.empty") }}
    </p>
  </section>
</template>
