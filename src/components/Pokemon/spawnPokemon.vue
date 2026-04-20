<template>
    <div class="absolute w-40" :class="[
        enemy.isRecoiling ? 'animate-enemy-recoil' : '',
        enemy.isHit ? 'animate-enemy-hit' : '',
    ]" :style="enemy.position">
        <div v-show="showHpBar && enemy.currentHp > 0"
            class="absolute -top-3 left-1/2 z-20 w-full -translate-x-1/2 transition-opacity duration-150">
            <div class="h-2 overflow-hidden rounded-full bg-neutral-raised-dark">
                <div class="h-full bg-gradient transition-[width] duration-150 ease-linear"
                    :style="{ width: `${enemyHpPercent}%` }"></div>
            </div>
        </div>

        <button class="relative w-full rounded-xl enabled:cursor-crosshair disabled:cursor-default"
            :disabled="enemy.currentHp <= 0 || !isRoundRunning" @click="handleDamageClick">
            <img :src="enemy.sprites.front" :alt="enemy.displayName" loading="lazy"
                class="mx-auto aspect-square w-full object-contain cursor-crosshair select-none"
                :class="enemy.currentHp <= 0 ? 'grayscale' : ''" />
            <img v-if="enemy.weaponImage && enemy.currentHp > 0" :src="enemy.weaponImage"
                :alt="`Arme de ${enemy.displayName}`"
                class="pointer-events-none absolute bottom-0 right-0 transform translate-y-2 translate-x-6 h-1/2 w-full object-contain select-none" />
            <!-- Capture is now auto -->
            <!-- <div v-if="enemy.currentHp <= 0" class="absolute inset-0 flex items-center justify-center">
                <ActionButton @click.stop="emit('capture', enemy.instanceId)" label="Capturer"
                    class="rounded-full px-3 py-0.5 text-black" />
            </div> -->
        </button>
    </div>
</template>

<script setup>
import { onBeforeUnmount, ref, watch } from 'vue'
import ActionButton from '../Buttons/actionButton.vue'

const props = defineProps({
    enemy: {
        type: Object,
        required: true,
    },
    isRoundRunning: {
        type: Boolean,
        required: true,
    },
    enemyHpPercent: {
        type: Number,
        required: true,
    },
    captureTimeLeftSeconds: {
        type: Number,
        required: true,
    },
})

const emit = defineEmits(['damage', 'capture'])

const showHpBar = ref(false)
let hpBarTimer = null

function clearHpBarTimer() {
    if (hpBarTimer) {
        clearTimeout(hpBarTimer)
        hpBarTimer = null
    }
}

function showHpBarTemporarily() {
    showHpBar.value = true
    clearHpBarTimer()
    hpBarTimer = setTimeout(() => {
        showHpBar.value = false
        hpBarTimer = null
    }, 1000)
}

function handleDamageClick() {
    if (props.enemy.currentHp <= 0 || !props.isRoundRunning) {
        return
    }

    showHpBarTemporarily()
    emit('damage', props.enemy.instanceId)

    if (props.enemy.currentHp <= 0) {
        emit('capture', props.enemy.instanceId)
    }

}

watch(() => props.enemy.currentHp, (currentHp) => {
    if (currentHp <= 0) {
        showHpBar.value = false
        clearHpBarTimer()
    }
})

onBeforeUnmount(() => {
    clearHpBarTimer()
})
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
</style>
