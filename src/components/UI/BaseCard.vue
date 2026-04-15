<template>
    <article class="flex flex-col rounded-lg p-4 gap-2" :class="props.bgColor ">
        <slot />
    </article>
</template>

<script setup>
const props = defineProps({
    bgColor: { type: String, default: "bg-neutral-raised-light" },
})

</script>


<!-- <template>
    <article class="flex flex-col rounded-lg border" :class="props.whiteBg ? 'bg-neutral-raised-light' : 'bg-black-gradient'">
        <slot />
    </article>
</template>

<script setup>
const props = defineProps({
    whiteBg: { type: Boolean, default: true },
})

</script> -->