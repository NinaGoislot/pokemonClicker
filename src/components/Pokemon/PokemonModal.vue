<template>
    <Transition name="modal">
        <div v-if="isOpen" class="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-2 sm:p-4"
            @click.self="close">
            <BaseCard bgColor="bg-neutral-bg-dark"
                class="dark-border w-full max-h-[92vh] overflow-y-auto sm:max-w-3xl lg:max-w-4xl">
                <div class="flex justify-between mb-4">
                    <div>
                        <p class="text-xs text-legend text-light">Pokédex #{{ pokemon.pokemonId }}</p>
                        <h2 class="text-xl sm:text-2xl font-bold text-light">{{ pokemon.name }}</h2>
                    </div>
                    <button @click="close" class="text-light hover:text-red-400 text-2xl cursor-pointer">×</button>
                </div>

                <div class="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                    <div class="bg-neutral-overlay-dark rounded p-4 flex items-center justify-center">
                        <img v-if="pokemon.spriteFront" :src="pokemon.spriteFront" :alt="pokemon.name"
                            class="w-full max-w-xs" />
                    </div>

                    <div class="flex flex-col justify-between">
                        <div v-if="fullData" class="space-y-3 flex flex-col gap-6">
                            <div class="flex flex-col gap-4">
                                <p class="text-lg text-light">Types</p>
                                <div class="flex gap-2 flex-wrap ">
                                    <span v-for="type in fullData.types" :key="type"
                                        class="px-2 py-1 rounded font-bold capitalize text-light"
                                        :class="typeColor(type)">
                                        {{ type }}
                                    </span>
                                </div>
                            </div>

                            <div class="flex flex-col gap-4">
                                <p class="text-lg text-light">Stats</p>
                                <div class="flex flex-col gap-1 text-sm sm:text-base">
                                    <div v-for="(val, stat) in fullData.stats" :key="stat"
                                        class="flex justify-between items-center">
                                        <span class="min-w-10 text-disabled">{{ statName(stat) }}</span>
                                        <div class="flex-1 h-1.5 bg-white/20 rounded mx-1">
                                            <div class="h-full bg-gradient rounded"
                                                :style="{ width: (val / STATS_BAR_MAX_VALUE) * 100 + '%' }">
                                            </div>
                                        </div>
                                        <span class="min-w-8 text-right text-light">{{ val }}</span>
                                    </div>
                                </div>
                            </div>

                            <div class="flex flex-col gap-3 rounded-lg bg-neutral-overlay-dark p-3">
                                <p class="text-lg text-light">Arme associée</p>

                                <button v-if="pokemonWeaponImage"
                                    class="rounded-lg bg-neutral-raised-dark p-2 cursor-pointer"
                                    @click="openWeaponModal">
                                    <img :src="pokemonWeaponImage" :alt="pokemonWeaponLabel"
                                        class="mx-auto h-24 w-full object-contain" />
                                    <p class="text-center text-xs text-disabled mt-1">{{ pokemonWeaponLabel }}</p>
                                </button>

                                <ActionButton v-else bgColor="bg-gradient" @click="openWeaponModal"
                                    label="Associer une arme" />
                            </div>
                        </div>
                    </div>
                </div>

                <p v-if="teamError" class="text-sm text-red-400">{{ teamError }}</p>

                <div class="flex flex-col sm:flex-row gap-2 sm:justify-end">
                    <ActionButton bgColor="bg-gray-700" @click="close" label="Fermer" />
                    <ActionButton :bgColor="isInTeam ? 'bg-red-600' : 'bg-gradient'" @click="addToTeam"
                        :disabled="loading"
                        :label="loading ? 'Chargement...' : (isInTeam ? 'Retirer de l\'équipe' : 'Ajouter à l\'équipe')" />
                </div>
            </BaseCard>

            <SwapModal v-if="showSwap" :team="playerStore.activeTeam" @swap="handleSwap" @cancel="showSwap = false" />
            <WeaponAssignModal :isOpen="showWeaponModal" :inventory="playerStore.weaponInventory"
                :currentPokemonId="props.pokemon.pokemonId"
                :currentWeaponId="currentPokemonEntry ? currentPokemonEntry.weaponId : ''"
                :currentSkinId="currentPokemonEntry ? currentPokemonEntry.skinId : ''"
                :errorMessage="weaponAssignError" @clearError="weaponAssignError = ''" @cancel="closeWeaponModal"
                @confirm="confirmWeaponAssociation" />
        </div>
    </Transition>
</template>

<script setup>
import { computed, ref, watch } from 'vue'
import { usePlayerStore } from '@/store/playerStore'
import { fetchPokemonById } from '@/services/api/pokeAPI'
import { fetchWeaponsCatalog, getWeaponImage, getWeaponSkinById } from '@/services/api/valorantAPI'
import BaseCard from '../UI/BaseCard.vue'
import ActionButton from '../Buttons/actionButton.vue'
import SwapModal from './SwapModal.vue'
import WeaponAssignModal from './WeaponAssignModal.vue'

const playerStore = usePlayerStore()

const props = defineProps({
    pokemon: Object,
    isOpen: Boolean,
})

const emit = defineEmits(['close'])

const fullData = ref(null)
const loading = ref(false)
const showSwap = ref(false)
const showWeaponModal = ref(false)
const isInTeam = ref(false)
const teamError = ref('')
const weaponAssignError = ref('')
const STATS_BAR_MAX_VALUE = 230

const currentPokemonEntry = computed(() => {
    return playerStore.findPokedexEntryById(props.pokemon.pokemonId)
})

const pokemonWeaponImage = computed(() => {
    const entry = currentPokemonEntry.value
    if (!entry || !entry.weaponId) {
        return ''
    }

    return getWeaponImage(entry.weaponId, entry.skinId)
})

const pokemonWeaponLabel = computed(() => {
    const entry = currentPokemonEntry.value
    if (!entry || !entry.skinId) {
        return 'Aucune arme'
    }

    const skin = getWeaponSkinById(entry.skinId)
    return skin ? skin.name : 'Skin sélectionné'
})

watch(() => props.isOpen, async (val) => {
    if (val) {
        try {
            await fetchWeaponsCatalog()
            fullData.value = await fetchPokemonById(props.pokemon.pokemonId)

            isInTeam.value = playerStore.activeTeamIds.includes(props.pokemon.pokemonId)
            teamError.value = ''
        } catch (e) {
            console.error(e)
        }
    }
})

const typeColor = (type) => {
    const colors = {
        normal: 'bg-gray-500', fire: 'bg-red-600', water: 'bg-blue-600', electric: 'bg-yellow-500',
        grass: 'bg-green-600', ice: 'bg-blue-300', fighting: 'bg-red-800', poison: 'bg-purple-600',
        ground: 'bg-yellow-700', flying: 'bg-blue-400', psychic: 'bg-pink-600', bug: 'bg-green-700',
        rock: 'bg-gray-700', ghost: 'bg-purple-800', dragon: 'bg-blue-800', dark: 'bg-gray-900',
        steel: 'bg-gray-400', fairy: 'bg-pink-400',
    }
    return colors[type] || 'bg-gray-500'
}

const statName = (stat) => {
    const names = { hp: 'PV', attack: 'Atk', defense: 'Déf', specialAttack: 'SpA', specialDefense: 'SpD', speed: 'Vit' }
    return names[stat] || stat
}

const close = () => emit('close')

const openWeaponModal = () => {
    weaponAssignError.value = ''
    showWeaponModal.value = true
}

const closeWeaponModal = () => {
    weaponAssignError.value = ''
    showWeaponModal.value = false
}

const confirmWeaponAssociation = ({ weaponId, skinId }) => {
    const done = playerStore.setPokemonWeaponLoadout(props.pokemon.pokemonId, weaponId, skinId)
    if (!done) {
        weaponAssignError.value = 'Association impossible. Tu n\'as pas assez d\'exemplaire de cette arme ! Direction le shop mon coco.'
        return
    }

    weaponAssignError.value = ''
    showWeaponModal.value = false
}

const addToTeam = async () => {
    loading.value = true
    teamError.value = ''
    const pokemonPayload = fullData.value || props.pokemon
    const result = playerStore.addPokemonToTeam(pokemonPayload)

    if (result.action === 'swap') {
        showSwap.value = true
    } else if (result.action === 'removed') {
        isInTeam.value = false
    } else if (result.action === 'added') {
        isInTeam.value = true
        close()
    } else if (result.action === 'missing-weapon') {
        teamError.value = 'Ce pokémon doit avoir une arme associée avant d\'entrer dans l\'équipe.'
    } else if (result.action === 'invalid') {
        teamError.value = 'Impossible de mettre ce pokémon dans l\'équipe active.'
    }
    loading.value = false
}

const handleSwap = (index) => {
    playerStore.confirmSwap(index)
    showSwap.value = false
    close()
}
</script>

<style scoped>
.modal-enter-active,
.modal-leave-active {
    transition: opacity 0.2s;
}

.modal-enter-from,
.modal-leave-to {
    opacity: 0;
}
</style>
