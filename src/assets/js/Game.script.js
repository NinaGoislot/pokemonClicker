import {
  computed,
  onUnmounted,
  ref
} from 'vue'
import {
  fetchPokemonShinySpriteById,
} from '../../services/api/pokeAPI'
import {
  ensureLegendaryPokemonIds,
  fetchPokemonForRarity,
  getRarityFromKills,
} from './gameSpawn'
import {
  fetchWeaponsCatalog,
  getRandomEnemyLoadout,
  getWeaponImage,
  getWeaponMaxDamage,
} from '../../services/api/valorantAPI'
import {
  CAPTURE_OPTIONS,
  CREDIT_PENALTIES,
  CREDIT_REWARDS,
  DEFAULT_DIFFICULTY,
  ENEMY_ATTACK_OPTIONS,
  ROUND_CONFIG,
  WEAPON_CATEGORY_SPAWN_WEIGHTS,
} from './options'
import {
  usePlayerStore
} from '../../store/playerStore'

function randomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min
}

function toDurationLabel(ms) {
  // Format a duration in ms as mm:ss.
  const safeMs = Math.max(ms, 0)
  const totalSeconds = Math.ceil(safeMs / 1000)
  const minutes = Math.floor(totalSeconds / 60)
  const seconds = totalSeconds % 60
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`
}

function randomArenaPosition() {
  // Random % position constrained to the arena bounds.
  const left = Math.floor(Math.random() * 75)
  const top = Math.floor(Math.random() * 55)
  return {
    left: `${left}%`,
    top: `${top}%`,
  }
}

function randomAttackDelay() {
  // Per-enemy cooldown based on configured min/max.
  return randomInt(ENEMY_ATTACK_OPTIONS.minIntervalMs, ENEMY_ATTACK_OPTIONS.maxIntervalMs)
}


function createBattleTeamFromStore(activeTeam, difficultyConfig) {
  // Normalize team members for battle state.
  const members = []

  for (const pokemon of activeTeam) {
    if (!pokemon) {
      continue
    }

    const baseHp = Number(pokemon.baseAttack) || 80
    const maxHp = Math.max(Math.round(baseHp * difficultyConfig.playerHpMultiplier), 40)

    members.push({
      pokemonId: pokemon.pokemonId,
      name: pokemon.name,
      spriteFront: pokemon.spriteFront,
      weaponId: pokemon.weaponId,
      skinId: pokemon.skinId,
      maxHp,
      currentHp: maxHp,
      isDead: false,
    })
  }

  return members
}

export function useGame() {
  const playerStore = usePlayerStore()

  const selectedDifficulty = ref(DEFAULT_DIFFICULTY)
  const isLoadingRound = ref(false)
  const isRoundRunning = ref(false)
  const hasRoundEnded = ref(false)
  const roundResult = ref('')
  const roundFeedback = ref('')

  const enemies = ref([])
  const battleTeam = ref([])
  const playerHitFlash = ref(false)
  const playerRecoil = ref(false)

  const killsCount = ref(0)
  const roundStartedAt = ref(0)
  const roundEndsAt = ref(0)
  const roundTimeLeftMs = ref(0)

  let instanceSeed = 0
  let spawnTicker = null
  let roundTicker = null
  let attackTicker = null

  const difficultyOptions = computed(() => {
    return [ROUND_CONFIG.easy, ROUND_CONFIG.medium, ROUND_CONFIG.hard]
  })

  const currentDifficulty = computed(() => {
    return ROUND_CONFIG[selectedDifficulty.value] || ROUND_CONFIG[DEFAULT_DIFFICULTY]
  })

  const roundTimerLabel = computed(() => {
    return toDurationLabel(roundTimeLeftMs.value)
  })

  const activeBattlePokemon = computed(() => {
    const activeId = playerStore.activePokemonId
    if (!activeId) {
      return null
    }

    return battleTeam.value.find((member) => member.pokemonId === activeId) || null
  })

  const activePokemonSprite = computed(() => {
    const member = activeBattlePokemon.value
    if (member && member.spriteFront) {
      return member.spriteFront
    }

    const storePokemon = playerStore.activePokemon
    return storePokemon && storePokemon.spriteFront ? storePokemon.spriteFront : ''
  })

  const activePokemonWeaponSprite = computed(() => {
    const member = activeBattlePokemon.value
    if (!member || !member.weaponId) {
      return ''
    }

    return getWeaponImage(member.weaponId, member.skinId)
  })

  const activePokemonAttack = computed(() => {
    const storePokemon = playerStore.activePokemon
    const attack = Number(storePokemon && storePokemon.baseAttack)
    return Number.isFinite(attack) ? Math.max(attack, 1) : 100
  })

  const activePokemonWeaponDamage = computed(() => {
    const member = activeBattlePokemon.value
    if (!member || !member.weaponId) {
      return 50
    }

    return getWeaponMaxDamage(member.weaponId)
  })

  const clickDamage = computed(() => {
    const multiplier = activePokemonAttack.value / 100
    return Math.max(Math.round(activePokemonWeaponDamage.value * multiplier), 1)
  })

  const playerHpPercent = computed(() => {
    const member = activeBattlePokemon.value
    if (!member || !member.maxHp) {
      return 0
    }

    return Math.max(Math.round((member.currentHp / member.maxHp) * 100), 0)
  })

  const livingEnemiesCount = computed(() => {
    return enemies.value.filter((enemy) => enemy.currentHp > 0).length
  })

  function clearTickers() {
    // Stop all running intervals.
    if (spawnTicker) {
      clearInterval(spawnTicker)
      spawnTicker = null
    }

    if (roundTicker) {
      clearInterval(roundTicker)
      roundTicker = null
    }

    if (attackTicker) {
      clearInterval(attackTicker)
      attackTicker = null
    }
  }

  function resetRoundState() {
    // Reset transient battle state.
    clearTickers()
    enemies.value = []
    battleTeam.value = []
    killsCount.value = 0
    roundStartedAt.value = 0
    roundEndsAt.value = 0
    roundTimeLeftMs.value = 0
    isRoundRunning.value = false
    hasRoundEnded.value = false
    roundResult.value = ''
    roundFeedback.value = ''
    playerHitFlash.value = false
    playerRecoil.value = false
  }

  function createEnemyInstance(pokemon, loadout, rarity, difficultyConfig) {
    // Merge Pokemon stats with battle metadata.
    instanceSeed += 1

    const baseHp = Number(pokemon.stats && pokemon.stats.hp) || 60
    const maxHp = Math.max(Math.round(baseHp * difficultyConfig.enemyHpMultiplier), 80)
    const weaponDamage = getWeaponMaxDamage(loadout.weaponId)

    return {
      ...pokemon,
      instanceId: `${pokemon.id}-${instanceSeed}`,
      maxHp,
      currentHp: maxHp,
      weaponId: loadout.weaponId,
      skinId: loadout.skinId,
      weaponImage: loadout.image,
      weaponDamage,
      rarity,
      isRecoiling: false,
      isHit: false,
      nextAttackAt: Date.now() + randomAttackDelay(),
      position: randomArenaPosition(),
      capturableUntil: 0,
    }
  }

  function getLivingTeamMembers() {
    // Filter alive allies.
    return battleTeam.value.filter((member) => !member.isDead && member.currentHp > 0)
  }

  function switchToNextLivingPokemon() {
    // Auto switch to the next alive ally.
    const nextMember = getLivingTeamMembers()[0] || null
    if (!nextMember) {
      return false
    }

    playerStore.setActivePokemon(nextMember.pokemonId)
    return true
  }

  function setRoundFinished(result, feedback) {
    // End round and freeze state.
    if (!isRoundRunning.value) {
      return
    }

    isRoundRunning.value = false
    hasRoundEnded.value = true
    roundResult.value = result
    roundFeedback.value = feedback
    clearTickers()
  }

  function loseRound() {
    // Apply penalty and stop the round.
    const lostCredits = playerStore.loseCreditsPercent(CREDIT_PENALTIES.loseRoundPercent)
    setRoundFinished('lost', `Round perdu. -${lostCredits} crédits.`)
  }

  function winRound() {
    // Stop the round with a win message.
    setRoundFinished('won', 'Round terminé. Bien joué.')
  }

  function markEnemyAsDead(enemy) {
    // Set capture window and queue a spawn attempt.
    enemy.currentHp = 0
    enemy.capturableUntil = Date.now() + CAPTURE_OPTIONS.availableWindowMs
    killsCount.value += 1
    playerStore.addCredits(CREDIT_REWARDS.enemyKill)

    spawnEnemiesIfNeeded(true).catch((error) => {
      console.error('Erreur spawn ennemi', error)
    })
  }

  function runEnemyAttack(enemy) {
    // Execute one enemy attack cycle.
    const activeMember = activeBattlePokemon.value
    if (!activeMember || activeMember.isDead || activeMember.currentHp <= 0) {
      return
    }

    enemy.isRecoiling = true
    setTimeout(() => {
      enemy.isRecoiling = false
    }, 180)

    playerHitFlash.value = true
    setTimeout(() => {
      playerHitFlash.value = false
    }, 220)

    const attackDamage = Math.max(Math.round(enemy.weaponDamage * 0.34), 10)
    activeMember.currentHp = Math.max(activeMember.currentHp - attackDamage, 0)

    if (activeMember.currentHp <= 0) {
      activeMember.isDead = true
      const switched = switchToNextLivingPokemon()
      if (!switched) {
        loseRound()
      }
    }
  }

  function updateEnemyAttackLoop() {
    // Tick for all enemies that can attack.
    if (!isRoundRunning.value) {
      return
    }

    const activeMember = activeBattlePokemon.value
    if (!activeMember || activeMember.isDead || activeMember.currentHp <= 0) {
      const switched = switchToNextLivingPokemon()
      if (!switched) {
        loseRound()
        return
      }
    }

    const now = Date.now()
    for (const enemy of enemies.value) {
      if (enemy.currentHp <= 0) {
        continue
      }

      if (now < enemy.nextAttackAt) {
        continue
      }

      enemy.nextAttackAt = now + randomAttackDelay()
      runEnemyAttack(enemy)
    }
  }

  function cleanupExpiredCaptures() {
    // Remove dead enemies whose capture window ended.
    const now = Date.now()
    enemies.value = enemies.value.filter((enemy) => {
      if (enemy.currentHp > 0) {
        return true
      }

      return now <= enemy.capturableUntil
    })
  }


  async function spawnOneEnemy(difficultyConfig) {
    // Spawn a single enemy with rarity + loadout.
    const rarity = getRarityFromKills(killsCount.value)
    const pokemon = await fetchPokemonForRarity(rarity)
    if (!pokemon || !pokemon.sprites || !pokemon.sprites.front) {
      return null
    }

    const loadout = await getRandomEnemyLoadout({
      allowedCategoryIds: difficultyConfig.enemyCategoryIds,
      categoryWeights: WEAPON_CATEGORY_SPAWN_WEIGHTS,
    })

    return createEnemyInstance(pokemon, loadout, rarity, difficultyConfig)
  }

  async function spawnEnemiesIfNeeded(forceSpawn) {
    // Decide how many enemies to add and spawn them.
    if (!isRoundRunning.value) {
      return
    }

    cleanupExpiredCaptures()

    const difficultyConfig = currentDifficulty.value
    const aliveCount = enemies.value.filter((enemy) => enemy.currentHp > 0).length

    if (aliveCount >= difficultyConfig.maxEnemies) {
      return
    }

    let toSpawn = 0
    if (aliveCount < difficultyConfig.minEnemies) {
      toSpawn = difficultyConfig.minEnemies - aliveCount
    } else {
      const shouldTryProbabilisticSpawn = forceSpawn || Math.random() < 0.58
      if (shouldTryProbabilisticSpawn) {
        toSpawn = 1
      }
    }

    if (!toSpawn) {
      return
    }

    const maxPossible = difficultyConfig.maxEnemies - aliveCount
    const spawnCount = Math.min(toSpawn, maxPossible)

    for (let i = 0; i < spawnCount; i += 1) {
      const enemy = await spawnOneEnemy(difficultyConfig)
      if (enemy) {
        enemies.value.push(enemy)
      }
    }
  }

  function setupRoundTickers() {
    // Start main round timers (spawn, round clock, attacks).
    const difficultyConfig = currentDifficulty.value

    spawnTicker = setInterval(() => {
      spawnEnemiesIfNeeded(false).catch((error) => {
        console.error('Erreur spawn périodique', error)
      })
    }, difficultyConfig.spawnIntervalMs)

    roundTicker = setInterval(() => {
      if (!isRoundRunning.value) {
        return
      }

      const now = Date.now()
      roundTimeLeftMs.value = Math.max(roundEndsAt.value - now, 0)

      cleanupExpiredCaptures()

      if (roundTimeLeftMs.value <= 0) {
        winRound()
      }
    }, 250)

    attackTicker = setInterval(() => {
      updateEnemyAttackLoop()
    }, 150)
  }

  async function startRound() {
    // Validate prerequisites, initialize round, and start timers.
    if (isLoadingRound.value || isRoundRunning.value) {
      return
    }

    playerStore.loadFromStorage()
    if (!playerStore.hasTeam) {
      roundFeedback.value = 'Aucune équipe active.'
      return
    }

    const teamHasLoadout = playerStore.activeTeam.every((pokemon) => {
      return !pokemon || (pokemon.weaponId && pokemon.skinId)
    })

    if (!teamHasLoadout) {
      roundFeedback.value = 'Tous les pokémons de l\'équipe doivent avoir une arme et un skin.'
      return
    }

    isLoadingRound.value = true
    resetRoundState()

    try {
      await fetchWeaponsCatalog()
      await ensureLegendaryPokemonIds()

      const difficultyConfig = currentDifficulty.value
      battleTeam.value = createBattleTeamFromStore(playerStore.activeTeam, difficultyConfig)

      if (!battleTeam.value.length) {
        roundFeedback.value = 'Aucun pokémon vivant pour lancer le round.'
        return
      }

      playerStore.setActivePokemon(battleTeam.value[0].pokemonId)

      const now = Date.now()
      roundStartedAt.value = now
      roundEndsAt.value = now + difficultyConfig.durationMs
      roundTimeLeftMs.value = difficultyConfig.durationMs
      isRoundRunning.value = true
      hasRoundEnded.value = false
      roundResult.value = ''
      roundFeedback.value = ''

      await spawnEnemiesIfNeeded(true)
      setupRoundTickers()
    } finally {
      isLoadingRound.value = false
    }
  }

  function setPlayerAttackPulse() {
    // Brief recoil animation on player attacks.
    playerRecoil.value = true
    setTimeout(() => {
      playerRecoil.value = false
    }, 120)
  }

  function damageEnemy(enemyInstanceId) {
    // Apply click damage to a single enemy.
    if (!isRoundRunning.value) {
      return
    }

    const enemy = enemies.value.find((entry) => entry.instanceId === enemyInstanceId)
    if (!enemy || enemy.currentHp <= 0) {
      return
    }

    setPlayerAttackPulse()

    enemy.isHit = true
    setTimeout(() => {
      enemy.isHit = false
    }, 160)

    enemy.currentHp -= clickDamage.value
    if (enemy.currentHp <= 0) {
      markEnemyAsDead(enemy)
    }
  }

  async function captureEnemy(enemyInstanceId) {
    // Capture a dead enemy during its capture window.
    const index = enemies.value.findIndex((entry) => entry.instanceId === enemyInstanceId)
    if (index < 0) {
      return
    }

    const enemy = enemies.value[index]
    if (enemy.currentHp > 0) {
      return
    }

    if (Date.now() > enemy.capturableUntil) {
      enemies.value.splice(index, 1)
      return
    }

    const capturedPokemon = {
      id: enemy.id,
      name: enemy.name,
      displayName: enemy.displayName,
      stats: enemy.stats,
      sprites: {
        front: enemy.sprites.front,
      },
      isShiny: Boolean(enemy.isShiny),
      spriteFront: enemy.sprites.front,
    }

    if (capturedPokemon.isShiny) {
      const shinySprite = await fetchPokemonShinySpriteById(enemy.id)
      if (shinySprite) {
        capturedPokemon.sprites.front = shinySprite
        capturedPokemon.spriteFront = shinySprite
      }
    }

    const added = playerStore.addPokemonToPokedex(capturedPokemon)
    if (added) {
      playerStore.addCredits(CREDIT_REWARDS.capture)
    }

    enemies.value.splice(index, 1)
  }

  function enemyHpPercent(enemy) {
    // Compute HP percent for UI.
    if (!enemy.maxHp) {
      return 0
    }

    return Math.max(Math.round((enemy.currentHp / enemy.maxHp) * 100), 0)
  }

  function enemyCaptureTimeLeftMs(enemy) {
    // Remaining capture time for UI.
    if (enemy.currentHp > 0 || !enemy.capturableUntil) {
      return 0
    }

    return Math.max(enemy.capturableUntil - Date.now(), 0)
  }

  function setDifficulty(level) {
    // Change difficulty between rounds only.
    if (isRoundRunning.value) {
      return
    }

    if (!ROUND_CONFIG[level]) {
      return
    }

    selectedDifficulty.value = level
  }

  onUnmounted(() => {
    clearTickers()
  })

  return {
    playerStore,
    enemies,
    battleTeam,
    isLoadingRound,
    isRoundRunning,
    hasRoundEnded,
    roundResult,
    roundFeedback,
    difficultyOptions,
    selectedDifficulty,
    setDifficulty,
    roundTimerLabel,
    clickDamage,
    activePokemonSprite,
    activePokemonWeaponSprite,
    activeBattlePokemon,
    playerHpPercent,
    playerHitFlash,
    playerRecoil,
    livingEnemiesCount,
    startRound,
    damageEnemy,
    captureEnemy,
    enemyHpPercent,
    enemyCaptureTimeLeftMs,
  }
}
