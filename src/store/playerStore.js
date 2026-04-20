import {
  defineStore
} from 'pinia'
import {
  ACTIVE_TEAM_SIZE,
  STORAGE_KEY,
  createEmptyTeam,
  getPokemonBaseAttack,
  getPokemonBaseHp,
  normalizePokedexFromStorage,
  normalizeTeamIds,
  normalizeWeaponInventory,
  removeDuplicateInTeam,
  toPokemonId,
} from './playerStore.utils'
import {
  fetchRandomShopSkins,
  getClassicWeapon,
  getShopSkinRefreshMs,
  getBaseSkinImageByName,
  getWeaponById,
  fetchWeaponsCatalog,
} from '@/services/api/valorantAPI'
import {
  getPokemonByName
} from '@/services/api/pokeAPI'



export const usePlayerStore = defineStore('player', {
  state: () => ({
    profile: {
      name: '',
      wallet: 0,
    },
    pokedex: [],
    activeTeamIds: createEmptyTeam(),
    activePokemonId: null,
    weaponInventory: [],
    shopSkins: [],
    shopSkinsResetAt: 0,
    shinyDexCount: 0,
    isLoaded: false,
    _pendingPokemon: null,
  }),
  getters: {
    hasPlayer(state) {
      return Boolean(state.profile.name && state.profile.name.trim())
    },
    activeTeam(state) {
      return state.activeTeamIds.map((pokedexId) =>
        state.pokedex.find((entry) => entry.pokemonId === pokedexId) || null)
    },
    activePokemon(state) {
      return state.pokedex.find((entry) => entry.pokemonId === state.activePokemonId) || null
    },
    hasTeam(state) {
      return state.activeTeamIds.some((pokemonId) => pokemonId !== null)
    },
  },
  actions: {
    findPokedexEntryById(pokemonId) {
      return this.pokedex.find((entry) => entry.pokemonId === pokemonId) || null
    },

    findOwnedWeaponById(weaponId) {
      return this.weaponInventory.find((weapon) => weapon.id === weaponId) || null
    },

    findOwnedWeaponByName(weaponName) {
      return this.weaponInventory.find((weapon) => weapon.name === weaponName) || null
    },

    hasPokemonLoadout(pokemonEntry) {
      // A Pokemon can be added to team if it has a weapon loadout (weapon + skin) assigned
      return Boolean(pokemonEntry && pokemonEntry.weaponId && pokemonEntry.skinId)
    },

    getWeaponAssignedCount(weaponId, excludedPokemonId = null) {
      // Count how many Pokemon in player's pokedex are currently assigned to this weapon, excluding a specific Pokemon ID if provided (used for swap scenarios)
      return this.pokedex.filter(
        (pokemon) => pokemon.weaponId === weaponId && pokemon.pokemonId !== excludedPokemonId,
      ).length
    },

    getWeaponAvailableUnits(weaponName, excludedPokemonId = null) {
      const weapon = this.findOwnedWeaponByName(weaponName)
      if (!weapon) {
        return 0
      }

      const quantity = Math.max(Number(weapon.quantity) || 1, 1)
      const assigned = this.getWeaponAssignedCount(weapon.id, excludedPokemonId)
      return Math.max(quantity - assigned, 0)
    },
    
    loadFromStorage() {
      if (this.isLoaded) {
        return
      }

      const raw = localStorage.getItem(STORAGE_KEY)
      if (!raw) {
        this.isLoaded = true
        return
      }

      try {
        const parsed = JSON.parse(raw)
        const profile = (parsed && parsed.profile) || {}

        this.profile = {
          name: profile.name || '',
          wallet: Number(profile.wallet || 0),
        }

        this.pokedex = normalizePokedexFromStorage(parsed && parsed.pokedex)
        this.activeTeamIds = normalizeTeamIds(parsed && parsed.activeTeamIds)

        // Active pokemon must always stay synced with a slot from activeTeamIds
        const parsedActivePokemonId = Number((parsed && parsed.activePokemonId) || 0)
        if (Number.isFinite(parsedActivePokemonId) && this.activeTeamIds.includes(parsedActivePokemonId)) {
          this.activePokemonId = parsedActivePokemonId
        } else {
          this.activePokemonId = this.activeTeamIds.find((id) => id !== null) || null
        }

        this.weaponInventory = normalizeWeaponInventory(parsed && parsed.weaponInventory)
        this.shopSkins = Array.isArray(parsed && parsed.shopSkins) ? parsed.shopSkins : []

        const parsedResetAt = Number(parsed && parsed.shopSkinsResetAt)
        this.shopSkinsResetAt = Number.isFinite(parsedResetAt) ? parsedResetAt : 0

        const parsedShinyDexCount = Number(parsed && parsed.shinyDexCount)
        this.shinyDexCount = Number.isFinite(parsedShinyDexCount) ? parsedShinyDexCount : 0
      } catch (error) {
        console.error('Impossible de charger le player depuis le local storage', error)
        localStorage.removeItem(STORAGE_KEY)
      } finally {
        this.isLoaded = true
      }
    },

    saveToStorage() {
      if (!this.hasPlayer) {
        return
      }

      const payload = {
        profile: {
          name: this.profile.name,
          wallet: this.profile.wallet,
        },
        activePokemonId: this.activePokemonId,
        activeTeamIds: [...this.activeTeamIds],
        weaponInventory: this.weaponInventory.map((w) => ({
          id: w.id,
          name: w.name,
          quantity: Math.max(Number(w.quantity) || 1, 1),
          skins: Array.isArray(w.skins) ? w.skins.map((skin) => ({
            id: skin.id,
            nom: skin.nom,
            image: skin.image,
          })) : [],
        })),
        shopSkins: [...this.shopSkins],
        shopSkinsResetAt: this.shopSkinsResetAt,
        shinyDexCount: this.shinyDexCount,
        pokedex: this.pokedex.map((entry) => ({
          pokemonId: entry.pokemonId,
          name: entry.name,
          spriteFront: entry.spriteFront,
          isShiny: Boolean(entry.isShiny),
          isLegendary: Boolean(entry.isLegendary),
          baseAttack: getPokemonBaseAttack(entry),
          baseHp: getPokemonBaseHp(entry),
          types: [...entry.types],
          stats: {
            ...entry.stats
          },
          weaponId: entry.weaponId || null,
          skinId: entry.skinId || null,
        })),
      }

      localStorage.setItem(STORAGE_KEY, JSON.stringify(payload))
    },

    createPlayer(name) {
      this.profile.name = name.trim()
      this.profile.wallet = 0
      this.pokedex = []
      this.activeTeamIds = createEmptyTeam()
      this.activePokemonId = null
      this.weaponInventory = []
      this.shopSkins = []
      this.shopSkinsResetAt = 0
      this.shinyDexCount = 0

      // Give player the Classic weapon as starting weapon
      const classic = getClassicWeapon()
      this.giveWeaponToPlayer(classic)

      this.saveToStorage()
    },

    async createPlayerWithStarter(name) {
      this.createPlayer(name)

      const starterPokemon = await getPokemonByName('ditto')
      this.addPokemonToPokedex(starterPokemon)
      this.saveToStorage()
    },

    addCredits(amount) {
      this.profile.wallet += amount
      this.saveToStorage()
    },

    spendCredits(amount) {
      const parsedAmount = Math.max(Number(amount) || 0, 0)
      if (this.profile.wallet < parsedAmount) {
        return false
      }

      this.profile.wallet -= parsedAmount
      this.saveToStorage()
      return true
    },

    loseCreditsPercent(percent) {
      const parsedPercent = Math.max(Number(percent) || 0, 0)
      if (!parsedPercent) {
        return 0
      }

      const loss = Math.floor(this.profile.wallet * (parsedPercent / 100))
      if (loss <= 0) {
        return 0
      }

      this.profile.wallet = Math.max(this.profile.wallet - loss, 0)
      this.saveToStorage()
      return loss
    },

    setPokemonWeaponLoadout(pokemonId, weaponName, skinId) {
      const entry = this.findPokedexEntryById(pokemonId)
      if (!entry) {
        return false
      }

      const weapon = this.findOwnedWeaponByName(weaponName)
      if (!weapon) {
        return false
      }

      // Check if skin exists in weapon.skins
      const canUseSkin = Array.isArray(weapon.skins) && weapon.skins.some((s) => s.id === skinId)
      if (!canUseSkin) {
        return false
      }

      // Exclude current pokemon so reassignment doesn't consume an extra weapon unit
      const availableUnits = this.getWeaponAvailableUnits(weapon.name, entry.pokemonId)
      if (availableUnits <= 0) {
        return false
      }

      entry.weaponId = weapon.id
      entry.skinId = skinId
      this.saveToStorage()
      return true
    },

    clearPokemonWeaponLoadout(pokemonId) {
      const entry = this.findPokedexEntryById(pokemonId)
      if (!entry) {
        return false
      }

      entry.weaponId = null
      entry.skinId = null
      this.saveToStorage()
      return true
    },

    buyWeapon(weapon) {
      if (!weapon || !weapon.id) {
        return { success: false, reason: 'invalid' }
      }

      // Check quantity limit before spending credits
      const existing = this.findOwnedWeaponById(weapon.id)
      if (existing && existing.quantity >= 99) {
        return { success: false, reason: 'max-quantity-reached' }
      }

      // Deduct credits
      if (!this.spendCredits(weapon.price)) {
        return { success: false, reason: 'not-enough-credits' }
      }

      // Add weapon to inventory
      const result = this.giveWeaponToPlayer(weapon)
      this.saveToStorage()
      return result
    },

    buySkin(skin) {
      if (!skin || !skin.id || !skin.weaponId) {
        return { success: false, reason: 'invalid' }
      }

      const weapon = this.findOwnedWeaponById(skin.weaponId)
      if (!weapon) {
        return { success: false, reason: 'weapon-not-owned' }
      }

      // Check if skin already owned
      if (weapon.skins.some((s) => s.id === skin.id)) {
        return { success: false, reason: 'already-owned' }
      }

      if (!this.spendCredits(skin.price)) {
        return { success: false, reason: 'not-enough-credits' }
      }

      weapon.skins.push({
        id: skin.id,
        nom: skin.name,
        image: skin.image,
      })
      this.saveToStorage()

      return { success: true }
    },

    async refreshShopSkinsIfNeeded(forceRefresh = false) {
      const now = Date.now()
      const isStillValid = now < this.shopSkinsResetAt && this.shopSkins.length > 0

      if (!forceRefresh && isStillValid) {
        return this.shopSkins
      }

      const skins = await fetchRandomShopSkins(4)
      this.shopSkins = skins
      this.shopSkinsResetAt = now + getShopSkinRefreshMs()
      this.saveToStorage()
      return skins
    },

    confirmSwap(slotIndex) {
      if (!this._pendingPokemon) {
        return false
      }

      if (slotIndex < 0 || slotIndex >= ACTIVE_TEAM_SIZE) {
        return false
      }

      if (!this.hasPokemonLoadout(this._pendingPokemon)) {
        return false
      }

      const newPokemonId = this._pendingPokemon.pokemonId
      removeDuplicateInTeam(this.activeTeamIds, newPokemonId, slotIndex)

      const replacedPokemonId = this.activeTeamIds[slotIndex]
      this.activeTeamIds[slotIndex] = newPokemonId

      if (this.activePokemonId === null || this.activePokemonId === replacedPokemonId) {
        this.activePokemonId = newPokemonId
      }

      this._pendingPokemon = null
      this.saveToStorage()
      return true
    },

    setActivePokemon(pokedexId) {
      const pokemonId = Number(pokedexId)
      if (!Number.isFinite(pokemonId)) {
        return false
      }

      const exists = this.activeTeamIds.includes(pokemonId)
      if (!exists) {
        return false
      }

      this.activePokemonId = pokemonId
      this.saveToStorage()
      return true
    },

    setActiveTeamSlot(slotIndex, pokedexId) {
      if (slotIndex < 0 || slotIndex >= ACTIVE_TEAM_SIZE) {
        return false
      }

      if (pokedexId === null) {
        this.activeTeamIds[slotIndex] = null
        this.activePokemonId = this.activeTeamIds.find((id) => id !== null) || null
        this.saveToStorage()
        return true
      }

      const pokemonId = Number(pokedexId)
      if (!Number.isFinite(pokemonId)) {
        return false
      }

      const entry = this.findPokedexEntryById(pokemonId)
      if (!entry || !this.hasPokemonLoadout(entry)) {
        return false
      }

      removeDuplicateInTeam(this.activeTeamIds, pokemonId, slotIndex)
      this.activeTeamIds[slotIndex] = pokemonId

      if (this.activePokemonId === null) {
        this.activePokemonId = pokemonId
      }

      this.saveToStorage()
      return true
    },

    giveWeaponToPlayer(weapon) {
      // Centralized function to add a weapon to player inventory
      if (!weapon || !weapon.id || !weapon.name) {
        console.warn('Invalid weapon data, cannot add to player inventory', weapon);
        return { success: false, reason: 'invalid' }
      }

      const existing = this.findOwnedWeaponByName(weapon.name)
      if (existing) {
        // Weapon already owned: increment quantity
        existing.quantity += 1
        console.log(`Weapon ${weapon.name} already owned, incrementing quantity to ${existing.quantity}`);
      } else {
        // New weapon: add with only default skin (async)
        this.addWeaponToCollection(weapon);
      }

      this.saveToStorage()
      return { success: true, quantity: this.findOwnedWeaponByName(weapon.name).quantity }
    },

  
    
    // ---------------- ADDERs ----------------
    addPokemonToPokedex(pokemon, isShiny = false) {
      const entry = normalizePokedexFromStorage([pokemon])[0] || null
      if (!entry) {
        return null
      }

      entry.weaponId = null
      entry.skinId = null

      const existing = this.findPokedexEntryById(entry.pokemonId)
      if (existing) {
        // Overwrite stale data with the latest fetched version
        existing.name = entry.name
        existing.spriteFront = entry.spriteFront
        existing.isShiny = isShiny
        existing.isLegendary = entry.isLegendary
        existing.baseAttack = entry.baseAttack
        existing.baseHp = entry.baseHp
        existing.types = [...entry.types]
        existing.stats = {
          ...entry.stats
        }

        this.saveToStorage()
        return existing
      }

      // New Pokemon capture: increment shiny dex if it's a shiny
      if (entry.isShiny) {
        this.shinyDexCount += 1
      }

      this.pokedex.push(entry)
      this.saveToStorage()
      return entry
    },

    addPokemonToTeam(pokemon) {
      const pokemonId = toPokemonId(pokemon)
      if (pokemonId === null) {
        return {
          action: 'invalid'
        }
      }

      let entry = this.findPokedexEntryById(pokemonId)
      if (!entry) {
        entry = this.addPokemonToPokedex(pokemon)
      }

      if (!entry) {
        return {
          action: 'invalid'
        }
      }

      if (!this.hasPokemonLoadout(entry)) {
        return {
          action: 'missing-weapon'
        }
      }

      const alreadyInTeamIdx = this.activeTeamIds.indexOf(entry.pokemonId)
      if (alreadyInTeamIdx !== -1) {
        this.activeTeamIds[alreadyInTeamIdx] = null
        this.activePokemonId = this.activeTeamIds.find((id) => id !== null) || null
        this.saveToStorage()
        return {
          action: 'removed'
        }
      }

      const emptyIdx = this.activeTeamIds.findIndex((id) => id === null)
      if (emptyIdx !== -1) {
        this.activeTeamIds[emptyIdx] = entry.pokemonId

        if (this.activePokemonId === null) {
          this.activePokemonId = entry.pokemonId
        }

        this.saveToStorage()
        return {
          action: 'added'
        }
      }

      // Team full: keep selection in memory until user confirms swap target slot
      this._pendingPokemon = entry
      return {
        action: 'swap'
      }
    },

    addSkinToWeapon(skinId, weaponName, skinName, skinImage) {
      const weapon = this.findOwnedWeaponByName(weaponName)
      if (!weapon) {
        return false
      }

      if (!Array.isArray(weapon.skins)) {
        weapon.skins = []
      }

      // Check if skin already owned by ID
      if (weapon.skins.some((s) => s.id === skinId)) {
        return false // already owned
      }

      console.log(`[addSkinToWeapon] Adding skin ${skinName} to weapon ${weapon.name}`);

      weapon.skins.push({
        id: skinId,
        nom: skinName,
        image: skinImage,
      });

      this.saveToStorage();
      return true
    },

    async addWeaponToCollection(weapon) {
      console.log(`[addWeaponToCollection] Adding weapon ${weapon.name} to inventory`); 

      this.weaponInventory.push({
        id: weapon.id,
        name: weapon.name,
        quantity: 1,
        skins: [],
      })

      // Load catalog if needed, then add default skin
      await this.addDefaultSkinToWeapon(weapon.name);

      this.saveToStorage();
    },

    async addDefaultSkinToWeapon(weaponName) {
      // Ensure catalog is loaded first
      await fetchWeaponsCatalog()
      
      const weapon = this.findOwnedWeaponByName(weaponName)
      if (!weapon) {
        console.warn(`[addDefaultSkinToWeapon] Weapon ${weaponName} not found in inventory`);
        return false
      }   
      if (!Array.isArray(weapon.skins)) {
        weapon.skins = []
      }
      const baseSkinId = `base-${weapon.id}` 
      if (weapon.skins.some((s) => s.id === baseSkinId)) {
        console.warn(`[addDefaultSkinToWeapon] Default skin for weapon ${weapon.name} already exists in inventory, skipping addition`);  
        return false // default skin already added    
      }      
      const baseSkinImage = await getBaseSkinImageByName(weapon.name)
      console.log(`[addDefaultSkinToWeapon] Base skin image for weapon ${weapon.name}: ${baseSkinImage}`);        
      if (!baseSkinImage) {   
        console.warn(`[addDefaultSkinToWeapon] No image found for default skin of weapon ${weapon.name}, skipping skin addition`);
        return false // no image found for default skin     
      }
      console.log(`[addDefaultSkinToWeapon] Adding default skin for weapon ${weapon.name} to inventory`);  
      weapon.skins.push({
        id: baseSkinId, 
        nom: "Default Skin", 
        image: baseSkinImage,   
      })      
      this.saveToStorage();
      return true 
    }

  },
})
