export const STORAGE_KEY = 'player-data'
export const ACTIVE_TEAM_SIZE = 6

export function createEmptyTeam() {
  return Array.from({
    length: ACTIVE_TEAM_SIZE
  }, () => null)
}

export function toPokemonId(pokemon) {
  if (!pokemon) return null
  const rawId = pokemon.pokemonId != null ? pokemon.pokemonId : pokemon.id
  const pokemonId = Number(rawId)
  return Number.isFinite(pokemonId) ? pokemonId : null
}

export function getSpriteFront(pokemon, pokemonId) {
  if (pokemon && pokemon.sprites && pokemon.sprites.front) {
    return pokemon.sprites.front
  }

  if (pokemon && pokemon.spriteFront) {
    return pokemon.spriteFront
  }

  return `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/${pokemonId}.png`
}

export function normalizeWeapon(rawWeapon) {
  if (!rawWeapon || typeof rawWeapon !== 'object') {
    return null
  }

  const maxDamage = Number(rawWeapon.maxDamage)
  return {
    id: rawWeapon.id || null,
    name: rawWeapon.name || 'Arme',
    image: rawWeapon.image || '',
    maxDamage: Number.isFinite(maxDamage) ? Math.max(Math.round(maxDamage), 0) : 0,
  }
}

export function normalizeWeaponInventory(rawInventory) {
  if (!Array.isArray(rawInventory)) {
    return []
  }

  const seenIds = new Set()
  const normalized = []

  for (const weapon of rawInventory) {
    if (!weapon || typeof weapon !== 'object') {
      continue
    }

    const weaponId = weapon.id || null
    if (!weaponId || seenIds.has(weaponId)) {
      continue
    }

    const rawSkins = Array.isArray(weapon.skins) ? weapon.skins : []
    const uniqueSkinIds = [...new Set(rawSkins.filter((skinId) => Boolean(skinId)))]

    normalized.push({
      id: weaponId,
      name: weapon.name || 'Arme',
      skins: uniqueSkinIds,
    })
    seenIds.add(weaponId)
  }

  return normalized
}

export function getPokemonBaseAttack(pokemon) {
  if (!pokemon || typeof pokemon !== 'object') {
    return 100
  }

  let attackValue = pokemon.baseAttack
  if (attackValue == null && pokemon.stats && typeof pokemon.stats === 'object') {
    attackValue = pokemon.stats.attack
  }

  const attack = Number(attackValue)

  if (!Number.isFinite(attack)) {
    return 100
  }

  return Math.max(Math.round(attack), 1)
}

export function getPokemonBaseHp(pokemon) {
  if (!pokemon || typeof pokemon !== 'object') {
    return 80
  }

  let hpValue = pokemon.baseHp
  if (hpValue == null && pokemon.stats && typeof pokemon.stats === 'object') {
    hpValue = pokemon.stats.hp
  }

  const hp = Number(hpValue)
  if (!Number.isFinite(hp)) {
    return 80
  }

  return Math.max(Math.round(hp), 1)
}

export function normalizePokemonEntry(pokemon) {
  const pokemonId = toPokemonId(pokemon)
  if (pokemonId === null) {
    return null
  }

  let weaponId = null
  let skinId = null
  if (pokemon && typeof pokemon === 'object') {
    if (pokemon.weaponId) {
      weaponId = pokemon.weaponId
    }
    if (pokemon.skinId) {
      skinId = pokemon.skinId
    }

    // Backward compatibility with old shape { weapon: { id } }
    if (!weaponId && pokemon.weapon && typeof pokemon.weapon === 'object') {
      weaponId = pokemon.weapon.id || null
    }
  }

  return {
    pokemonId,
    name: pokemon.displayName || pokemon.name || 'Pokemon',
    spriteFront: getSpriteFront(pokemon, pokemonId),
    isShiny: Boolean(pokemon.isShiny),
    baseAttack: getPokemonBaseAttack(pokemon),
    baseHp: getPokemonBaseHp(pokemon),
    weaponId,
    skinId,
  }
}

export function normalizePokedexFromStorage(rawPokedex) {
  if (!Array.isArray(rawPokedex)) {
    return []
  }

  const uniqueEntries = []
  const seenIds = new Set()

  for (const pokemon of rawPokedex) {
    const entry = normalizePokemonEntry(pokemon)
    if (!entry || seenIds.has(entry.pokemonId)) {
      continue
    }

    seenIds.add(entry.pokemonId)
    uniqueEntries.push(entry)
  }

  return uniqueEntries
}

export function normalizeTeamIds(rawTeamIds) {
  if (!Array.isArray(rawTeamIds) || rawTeamIds.length !== ACTIVE_TEAM_SIZE) {
    return createEmptyTeam()
  }

  return rawTeamIds.map((id) => {
    const pokemonId = Number(id)
    return Number.isFinite(pokemonId) ? pokemonId : null
  })
}

export function findFirstNonNullId(teamIds) {
  return teamIds.find((id) => id !== null) || null
}

export function ensureValidActivePokemonId(activePokemonId, teamIds) {
  const parsed = Number(activePokemonId)
  if (Number.isFinite(parsed) && teamIds.includes(parsed)) {
    return parsed
  }

  return findFirstNonNullId(teamIds)
}

export function removeDuplicateInTeam(teamIds, pokemonId, keepIndex) {
  const duplicateIndex = teamIds.findIndex((id, index) => id === pokemonId && index !== keepIndex)
  if (duplicateIndex !== -1) {
    teamIds[duplicateIndex] = null
  }
}
