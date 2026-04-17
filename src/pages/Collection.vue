<template>
    <div class="page-container">
        <main class="p-4">
            <h1 class="mb-2 text-2xl font-bold">Collection</h1>
            <p class="mb-4 text-slate-600">Tous les pokemons captures.</p>

            <div v-if="!playerStore.pokedex.length" class="rounded-lg border p-4 text-sm text-slate-500">
                Aucun pokemon dans le pokedex.
            </div>


            <Gallery v-else>
                <PokemonCard v-for="pokemon in playerStore.pokedex" :key="pokemon.pokemonId" :pokemon="pokemon" />
            </Gallery>
        </main>
    </div>
</template>

<script setup>
import { onMounted } from 'vue'
import { usePlayerStore } from '../store/playerStore'
import PokemonCard from '../components/Pokemon/PokemonCard.vue'
import Gallery from '../components/UI/Gallery.vue'

const playerStore = usePlayerStore()

onMounted(() => {
    playerStore.loadFromStorage()
})
</script>