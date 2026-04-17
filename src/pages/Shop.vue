<template>
    <div class="page-container">
        <main class="mx-auto max-w-6xl p-6 pt-20">
            <BaseCard bgColor="bg-surface-glass" class="light-border mb-4 backdrop-blur-sm">
                <div class="flex flex-wrap items-center justify-between gap-3">
                    <div>
                        <h1 class="text-2xl font-bold">Shop</h1>
                        <p class="text-disabled">Binvenue sur lee shop d'armes et skins ! Aujourd'hui, tout est en promo.</p>
                    </div>
                    <p class="rounded-full bg-neutral-overlay-light px-4 py-1 text-sm font-semibold text-black">
                        Crédits: {{ playerStore.profile.wallet }}
                    </p>
                </div>

                <div class="mt-4 flex gap-2">
                    <Button :bgColor="activeTab === 'weapons' ? 'bg-gradient' : 'bg-neutral-overlay-light text-black'"
                        @click="activeTab = 'weapons'">
                        Armes
                    </Button>
                    <Button :bgColor="activeTab === 'skins' ? 'bg-gradient' : 'bg-neutral-overlay-light text-black'"
                        @click="activeTab = 'skins'">
                        Skins
                    </Button>
                </div>
            </BaseCard>

            <BaseCard v-if="activeTab === 'weapons'" bgColor="bg-neutral-bg-dark" class="dark-border gap-3">

                <div v-if="isLoadingWeapons" class="text-light">Chargement des armes...</div>
                <div v-else class="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
                    <BaseCard v-for="weapon in shopWeapons" :key="weapon.id" bgColor="bg-neutral-raised-dark"
                        class="rounded-lg border border-surface-border p-3">
                        <img :src="weapon.image" :alt="weapon.name" class="mx-auto h-24 w-full object-contain" />
                        <p class="mt-2 text-lg font-semibold text-light">{{ weapon.name }}</p>
                        <p class="text-sm text-disabled">Prix: {{ weapon.price }} crédits</p>

                        <Button v-if="!isWeaponOwned(weapon.id)" class="mt-3 w-full" @click="buyWeapon(weapon)">
                            Acheter
                        </Button>
                        <p v-else class="mt-3 rounded-full bg-primary/20 px-3 py-1 text-center text-sm font-semibold">
                            Déjà possédée
                        </p>
                    </BaseCard>
                </div>
            </BaseCard>

            <BaseCard v-else bgColor="bg-neutral-bg-dark" class="dark-border gap-3">
                <div class="flex flex-wrap items-center justify-between gap-2">
                    <p class="text-sm text-disabled">Reset toutes les heures (sauf si tu veux tricher -> Bouton rafraichir)</p>
                    <div class="flex items-center gap-2">
                        <p class="text-xs text-disabled">Reset dans: {{ resetCountdown }}</p>
                        <Button bgColor="bg-neutral-overlay-dark text-light" @click="refreshSkins"
                            :disabled="isLoadingSkins">
                            Rafraîchir
                        </Button>
                    </div>
                </div>

                <div v-if="isLoadingSkins" class="text-light">Chargement des skins...</div>
                <div v-else class="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
                    <article v-for="skin in playerStore.shopSkins" :key="skin.id"
                        class="rounded-lg border border-surface-border bg-neutral-raised-dark p-3">
                        <img :src="skin.image" :alt="skin.name" class="mx-auto h-24 w-full object-contain" />
                        <p class="mt-2 text-sm font-semibold text-light">{{ skin.name }}</p>
                        <p class="text-xs text-disabled">Arme: {{ skin.weaponName }}</p>
                        <p class="text-sm text-disabled">Prix: {{ skin.price }} crédits</p>

                        <Button class="mt-3 w-full" @click="buySkin(skin)" :disabled="isSkinOwned(skin)">
                            {{ isSkinOwned(skin) ? 'Déjà possédé' : 'Acheter' }}
                        </Button>
                    </article>
                </div>
            </BaseCard>

            <p v-if="feedback" class="mt-3 text-sm text-slate-700">{{ feedback }}</p>
        </main>
    </div>
</template>

<script setup>
import { computed, onMounted, onUnmounted, ref } from 'vue'
import BaseCard from '@/components/UI/BaseCard.vue'
import Button from '@/components/UI/Button.vue'
import { fetchShopWeapons, getShopSkinRefreshMs } from '@/services/api/valorantAPI'
import { usePlayerStore } from '@/store/playerStore'

const playerStore = usePlayerStore()
const activeTab = ref('weapons')
const shopWeapons = ref([])
const isLoadingWeapons = ref(false)
const isLoadingSkins = ref(false)
const feedback = ref('')
const nowTick = ref(Date.now())
let ticker = null

const resetCountdown = computed(() => {
    if (!playerStore.shopSkinsResetAt) {
        return '60m'
    }

    const remainingMs = Math.max(playerStore.shopSkinsResetAt - nowTick.value, 0)
    const remainingMinutes = Math.ceil(remainingMs / (60 * 1000))
    return `${remainingMinutes}m`
})

function isWeaponOwned(weaponId) {
    return Boolean(playerStore.findOwnedWeaponById(weaponId))
}

function isSkinOwned(skin) {
    const weapon = playerStore.findOwnedWeaponById(skin.weaponId)
    if (!weapon) {
        return false
    }

    return weapon.skins.includes(skin.id)
}

async function loadWeapons() {
    isLoadingWeapons.value = true
    try {
        shopWeapons.value = await fetchShopWeapons()
    } finally {
        isLoadingWeapons.value = false
    }
}

async function loadSkins() {
    isLoadingSkins.value = true
    try {
        await playerStore.refreshShopSkinsIfNeeded(false)
    } finally {
        isLoadingSkins.value = false
    }
}

async function refreshSkins() {
    isLoadingSkins.value = true
    try {
        await playerStore.refreshShopSkinsIfNeeded(true)
    } finally {
        isLoadingSkins.value = false
    }
}

function buyWeapon(weapon) {
    const result = playerStore.buyWeapon(weapon)

    if (!result.success) {
        if (result.reason === 'not-enough-credits') {
            feedback.value = 'Crédits insuffisants.'
            return
        }

        if (result.reason === 'already-owned') {
            feedback.value = 'Arme déjà possédée.'
            return
        }

        feedback.value = 'Achat impossible.'
        return
    }

    feedback.value = `${weapon.name} ajoutée à ton inventaire.`
}

function buySkin(skin) {
    const result = playerStore.buySkin(skin)

    if (!result.success) {
        if (result.reason === 'weapon-not-owned') {
            feedback.value = 'Tu dois d\'abord posséder l\'arme de ce skin.'
            return
        }

        if (result.reason === 'not-enough-credits') {
            feedback.value = 'Crédits insuffisants.'
            return
        }

        if (result.reason === 'already-owned') {
            feedback.value = 'Skin déjà possédé.'
            return
        }

        feedback.value = 'Achat impossible.'
        return
    }

    feedback.value = `${skin.name} ajouté à ton inventaire.`
}

onMounted(async () => {
    playerStore.loadFromStorage()
    await Promise.all([loadWeapons(), loadSkins()])

    ticker = setInterval(() => {
        nowTick.value = Date.now()
        const elapsed = nowTick.value >= playerStore.shopSkinsResetAt
        if (elapsed) {
            playerStore.refreshShopSkinsIfNeeded(false)
        }
    }, Math.min(60 * 1000, getShopSkinRefreshMs()))
})

onUnmounted(() => {
    if (ticker) {
        clearInterval(ticker)
    }
})
</script>
