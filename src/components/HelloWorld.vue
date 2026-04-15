<script setup>
defineProps({
  msg: {
    type: String,
    required: true,
  },
})
</script>

<template>
  <div class="text-center lg:text-left">
    <h1 class="relative -top-2.5 border-2 border-red-500 text-[2.6rem] font-medium text-emerald-500">{{ msg }}</h1>
    <h3 class="text-[1.2rem]">
      You’ve successfully created a project with
      <a href="https://vite.dev/" target="_blank" rel="noopener">Vite</a> +
      <a href="https://vuejs.org/" target="_blank" rel="noopener">Vue 3</a>.
    </h3>
  </div>
</template>
