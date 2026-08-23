<script setup>
import { computed } from 'vue'

const props = defineProps({ url: { type: String, default: '' }, label: { type: String, required: true }, className: { type: String, default: '' } })

const safeUrl = computed(() => {
  try {
    const parsed = new URL(props.url)
    return parsed.protocol === 'https:' ? parsed.href : ''
  } catch {
    return ''
  }
})
</script>

<template>
  <a v-if="safeUrl" :href="safeUrl" target="_blank" rel="noopener noreferrer" :class="className" :aria-label="`${label}: відкрити сторінку Вікіпедії в новій вкладці`">{{ label }}</a>
  <span v-else :class="className">{{ label }}</span>
</template>
