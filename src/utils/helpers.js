/**
 * Convertit une valeur en nombre pour sur
 */
export function toNumber(value, defaultValue = 0) {
  const n = Number(value)
  return Number.isNaN(n) ? defaultValue : n
}

/**
 * Nombre aléatoire entier inclusif
 */
export function randomInt(min, max) {
  const minVal = Math.ceil(min)
  const maxVal = Math.floor(max)
  return Math.floor(Math.random() * (maxVal - minVal + 1)) + minVal
}

/**
 * Mélange un tableau (Fisher-Yates)
 */
export function shuffleArray(array) {
  const arr = [...array]

  for (let i = arr.length - 1; i > 0; i--) {
    const j = randomInt(0, i)
    ;[arr[i], arr[j]] = [arr[j], arr[i]]
  }

  return arr
}