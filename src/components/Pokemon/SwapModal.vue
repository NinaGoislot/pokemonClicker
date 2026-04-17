<template>
    <div class="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4">
        <BaseCard bgColor="bg-neutral-overlay-dark" class="dark-border w-1/4 gap-8">
            <h3 class="text-lg font-bold text-light text-center">Équipe pleine - Choisir un Pokémon à remplacer</h3>

            <div class="flex flex-wrap gap-2 justify-center">
                <button v-for="(poke, i) in team" :key="i" @click="select(i)"
                    :class="['w-2/5 p-2 text-left rounded border transition cursor-pointer', selected === i ? 'border-green-500 bg-green-500/20' : 'border border-surface-border hover:border-green-500']">
                    <p class=" text-light">{{ poke ? poke.name : 'Vide' }}</p>
                    <p class="text-xs text-legend text-disabled">Slot {{ i + 1 }}</p>
                </button>
            </div>

            <div class="flex gap-2 justify-end">
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
