<script setup>
import { computed } from 'vue'
import alpine from '../assets/team-badges/alpine.svg'
import astonMartin from '../assets/team-badges/aston-martin.svg'
import audi from '../assets/team-badges/audi.svg'
import cadillac from '../assets/team-badges/cadillac.svg'
import ferrari from '../assets/team-badges/ferrari.svg'
import haas from '../assets/team-badges/haas.svg'
import mclaren from '../assets/team-badges/mclaren.svg'
import mercedes from '../assets/team-badges/mercedes.svg'
import racingBulls from '../assets/team-badges/racing-bulls.svg'
import redBull from '../assets/team-badges/red-bull.svg'
import unknown from '../assets/team-badges/unknown.svg'
import williams from '../assets/team-badges/williams.svg'

const props = defineProps({ team: { type: String, default: '' } })
const identities = [
  ['mercedes', mercedes], ['ferrari', ferrari], ['mclaren', mclaren], ['red bull', redBull], ['racing bulls', racingBulls], ['rb f1', racingBulls],
  ['williams', williams], ['aston martin', astonMartin], ['alpine', alpine], ['haas', haas], ['audi', audi], ['cadillac', cadillac]
]
const asset = computed(() => identities.find(([name]) => props.team.toLowerCase().includes(name))?.[1] || unknown)
</script>

<template>
  <img class="size-5 shrink-0" :src="asset" :alt="`Команда: ${team || 'невідома'}`" :title="team || 'Невідома команда'" width="20" height="20">
</template>
