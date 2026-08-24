<script setup lang="ts">
import { onMounted, reactive, ref } from 'vue'
import { disablePush, enablePush, pushState, updatePush, type ReminderPreferences } from '../services/pushReminders'

const preferences = reactive<ReminderPreferences>({ day: true, hour: true, start: true })
const supported = ref(false); const active = ref(false); const permission = ref('default'); const loading = ref(false); const message = ref('')
onMounted(async () => { const state = await pushState(); supported.value = state.supported; active.value = Boolean(state.subscription); permission.value = state.permission })
async function enable() { loading.value = true; message.value = ''; try { const result = await enablePush(preferences); if (result === 'denied') message.value = 'Дозвіл на сповіщення відхилено в браузері.'; else if (result === 'unsupported') message.value = 'Цей браузер не підтримує Web Push.'; else { active.value = true; permission.value = 'granted'; message.value = 'Нагадування увімкнено.' } } catch (cause) { message.value = cause instanceof Error ? cause.message : 'Не вдалося увімкнути нагадування.' } finally { loading.value = false } }
async function save() { loading.value = true; message.value = ''; try { await updatePush(preferences); message.value = 'Налаштування збережено.' } catch (cause) { message.value = cause instanceof Error ? cause.message : 'Не вдалося зберегти налаштування.' } finally { loading.value = false } }
async function disable() { loading.value = true; message.value = ''; try { await disablePush(); active.value = false; message.value = 'Нагадування вимкнено.' } catch (cause) { message.value = cause instanceof Error ? cause.message : 'Не вдалося вимкнути нагадування.' } finally { loading.value = false } }
</script>

<template>
  <section aria-labelledby="reminders-title" class="border border-white/10 bg-f1-panel p-5 sm:p-6">
    <div class="flex items-start gap-3"><span aria-hidden="true" class="flex size-9 shrink-0 items-center justify-center rounded-full bg-f1-red/15 text-lg text-f1-red">🔔</span><div><p class="text-[10px] font-extrabold tracking-[.16em] text-zinc-400">PUSH</p><h2 id="reminders-title" class="font-display text-xl font-extrabold uppercase">Нагадування про гонку</h2><p class="mt-2 text-xs leading-5 text-zinc-400">Сповіщення надсилаються за запланованим UTC-часом календаря: за 1 день, за 1 годину або в момент запланованого старту. На сайті час етапу показано у вашому часовому поясі. Це не підтвердження фактичного старту гонки.</p></div></div>
    <fieldset :disabled="loading || !supported" class="mt-4 space-y-2 border-0 p-0"><legend class="mb-2 text-xs font-bold text-zinc-200">Коли нагадувати</legend><label v-for="item in [{ key: 'day', label: 'За 1 день' }, { key: 'hour', label: 'За 1 годину' }, { key: 'start', label: 'У момент старту' }]" :key="item.key" class="flex cursor-pointer items-center gap-3 rounded border border-white/10 px-3 py-2 text-xs text-zinc-200 hover:border-white/30"><input v-model="preferences[item.key as keyof ReminderPreferences]" class="size-4 accent-red-600" type="checkbox"><span>{{ item.label }}</span></label></fieldset>
    <p v-if="!supported" class="mt-4 text-xs text-amber-300">Web Push недоступний у цьому браузері. На iPhone/iPad спершу встановіть застосунок на екран «Початок».</p>
    <p v-else-if="permission === 'denied'" class="mt-4 text-xs text-amber-300">Браузер заблокував сповіщення. Дозвольте їх у налаштуваннях сайту.</p>
    <div v-else class="mt-4 flex flex-wrap gap-2"><button v-if="!active" :disabled="loading" class="bg-f1-red px-4 py-2 text-xs font-bold text-white disabled:opacity-50" @click="enable">{{ loading ? 'Зачекайте…' : 'Увімкнути нагадування' }}</button><template v-else><button :disabled="loading" class="border border-white/30 px-4 py-2 text-xs font-bold text-white disabled:opacity-50" @click="save">Зберегти вибір</button><button :disabled="loading" class="px-3 py-2 text-xs font-bold text-zinc-400 underline disabled:opacity-50" @click="disable">Вимкнути</button></template></div>
    <p v-if="message" role="status" class="mt-3 text-xs text-zinc-300">{{ message }}</p>
  </section>
</template>
