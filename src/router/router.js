import {
  createRouter,
  createWebHistory
} from 'vue-router'
import Home from '../pages/Home.vue'
import Game from '../pages/Game.vue'
import Collection from '../pages/Collection.vue'
import Shop from '../pages/Shop.vue'
import {
  usePlayerStore
} from '../store/playerStore'
import {
  executeCommandFromRoute
} from './commandHandlers'

const routes = [{
    path: '/',
    name: 'Home',
    component: Home
  },
  {
    path: '/game',
    name: 'Game',
    component: Game
  },
  {
    path: '/collection',
    name: 'Collection',
    component: Collection
  },
  {
    path: '/shop',
    name: 'Shop',
    component: Shop
  },
  {
    path: '/command/:rawCommand/:arg?',
    name: 'Command'
  },
]

const router = createRouter({
  history: createWebHistory(),
  routes,
})

router.beforeEach(async (to) => {
  const playerStore = usePlayerStore()
  playerStore.loadFromStorage()

  const wasCommandRouteHandled = await executeCommandFromRoute(to, playerStore)
  if (wasCommandRouteHandled) {

    return {
      name: 'Home'
    }
  }

  if (!playerStore.hasPlayer && to.name !== 'Home') {
    return {
      name: 'Home'
    }
  }

  return true
})

export default router
