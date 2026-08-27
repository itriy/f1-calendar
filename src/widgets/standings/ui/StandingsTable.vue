<script setup lang="ts">
import { computed, ref } from "vue";
import { useI18n } from "vue-i18n";
import TeamBadge from "@/entities/team/ui/TeamBadge.vue";
import WikiLink from "@/shared/ui/WikiLink.vue";
import type { StandingDriver } from "@/entities/race/model/types";

type ConstructorStanding = StandingDriver;
const props = defineProps<{
  drivers: StandingDriver[];
  constructors: ConstructorStanding[];
}>();
const activeTable = ref("drivers");
const standings = computed(() =>
  activeTable.value === "drivers" ? props.drivers : props.constructors,
);
const { t } = useI18n();
</script>

<template>
  <aside class="border border-white/10 bg-f1-panel">
    <div class="px-5 pt-5 sm:px-7">
      <p class="mb-2 text-[12px] font-extrabold tracking-[.16em] text-zinc-400">
        {{ t("standings.eyebrow") }}
      </p>
      <h2 class="font-display text-3xl leading-none font-extrabold uppercase">
        {{ t("standings.title") }}
      </h2>
    </div>
    <div class="mt-5 flex gap-5 border-b border-white/10 px-5 sm:px-7">
      <button
        class="border-b-2 pb-3 text-[11px] font-bold"
        :class="
          activeTable === 'drivers'
            ? 'border-f1-red text-white'
            : 'border-transparent text-zinc-500'
        "
        @click="activeTable = 'drivers'"
      >
        {{ t("standings.drivers") }}
      </button>
      <button
        class="border-b-2 pb-3 text-[11px] font-bold"
        :class="
          activeTable === 'constructors'
            ? 'border-f1-red text-white'
            : 'border-transparent text-zinc-500'
        "
        @click="activeTable = 'constructors'"
      >
        {{ t("standings.constructors") }}
      </button>
    </div>
    <div
      class="grid grid-cols-[50px_1fr_48px] px-5 py-3 text-[10px] font-extrabold tracking-[.13em] text-zinc-500 sm:px-7"
    >
      <span>{{ t("standings.position") }}</span><span>{{ t("standings.participant") }}</span><span class="text-right">{{ t("standings.points") }}</span>
    </div>
    <div
      v-for="item in standings"
      :key="item.code"
      class="grid min-h-13 grid-cols-[26px_1fr_48px] items-center gap-2 border-t border-white/8 px-5 sm:px-7"
    >
      <b class="font-display text-lg text-zinc-300">{{ item.pos }}</b>
      <div>
        <div
          v-if="activeTable === 'constructors'"
          class="flex items-center gap-2"
        >
          <TeamBadge :team="item.name" />
          <WikiLink
            :url="item.url"
            :label="item.name"
            class-name="block text-[11px] hover:text-f1-red hover:underline"
          />
        </div>
        <WikiLink
          v-else
          :url="item.url"
          :label="item.name"
          class-name="block text-[11px] hover:text-f1-red hover:underline"
        />
        <div class="mt-0.5 flex items-center gap-1.5">
          <WikiLink
            v-if="activeTable === 'drivers'"
            :url="item.teamUrl"
            :label="item.team"
            class-name="block text-[12px] text-zinc-500 hover:text-white hover:underline"
          />
          <small v-else class="block text-[10px] text-zinc-500">{{
            item.team
          }}</small>
        </div>
      </div>
      <strong class="text-right font-display text-xl">{{ item.points }}</strong>
    </div>
    <p v-if="!standings.length" class="p-6 text-center text-xs text-zinc-400">
      {{ t("standings.empty") }}
    </p>
  </aside>
</template>
