<template>
    <div class="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-2 sm:p-4">
        <BaseCard bgColor="bg-neutral-overlay-dark"
            class="dark-border w-full md:max-w-2xl gap-6 sm:gap-8 max-h-[92vh] overflow-y-auto">
            <h3 class="text-base sm:text-lg font-bold text-light text-center">Équipe pleine - Choisir un Pokémon à
                remplacer</h3>

            <div class="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <button v-for="(poke, i) in team" :key="i" @click="select(i)"
                    :class="['p-2 text-left rounded border transition cursor-pointer', selected === i ? 'border-green-500 bg-green-500/20' : 'border border-surface-border hover:border-green-500']">
                    <p class=" text-light">{{ poke ? poke.name : 'Vide' }}</p>
                    <p class="text-xs text-legend text-disabled">Slot {{ i + 1 }}</p>
                </button>
            </div>

            <div class="flex flex-col sm:flex-row gap-2 sm:justify-end">
                <ActionButton bgColor="bg-gray-700" class="text-light font-normal" @click="$emit('cancel')"
                    label="Annuler" />
                <ActionButton @click="$emit('swap', selected)" :disabled="selected === null" label="Échanger" />
            </div>
        </BaseCard>
    </div>
</template>

<script setup>
import { ref } from 'vue'
import BaseCard from '../UI/BaseCard.vue'
import ActionButton from '../Buttons/actionButton.vue'

defineProps({
    team: Array,
})

defineEmits(['swap', 'cancel'])

const selected = ref(null)
const select = (i) => {
    selected.value = selected.value === i ? null : i
}
</script>
