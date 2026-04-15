<template>
    <button @click="showModal = true" class="w-full h-full hover:scale-102 transition cursor-pointer">
        <BaseCard class="">
            <div class="flex justify-between">
                <p class="text-xl">{{ pokemon.name }}</p>
                <div class="text-right">
                    <p class="text-xs text-legend text-disabled">Pokedex</p>
                    <p class="font-bold">#{{ pokemon.pokemonId }}</p>
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