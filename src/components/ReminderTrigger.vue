<script setup lang="ts">
import { useI18n } from "vue-i18n";
import { useRemindersModal } from "../composables/useRemindersModal";

const { t } = useI18n();
const { open } = useRemindersModal();
</script>

<template>
  <button
    class="inline-flex size-9 shrink-0 items-center justify-center bg-f1-red text-xs font-extrabold tracking-wide text-white shadow-lg shadow-red-950/40 transition hover:bg-red-500 focus-visible:outline-2 focus-visible:outline-offset-3 focus-visible:outline-f1-red sm:size-auto sm:gap-1.5 sm:px-3 sm:py-2"
    type="button"
    :aria-label="t('app.reminders')"
    @click="open"
  >
    <span aria-hidden="true" class="reminder-bell inline-block origin-top">🔔</span>
    <span class="hidden sm:inline">{{ t("app.reminders") }}</span>
  </button>
</template>
