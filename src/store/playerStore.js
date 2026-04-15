import {
  defineStore
} from 'pinia'
import {
  ACTIVE_TEAM_SIZE,
  STORAGE_KEY,
  createEmptyTeam,
  getPokemonBaseAttack,
  normalizePokedexFromStorage,
  normalizeTeamIds,
  normalizeWeaponInventory,
  removeDuplicateInTeam,
  toPokemonId,
} from './playerStore.utils'
import {
  fetchRandomShopSkins,
  getClassicWeapon,
  getWeaponDefaultSkinId,
  getShopSkinRefreshMs,
} from '@/services/api/valorantAPI'

function cloneWeaponInventoryEntry(weapon) {
  return {
    id: weapon.id,
    name: weapon.name,
    skins: Array.isArray(weapon.skins) ? [...weapon.skins] : [],
  }
}

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

    hasPokemonLoadout(pokemonEntry) {
      return Boolean(
        pokemonEntry &&
        pokemonEntry.weaponId &&
        pokemonEntry.skinId,
      )
    },

    ensureClassicWeaponInInventory() {
      const classic = getClassicWeapon()
      const existing = this.findOwnedWeaponById(classic.id)

      if (!existing) {
        this.weaponInventory.push(cloneWeaponInventoryEntry(classic))
        return
      }

      if (!Array.isArray(existing.skins)) {
        existing.skins = []
      }

      for (const skinId of classic.skins) {
        if (!existing.skins.includes(skinId)) {
          existing.skins.push(skinId)
        }
      }
    },

    ensureDefaultSkinInOwnedWeapon(weaponId) {
      const weapon = this.findOwnedWeaponById(weaponId)
      if (!weapon) {
        return
      }

      if (!Array.isArray(weapon.skins)) {
        weapon.skins = []
      }

      const defaultSkinId = getWeaponDefaultSkinId(weaponId)
      if (defaultSkinId && !weapon.skins.includes(defaultSkinId)) {
        weapon.skins.unshift(defaultSkinId)
      }
    },

    loadFromStorage() {
      if (this.isLoaded) {
        return
      }

      const raw = localStorage.getItem(STORAGE_KEY)
      if (!raw) {
        this.ensureClassicWeaponInInventory()
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

        const parsedActivePokemonId = Number((parsed && parsed.activePokemonId) || 0)
        if (Number.isFinite(parsedActivePokemonId) && this.activeTeamIds.includes(
            parsedActivePokemonId)) {
          this.activePokemonId = parsedActivePokemonId
        } else {
          this.activePokemonId = this.activeTeamIds.find((id) => id !== null) || null
        }

        this.weaponInventory = normalizeWeaponInventory(parsed && parsed.weaponInventory)
        for (const ownedWeapon of this.weaponInventory) {
          this.ensureDefaultSkinInOwnedWeapon(ownedWeapon.id)
        }
        this.shopSkins = Array.isArray(parsed && parsed.shopSkins) ? parsed.shopSkins : []

        const parsedResetAt = Number(parsed && parsed.shopSkinsResetAt)
        this.shopSkinsResetAt = Number.isFinite(parsedResetAt) ? parsedResetAt : 0
      } catch (error) {
        console.error('Impossible de charger le player depuis le local storage', error)
        localStorage.removeItem(STORAGE_KEY)
      } finally {
        this.ensureClassicWeaponInInventory()
        this.isLoaded = true
        this.saveToStorage()
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
        weaponInventory: this.weaponInventory.map((weapon) => cloneWeaponInventoryEntry(
          weapon)),
        shopSkins: [...this.shopSkins],
        shopSkinsResetAt: this.shopSkinsResetAt,
        pokedex: this.pokedex.map((entry) => ({
          pokemonId: entry.pokemonId,
          name: entry.name,
          spriteFront: entry.spriteFront,
          isShiny: Boolean(entry.isShiny),
          baseAttack: getPokemonBaseAttack(entry),
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
      this.ensureClassicWeaponInInventory()
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

    addPokemonToPokedex(pokemon) {
      const entry = normalizePokedexFromStorage([pokemon])[0] || null
      if (!entry) {
        return null
      }

      entry.weaponId = null
      entry.skinId = null

      const existing = this.findPokedexEntryById(entry.pokemonId)
      if (existing) {
        if (entry.isShiny) {
          existing.isShiny = true
          existing.spriteFront = entry.spriteFront || existing.spriteFront
          this.saveToStorage()
        }
        return existing
      }

      this.pokedex.push(entry)
      this.saveToStorage()
      return entry
    },

    setPokemonWeaponLoadout(pokemonId, weaponId, skinId) {
      const entry = this.findPokedexEntryById(pokemonId)
      if (!entry) {
        return false
      }

      const weapon = this.findOwnedWeaponById(weaponId)
      if (!weapon) {
        return false
      }

      this.ensureDefaultSkinInOwnedWeapon(weaponId)
      const defaultSkinId = getWeaponDefaultSkinId(weaponId)
      const canUseSkin = Array.isArray(weapon.skins) && weapon.skins.includes(skinId)
      if (!canUseSkin && skinId !== defaultSkinId) {
        return false
      }

      entry.weaponId = weaponId
      entry.skinId = skinId
      this.saveToStorage()
      return true
    },

    buyWeapon(weapon) {
      if (!weapon || !weapon.id) {
        return {
          success: false,
          reason: 'invalid'
        }
      }

      if (this.findOwnedWeaponById(weapon.id)) {
        return {
          success: false,
          reason: 'already-owned'
        }
      }

      if (!this.spendCredits(weapon.price)) {
        return {
          success: false,
          reason: 'not-enough-credits'
        }
      }

      const skins = weapon.defaultSkinId ? [weapon.defaultSkinId] : []
      this.weaponInventory.push({
        id: weapon.id,
        name: weapon.name,
        skins,
      })
      this.ensureDefaultSkinInOwnedWeapon(weapon.id)
      this.saveToStorage()

      return {
        success: true
      }
    },

    buySkin(skin) {
      if (!skin || !skin.id || !skin.weaponId) {
        return {
          success: false,
          reason: 'invalid'
        }
      }

      const weapon = this.findOwnedWeaponById(skin.weaponId)
      if (!weapon) {
        return {
          success: false,
          reason: 'weapon-not-owned'
        }
      }

      if (weapon.skins.includes(skin.id)) {
        return {
          success: false,
          reason: 'already-owned'
        }
      }

      if (!this.spendCredits(skin.price)) {
        return {
          success: false,
          reason: 'not-enough-credits'
        }
      }

      weapon.skins.push(skin.id)
      this.saveToStorage()

      return {
        success: true
      }
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
      return this.shopSkins
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

      this._pendingPokemon = entry
      return {
        action: 'swap'
      }
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
  },
})
