<template>
  <nav class="fixed top-0 left-0 z-20 w-full px-4 py-2">
    <div class="flex w-full flex-col gap-2 sm:flex-row items-center justify-between">
      <router-link to="/"
        class="w-fit rounded-full bg-neutral-bg-dark px-4 py-2 text-sm font-black uppercase text-light">
        PokeRadiant
      </router-link>

      <div class="flex flex-wrap items-center gap-2">
        <router-link to="/" active-class="bg-neutral-bg-dark text-light"
          class="rounded-full px-4 py-2 text-sm font-semibold text-disabled transition-colors duration-200 ease-in-out hover:bg-primary hover:text-black">
          Home
        </router-link>

        <router-link to="/game" active-class="bg-neutral-bg-dark text-light"
          class="rounded-full px-4 py-2 text-sm font-semibold text-disabled transition-colors duration-200 ease-in-out hover:bg-primary hover:text-black">
          Game
        </router-link>

        <router-link to="/shop" active-class="bg-neutral-bg-dark text-light"
          class="rounded-full px-4 py-2 text-sm font-semibold text-disabled transition-colors duration-200 ease-in-out hover:bg-primary hover:text-black">
          Shop
        </router-link>

        <router-link to="/collection" active-class="bg-neutral-bg-dark text-light"
          class="rounded-full px-4 py-2 text-sm font-semibold text-disabled transition-colors duration-200 ease-in-out hover:bg-primary hover:text-black">
          Pokedex
        </router-link>
      </div>
    </div>
  </nav>
</template>

<script setup>
</script>