import {
  randomInt,
  shuffleArray,
  toNumber
} from '@/utils/helpers'

const API_BASE_URL = 'https://valorant-api.com/v1'
const SHOP_SKIN_REFRESH_MS = 60 * 60 * 1000
const SKIN_SELL_PRICE_MULTIPLIER = 1.5 // Pour pas que les skins soient trop faciles  à obtenir

const CATEGORY_NAMES = {
  1: ['classic', 'shorty', 'frenzy', 'ghost', 'stinger', 'spectre', 'bucky', 'ares', 'judge'],
  2: ['odin', 'sheriff', 'marshal', 'bulldog'],
  3: ['outlaw', 'vandal', 'phantom', 'guardian'],
  4: ['operator'],
}

const FALLBACK_CLASSIC = {
  id: '24aee897-4cdc-b0fd-e596-1ba90fa6d1b2',
  name: 'Classic',
  image: 'https://media.valorant-api.com/weapons/29a0cfab-485b-f5d5-779a-b59f85e204a8/displayicon.png',
  maxDamage: 78,
  categoryId: 1,
  price: 0,
}

let weaponCatalogList = []
let weaponByIdMap = {}
let skinByIdMap = {}
let catalogPromise = null

// ------------------- Getters ------------------- 
function getRawImage(entry) {
  if (!entry || typeof entry !== 'object') {
    return ''
  }

  if (entry.displayIcon) {
    return entry.displayIcon
  }

  return ''
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

export function getWeaponMaxDamage(weaponId) {
  const weapon = getWeaponById(weaponId)
  return weapon ? weapon.maxDamage : 25
}

export function getWeaponsCatalog() {
  return weaponCatalogList
}

export function getWeaponById(weaponId) {
  if (!weaponId) {
    return null
  }

  return weaponByIdMap[weaponId] || null
}

export function getWeaponSkinById(skinId) {
  if (!skinId) {
    return null
  }

  return skinByIdMap[skinId] || null
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
  // const catalogClassic = weaponCatalogList.find((weapon) => weapon.name === 'Classic')
  // const classic = catalogClassic || FALLBACK_CLASSIC

  return {
    id: FALLBACK_CLASSIC.id,
    name: FALLBACK_CLASSIC.name,
    image: FALLBACK_CLASSIC.image,
    maxDamage: FALLBACK_CLASSIC.maxDamage,
    categoryId: FALLBACK_CLASSIC.categoryId,
    price: FALLBACK_CLASSIC.price,
  }
}

export async function getRandomEnemyWeapon(options = {}) {
  const catalog = await fetchWeaponsCatalog()

  const allowedCategoryIds = Array.isArray(options.allowedCategoryIds) && options.allowedCategoryIds.length ?
    options.allowedCategoryIds : [1, 2, 3, 4]
  const categoryWeights = options.categoryWeights || {
    1: 0.6,
    2: 0.25,
    3: 0.1,
    4: 0.05,
  }

  const chosenCategory = pickWeightedCategory(allowedCategoryIds, categoryWeights)

  let pool = catalog.filter((weapon) => weapon.maxDamage > 0 && weapon.categoryId === chosenCategory)
  if (!pool.length) {
    pool = catalog.filter((weapon) => weapon.maxDamage > 0)
  }

  const weapon = pool.length ? pool[randomInt(0, pool.length - 1)] : FALLBACK_CLASSIC

  // Pick a random skin from available skins for this weapon
  let skin = null
  if (Array.isArray(weapon.skins) && weapon.skins.length > 0) {
    skin = weapon.skins[randomInt(0, weapon.skins.length - 1)]
  }

  return {
    weaponId: weapon.id,
    weaponName: weapon.name,
    image: weapon.image,
    skinId: skin ? skin.id : null,
    skinImage: skin ? skin.image : weapon.image,
    skinName: skin ? skin.name : weapon.name,
  }
}

export function getShopSkinRefreshMs() {
  return SHOP_SKIN_REFRESH_MS
}

export async function getBaseSkinImageByName(weaponName) {
  await fetchWeaponsCatalog() // Ensure catalog is loaded before trying to get skin image   
  console.log(`[getBaseSkinImageByName] Looking for base skin image for weapon ${weaponName}`);  
  const weapon = weaponCatalogList.find((weapon) => weapon.name === weaponName)
  // console.log(`[getBaseSkinImageByName] Weapon found : `, weapon);
  console.log(`[getBaseSkinImageByName] Weapon Image: `, weapon.image);
  return weapon ? weapon.image : ''
}


// ------------------- Fetchers ------------------- 
async function fetchFromValorantAPI(path) {
  const response = await fetch(`${API_BASE_URL}${path}`)
  if (!response.ok) {
    throw new Error(`ValorantAPI request failed: ${response.status}`)
  }

  return response.json()
}

export async function fetchWeaponsCatalog() {
  if (weaponCatalogList.length) {
    return weaponCatalogList
  }

  if (catalogPromise) {
    return catalogPromise
  }

  console.log('[fetchWeaponsCatalog]Fetching weapons catalog from Valorant API...')
  catalogPromise = fetchFromValorantAPI('/weapons')
    .then((payload) => {
      console.log('[fetchWeaponsCatalog] Weapons catalog fetched successfully from Valorant API', payload)
      const rawWeapons = Array.isArray(payload && payload.data) ? payload.data : []
      buildCatalog(rawWeapons)
      return weaponCatalogList
    })
    .catch((error) => {
      console.error('[fetchWeaponsCatalog] Impossible de charger le catalogue Valorant', error)
      buildCatalog([FALLBACK_CLASSIC])
      return weaponCatalogList
    })
    .finally(() => {
      catalogPromise = null
    })

  return catalogPromise
}

export async function fetchShopWeapons() {
  //ALL buyable weapon, triées par prix
  const catalog = await fetchWeaponsCatalog()
  return catalog
    .sort((a, b) => a.price - b.price)
}

export async function fetchRandomShopSkins(count = 4) {
  // 4 randoms skins
  const catalog = await fetchWeaponsCatalog()

  const candidates = []
  for (const weapon of catalog) {
    for (const skin of weapon.skins) {
      // Skip skins that are just basic images (no id field or malformed)
      if (!skin.id || typeof skin.id !== 'string') {
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

// ------------------- Normalizers -------------------

function normalizeSkin(rawSkin, weaponId, fallbackPrice) {
  return {
    id: rawSkin.uuid,
    weaponId,
    name: rawSkin.displayName || 'Skin',
    image: getRawImage(rawSkin),
    price: Math.max(Math.round(fallbackPrice * SKIN_SELL_PRICE_MULTIPLIER), 1000),
  }
}

function normalizeWeapon(rawWeapon) {
  const weaponName = rawWeapon.displayName || 'Arme'
  const weaponImage = getRawImage(rawWeapon)
  const maxDamage = getMaxWeaponDamage(rawWeapon.weaponStats)

  const basePrice = toNumber(rawWeapon.shopData && rawWeapon.shopData.cost)
  const weaponPrice = basePrice > 0 ? basePrice : 2000

  const rawSkins = Array.isArray(rawWeapon.skins) ? rawWeapon.skins : []

  // const skinPrice = Math.max(Math.round(weaponPrice * 0.35), 200)
  // const skins = rawSkins
  //   .map((rawSkin) => normalizeSkin(rawSkin, rawWeapon.uuid, skinPrice))
  //   .filter((skin) => skin.image)
  //   .filter((skin) => shouldIncludeSkin(skin))

  const skins = rawSkins
    .map((rawSkin) => ({
      id: rawSkin.uuid,
      name: rawSkin.displayName || 'Skin',
      image: getRawImage(rawSkin),
      price: Math.max(Math.round(weaponPrice * SKIN_SELL_PRICE_MULTIPLIER), 1000),
    }))
    .filter((skin) => skin.image)
    .filter((skin) => shouldIncludeSkin(skin))

  return {
    id: rawWeapon.uuid,
    name: weaponName,
    image: weaponImage,
    maxDamage,
    categoryId: getWeaponCategoryId(weaponName),
    price: weaponName === 'Classic' ? 0 : Math.round(weaponPrice),
    skins,
  }
}

// ------------------- Actions -------------------

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

  weaponCatalogList = normalized
  weaponByIdMap = weaponMap
  skinByIdMap = skinMap

  console.log('[buildCatalog] Weapon catalog :', weaponCatalogList)       
}

// Filter out problematic skins: Standard variants and Random Favorite that don't have proper display
function shouldIncludeSkin(skin) {
  const name = skin.name || ''

  // Skip "Random Favorite Skin"
  if (name === 'Random Favorite Skin') {
    return false
  }

  // Skip "Standard" skins
  if (name.startsWith('Standard ')) {
    return false
  }

  return true
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
