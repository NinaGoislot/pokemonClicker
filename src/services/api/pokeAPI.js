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

function normalizePokemon(rawPokemon, isShiny) {
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

  return {
    id: rawPokemon.id,
    name: rawPokemon.name,
    displayName: rawPokemon.name[0].toUpperCase() + rawPokemon.name.slice(1),
    sprites,
    isShiny: Boolean(isShiny),
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
  return normalizePokemon(rawPokemon, isShiny)
}

export async function fetchPokemonByName(name, options = {}) {
  const isShiny = Boolean(options.isShiny)
  const rawPokemon = await fetchFromPokeAPI(`/pokemon/${name.toLowerCase()}`)
  return normalizePokemon(rawPokemon, isShiny)
}

export async function getPokemonByName(name, options = {}) {
  return fetchPokemonByName(name, options)
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

let cachedLegendaryIds = null
let legendaryIdsPromise = null

export async function fetchLegendaryPokemonIds(limit = 50) {
  if (Array.isArray(cachedLegendaryIds)) {
    return cachedLegendaryIds
  }

  if (legendaryIdsPromise) {
    return legendaryIdsPromise
  }

  const safeLimit = Math.max(Math.min(Number(limit) || 50, MAX_POKEMON_ID), 1)

  legendaryIdsPromise = (async () => {
    const legendaryIds = []

    for (let startId = 1; startId <= MAX_POKEMON_ID; startId += safeLimit) {
      const endId = Math.min(startId + safeLimit - 1, MAX_POKEMON_ID)
      const batchIds = []

      for (let id = startId; id <= endId; id += 1) {
        batchIds.push(id)
      }

      const batchResults = await Promise.all(
        batchIds.map((id) => fetchPokemonSpeciesById(id).catch(() => null)),
      )

      for (const entry of batchResults) {
        if (!entry) {
          continue
        }

        if (entry.is_legendary || entry.is_mythical) {
          legendaryIds.push(entry.id)
        }
      }
    }

    cachedLegendaryIds = legendaryIds
    return legendaryIds
  })()

  try {
    return await legendaryIdsPromise
  } finally {
    legendaryIdsPromise = null
  }
}
