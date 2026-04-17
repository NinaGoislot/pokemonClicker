import {
  fetchPokemonById,
  MAX_POKEMON_ID,
} from '../services/api/pokeAPI'

const MOTHERLODE_AMOUNT = 50000

function parseCommandRoute(to) {
  if (to.name !== 'Command') {
    return null
  }

  const rawCommand = String(to.params.rawCommand || '')
  const routeArg = to.params.arg == null ? '' : String(to.params.arg)

  let commandName = rawCommand
  let arg = routeArg

  // Support both /command/addPokemon/25 and /command/addPokemon(25)
  const openParenIndex = rawCommand.indexOf('(')
  if (openParenIndex > 0 && rawCommand.endsWith(')')) {
    commandName = rawCommand.slice(0, openParenIndex)
    arg = rawCommand.slice(openParenIndex + 1, -1)
  }

  return {
    commandName: commandName.toLowerCase(),
    arg,
  }
}

function parsePokemonId(rawArg) {
  const id = Number(rawArg)
  if (!Number.isInteger(id) || id < 1 || id > MAX_POKEMON_ID) {
    return null
  }

  return id
}

async function executeUrlCommand(command, playerStore) {
  if (command.commandName === 'motherlode') {
    playerStore.addCredits(MOTHERLODE_AMOUNT)
    return
  }

  const shouldAddPokemon = command.commandName === 'addpokemon'
  const shouldAddShinyPokemon = command.commandName === 'addshinypokemon'
  if (!shouldAddPokemon && !shouldAddShinyPokemon) {
    return
  }

  const pokemonId = parsePokemonId(command.arg)
  if (!pokemonId) {
    return
  }

  const pokemon = await fetchPokemonById(pokemonId, {
    isShiny: shouldAddShinyPokemon,
    includeSpeciesFlags: true,
  })
  playerStore.addPokemonToPokedex(pokemon)
}

export async function executeCommandFromRoute(to, playerStore) {
  const command = parseCommandRoute(to)
  if (!command) {
    return false
  }

  if (playerStore.hasPlayer) {
    await executeUrlCommand(command, playerStore)
  }

  return true
}
