<template>
    <div class="page-container ">
        <div class="mx-auto max-w-6xl p-6 flex flex-col gap-6">
            <BaseCard bgColor="bg-surface-glass" class="light-border backdrop-blur-sm gap-6">
                <div class="flex flex-wrap items-center justify-between gap-3">
                    <div>
                        <h1 class="text-2xl font-bold">Shop</h1>
                        <p class="text-disabled">Binvenue sur lee shop d'armes et skins ! Aujourd'hui, tout est en
                            promo.</p>
                    </div>
                    <p class="rounded-full bg-neutral-overlay-light px-4 py-1 text-sm font-semibold text-black">
                        Crédits: {{ playerStore.profile.wallet }}
                    </p>
                </div>

                <ButtonsGallery :withTopSpacing="false">
                    <FilterButton :isActive="activeTab === 'weapons'" @click="activeTab = 'weapons'">
                        Armes
                    </FilterButton>
                    <FilterButton :isActive="activeTab === 'skins'" @click="activeTab = 'skins'">
                        Skins
                    </FilterButton>
                </ButtonsGallery>
            </BaseCard>

            <BaseCard v-if="activeTab === 'weapons'" bgColor="bg-neutral-bg-dark" class="dark-border gap-3">

                <div v-if="isLoadingWeapons" class="text-light">Chargement des armes...</div>
                <div v-else class="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
                    <BaseCard v-for="weapon in shopWeapons" :key="weapon.id" bgColor="bg-neutral-raised-dark"
                        class="rounded-lg border border-surface-border p-3">
                        <img :src="weapon.image" :alt="weapon.name" class="mx-auto h-24 w-full object-contain" />
                        <p class="mt-2 text-lg font-semibold text-light">{{ weapon.name }}</p>
                        <p class="text-sm text-disabled">Prix: {{ weapon.price }} crédits</p>
                        <p class="text-xs text-disabled mt-1">Possédées: {{ getOwnedWeaponQuantity(weapon.id) }}</p>
                        <ActionButton 
                            class="mt-3 w-full" 
                            label="Acheter" 
                            @click="buyWeapon(weapon)"
                            :disabled="getOwnedWeaponQuantity(weapon.id) >= 99"
                        />
                        <p v-if="feedbacks[weapon.id]" class="mt-2 text-xs text-slate-400">{{ feedbacks[weapon.id] }}</p>
                    </BaseCard>
                </div>
            </BaseCard>

            <BaseCard v-else bgColor="bg-neutral-bg-dark" class="dark-border gap-3">
                <div class="flex flex-wrap items-center justify-between gap-2">
                    <p class="text-sm text-disabled">Reset toutes les heures (sauf si tu veux tricher -> Bouton
                        rafraichir)</p>
                    <div class="flex items-center gap-2">
                        <p class="text-xs text-disabled">Reset dans: {{ resetCountdown }}</p>
                        <ActionButton bgColor="bg-neutral-overlay-dark text-light" label="Rafraîchir"
                            @click="refreshSkins" :disabled="isLoadingSkins" />
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

                        <ActionButton class="mt-3 w-full" @click="buySkin(skin)" :disabled="isSkinOwned(skin)"
                            :label="isSkinOwned(skin) ? 'Déjà possédé' : 'Acheter'" />
                    </article>
                </div>
            </BaseCard>

            <p v-if="globalFeedback" class="mt-3 text-sm text-slate-700">{{ globalFeedback }}</p>
        </div>
    </div>
    
</template>

<script setup>
import { computed, onMounted, onUnmounted, ref } from 'vue'
import BaseCard from '@/components/UI/BaseCard.vue'
import ActionButton from '@/components/Buttons/actionButton.vue'
import FilterButton from '@/components/Buttons/filterButton.vue'
import ButtonsGallery from '@/components/Gallery/buttonsGallery.vue'
import { fetchShopWeapons, getShopSkinRefreshMs } from '@/services/api/valorantAPI'
import { usePlayerStore } from '@/store/playerStore'

const playerStore = usePlayerStore()
const activeTab = ref('weapons')
const shopWeapons = ref([])
const isLoadingWeapons = ref(false)
const isLoadingSkins = ref(false)
const feedbacks = ref({}) // feedback per weapon ID
const globalFeedback = ref('') // for skin feedback
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

function getOwnedWeaponQuantity(weaponId) {
    const weapon = playerStore.findOwnedWeaponById(weaponId)
    return weapon ? Math.max(Number(weapon.quantity) || 1, 1) : 0
}

function isSkinOwned(skin) {
    const weapon = playerStore.findOwnedWeaponById(skin.weaponId)
    if (!weapon) {
        return false
    }

    return Array.isArray(weapon.skins) && weapon.skins.some((s) => s.id === skin.id)
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
        if (result.reason === 'max-quantity-reached') {
            feedbacks.value[weapon.id] = `You have reached the maximum of 99 units.`
            return
        }

        if (result.reason === 'not-enough-credits') {
            feedbacks.value[weapon.id] = 'Crédits insuffisants.'
            return
        }

        feedbacks.value[weapon.id] = 'Achat impossible.'
        return
    }

    feedbacks.value[weapon.id] = `${weapon.name} ajoutée. Quantité: ${result.quantity}/99.`
}

function buySkin(skin) {
    const result = playerStore.buySkin(skin)

    if (!result.success) {
        if (result.reason === 'weapon-not-owned') {
            globalFeedback.value = 'Tu dois d\'abord posséder l\'arme de ce skin.'
            return
        }

        if (result.reason === 'not-enough-credits') {
            globalFeedback.value = 'Crédits insuffisants.'
            return
        }

        if (result.reason === 'already-owned') {
            globalFeedback.value = 'Skin déjà possédé.'
            return
        }

        globalFeedback.value = 'Achat impossible.'
        return
    }

    globalFeedback.value = `${skin.name} ajouté à ton inventaire.`
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
