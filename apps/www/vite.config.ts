import { fileURLToPath, URL } from 'node:url'

import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import vueJsx from '@vitejs/plugin-vue-jsx'
import vueDevTools from 'vite-plugin-vue-devtools'
import { loadApplicationPlugins } from '@admin/vite-config'

// https://vite.dev/config/
export default defineConfig(async (config) => {
  const plugins = await loadApplicationPlugins({
    isBuild: config.command === 'build',
    devtools: true,
    injectAppLoading: true,
    injectMetadata: true
  })

  return {
    plugins,
    resolve: {
      alias: {
        '@': fileURLToPath(new URL('./src', import.meta.url))
      }
    }
  }
})
