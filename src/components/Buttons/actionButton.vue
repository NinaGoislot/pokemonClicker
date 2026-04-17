<template>
    <Button :bgColor="bgColor" :disabled="disabled" @click="onClick" class="px-2 sm:px-5 py-1 sm:py-2 font-bold">
        {{ label }}
    </Button>
</template>

<script setup>
import Button from '../UI/Button.vue'

const props = defineProps({
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

function onClick(event) {
    if (props.disabled) {
        return
    }

    emit('click', event)
}
</script>
