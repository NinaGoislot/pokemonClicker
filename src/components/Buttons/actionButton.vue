<template>
    <Button :bgColor="bgColor" :disabled="disabled" @click="emit('click', $event)"
        class="px-2 py-1 font-bold sm:px-5 sm:py-2">
        <slot>{{ label }}</slot>
    </Button>
</template>

<script setup>
import Button from '../UI/Button.vue'

const { label, bgColor, disabled } = defineProps({
    label: {
        type: String,
        required: true,
    },
    bgColor: {
        type: String,
        default: 'bg-gradient',
    },
    disabled: {
        type: Boolean,
        default: false,
    },
})

const emit = defineEmits(['click'])
</script>
