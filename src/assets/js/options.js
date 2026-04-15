export const ROUND_CONFIG = {
  easy: {
    key: 'easy',
    label: 'Easy',
    durationMs: 60 * 1000,
    minEnemies: 3,
    maxEnemies: 5,
    spawnIntervalMs: 5000,
    enemyCategoryIds: [1, 2],
    enemyHpMultiplier: 2.6,
    playerHpMultiplier: 1.2,
  },
  medium: {
    key: 'medium',
    label: 'Medium',
    durationMs: 2 * 60 * 1000,
    minEnemies: 5,
    maxEnemies: 10,
    spawnIntervalMs: 3000,
    enemyCategoryIds: [1, 2, 3],
    enemyHpMultiplier: 3.3,
    playerHpMultiplier: 1.3,
  },
  hard: {
    key: 'hard',
    label: 'Hard',
    durationMs: 2 * 60 * 1000,
    minEnemies: 10,
    maxEnemies: 20,
    spawnIntervalMs: 2000,
    enemyCategoryIds: [1, 2, 3, 4],
    enemyHpMultiplier: 4.2,
    playerHpMultiplier: 1.45,
  },
}

export const DEFAULT_DIFFICULTY = 'medium'

export const CREDIT_REWARDS = {
  enemyKill: 35,
  capture: 80,
}

export const CREDIT_PENALTIES = {
  loseRoundPercent: 10,
}

export const ENEMY_ATTACK_OPTIONS = {
  minIntervalMs: 3000,
  maxIntervalMs: 6000,
}

export const CAPTURE_OPTIONS = {
  availableWindowMs: 3000,
}

export const RARITY_OPTIONS = {
  baseLegendaryChance: 0.04,
  baseShinyChance: 0.02,
  baseShinyLegendaryChance: 0.002,
  killBonusLegendary: 0.0015,
  killBonusShiny: 0.0012,
  killBonusShinyLegendary: 0.00015,
  maxLegendaryChance: 0.14,
  maxShinyChance: 0.12,
  maxShinyLegendaryChance: 0.015,
}

export const WEAPON_CATEGORY_SPAWN_WEIGHTS = {
  1: 0.63,
  2: 0.25,
  3: 0.09,
  4: 0.03,
}

export const LEGENDARY_POKEMON_IDS = [
  144, 145, 146,
  150, 151,
  243, 244, 245,
  249, 250, 251,
  377, 378, 379,
  380, 381,
  382, 383, 384,
  385, 386,
  480, 481, 482,
  483, 484, 487,
  488, 491, 492,
  493,
  638, 639, 640,
  641, 642, 643,
  644, 645, 646,
  647, 648, 649,
  716, 717, 718,
  785, 786, 787, 788,
  789, 790, 791, 792,
  800, 801, 802,
  807,
  888, 889, 890,
]
