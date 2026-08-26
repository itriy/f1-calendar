<script setup lang="ts">
import { useI18n } from "vue-i18n";
import { useRemindersModal } from "../composables/useRemindersModal";

const { t } = useI18n();
const { open } = useRemindersModal();
</script>

<template>
  <button
    class="shrink-0 bg-f1-red px-3 py-2 text-xs font-extrabold tracking-wide text-white shadow-lg shadow-red-950/40 transition hover:bg-red-500 focus-visible:outline-2 focus-visible:outline-offset-3 focus-visible:outline-f1-red"
    type="button"
    @click="open"
  >
    <span aria-hidden="true" class="reminder-bell inline-block origin-top">🔔</span>
    {{ t("app.reminders") }}
  </button>
</template>
