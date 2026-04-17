<template>
    <button
        class="rounded-full transition-transform disabled:cursor-wait disabled:opacity-60 enabled:hover:-translate-y-0.5 enabled:cursor-pointer"
        :class="props.bgColor">
        <slot />
    </button>
</template>

<script setup>
const props = defineProps({
    bgColor: { type: String, default: '' },
})
</script>