<script setup lang="ts">
import { computed } from "vue";
import { useI18n } from "vue-i18n";
import alpine from "../assets/team-badges/alpine.avif";
import astonMartin from "../assets/team-badges/astonmartin.avif";
import audi from "../assets/team-badges/audi.avif";
import cadillac from "../assets/team-badges/cadillac.avif";
import ferrari from "../assets/team-badges/ferrari.avif";
import haas from "../assets/team-badges/haasf1team.avif";
import mclaren from "../assets/team-badges/mclaren.avif";
import mercedes from "../assets/team-badges/mercedes.avif";
import racingBulls from "../assets/team-badges/racingbulls.avif";
import redBull from "../assets/team-badges/redbullracing.avif";
import unknown from "../assets/team-badges/unknown.svg";
import williams from "../assets/team-badges/williams.avif";

const props = defineProps({ team: { type: String, default: "" } });
const { t } = useI18n();
const identities = [
  ["mercedes", mercedes, "#27f4d2"],
  ["ferrari", ferrari, "#e8002d"],
  ["mclaren", mclaren, "#ff8700"],
  ["red bull", redBull, "#3671c6"],
  ["racing bulls", racingBulls, "#6692ff"],
  ["rb f1", racingBulls, "#6692ff"],
  ["williams", williams, "#64c4ff"],
  ["aston martin", astonMartin, "#229971"],
  ["alpine", alpine, "#ff87bc"],
  ["haas", haas, "#b6babd"],
  ["audi", audi, "#ff2d00"],
  ["cadillac", cadillac, "#d6aa61"],
];
const invertedIconTeams: Record<string, boolean> = {
  mercedes: true,
  "aston martin": true,
};

const identity = computed(() =>
  identities.find(([name]) => props.team.toLowerCase().includes(name)),
);
const asset = computed(() => identity.value?.[1] || unknown);
const brandColor = computed(() => identity.value?.[2] || "#71717a");
const invertIcon = computed(() =>
  Boolean(identity.value && invertedIconTeams[identity.value[0]]),
);
</script>

<template>
  <span
    class="flex size-5 shrink-0 items-center justify-center rounded-full p-0.5"
    :style="{ backgroundColor: brandColor }"
  >
    <img
      class="size-full object-contain"
      :class="{ invert: invertIcon }"
      :src="asset"
      :alt="t('teamBadge.label', { team: team || t('teamBadge.unknown') })"
      :title="team || t('teamBadge.unknownTitle')"
      width="16"
      height="16"
    />
  </span>
</template>
