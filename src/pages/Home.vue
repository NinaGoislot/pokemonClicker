<template>
    <div>
        <main class="p-4">
            <h1 class="mb-2 text-2xl font-bold">Accueil</h1>

            <section v-if="!playerStore.hasPlayer" class="max-w-md rounded-lg border p-4">
                <h2 class="text-lg font-bold">Creer ton joueur</h2>
                <p class="mb-3 text-sm text-slate-600">Choisis un nom pour commencer l'aventure.</p>

                <div class="flex flex-col gap-2">
                    <input v-model="playerName" type="text" placeholder="Nom du joueur"
                        class="rounded border px-3 py-2" />
                    <button class="rounded bg-slate-900 px-3 py-2 text-white disabled:opacity-50" :disabled="!canCreate"
                        @click="createPlayer">
                        Valider
                    </button>
                    <p v-if="error" class="text-sm text-red-600">{{ error }}</p>
                </div>
            </section>

            <section v-else class="max-w-lg rounded-lg border p-4">
                <p class="text-sm uppercase tracking-[0.2em] text-slate-500">Bienvenue</p>
                <h2 class="text-xl font-extrabold">{{ playerStore.profile.name }}</h2>
                <p class="mt-2">Credits: {{ playerStore.profile.wallet }}</p>
                <p class="mt-2 text-sm text-slate-600">Team active: {{ playerStore.activeTeam.length }} slots.</p>
            </section>
        </main>
    </div>
</template>

<script setup>
import { computed, onMounted, ref } from 'vue'
import { usePlayerStore } from '../store/playerStore'

const playerStore = usePlayerStore()
const playerName = ref('')
const error = ref('')

// Check if the player name is valid (at least 2 characters)
const canCreate = computed(() => playerName.value.trim().length >= 2)

// on click, create the player and save it to the store
function createPlayer() {
    const name = playerName.value.trim()
    if (name.length < 2) {
        error.value = 'Le nom doit contenir au moins 2 caracteres.'
        return
    }

    error.value = ''
    playerStore.createPlayer(name)
}

onMounted(() => {
    playerStore.loadFromStorage()
})
</script>