import { nextTick, ref } from "vue";

const isOpen = ref(false);
const dialog = ref<HTMLElement | null>(null);

export function useRemindersModal() {
  const open = async () => {
    isOpen.value = true;
    await nextTick();
    dialog.value?.focus();
  };
  const close = () => {
    isOpen.value = false;
  };
  return { isOpen, dialog, open, close };
}
