const API_BASE_URL = 'https://valorant-api.com/v1'
const SHOP_SKIN_REFRESH_MS = 60 * 60 * 1000

const CATEGORY_NAMES = {
  1: ['classic', 'shorty', 'frenzy', 'ghost', 'stinger', 'spectre', 'bucky', 'ares', 'judge'],
  2: ['odin', 'phantom', 'sheriff', 'marshal', 'bulldog', 'guardian'],
  3: ['outlaw', 'vandal'],
  4: ['operator'],
}

const FALLBACK_CLASSIC = {
  id: '42da8ccc-40d5-affc-beec-15aa47b42eda',
  name: 'Classic',
  image: 'https://media.valorant-api.com/weapons/42da8ccc-40d5-affc-beec-15aa47b42eda/displayicon.png',
  maxDamage: 78,
  categoryId: 1,
  price: 0,
  defaultSkinId: '0fdb6f8d-46b8-b3b7-a7e3-83b5a153da6a',
  skins: [{
    id: '0fdb6f8d-46b8-b3b7-a7e3-83b5a153da6a',
    weaponId: '42da8ccc-40d5-affc-beec-15aa47b42eda',
    name: 'Classic Standard',
    image: 'https://media.valorant-api.com/weaponskins/0fdb6f8d-46b8-b3b7-a7e3-83b5a153da6a/displayicon.png',
    price: 200,
  }, ],
}

let cachedCatalog = []
let cachedWeaponMap = {}
let cachedSkinMap = {}
let catalogPromise = null

function toNumber(value) {
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : 0
}

function randomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min
}

function shuffleArray(values) {
  const copy = [...values]
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = randomInt(0, i)
    const temp = copy[i]
    copy[i] = copy[j]
    copy[j] = temp
  }
  return copy
}

function getRawImage(entry) {
  if (!entry || typeof entry !== 'object') {
    return ''
  }

  if (entry.displayIcon) {
    return entry.displayIcon
  }

  if (entry.fullRender) {
    return entry.fullRender
  }

  if (entry.killStreamIcon) {
    return entry.killStreamIcon
  }

  return ''
}

function getMaxWeaponDamage(weaponStats) {
  if (!weaponStats || !Array.isArray(weaponStats.damageRanges)) {
    return 0
  }

  let maxDamage = 0
  for (const range of weaponStats.damageRanges) {
    maxDamage = Math.max(
      maxDamage,
      toNumber(range.headDamage),
      toNumber(range.bodyDamage),
      toNumber(range.legDamage),
    )
  }

  return Math.max(Math.round(maxDamage), 1)
}

function normalizeSkin(rawSkin, weaponId, fallbackPrice) {
  return {
    id: rawSkin.uuid,
    weaponId,
    name: rawSkin.displayName || 'Skin',
    image: getRawImage(rawSkin),
    price: Math.max(Math.round(fallbackPrice), 150),
  }
}

function normalizeWeapon(rawWeapon) {
  const weaponName = rawWeapon.displayName || 'Arme'
  const maxDamage = getMaxWeaponDamage(rawWeapon.weaponStats)
  const basePrice = toNumber(rawWeapon.shopData && rawWeapon.shopData.cost)
  const weaponPrice = basePrice > 0 ? basePrice : Math.max(maxDamage * 15, 500)

  const rawSkins = Array.isArray(rawWeapon.skins) ? rawWeapon.skins : []
  const skinPrice = Math.max(Math.round(weaponPrice * 0.35), 200)
  const skins = rawSkins
    .map((rawSkin) => normalizeSkin(rawSkin, rawWeapon.uuid, skinPrice))
    .filter((skin) => skin.image)

  const defaultSkinId = skins.length ? skins[0].id : ''

  return {
    id: rawWeapon.uuid,
    name: weaponName,
    image: getRawImage(rawWeapon),
    maxDamage,
    categoryId: getWeaponCategoryId(weaponName),
    price: weaponName === 'Classic' ? 0 : Math.round(weaponPrice),
    defaultSkinId,
    skins,
  }
}

function getWeaponCategoryId(weaponName) {
  const lowerName = (weaponName || '').toLowerCase()

  for (const categoryId of Object.keys(CATEGORY_NAMES)) {
    const names = CATEGORY_NAMES[categoryId]
    if (names.includes(lowerName)) {
      return Number(categoryId)
    }
  }

  return 1
}

function buildCatalog(rawWeapons) {
  const normalized = rawWeapons
    .map(normalizeWeapon)
    .filter((weapon) => weapon.image && weapon.maxDamage > 0)

  const hasClassic = normalized.some((weapon) => weapon.name === 'Classic')
  if (!hasClassic) {
    normalized.push(FALLBACK_CLASSIC)
  }

  const weaponMap = {}
  const skinMap = {}

  for (const weapon of normalized) {
    weaponMap[weapon.id] = weapon
    for (const skin of weapon.skins) {
      skinMap[skin.id] = skin
    }
  }

  cachedCatalog = normalized
  cachedWeaponMap = weaponMap
  cachedSkinMap = skinMap
}

async function fetchFromValorantAPI(path) {
  const response = await fetch(`${API_BASE_URL}${path}`)
  if (!response.ok) {
    throw new Error(`ValorantAPI request failed: ${response.status}`)
  }

  return response.json()
}

export async function fetchWeaponsCatalog() {
  if (cachedCatalog.length) {
    return cachedCatalog
  }

  if (catalogPromise) {
    return catalogPromise
  }

  catalogPromise = fetchFromValorantAPI('/weapons')
    .then((payload) => {
      const rawWeapons = Array.isArray(payload && payload.data) ? payload.data : []
      buildCatalog(rawWeapons)
      return cachedCatalog
    })
    .catch((error) => {
      console.error('Impossible de charger le catalogue Valorant', error)
      buildCatalog([FALLBACK_CLASSIC])
      return cachedCatalog
    })
    .finally(() => {
      catalogPromise = null
    })

  return catalogPromise
}

export function getWeaponsCatalog() {
  return cachedCatalog
}

export function getWeaponById(weaponId) {
  if (!weaponId) {
    return null
  }

  return cachedWeaponMap[weaponId] || null
}

export function getWeaponMaxDamage(weaponId) {
  const weapon = getWeaponById(weaponId)
  if (!weapon) {
    return FALLBACK_CLASSIC.maxDamage
  }

  return weapon.maxDamage
}

export function getWeaponSkinById(skinId) {
  if (!skinId) {
    return null
  }

  return cachedSkinMap[skinId] || null
}

export function getWeaponDefaultSkinId(weaponId) {
  const weapon = getWeaponById(weaponId)
  if (!weapon) {
    return ''
  }

  return weapon.defaultSkinId || ''
}

export function getWeaponImage(weaponId, skinId) {
  if (skinId) {
    const skin = getWeaponSkinById(skinId)
    if (skin && skin.image) {
      return skin.image
    }
  }

  const weapon = getWeaponById(weaponId)
  if (weapon && weapon.image) {
    return weapon.image
  }

  return FALLBACK_CLASSIC.image
}

export function getClassicWeapon() {
  const catalogClassic = cachedCatalog.find((weapon) => weapon.name === 'Classic')
  const classic = catalogClassic || FALLBACK_CLASSIC

  return {
    id: classic.id,
    name: classic.name,
    skins: classic.defaultSkinId ? [classic.defaultSkinId] : [],
  }
}

export async function fetchShopWeapons() {
  const catalog = await fetchWeaponsCatalog()
  return catalog
    .filter((weapon) => weapon.price > 0 && weapon.name !== 'Classic')
    .sort((a, b) => a.price - b.price)
}

export async function fetchRandomShopSkins(count = 4) {
  const catalog = await fetchWeaponsCatalog()

  const candidates = []
  for (const weapon of catalog) {
    for (const skin of weapon.skins) {
      if (skin.id === weapon.defaultSkinId) {
        continue
      }
      candidates.push({
        id: skin.id,
        name: skin.name,
        image: skin.image,
        weaponId: weapon.id,
        weaponName: weapon.name,
        price: skin.price,
      })
    }
  }

  if (!candidates.length) {
    return []
  }

  return shuffleArray(candidates).slice(0, count)
}

function pickWeightedCategory(allowedCategoryIds, categoryWeights) {
  const filteredCategoryIds = allowedCategoryIds.filter((categoryId) => {
    const parsedWeight = Number(categoryWeights[categoryId] || 0)
    return parsedWeight > 0
  })

  if (!filteredCategoryIds.length) {
    return 1
  }

  let totalWeight = 0
  for (const categoryId of filteredCategoryIds) {
    totalWeight += Number(categoryWeights[categoryId] || 0)
  }

  if (totalWeight <= 0) {
    return filteredCategoryIds[0]
  }

  let roll = Math.random() * totalWeight
  for (const categoryId of filteredCategoryIds) {
    roll -= Number(categoryWeights[categoryId] || 0)
    if (roll <= 0) {
      return categoryId
    }
  }

  return filteredCategoryIds[filteredCategoryIds.length - 1]
}

export async function getRandomEnemyLoadout(options = {}) {
  const catalog = await fetchWeaponsCatalog()

  const allowedCategoryIds = Array.isArray(options.allowedCategoryIds) && options
    .allowedCategoryIds.length ?
    options.allowedCategoryIds :
    [1, 2, 3, 4]
  const categoryWeights = options.categoryWeights || {
    1: 0.6,
    2: 0.25,
    3: 0.1,
    4: 0.05,
  }

  const chosenCategory = pickWeightedCategory(allowedCategoryIds, categoryWeights)

  let pool = catalog.filter((weapon) => weapon.maxDamage > 0 && weapon.categoryId ===
    chosenCategory)
  if (!pool.length) {
    pool = catalog.filter((weapon) => weapon.maxDamage > 0)
  }

  const weapon = pool.length ? pool[randomInt(0, pool.length - 1)] : FALLBACK_CLASSIC
  const skinId = weapon.defaultSkinId || ''

  return {
    weaponId: weapon.id,
    skinId,
    image: getWeaponImage(weapon.id, skinId),
  }
}

export function getShopSkinRefreshMs() {
  return SHOP_SKIN_REFRESH_MS
}
