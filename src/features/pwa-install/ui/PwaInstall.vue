<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from "vue";
import { useI18n } from "vue-i18n";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

const { t } = useI18n();
const installEvent = ref<BeforeInstallPromptEvent | null>(null);
const isInstalled = ref(false);
const isOpen = ref(false);
const hasDismissedPrompt = ref(false);

const isIos = () =>
  /iPad|iPhone|iPod/.test(navigator.userAgent) ||
  (navigator.userAgent.includes("Mac") && navigator.maxTouchPoints > 1);
const isStandalone = () =>
  window.matchMedia?.("(display-mode: standalone)").matches ||
  ("standalone" in navigator &&
    (navigator as Navigator & { standalone?: boolean }).standalone === true);
const fallbackMessage = computed(() =>
  isIos() ? t("install.iosInstructions") : t("install.browserInstructions"),
);

function close() {
  isOpen.value = false;
}

async function install() {
  if (!installEvent.value) {
    isOpen.value = true;
    return;
  }

  const prompt = installEvent.value;
  installEvent.value = null;
  await prompt.prompt();
  const choice = await prompt.userChoice;
  if (choice.outcome === "accepted") {
    isInstalled.value = true;
    close();
  } else {
    hasDismissedPrompt.value = true;
    isOpen.value = true;
  }
}

function onBeforeInstallPrompt(event: Event) {
  event.preventDefault();
  installEvent.value = event as BeforeInstallPromptEvent;
}

function onAppInstalled() {
  isInstalled.value = true;
  close();
}

function onKeydown(event: KeyboardEvent) {
  if (event.key === "Escape") close();
}

onMounted(() => {
  isInstalled.value = isStandalone();
  window.addEventListener("beforeinstallprompt", onBeforeInstallPrompt);
  window.addEventListener("appinstalled", onAppInstalled);
  window.addEventListener("keydown", onKeydown);
});

onBeforeUnmount(() => {
  window.removeEventListener("beforeinstallprompt", onBeforeInstallPrompt);
  window.removeEventListener("appinstalled", onAppInstalled);
  window.removeEventListener("keydown", onKeydown);
});
</script>

<template>
  <div v-if="!isInstalled" class="relative">
    <button
      class="cursor-pointer inline-flex size-9 items-center justify-center border border-white/15 text-zinc-300 transition hover:border-white/40 hover:bg-white/10 hover:text-white focus-visible:outline-2 focus-visible:outline-offset-3 focus-visible:outline-f1-red sm:size-auto sm:gap-1.5 sm:px-2.5 sm:py-2"
      type="button"
      :aria-expanded="isOpen"
      aria-controls="pwa-install-help"
      :aria-label="t('install.label')"
      :title="t('install.label')"
      @click="install"
    >
      <svg
        aria-hidden="true"
        class="size-4"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        stroke-width="2"
        stroke-linecap="round"
        stroke-linejoin="round"
      >
        <path d="M12 3v12" />
        <path d="m7 10 5 5 5-5" />
        <path d="M5 21h14" />
      </svg>
      <span class="hidden text-[11px] font-extrabold tracking-wide sm:inline">{{
        t("install.action")
      }}</span>
    </button>
    <section
      v-if="isOpen"
      id="pwa-install-help"
      class="absolute right-0 top-full z-[60] mt-2 w-72 border border-white/15 bg-f1-panel p-4 text-left shadow-2xl"
      role="dialog"
      :aria-label="t('install.helpTitle')"
    >
      <div class="flex items-start justify-between gap-3">
        <div>
          <h2 class="font-display text-lg font-bold uppercase">
            {{ t("install.helpTitle") }}
          </h2>
          <p class="mt-1 text-xs leading-5 text-zinc-400">
            {{ hasDismissedPrompt ? t("install.dismissed") : fallbackMessage }}
          </p>
        </div>
        <button
          class="-mr-1 -mt-1 grid size-7 shrink-0 place-items-center text-zinc-400 transition hover:text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-f1-red"
          type="button"
          :aria-label="t('common.close')"
          @click="close"
        >
          <span aria-hidden="true">×</span>
        </button>
      </div>
    </section>
  </div>
</template>
