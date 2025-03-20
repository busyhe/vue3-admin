import { createApp, watchEffect } from 'vue'
import { initStores } from '@admin/stores'

import App from './App.vue'
import router from './router'

async function bootstrap(namespace: string) {
  const app = createApp(App)

  await initStores(app, { namespace })

  app.use(router)

  app.mount('#app')
}

export { bootstrap }
