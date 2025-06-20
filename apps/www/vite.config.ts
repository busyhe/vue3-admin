import { fileURLToPath, URL } from 'node:url'

import { defineConfig } from 'vite'
import { loadApplicationPlugins } from '@admin/vite-config'

// https://vite.dev/config/
export default defineConfig(async (config) => {
  const plugins = await loadApplicationPlugins({
    isBuild: config.command === 'build',
    devtools: true,
    injectAppLoading: true,
    injectMetadata: true,
    tailwindcss: true,
    extraAppConfig: true
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
