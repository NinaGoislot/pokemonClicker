<template>
    <button @click="showModal = true" class="w-full h-full hover:scale-102 transition cursor-pointer">
        <BaseCard class="h-full">
            <div class="flex justify-start items-start sm:justify-between flex-col sm:flex-row gap-2">
                <p class="text-sm lg:text-md xl:text-lg">{{ pokemon.name }}</p>
                <div class="text-right">
                    <p class="text-xs md:text-xs text-legend text-disabled">Pokedex</p>
                    <p class="text-xs md:text-sm font-bold">#{{ pokemon.pokemonId }}</p>
                </div>
            </div>
            <img v-if="pokemon.spriteFront" :src="pokemon.spriteFront" :alt="pokemon.name" loading="lazy"
                class="w-5/6 aspect-square mx-auto" />
        </BaseCard>
    </button>

    <PokemonModal :pokemon="pokemon" :isOpen="showModal" @close="showModal = false" />
</template>

<script setup>
import { ref } from 'vue'
import BaseCard from '../UI/BaseCard.vue'
import PokemonModal from './PokemonModal.vue'

defineProps({
    pokemon: Object
})

const showModal = ref(false)
</script>