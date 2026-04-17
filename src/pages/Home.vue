<template>
    <div class="page-container p-4 w-full h-full flex items-center justify-center">

        <section v-if="!playerStore.hasPlayer"
            class="w-full sm:w-2/3 md:w-1/2 xl:w-1/4 rounded-lg border p-4 bg-neutral-raised-light">
            <h2 class="text-lg font-bold">Créer ton joueur</h2>
            <p class="mb-3 text-sm text-slate-600">Choisis un nom pour commencer l'aventure !</p>

            <div class="flex flex-col gap-2">
                <input v-model="playerName" type="text" placeholder="Nom du joueur" class="rounded border px-3 py-2" />
                <ActionButton bgColor="bg-neutral-raised-dark text-white" class="rounded"
                    :disabled="!canCreate || isCreating" @click="createPlayer"
                    :label="isCreating ? 'Creation...' : 'Valider'" />
                <p v-if="error" class="text-sm text-red-600">{{ error }}</p>
            </div>
        </section>

        <section v-else class=" w-full sm:w-2/3 md:w-1/2 xl:w-1/4 rounded-lg border p-4 bg-neutral-raised-light">
            <p class="text-sm uppercase tracking-[0.2em] text-slate-500">Bienvenue</p>
            <h2 class="text-xl font-extrabold">{{ playerStore.profile.name }}</h2>
            <p class="mt-2">Credits: {{ playerStore.profile.wallet }}</p>
            <p class="mt-2 text-sm text-slate-600">Taille pokedex: {{ playerStore.pokedex.length }}</p>
        </section>
    </div>
</template>

<script setup>
import { computed, onMounted, ref } from 'vue'
import ActionButton from '../components/Buttons/actionButton.vue'
import { usePlayerStore } from '../store/playerStore'

const playerStore = usePlayerStore()
const playerName = ref('')
const error = ref('')
const isCreating = ref(false)

// Check if the player name is valid (at least 2 characters)
const canCreate = computed(() => playerName.value.trim().length >= 2)

// on click, create the player and save it to the store
async function createPlayer() {
    const name = playerName.value.trim()
    if (name.length < 2) {
        error.value = 'Le nom doit contenir au moins 2 caracteres.'
        return
    }

    error.value = ''
    isCreating.value = true

    try {
        await playerStore.createPlayerWithStarter(name)
    } catch (e) {
        error.value = 'Impossible de creer le joueur pour le moment.'
    } finally {
        isCreating.value = false
    }
}

onMounted(() => {
    playerStore.loadFromStorage()
})
</script>