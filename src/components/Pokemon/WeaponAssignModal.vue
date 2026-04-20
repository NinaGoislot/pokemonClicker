<template>
    <Transition name="modal">
        <div v-if="isOpen" class="fixed inset-0 z-60 flex items-center justify-center bg-black/60 p-2 sm:p-4"
            @click.self="onCancel">
            <BaseCard bgColor="bg-neutral-bg-dark"
                class="dark-border w-full max-h-[92vh] overflow-y-auto sm:max-w-3xl lg:max-w-4xl gap-4">
                <div class="flex items-center justify-between">
                    <h3 class="text-lg sm:text-xl font-bold text-light">Associer arme et skin</h3>
                    <button class="text-2xl text-light hover:text-primary cursor-pointer" @click="onCancel">×</button>
                </div>

                <div class="grid grid-cols-1 gap-4 md:grid-cols-2">
                    <div class="rounded-lg bg-neutral-overlay-dark p-3">
                        <p class="mb-2 text-xs text-legend text-light">Armes possédées</p>
                        <div class="flex max-h-64 sm:max-h-80 flex-col gap-2 pr-1 overflow-y-auto">
                            <button v-for="weapon in weaponChoices" :key="weapon.id"
                                class="flex items-center gap-3 rounded-lg border px-3 py-2 text-left transition cursor-pointer"
                                :class="selectedWeaponId === weapon.id ? 'border-primary bg-primary/20' : 'border-surface-border bg-neutral-raised-dark'"
                                @click="selectWeapon(weapon.id)">
                                <img :src="weapon.image" :alt="weapon.name"
                                    class="h-10 w-10 sm:h-12 sm:w-12 rounded object-contain bg-neutral-overlay-dark" />
                                <div>
                                    <p class="font-semibold text-sm sm:text-base text-light">{{ weapon.name }}</p>
                                    <p class="text-xs text-disabled">{{ weapon.skinCount }} skins dispo</p>
                                </div>
                                <p class="text-xs text-disabled text-end ml-auto">Exemplaires restants : {{
                                    weapon.availableUnits }}</p>

                            </button>
                        </div>
                    </div>

                    <div class="rounded-lg bg-neutral-overlay-dark p-3">
                        <p class="mb-2 text-xs text-legend text-light">Skins disponibles</p>
                        <div class="grid max-h-64 sm:max-h-80 grid-cols-2 gap-2 pr-1 overflow-y-auto">
                            <button v-for="skin in skinChoices" :key="skin.id"
                                class="rounded-lg border p-2 transition cursor-pointer"
                                :class="selectedSkinId === skin.id ? 'border-primary bg-primary/20' : 'border-surface-border bg-neutral-raised-dark'"
                                @click="selectSkin(skin.id)">
                                <img :src="skin.image" :alt="skin.name"
                                    class="mx-auto h-14 sm:h-20 w-full object-contain" />
                                <p class="mt-1 text-center text-xs text-light">{{ skin.name }}</p>
                            </button>
                        </div>
                    </div>
                </div>

                <div class="flex flex-col sm:flex-row sm:justify-end gap-2">
                    <ActionButton v-if="hasCurrentLoadout" bgColor="bg-red-600 text-white" @click="onRemove"
                        label="Retirer l'arme" />
                    <ActionButton bgColor="bg-neutral-overlay-dark text-light" @click="onCancel" label="Annuler" />
                    <ActionButton :disabled="!selectedWeaponId || !selectedSkinId" @click="onConfirm"
                        label="Confirmer" />
                </div>

                <p v-if="errorMessage" class="text-sm text-red-400">{{ errorMessage }}</p>
            </BaseCard>
        </div>
    </Transition>
</template>

<script setup>
import { computed, ref, watch } from 'vue'
import { usePlayerStore } from '@/store/playerStore'
import {
    fetchWeaponsCatalog,
    getWeaponById,
    getWeaponImage,
} from '@/services/api/valorantAPI'
import BaseCard from '../UI/BaseCard.vue'
import ActionButton from '../Buttons/actionButton.vue'

const props = defineProps({
    isOpen: Boolean,
    inventory: Array,
    currentPokemonId: Number,
    currentWeaponId: String,
    currentSkinId: String,
    errorMessage: {
        type: String,
        default: '',
    },
})

const emit = defineEmits(['cancel', 'confirm', 'clearError', 'remove'])
const playerStore = usePlayerStore()

const selectedWeaponId = ref('')
const selectedSkinId = ref('')

const hasCurrentLoadout = computed(() => {
    return Boolean(props.currentWeaponId && props.currentSkinId)
})

const weaponChoices = computed(() => {
    const inventory = Array.isArray(props.inventory) ? props.inventory : []

    return inventory.map((ownedWeapon) => {
        const weaponData = getWeaponById(ownedWeapon.id)
        const skinCount = Array.isArray(ownedWeapon.skins) ? ownedWeapon.skins.length : 0

        return {
            id: ownedWeapon.id,
            name: weaponData ? weaponData.name : ownedWeapon.name,
            image: getWeaponImage(ownedWeapon.id, ''),
            skinCount,
            availableUnits: playerStore.getWeaponAvailableUnits(ownedWeapon.id, props.currentPokemonId),
        }
    })
})

const skinChoices = computed(() => {
    const inventory = Array.isArray(props.inventory) ? props.inventory : []
    const selectedWeapon = inventory.find((weapon) => weapon.id === selectedWeaponId.value)

    if (!selectedWeapon) {
        return []
    }

    const ownedSkins = Array.isArray(selectedWeapon.skins) ? selectedWeapon.skins : []
    return ownedSkins.map((skin) => ({
        id: skin.id,
        name: skin.nom,
        image: skin.image,
    }))
})

function ensureSelectedSkin() {
    const skins = skinChoices.value
    if (!skins.length) {
        selectedSkinId.value = ''
        return
    }

    const currentSkinExists = skins.some((skin) => skin.id === selectedSkinId.value)
    if (!currentSkinExists) {
        selectedSkinId.value = skins[0].id
    }
}

function selectWeapon(weaponId) {
    selectedWeaponId.value = weaponId
    ensureSelectedSkin()
    emit('clearError')
}

function selectSkin(skinId) {
    selectedSkinId.value = skinId
    emit('clearError')
}

function onCancel() {
    emit('cancel')
}

function onConfirm() {
    if (!selectedWeaponId.value || !selectedSkinId.value) {
        return
    }

    const inventory = Array.isArray(props.inventory) ? props.inventory : []
    const selectedWeapon = inventory.find((weapon) => weapon.id === selectedWeaponId.value)
    const weaponName = selectedWeapon ? selectedWeapon.name : ''

    emit('confirm', {
        weaponName,
        skinId: selectedSkinId.value,
    })
}

function onRemove() {
    emit('clearError')
    emit('remove')
}

async function initializeSelection() {
    await fetchWeaponsCatalog()

    const inventory = Array.isArray(props.inventory) ? props.inventory : []
    if (!inventory.length) {
        selectedWeaponId.value = ''
        selectedSkinId.value = ''
        return
    }

    const hasCurrentWeapon = inventory.some((weapon) => weapon.id === props.currentWeaponId)
    selectedWeaponId.value = hasCurrentWeapon ? props.currentWeaponId : inventory[0].id

    const selectedWeapon = inventory.find((weapon) => weapon.id === selectedWeaponId.value)
    const hasCurrentSkin = selectedWeapon && Array.isArray(selectedWeapon.skins)
        ? selectedWeapon.skins.some((s) => s.id === props.currentSkinId)
        : false

    if (hasCurrentSkin) {
        selectedSkinId.value = props.currentSkinId
    } else {
        ensureSelectedSkin()
    }
}

watch(() => props.isOpen, async (isOpen) => {
    if (!isOpen) {
        return
    }

    await initializeSelection()
})

watch(skinChoices, () => {
    ensureSelectedSkin()
})
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
