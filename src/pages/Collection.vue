<template>
    <div class="page-container">
        <div class="p-4 flex flex-col gap-4">
            <h1 class="text-2xl font-bold">Pokédex de {{ playerStore.profile.name }}</h1>

            <BaseCard class="light-border" bgColor="bg-neutral-raised-light gap-4">
                <div class="">
                    <p class="text-xs mb-2 text-legend text-slate-500">Trier par</p>
                    <ButtonsGallery>
                        <FilterButton v-for="option in sortOptions" :key="option.key" class="text-sm"
                            :isActive="selectedSort === option.key" @click="selectedSort = option.key">
                            {{ option.label }}
                        </FilterButton>
                    </ButtonsGallery>
                </div>

                <div>
                    <p class="text-xs mb-2 text-legend text-slate-500">Filtres</p>
                    <ButtonsGallery>
                        <FilterButton v-for="option in baseFilterOptions" :key="option.key" class="text-sm"
                            :isActive="selectedFilter === option.key" @click="selectedFilter = option.key">
                            {{ option.label }}
                        </FilterButton>
                    </ButtonsGallery>
                </div>

                <div>
                    <p class="text-xs mb-2 text-legend text-slate-500">Type</p>
                    <ButtonsGallery>
                        <FilterButton :isActive="selectedType === 'all'" @click="selectedType = 'all'" class="text-sm">
                            Tous
                        </FilterButton>
                        <FilterButton v-for="pokemonType in availableTypes" :key="pokemonType" class="text-sm"
                            :isActive="selectedType === pokemonType" @click="selectedType = pokemonType">
                            {{ pokemonType }}
                        </FilterButton>
                    </ButtonsGallery>
                </div>
            </BaseCard>

            <div v-if="!playerStore.pokedex.length" class="rounded-lg border p-4 text-sm text-slate-500">
                Aucun pokemon dans le pokedex.
            </div>

            <Pokedex v-else>
                <PokemonCard v-for="pokemon in filteredAndSortedPokedex" :key="pokemon.pokemonId" :pokemon="pokemon" />
            </Pokedex>
        </div>
    </div>
</template>

<script setup>
import { computed, onMounted, ref } from 'vue'
import { usePlayerStore } from '../store/playerStore'
import PokemonCard from '../components/Pokemon/PokemonCard.vue'
import BaseCard from '../components/UI/BaseCard.vue'
import FilterButton from '../components/Buttons/filterButton.vue'
import ButtonsGallery from '../components/Gallery/buttonsGallery.vue'
import Pokedex from '../components/Gallery/pokedexGallery.vue'

const playerStore = usePlayerStore()

const selectedSort = ref('id')
const selectedFilter = ref('all')
const selectedType = ref('all')

const sortOptions = [
    { key: 'id', label: 'ID' },
    { key: 'name', label: 'Nom' },
    { key: 'attack', label: 'Attaque max' },
    { key: 'hp', label: 'PV max' },
    { key: 'speed', label: 'Vitesse max' },
    { key: 'defense', label: 'Defense max' },
    { key: 'specialAttack', label: 'Attaque Sp. max' },
    { key: 'specialDefense', label: 'Defense Sp. max' },
]

const baseFilterOptions = [
    { key: 'all', label: 'Tous' },
    { key: 'shiny', label: 'Shiny' },
    { key: 'armed', label: 'Pokémons armés' },
    { key: 'unarmed', label: 'Pokémons non armés' },
    { key: 'legendary', label: 'Legendaires / Fabuleux' },
    { key: 'activeTeam', label: 'Equipe active' },
]

const statSortOrder = {
    attack: 'attack',
    hp: 'hp',
    speed: 'speed',
    defense: 'defense',
    specialAttack: 'specialAttack',
    specialDefense: 'specialDefense',
}

const availableTypes = computed(() => {
    const typeSet = new Set()
    for (const pokemon of playerStore.pokedex) {
        for (const pokemonType of pokemon.types) {
            typeSet.add(pokemonType)
        }
    }

    return [...typeSet].sort((a, b) => a.localeCompare(b))
})

function getStatValue(pokemon, statKey) {
    const value = Number(pokemon.stats[statKey])
    return Number.isFinite(value) ? value : 0
}

function comparePokemons(a, b) {
    if (selectedSort.value === 'id') {
        return a.pokemonId - b.pokemonId
    }

    if (selectedSort.value === 'name') {
        return (a.name || '').localeCompare(b.name || '')
    }

    const statKey = statSortOrder[selectedSort.value]
    if (statKey) {
        return getStatValue(b, statKey) - getStatValue(a, statKey)
    }

    return a.pokemonId - b.pokemonId
}

const filteredAndSortedPokedex = computed(() => {
    const filtered = playerStore.pokedex.filter((pokemon) => {
        const isInActiveTeam = playerStore.activeTeamIds.includes(pokemon.pokemonId)
        const hasWeapon = Boolean(pokemon.weaponId)
        const isLegendary = Boolean(pokemon.isLegendary)

        if (selectedFilter.value === 'shiny' && !pokemon.isShiny) {
            return false
        }

        if (selectedFilter.value === 'armed' && !hasWeapon) {
            return false
        }

        if (selectedFilter.value === 'unarmed' && hasWeapon) {
            return false
        }

        if (selectedFilter.value === 'legendary' && !isLegendary) {
            return false
        }

        if (selectedFilter.value === 'activeTeam' && !isInActiveTeam) {
            return false
        }

        if (selectedType.value !== 'all' && !pokemon.types.includes(selectedType.value)) {
            return false
        }

        return true
    })

    return [...filtered].sort(comparePokemons)
})

onMounted(() => {
    playerStore.loadFromStorage()
})
</script>
