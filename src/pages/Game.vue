<template>
    <div class="page-container">
        <main class="mx-auto grid grid-cols-1 gap-4 p-6 lg:grid-cols-8">
            <section class="flex flex-col gap-4 lg:col-span-2">
                <BaseCard bgColor="bg-surface-glass" class="border border-surface-glass-border backdrop-blur-sm">
                    <h2 class="text-xl font-bold">Team active</h2>
                    <p class="mb-3 text-disabled">6 pokémons actifs pour combattre</p>

                    <div class="grid grid-cols-[repeat(auto-fill,minmax(120px,1fr))] gap-2">
                        <button v-for="(pokemon, index) in playerStore.activeTeam" :key="index"
                            class="rounded-xl light-border transition-all duration-200 aspect-square cursor-pointer bg-neutral-raised-light"
                            @click="pokemon && playerStore.setActivePokemon(pokemon.pokemonId)">
                            <img v-if="pokemon" class="w-full aspect-square" :src="pokemon.spriteFront"
                                :alt="pokemon.name" loading="lazy" />
                            <span class="text-sm">{{ pokemon ? '' : 'Slot libre' }}</span>
                        </button>
                    </div>
                </BaseCard>

                <BaseCard bgColor="bg-neutral-bg-dark" class="dark-border">
                    <div class="flex gap-3">
                        <div class="relative mx-auto aspect-square w-2/5 rounded-xl bg-neutral-overlay-dark"
                            :class="[{ 'animate-player-hit': playerHitFlash }, { 'animate-player-recoil': playerRecoil }]">
                            <img v-if="activePokemonState.sprite" :src="activePokemonState.sprite" alt="Pokémon actif"
                                class="h-full w-full object-contain" />
                            <img v-if="activePokemonState.weaponSprite" :src="activePokemonState.weaponSprite"
                                alt="Arme active"
                                class="pointer-events-none absolute bottom-0 right-0 transform translate-y-2 translate-x-6 h-1/2 w-full object-contain drop-shadow-lg" />
                        </div>
                        <div class="flex flex-1 flex-col gap-2">
                            <p class="text-xs text-legend text-light">Pokémon actif</p>
                            <p class="text-lg font-bold text-light">{{ activePokemonState.member ?
                                activePokemonState.member.name :
                                'Aucun' }}</p>
                            <p class="text-sm text-disabled">Puissance clic: {{ clickDamage }}</p>

                            <div v-if="activePokemonState.member" class="flex flex-col gap-1">
                                <p class="text-xs text-light">{{ activePokemonState.member.currentHp }} / {{
                                    activePokemonState.member.maxHp }} PV</p>
                                <div class="h-2 overflow-hidden rounded-full bg-neutral-overlay-dark">
                                    <div class="h-full bg-gradient transition-[width] duration-200"
                                        :style="{ width: `${activePokemonState.hpPercent}%` }"></div>
                                </div>
                            </div>
                        </div>
                    </div>
                </BaseCard>

                <BaseCard bgColor="bg-neutral-bg-dark" class="dark-border">
                    <p class="text-xs text-legend text-light">Difficulté</p>
                    <ButtonsGallery>
                        <FilterButton v-for="difficulty in difficultyOptions" :key="difficulty.key"
                            inactiveBgColor="bg-neutral-overlay-dark text-light"
                            :isActive="selectedDifficulty === difficulty.key" @click="setDifficulty(difficulty.key)">
                            {{ difficulty.label }}
                        </FilterButton>
                    </ButtonsGallery>
                </BaseCard>
            </section>

            <section class="relative flex flex-col lg:col-span-6">
                <BaseCard bgColor="bg-neutral-bg-dark" class="h-full dark-border gap-4">
                    <div class="flex flex-wrap items-center justify-between gap-3">
                        <div>
                            <p class="text-legend text-light">Jeu Shooter Clicker</p>
                        </div>
                        <div class="flex items-center gap-2">
                            <p class="rounded-full bg-neutral-overlay-dark px-3 py-1 text-sm text-light">Temps: {{
                                roundTimerLabel }}</p>
                            <ActionButton :disabled="isLoadingRound || isRoundRunning" @click="startRound"
                                :label="isLoadingRound ? 'Chargement...' : 'Lancer un round'" />
                        </div>
                    </div>

                    <div class="flex flex-wrap items-center justify-between gap-2">
                        <p class="text-sm text-light">Ennemis vivants: {{ livingEnemiesCount }}</p>
                        <p class="text-sm text-light">Crédits: {{ playerStore.profile.wallet }}</p>
                    </div>

                    <p v-if="roundFeedback" class="rounded-full px-4 py-1 text-sm"
                        :class="roundResult === 'lost' ? 'bg-red-600/30 text-light' : 'bg-primary/50 text-black'">
                        {{ roundFeedback }}
                    </p>

                    <div class="relative min-h-125 rounded-lg bg-neutral-raised-dark p-3 h-full">
                        <div v-if="isLoadingRound"
                            class="absolute left-1/2 top-1/2 -translate-x-1/2 rounded-full dark-border bg-neutral-overlay-dark px-4 py-1.5 text-light">
                            Chargement des ennemis...
                        </div>

                        <div v-else-if="!enemies.length"
                            class="absolute left-1/2 top-1/2 -translate-x-1/2 rounded-full dark-border bg-neutral-overlay-dark px-4 py-1.5 text-light">
                            Aucun ennemi actif.
                        </div>

                        <SpawnPokemon v-for="enemy in enemies" :key="enemy.instanceId" :enemy="enemy"
                            :isRoundRunning="isRoundRunning" :enemyHpPercent="enemyHpPercent(enemy)"
                            :captureTimeLeftSeconds="Math.ceil(enemyCaptureTimeLeftMs(enemy) / 1000)"
                            @damage="damageEnemy" @capture="captureEnemy" />
                    </div>
                </BaseCard>
            </section>
        </main>
    </div>
</template>

<script setup>
import BaseCard from '@/components/UI/BaseCard.vue'
import ActionButton from '@/components/Buttons/actionButton.vue'
import FilterButton from '@/components/Buttons/filterButton.vue'
import ButtonsGallery from '@/components/Gallery/buttonsGallery.vue'
import SpawnPokemon from '@/components/Pokemon/spawnPokemon.vue'
import { useGame } from '@/assets/js/gameScript.js'

const {
    playerStore,
    enemies,
    isLoadingRound,
    isRoundRunning,
    roundResult,
    roundFeedback,
    difficultyOptions,
    selectedDifficulty,
    setDifficulty,
    roundTimerLabel,
    clickDamage,
    activePokemonState,
    playerHitFlash,
    playerRecoil,
    livingEnemiesCount,
    startRound,
    damageEnemy,
    captureEnemy,
    enemyHpPercent,
    enemyCaptureTimeLeftMs,
} = useGame()
</script>

<!-- animation -->
<style scoped>
@keyframes enemy-recoil {
    0% {
        transform: translateX(0);
    }

    30% {
        transform: translateX(-4px);
    }

    100% {
        transform: translateX(0);
    }
}

@keyframes hit-shake {
    0% {
        transform: translateX(0);
        opacity: 1;
    }

    30% {
        transform: translateX(2px);
        opacity: 0.75;
    }

    60% {
        transform: translateX(-2px);
    }

    100% {
        transform: translateX(0);
        opacity: 1;
    }
}

.animate-player-hit {
    animation: hit-shake 0.22s ease;
}

.animate-player-recoil {
    animation: enemy-recoil 0.12s ease;
}
</style>
