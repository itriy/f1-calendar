<script setup lang="ts">
import { onMounted, reactive, ref } from "vue";
import { useI18n } from "vue-i18n";
import {
  disablePush,
  enablePush,
  pushState,
  updatePush,
  type ReminderPreferences,
} from "../services/pushReminders";

const { t } = useI18n();
const preferences = reactive<ReminderPreferences>({
  day: true,
  hour: true,
  start: true,
});
const supported = ref(false);
const active = ref(false);
const permission = ref("default");
const loading = ref(false);
const message = ref("");
const reminderOptions = [
  { key: "day", label: t("reminders.day") },
  { key: "hour", label: t("reminders.hour") },
  { key: "start", label: t("reminders.start") },
] as const;
async function refreshPermission() {
  const state = await pushState();
  supported.value = state.supported;
  active.value = Boolean(state.subscription);
  permission.value = state.permission;
}
onMounted(refreshPermission);
async function enable() {
  loading.value = true;
  message.value = "";
  try {
    const result = await enablePush(preferences);
    if (result === "denied") {
      permission.value = "denied";
    } else if (result === "unsupported")
      message.value = t("reminders.enableUnsupported");
    else {
      active.value = true;
      permission.value = "granted";
      message.value = t("reminders.enabled");
    }
  } catch (cause) {
    message.value =
      cause instanceof Error ? cause.message : t("reminders.enableError");
  } finally {
    loading.value = false;
  }
}
async function save() {
  loading.value = true;
  message.value = "";
  try {
    await updatePush(preferences);
    message.value = t("reminders.saved");
  } catch (cause) {
    message.value =
      cause instanceof Error ? cause.message : t("reminders.saveError");
  } finally {
    loading.value = false;
  }
}
async function disable() {
  loading.value = true;
  message.value = "";
  try {
    await disablePush();
    active.value = false;
    message.value = t("reminders.disabled");
  } catch (cause) {
    message.value =
      cause instanceof Error ? cause.message : t("reminders.disableError");
  } finally {
    loading.value = false;
  }
}
</script>

<template>
  <section
    aria-labelledby="reminders-title"
    class="border border-white/10 bg-f1-panel p-5 sm:p-6"
  >
    <div class="flex items-start gap-3">
      <span
        aria-hidden="true"
        class="flex size-9 shrink-0 items-center justify-center rounded-full bg-f1-red/15 text-lg text-f1-red"
      >🔔</span>
      <div>
        <p class="text-[12px] font-extrabold tracking-[.16em] text-zinc-400">
          {{ t("reminders.eyebrow") }}
        </p>
        <h2
          id="reminders-title"
          class="font-display text-xl font-extrabold uppercase"
        >
          {{ t("reminders.title") }}
        </h2>
        <p class="mt-2 text-xs leading-5 text-zinc-400">
          {{ t("reminders.description") }}
        </p>
      </div>
    </div>
    <fieldset
      :disabled="loading || !supported"
      class="mt-4 space-y-2 border-0 p-0"
    >
      <legend class="mb-2 text-xs font-bold text-zinc-200">
        {{ t("reminders.legend") }}
      </legend>
      <label
        v-for="item in reminderOptions"
        :key="item.key"
        class="flex cursor-pointer items-center gap-3 rounded border border-white/10 px-3 py-2 text-xs text-zinc-200 hover:border-white/30"
      ><input
        v-model="preferences[item.key]"
        class="size-4 accent-red-600"
        type="checkbox"
      /><span>{{ item.label }}</span></label>
    </fieldset>
    <p v-if="!supported" class="mt-4 text-xs text-amber-300">
      {{ t("reminders.unsupported") }}
    </p>
    <div v-else class="mt-4 flex flex-wrap gap-2">
      <button
        v-if="!active"
        :disabled="loading || permission === 'denied'"
        class="bg-f1-red px-4 py-2 text-xs font-bold text-white disabled:cursor-not-allowed disabled:opacity-50"
        @click="enable"
      >
        {{ loading ? t("reminders.wait") : t("reminders.enable") }}
      </button><template v-else>
        <button
          :disabled="loading"
          class="border border-white/30 px-4 py-2 text-xs font-bold text-white disabled:opacity-50"
          @click="save"
        >
          {{ t("reminders.save") }}
        </button><button
          :disabled="loading"
          class="px-3 py-2 text-xs font-bold text-zinc-400 underline disabled:opacity-50 cursor-pointer"
          @click="disable"
        >
          {{ t("reminders.disable") }}
        </button>
      </template>
    </div>
    <div
      v-if="supported && permission === 'denied'"
      class="mt-4 border border-amber-300/40 bg-amber-300/8 p-4 text-xs text-amber-100"
      role="alert"
    >
      <p class="font-bold text-amber-300">
        {{ t("reminders.permissionDeniedTitle") }}
      </p>
      <p class="mt-1 leading-5">{{ t("reminders.permissionDenied") }}</p>
      <ol class="mt-3 list-decimal space-y-1 pl-4 leading-5">
        <li>{{ t("reminders.permissionStepOne") }}</li>
        <li>{{ t("reminders.permissionStepTwo") }}</li>
        <li>{{ t("reminders.permissionStepThree") }}</li>
      </ol>
      <button
        class="mt-3 border border-amber-300/60 px-3 py-2 text-xs font-bold text-amber-100 hover:bg-amber-300/10"
        type="button"
        @click="refreshPermission"
      >
        {{ t("reminders.checkPermission") }}
      </button>
    </div>
    <p v-if="message" role="status" class="mt-3 text-xs text-zinc-300">
      {{ message }}
    </p>
  </section>
</template>
