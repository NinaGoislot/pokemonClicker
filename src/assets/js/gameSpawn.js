import {
  fetchLegendaryPokemonIds,
  fetchPokemonById,
  MAX_POKEMON_ID,
} from '../../services/api/pokeAPI'
import {
  RARITY_OPTIONS,
} from './options'

let legendaryPokemonIds = []
let legendaryPokemonSet = new Set()
let legendaryIdsPromise = null
const LEGENDARY_CACHE_KEY = 'legendary-pokemon-ids'
const LEGENDARY_CACHE_TTL_MS = 7 * 24 * 60 * 60 * 1000 // 1 week

function loadLegendaryCache() {
  try {
    const raw = localStorage.getItem(LEGENDARY_CACHE_KEY)
    if (!raw) {
      return false
    }

    const parsed = JSON.parse(raw)
    if (!parsed || !Array.isArray(parsed.ids) || typeof parsed.savedAt !== 'number') {
      return false
    }

    if (Date.now() - parsed.savedAt > LEGENDARY_CACHE_TTL_MS) {
      return false
    }

    legendaryPokemonIds = parsed.ids
      .map((id) => Number(id))
      .filter((id) => Number.isFinite(id))
    legendaryPokemonSet = new Set(legendaryPokemonIds)
    return Boolean(legendaryPokemonIds.length)
  } catch (error) {
    console.warn('Cache legendaires invalide', error)
    return false
  }
}

function saveLegendaryCache(ids) {
  try {
    const payload = {
      savedAt: Date.now(),
      ids,
    }
    localStorage.setItem(LEGENDARY_CACHE_KEY, JSON.stringify(payload))
  } catch (error) {
    console.warn('Cache legendaires non sauvegarde', error)
  }
}

function randomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min
}

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max)
}

function pickRandomFromList(values) {
  if (!Array.isArray(values) || !values.length) {
    return null
  }

  return values[randomInt(0, values.length - 1)]
}

export async function ensureLegendaryPokemonIds(limit = 50) {
  if (legendaryPokemonIds.length) {
    return
  }

  if (loadLegendaryCache()) {
    return
  }

  if (legendaryIdsPromise) {
    await legendaryIdsPromise
    return
  }

  legendaryIdsPromise = fetchLegendaryPokemonIds(limit)
    .then((ids) => {
      legendaryPokemonIds = Array.isArray(ids) ? ids : []
      legendaryPokemonSet = new Set(legendaryPokemonIds)
      if (legendaryPokemonIds.length) {
        saveLegendaryCache(legendaryPokemonIds)
      }
    })
    .catch((error) => {
      console.error('Erreur chargement pokemons legendaires', error)
      legendaryPokemonIds = []
      legendaryPokemonSet = new Set()
    })
    .finally(() => {
      legendaryIdsPromise = null
    })

  await legendaryIdsPromise
}

export function getNormalPokemonId() {
  if (!legendaryPokemonSet.size) {
    return randomInt(1, MAX_POKEMON_ID)
  }

  let attempts = 0

  while (attempts < 25) {
    const candidate = randomInt(1, MAX_POKEMON_ID)
    if (!legendaryPokemonSet.has(candidate)) {
      return candidate
    }
    attempts += 1
  }

  return randomInt(1, MAX_POKEMON_ID)
}

export function getRarityFromKills(killsCount) {
  const killCount = Math.max(Number(killsCount) || 0, 0)

  const shinyLegendaryChance = clamp(
    RARITY_OPTIONS.baseShinyLegendaryChance + killCount * RARITY_OPTIONS.killBonusShinyLegendary,
    0,
    RARITY_OPTIONS.maxShinyLegendaryChance,
  )

  const shinyChance = clamp(
    RARITY_OPTIONS.baseShinyChance + killCount * RARITY_OPTIONS.killBonusShiny,
    0,
    RARITY_OPTIONS.maxShinyChance,
  )

  const legendaryChance = clamp(
    RARITY_OPTIONS.baseLegendaryChance + killCount * RARITY_OPTIONS.killBonusLegendary,
    0,
    RARITY_OPTIONS.maxLegendaryChance,
  )

  const roll = Math.random()
  if (roll < shinyLegendaryChance) {
    return 'shiny-legendary'
  }

  if (roll < shinyLegendaryChance + shinyChance) {
    return 'shiny'
  }

  if (roll < shinyLegendaryChance + shinyChance + legendaryChance) {
    return 'legendary'
  }

  return 'normal'
}

export async function fetchPokemonForRarity(rarity) {
  const isLegendary = rarity === 'legendary' || rarity === 'shiny-legendary'
  const isShiny = rarity === 'shiny' || rarity === 'shiny-legendary'

  const pokemonId = isLegendary ?
    (pickRandomFromList(legendaryPokemonIds) || randomInt(1, MAX_POKEMON_ID)) :
    getNormalPokemonId()

  return fetchPokemonById(pokemonId, {
    isShiny
  })
}
