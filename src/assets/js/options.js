export const ROUND_CONFIG = {
  easy: {
    key: 'easy',
    label: 'Easy',
    durationMs: 30 * 1000, // 30s
    minEnemies: 2,
    maxEnemies: 4,
    spawnIntervalMs: 20000,
    enemyCategoryIds: [1, 2],
    enemyHpMultiplier: 4.,
    playerHpMultiplier: 2.5,
  },
  medium: {
    key: 'medium',
    label: 'Medium',
    durationMs: 1 * 60 * 1000, // 1min
    minEnemies: 5,
    maxEnemies: 8,
    spawnIntervalMs: 10000,
    enemyCategoryIds: [1, 2, 3],
    enemyHpMultiplier: 6.,
    playerHpMultiplier: 2.5,
  },
  hard: {
    key: 'hard',
    label: 'Hard',
    durationMs: 1.5 * 60 * 1000, // 1min30s
    minEnemies: 10,
    maxEnemies: 20,
    spawnIntervalMs: 5000,
    enemyCategoryIds: [1, 2, 3, 4],
    enemyHpMultiplier: 15.,
    playerHpMultiplier: 5.5,
  },
}

export const DEFAULT_DIFFICULTY = 'easy'

export const CREDIT_REWARDS = {
  enemyKill: 15,
  capture: 40,
}

export const CREDIT_PENALTIES = {
  loseRoundPercent: 10,
}

export const ENEMY_ATTACK_OPTIONS = {
  minIntervalMs: 3000,
  maxIntervalMs: 10000,
}

export const CAPTURE_OPTIONS = {
  availableWindowMs: 2000,
}

export const RARITY_OPTIONS = {
  baseLegendaryChance: 1/25000, // 0,004%
  baseShinyChance: 1/8000, // 0,0125%
  baseShinyLegendaryChance: 1/100000, // 0,001%
  killBonusLegendary: 0.00015, // +0.015% per kill
  killBonusShiny: 0.00012, // +0.012% per kill
  killBonusShinyLegendary: 0.000015, // +0.0015% per kill
  maxLegendaryChance: 0.005, // 0,5%
  maxShinyChance: 0.05, // 5%
  maxShinyLegendaryChance: 0.0005, // 0,05%
}

export const WEAPON_CATEGORY_SPAWN_WEIGHTS = {
  1: 0.63,
  2: 0.25,
  3: 0.09,
  4: 0.05,
}
