import './assets/main.css'

import { createApp } from 'vue'
import { createPinia } from 'pinia'

import { unmountGlobalLoading } from '@admin/utils'

import App from './App.vue'
import router from './router'

const app = createApp(App)

app.use(createPinia())
app.use(router)

app.mount('#app')

/**
 * 应用初始化完成之后再进行页面加载渲染
 */
async function initApplication() {
  // name用于指定项目唯一标识
  // 用于区分不同项目的偏好设置以及存储数据的key前缀以及其他一些需要隔离的数据
  const env = import.meta.env.PROD ? 'prod' : 'dev'
  const appVersion = import.meta.env.VITE_APP_VERSION

  // 移除并销毁loading
  unmountGlobalLoading()
}

initApplication()
