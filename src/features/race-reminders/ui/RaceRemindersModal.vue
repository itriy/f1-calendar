<script setup lang="ts">
import { defineAsyncComponent } from "vue";
import { useI18n } from "vue-i18n";
import { useRemindersModal } from "@/features/race-reminders/model/useRemindersModal";

const RaceReminders = defineAsyncComponent(() => import("./RaceReminders.vue"));

const { t } = useI18n();
const { isOpen, dialog, close } = useRemindersModal();
</script>

<template>
  <Teleport to="body">
    <div
      v-if="isOpen"
      class="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm"
      @click.self="close"
    >
      <div
        ref="dialog"
        class="relative max-h-[calc(100vh-2rem)] w-full max-w-xl overflow-y-auto outline-none"
        role="dialog"
        aria-modal="true"
        aria-labelledby="reminders-title"
        tabindex="-1"
        @keydown.esc="close"
      >
        <button
          class="absolute top-3 right-3 z-10 flex size-8 items-center justify-center border border-white/20 bg-f1-panel text-lg text-zinc-300 hover:text-white focus-visible:outline-2 focus-visible:outline-f1-red"
          type="button"
          :aria-label="t('common.close')"
          @click="close"
        >
          ×
        </button>
        <RaceReminders />
      </div>
    </div>
  </Teleport>
</template>
