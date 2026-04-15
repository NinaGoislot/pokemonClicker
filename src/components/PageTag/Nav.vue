<template>
  <nav class="fixed top-0 left-0 w-full px-4 py-2">
    <div class="mx-auto flex items-center justify-between">
      <router-link to="/" class="rounded-full bg-slate-900 px-4 py-2 text-sm font-black uppercase text-primary">
        Poke Arena
      </router-link>

      <div class="flex items-center gap-2">
        <router-link to="/" active-class="bg-slate-900 text-primary shadow-sm"
          class="rounded-full px-4 py-2 text-sm font-semibold text-slate-700 transition-colors duration-200 hover:bg-amber-100 hover:text-slate-900">
          Home
        </router-link>

        <router-link to="/game" active-class="bg-slate-900 text-primary shadow-sm"
          class="rounded-full px-4 py-2 text-sm font-semibold text-slate-700 transition-colors duration-200 hover:bg-amber-100 hover:text-slate-900">
          Game
        </router-link>

        <router-link to="/collection" active-class="bg-slate-900 text-primary shadow-sm"
          class="rounded-full px-4 py-2 text-sm font-semibold text-slate-700 transition-colors duration-200 hover:bg-amber-100 hover:text-slate-900">
          Collection
        </router-link>

        <router-link to="/shop" active-class="bg-slate-900 text-primary shadow-sm"
          class="rounded-full px-4 py-2 text-sm font-semibold text-slate-700 transition-colors duration-200 hover:bg-amber-100 hover:text-slate-900">
          Shop
        </router-link>
      </div>
    </div>
  </nav>
</template>