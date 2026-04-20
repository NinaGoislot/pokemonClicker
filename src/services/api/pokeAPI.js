const API_BASE_URL = 'https://pokeapi.co/api/v2'
export const MAX_POKEMON_ID = 1025

const statToGameKey = {
  hp: 'hp',
  attack: 'attack',
  defense: 'defense',
  'special-attack': 'specialAttack',
  'special-defense': 'specialDefense',
  speed: 'speed',
}

function randomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min
}

function getSpriteUrls(rawPokemon, isShiny) {
  const sprites = rawPokemon && rawPokemon.sprites ? rawPokemon.sprites : null
  const spritesOther = sprites && sprites.other ? sprites.other : null
  const officialArtworkGroup = spritesOther && spritesOther['official-artwork'] ? spritesOther[
    'official-artwork'] : null
  const officialArtwork = officialArtworkGroup ?
    (isShiny ? (officialArtworkGroup.front_shiny || '') : (officialArtworkGroup.front_default ||
      '')) :
    ''
  const front = sprites ?
    (isShiny ? (sprites.front_shiny || '') : (sprites.front_default || '')) :
    ''
  const back = sprites && sprites.back_default ? sprites.back_default : ''

  return {
    front: officialArtwork ||
      front ||
      '',
    back,
  }
}

async function normalizePokemon(rawPokemon, isShiny) {
  const stats = rawPokemon.stats.reduce((acc, entry) => {
    const statKey = statToGameKey[entry.stat.name]
    if (statKey) {
      acc[statKey] = entry.base_stat
    }
    return acc
  }, {})

  const types = rawPokemon.types.map((entry) => entry.type.name)
  const sprites = getSpriteUrls(rawPokemon, isShiny)

  const hp = stats.hp != null ? stats.hp : 50
  const attack = stats.attack != null ? stats.attack : 50
  const defense = stats.defense != null ? stats.defense : 50
  const specialAttack = stats.specialAttack != null ? stats.specialAttack : 50
  const specialDefense = stats.specialDefense != null ? stats.specialDefense : 50
  const speed = stats.speed != null ? stats.speed : 50

  // Check if this Pokemon is legendary/mythical via species endpoint
  const isLegendary = await fetchPokemonIsLegendary(rawPokemon.id)

  return {
    id: rawPokemon.id,
    name: rawPokemon.name,
    displayName: rawPokemon.name[0].toUpperCase() + rawPokemon.name.slice(1),
    sprites,
    isShiny: Boolean(isShiny),
    isLegendary: Boolean(isLegendary),
    types,
    stats: {
      hp,
      attack,
      defense,
      specialAttack,
      specialDefense,
      speed,
    },
  }
}

async function fetchFromPokeAPI(path) {
  const response = await fetch(`${API_BASE_URL}${path}`)
  if (!response.ok) {
    throw new Error(`PokeAPI request failed: ${response.status}`)
  }

  return response.json()
}

async function fetchPokemonSpeciesById(id) {
  return fetchFromPokeAPI(`/pokemon-species/${id}`)
}

export async function fetchPokemonById(id, options = {}) {
  const isShiny = Boolean(options.isShiny)
  const rawPokemon = await fetchFromPokeAPI(`/pokemon/${id}`)
  return await normalizePokemon(rawPokemon, isShiny)
}

export async function fetchPokemonByName(name, options = {}) {
  const isShiny = Boolean(options.isShiny)
  const rawPokemon = await fetchFromPokeAPI(`/pokemon/${name.toLowerCase()}`)
  return await normalizePokemon(rawPokemon, isShiny)
}

export async function fetchPokemonShinySpriteById(id) {
  const rawPokemon = await fetchFromPokeAPI(`/pokemon/${id}`)
  const sprites = getSpriteUrls(rawPokemon, true)
  return sprites.front || ''
}

export async function fetchRandomWildPokemons(count = 3) {
  const requests = Array.from({
    length: count
  }, () => {
    const randomPokemonId = randomInt(1, MAX_POKEMON_ID)
    return fetchPokemonById(randomPokemonId)
  })

  return Promise.all(requests)
}

let cachedLegendaryIds = null // Cache of legendary Pokemon IDs (array) to avoid repeated API calls      
let legendaryIdsPromise = null 

/**
 * Fetch and cache all legendary + mythical Pokemon IDs
 *
 * this exists because:
 * - The /pokemon endpoint does NOT have is_legendary / is_mythical flags (POURQUOI ???)
 * - We must query /pokemon-species for each Pokemon to check those flags
 * - We do it once, cache the results, then reuse them everywhere
 *
 * Returns: Array of Pokemon IDs that are legendary or mythical
 */
export async function fetchLegendaryPokemonIds(limit = 50) {
  // If we already cached the list, return it immediately
  if (Array.isArray(cachedLegendaryIds)) {
    return cachedLegendaryIds
  }

  // If a fetch is already in progress, reuse that promise so we don't trigger multiple fetches at the same time        
  if (legendaryIdsPromise) {
    return legendaryIdsPromise
  }

  // Ensure limit is a safe number between 1 and MAX_POKEMON_ID
  const batchSize = Math.max(Math.min(Number(limit) || 50, MAX_POKEMON_ID), 1) // group of requests at th same time, here 50 mainly

  // Start the fetch and cache the promise
  legendaryIdsPromise = (async () => {
    const legendaryIds = []

    // Go through all Pokemon in batch (group of requests) to avoid flooding the API
    for (let currentId = 1; currentId <= MAX_POKEMON_ID; currentId += batchSize) {
      const endId = Math.min(currentId + batchSize - 1, MAX_POKEMON_ID)

      // Build a list of IDs for this batch
      const idsToFetch = []
      for (let id = currentId; id <= endId; id += 1) {
        idsToFetch.push(id)
      }

      // Fetch all species data for this batch in parallel (faster than one-by-one)
      const speciesResults = await Promise.all(
        idsToFetch.map((id) => fetchPokemonSpeciesById(id).catch(() => null)),
      )

      // Check each species: if it's legendary or mythical, remember its ID
      for (const species of speciesResults) {
        if (!species) {
          continue
        }

        if (species.is_legendary || species.is_mythical) {
          legendaryIds.push(species.id)
        }
      }
    }

    // Store the result in cache
    cachedLegendaryIds = legendaryIds
    return legendaryIds
  })()

  try {
    return await legendaryIdsPromise
  } finally {
    // Clear the promise tracker so the next full scan can start fresh if cache expires
    legendaryIdsPromise = null
  }
}

export async function fetchPokemonIsLegendary(id) {
  try {
    const species = await fetchPokemonSpeciesById(id)
    return Boolean(species.is_legendary || species.is_mythical)
  } catch (error) {
    console.error(`Impossible de verifier si le pokemon ${id} est legendaire`, error)
    return false
  }
}

export async function getPokemonByName(name, options = {}) {
  return fetchPokemonByName(name, options)
}
