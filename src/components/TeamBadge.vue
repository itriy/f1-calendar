<script setup>
import { computed } from 'vue'
import spriteUrl from '../assets/team-badges.svg?url'

const props = defineProps({ team: { type: String, default: '' }, color: { type: String, default: '' } })
const identities = [
  ['mercedes', 'mercedes', '#27f4d2'], ['ferrari', 'ferrari', '#e8002d'], ['mclaren', 'mclaren', '#ff8700'], ['red bull', 'red-bull', '#3671c6'],
  ['racing bulls', 'racing-bulls', '#6692ff'], ['rb f1', 'racing-bulls', '#6692ff'], ['williams', 'williams', '#64c4ff'], ['aston martin', 'aston-martin', '#229971'],
  ['alpine', 'alpine', '#ff87bc'], ['haas', 'haas', '#b6babd'], ['audi', 'audi', '#e9e9e9'], ['cadillac', 'cadillac', '#d6aa61']
]
const identity = computed(() => identities.find(([name]) => props.team.toLowerCase().includes(name)) || ['unknown', 'unknown', props.color || '#737780'])
</script>

<template>
  <svg class="size-5 shrink-0" :style="{ color: color || identity[2] }" role="img" :aria-label="`Команда: ${team || 'невідома'}`" :title="team || 'Невідома команда'" viewBox="0 0 24 24"><use :href="`${spriteUrl}#team-${identity[1]}`" /></svg>
</template>
