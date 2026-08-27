<script setup lang="ts">
import { computed } from "vue";
import { useI18n } from "vue-i18n";
import { localeLabels, localeShortLabels, setLocale, supportedLocales, type SupportedLocale } from "@/shared/config/i18n";

const emit = defineEmits<{ changed: [] }>();

const { locale } = useI18n();
const selected = computed({
  get: () => locale.value as SupportedLocale,
  set: (value: SupportedLocale) => {
    void setLocale(value).then(() => emit("changed"));
  },
});
</script>

<template>
  <label class="sr-only" for="language-selector-mobile">{{ $t("common.language") }}</label>
  <select
    id="language-selector-mobile"
    v-model="selected"
    class="cursor-pointer bg-transparent text-xs font-bold text-zinc-200 outline-none focus-visible:ring-2 focus-visible:ring-f1-red sm:hidden"
    :aria-label="$t('common.language')"
  >
    <option v-for="language in supportedLocales" :key="language" :value="language" class="bg-zinc-900">
      {{ localeShortLabels[language] }}
    </option>
  </select>
  <label class="sr-only" for="language-selector-desktop">{{ $t("common.language") }}</label>
  <select
    id="language-selector-desktop"
    v-model="selected"
    class="hidden cursor-pointer bg-transparent text-xs font-bold text-zinc-200 outline-none focus-visible:ring-2 focus-visible:ring-f1-red sm:block"
    :aria-label="$t('common.language')"
  >
    <option v-for="language in supportedLocales" :key="language" :value="language" class="bg-zinc-900">
      {{ localeLabels[language] }}
    </option>
  </select>
</template>
