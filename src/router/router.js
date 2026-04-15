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
]

const router = createRouter({
  history: createWebHistory(),
  routes,
})

router.beforeEach((to) => {
  const playerStore = usePlayerStore()
  playerStore.loadFromStorage()

  if (!playerStore.hasPlayer && to.name !== 'Home') {
    return {
      name: 'Home'
    }
  }

  return true
})

export default router
