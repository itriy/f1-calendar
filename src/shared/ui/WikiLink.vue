<script setup lang="ts">
import { computed } from "vue";
import { useI18n } from "vue-i18n";

const props = defineProps({
  url: { type: String, default: "" },
  label: { type: String, required: true },
  className: { type: String, default: "" },
});
const { t } = useI18n();

const safeUrl = computed(() => {
  try {
    const parsed = new URL(props.url);
    if (!["http:", "https:"].includes(parsed.protocol)) return "";

    // Jolpica still returns HTTP Wikipedia URLs for many established drivers.
    // Wikipedia supports HTTPS, so upgrade them before rendering the external link.
    parsed.protocol = "https:";
    return parsed.href;
  } catch {
    return "";
  }
});
</script>

<template>
  <a
    v-if="safeUrl"
    :href="safeUrl"
    target="_blank"
    rel="noopener noreferrer"
    :class="[
      'cursor-pointer decoration-f1-red/70 underline-offset-2 transition-colors hover:underline focus-visible:rounded-sm focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-f1-red',
      className,
    ]"
    :aria-label="t('wikiLink.ariaLabel', { label })"
    :title="t('wikiLink.title', { label })"
  >{{ label }}</a>
  <span v-else :class="className">{{ label }}</span>
</template>
