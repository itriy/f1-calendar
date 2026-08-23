<script setup>
import { computed } from 'vue'

const props = defineProps({ team: { type: String, default: '' }, color: { type: String, default: '' } })
const identities = [
  ['mercedes', 'mercedes', '#27f4d2'], ['ferrari', 'ferrari', '#e8002d'], ['mclaren', 'mclaren', '#ff8700'], ['red bull', 'red-bull', '#3671c6'],
  ['racing bulls', 'racing-bulls', '#6692ff'], ['rb f1', 'racing-bulls', '#6692ff'], ['williams', 'williams', '#64c4ff'], ['aston martin', 'aston-martin', '#229971'],
  ['alpine', 'alpine', '#ff87bc'], ['haas', 'haas', '#b6babd'], ['audi', 'audi', '#e9e9e9'], ['cadillac', 'cadillac', '#d6aa61']
]
const identity = computed(() => identities.find(([name]) => props.team.toLowerCase().includes(name)) || ['unknown', 'unknown', props.color || '#737780'])
</script>

<template>
  <svg class="size-5 shrink-0" :style="{ color: color || identity[2] }" role="img" :aria-label="`Команда: ${team || 'невідома'}`" :title="team || 'Невідома команда'" viewBox="0 0 24 24">
    <template v-if="identity[1] === 'mercedes'"><circle cx="12" cy="12" r="10" fill="currentColor"/><path d="M12 4 15 17l-3-2-3 2Z" fill="#0b0d12"/></template>
    <template v-else-if="identity[1] === 'ferrari'"><path d="M4 3h16v18H4z" fill="currentColor"/><path d="M8 6h8v3h-5v2h4v3h-4v4H8z" fill="#0b0d12"/></template>
    <template v-else-if="identity[1] === 'mclaren'"><path d="M2 12 12 2l10 10-10 10Z" fill="currentColor"/><path d="M7 16V8h2l3 4 3-4h2v8h-3v-3l-2 3-2-3v3Z" fill="#0b0d12"/></template>
    <template v-else-if="identity[1] === 'red-bull'"><path d="m12 2 10 5v10l-10 5-10-5V7Z" fill="currentColor"/><path d="M7 16V8h3c3 0 4 4 1 5l3 3h-3l-2-2v2Zm3-5v1h1c1 0 1-1 0-1Z" fill="#0b0d12"/></template>
    <template v-else-if="identity[1] === 'racing-bulls'"><path d="M3 5h18v14H3z" fill="currentColor"/><path d="m6 9 3 3-3 3h3l3-3-3-3Zm6 0 3 3-3 3h3l3-3-3-3Z" fill="#0b0d12"/></template>
    <template v-else-if="identity[1] === 'williams'"><path d="M2 4h20l-3 16H5Z" fill="currentColor"/><path d="m6 8 2 8h2l2-4 2 4h2l2-8h-3l-1 4-2-4-2 4-1-4Z" fill="#0b0d12"/></template>
    <template v-else-if="identity[1] === 'aston-martin'"><path d="m12 2 3 7 7 3-7 3-3 7-3-7-7-3 7-3Z" fill="currentColor"/><path d="M11 8h2v8h-2zM8 11h8v2H8z" fill="#0b0d12"/></template>
    <template v-else-if="identity[1] === 'alpine'"><path d="m12 3 9 17H3Z" fill="currentColor"/><path d="m12 8 3 8h-2l-1-3-1 3H9Z" fill="#0b0d12"/></template>
    <template v-else-if="identity[1] === 'haas'"><path d="M3 3h18v18H3z" fill="currentColor"/><path d="M7 7h3v3h4V7h3v10h-3v-4h-4v4H7z" fill="#0b0d12"/></template>
    <template v-else-if="identity[1] === 'audi'"><path d="M2 18 10 3h4l8 15h-4l-2-4H8l-2 4Zm8-7h4l-2-4Z" fill="currentColor"/><circle cx="12" cy="12" r="2" fill="#0b0d12"/></template>
    <template v-else-if="identity[1] === 'cadillac'"><path d="m12 2 8 4v7c0 5-4 8-8 9-4-1-8-4-8-9V6Z" fill="currentColor"/><path d="M16 8a5 5 0 1 0 0 8l-2-2a2 2 0 1 1 0-4Z" fill="#0b0d12"/></template>
    <template v-else><circle cx="12" cy="12" r="10" fill="currentColor"/><path d="M9 9a3 3 0 1 1 5 2c-1 1-2 1-2 3" fill="none" stroke="#0b0d12" stroke-width="2" stroke-linecap="round"/><circle cx="12" cy="17" r="1" fill="#0b0d12"/></template>
  </svg>
</template>
