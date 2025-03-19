import { createApp, watchEffect } from 'vue'
import { createPinia } from 'pinia'

import App from './App.vue'
import router from './router'

async function bootstrap(namespace: string) {
  const app = createApp(App)

  app.use(createPinia())

  app.use(router)

  app.mount('#app')
}

export { bootstrap }
