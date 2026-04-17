<template>
    <button
        class="rounded-full px-2 sm:px-5 py-1 sm:py-2 font-bold transition-transform disabled:cursor-wait disabled:opacity-60 enabled:hover:-translate-y-0.5 enabled:cursor-pointer"
        :class="props.bgColor">
         <slot />
    </button>
</template>

<script setup>
const props = defineProps({
    bgColor: { type: String, default: "bg-gradient" },
})
</script>