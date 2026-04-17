<template>
    <Button :bgColor="resolvedBgColor" :disabled="disabled" @click="emit('click', $event)" class="px-2 py-0.5 sm:px-3">
        <slot>{{ label }}</slot>
    </Button>
</template>

<script setup>
import { computed } from 'vue'
import Button from '../UI/Button.vue'

const props = defineProps({
  label: {
    type: String,
    default: '',
  },
  isActive: {
    type: Boolean,
    default: false,
  },
  activeBgColor: {
    type: String,
    default: 'bg-gradient',
  },
  inactiveBgColor: {
    type: String,
    default: 'bg-neutral-overlay-light text-black',
  },
  disabled: {
    type: Boolean,
    default: false,
  },
})

const emit = defineEmits(['click'])

const resolvedBgColor = computed(() => props.isActive ? props.activeBgColor : props.inactiveBgColor)
</script>