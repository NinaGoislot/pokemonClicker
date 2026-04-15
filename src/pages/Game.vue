<template>
    <div class="bg-window-gradient min-h-screen">
        <main class="mx-auto grid grid-cols-1 gap-4 p-6 pt-20 lg:grid-cols-6">
            <section class="flex flex-col gap-4 lg:col-span-2">
                <BaseCard bgColor="bg-[#ffffffb8]" class="border border-[#19273d26] backdrop-blur-sm">
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
                            <img v-if="activePokemonSprite" :src="activePokemonSprite" alt="Pokémon actif"
                                class="h-full w-full object-contain" />
                            <img v-if="activePokemonWeaponSprite" :src="activePokemonWeaponSprite" alt="Arme active"
                                class="pointer-events-none absolute bottom-2 right-2 h-1/2 w-1/2 object-contain drop-shadow-[0_4px_8px_rgba(0,0,0,0.55)]" />
                        </div>
                        <div class="flex flex-1 flex-col gap-2">
                            <p class="text-xs text-legend text-light">Pokémon actif</p>
                            <p class="text-lg font-bold text-light">{{ activeBattlePokemon ? activeBattlePokemon.name :
                                'Aucun' }}</p>
                            <p class="text-sm text-disabled">Puissance clic: {{ clickDamage }}</p>

                            <div v-if="activeBattlePokemon" class="flex flex-col gap-1">
                                <p class="text-xs text-light">{{ activeBattlePokemon.currentHp }} / {{
                                    activeBattlePokemon.maxHp }} PV</p>
                                <div class="h-2 overflow-hidden rounded-full bg-neutral-overlay-dark">
                                    <div class="h-full bg-gradient transition-[width] duration-200"
                                        :style="{ width: `${playerHpPercent}%` }"></div>
                                </div>
                            </div>
                        </div>
                    </div>
                </BaseCard>

                <BaseCard bgColor="bg-neutral-bg-dark" class="dark-border">
                    <p class="text-xs text-legend text-light">Difficulté</p>
                    <div class="mt-2 flex gap-2">
                        <Button v-for="difficulty in difficultyOptions" :key="difficulty.key"
                            :bgColor="selectedDifficulty === difficulty.key ? 'bg-gradient' : 'bg-neutral-overlay-dark text-light'"
                            @click="setDifficulty(difficulty.key)">
                            {{ difficulty.label }}
                        </Button>
                    </div>
                </BaseCard>
            </section>

            <section class="relative flex flex-col gap-4 lg:col-span-4">
                <BaseCard bgColor="bg-neutral-bg-dark" class="h-full justify-between dark-border">
                    <div class="flex flex-wrap items-center justify-between gap-3">
                        <div>
                            <p class="text-legend text-light">Jeu Shooter Clicker</p>
                            <p class="text-disabled italic">Le round se termine au timer ou si ton équipe meurt.</p>
                        </div>
                        <div class="flex items-center gap-2">
                            <p class="rounded-full bg-neutral-overlay-dark px-3 py-1 text-sm text-light">Temps: {{
                                roundTimerLabel }}</p>
                            <Button :disabled="isLoadingRound || isRoundRunning" @click="startRound">
                                {{ isLoadingRound ? 'Chargement...' : 'Lancer un round' }}
                            </Button>
                        </div>
                    </div>

                    <div class="mt-2 flex flex-wrap items-center justify-between gap-2">
                        <p class="text-sm text-light">Ennemis vivants: {{ livingEnemiesCount }}</p>
                        <p class="text-sm text-light">Crédits: {{ playerStore.profile.wallet }}</p>
                    </div>

                    <p v-if="roundFeedback" class="mt-2 rounded-full px-4 py-1 text-sm"
                        :class="roundResult === 'lost' ? 'bg-red-500/30 text-light' : 'bg-primary/30 text-black'">
                        {{ roundFeedback }}
                    </p>

                    <div class="relative min-h-125 rounded-lg bg-neutral-raised-dark p-3">
                        <div v-if="isLoadingRound"
                            class="absolute left-1/2 top-1/2 -translate-x-1/2 rounded-full dark-border bg-neutral-overlay-dark px-4 py-1.5 text-light">
                            Chargement des ennemis...
                        </div>

                        <div v-else-if="!enemies.length"
                            class="absolute left-1/2 top-1/2 -translate-x-1/2 rounded-full dark-border bg-neutral-overlay-dark px-4 py-1.5 text-light">
                            Aucun ennemi actif.
                        </div>

                        <BaseCard v-for="enemy in enemies" :key="enemy.instanceId" bgColor="bg-neutral-overlay-dark"
                            class="absolute w-40 border border-[#93deff66] p-2 text-light" :class="[
                                enemy.currentHp <= 0 ? 'border-[#f6b174] shadow-[0_0_0_2px_rgba(246,177,116,0.25)]' : '',
                                enemy.isRecoiling ? 'animate-enemy-recoil' : '',
                                enemy.isHit ? 'animate-enemy-hit' : '',
                            ]" :style="enemy.position">

                            <button
                                class="relative rounded-xl bg-neutral-raised-dark enabled:cursor-crosshair disabled:cursor-default"
                                :disabled="enemy.currentHp <= 0 || !isRoundRunning"
                                @click="damageEnemy(enemy.instanceId)">
                                <img :src="enemy.sprites.front" :alt="enemy.displayName" loading="lazy"
                                    class="mx-auto aspect-square w-full" />
                                <img v-if="enemy.weaponImage" :src="enemy.weaponImage"
                                    :alt="`Arme de ${enemy.displayName}`"
                                    class="pointer-events-none absolute bottom-2 right-2 h-1/2 w-1/2 object-contain drop-shadow-[0_4px_8px_rgba(0,0,0,0.6)]" />
                            </button>

                            <div class="mt-1 flex flex-col gap-1">
                                <p class="font-bold">{{ enemy.displayName }}</p>
                                <p class="text-[11px] uppercase tracking-[0.08em] text-disabled">{{ enemy.rarity }}</p>

                                <div v-if="enemy.currentHp > 0" class="flex flex-col gap-0.5">
                                    <p class="text-xs text-light">{{ Math.max(enemy.currentHp, 0) }} / {{ enemy.maxHp }}
                                        PV</p>
                                    <div class="mt-1 h-2 overflow-hidden rounded-full bg-neutral-raised-dark">
                                        <div class="h-full bg-gradient transition-[width] duration-150 ease-linear"
                                            :style="{ width: `${enemyHpPercent(enemy)}%` }"></div>
                                    </div>
                                </div>

                                <div v-else class="flex flex-col items-center gap-1">
                                    <button @click="captureEnemy(enemy.instanceId)"
                                        class="bg-gradient rounded-full px-3 py-0.5 text-black mx-auto cursor-pointer">
                                        Capturer
                                    </button>
                                    <p class="text-[11px] text-disabled">
                                        {{ Math.ceil(enemyCaptureTimeLeftMs(enemy) / 1000) }}s restantes
                                    </p>
                                </div>
                            </div>
                        </BaseCard>
                    </div>
                </BaseCard>
            </section>
        </main>
    </div>
</template>

<script setup>
import BaseCard from '@/components/UI/BaseCard.vue'
import Button from '@/components/UI/Button.vue'
import { useGame } from '@/assets/js/Game.script.js'

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
    activePokemonSprite,
    activePokemonWeaponSprite,
    activeBattlePokemon,
    playerHpPercent,
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

.animate-enemy-recoil {
    animation: enemy-recoil 0.18s ease;
}

.animate-enemy-hit {
    animation: hit-shake 0.16s ease;
}

.animate-player-hit {
    animation: hit-shake 0.22s ease;
}

.animate-player-recoil {
    animation: enemy-recoil 0.12s ease;
}
</style>
