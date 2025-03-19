import type { PluginOption } from 'vite'
import viteVue from '@vitejs/plugin-vue'
import viteVueJsx from '@vitejs/plugin-vue-jsx'
import viteVueDevTools from 'vite-plugin-vue-devtools'
import { createHtmlPlugin as viteHtmlPlugin } from 'vite-plugin-html'
import { viteInjectAppLoadingPlugin } from './inject-app-loading'
import { viteMetadataPlugin } from './inject-metadata'

import type { ApplicationPluginOptions, CommonPluginOptions, ConditionPlugin } from '../types'
/**
 * 获取条件成立的 vite 插件
 * @param conditionPlugins
 */
async function loadConditionPlugins(conditionPlugins: ConditionPlugin[]) {
  const plugins: PluginOption[] = []
  for (const conditionPlugin of conditionPlugins) {
    if (conditionPlugin.condition) {
      const realPlugins = await conditionPlugin.plugins()
      plugins.push(...realPlugins)
    }
  }
  return plugins.flat()
}

/**
 * 根据条件获取通用的vite插件
 */
async function loadCommonPlugins(options: CommonPluginOptions): Promise<ConditionPlugin[]> {
  const { devtools, injectMetadata, isBuild } = options
  return [
    {
      condition: true,
      plugins: () => [
        viteVue({
          script: {
            defineModel: true
            // propsDestructure: true,
          }
        }),
        viteVueJsx()
      ]
    },

    {
      condition: !isBuild && devtools,
      plugins: () => [viteVueDevTools()]
    },
    {
      condition: injectMetadata,
      plugins: async () => [await viteMetadataPlugin()]
    }
  ]
}

/**
 * 根据条件获取应用类型的vite插件
 */
async function loadApplicationPlugins(options: ApplicationPluginOptions): Promise<PluginOption[]> {
  // 单独取，否则commonOptions拿不到
  const isBuild = options.isBuild
  const env = options.env

  const {
    archiver,
    compress,
    compressTypes,
    extraAppConfig,
    html,
    i18n,
    injectAppLoading,
    license,
    nitroMock,
    print,
    ...commonOptions
  } = options

  const commonPlugins = await loadCommonPlugins(commonOptions)

  return await loadConditionPlugins([
    ...commonPlugins,
    {
      condition: injectAppLoading,
      plugins: async () => [await viteInjectAppLoadingPlugin(!!isBuild, env)]
    },
    {
      condition: !!html,
      plugins: () => [viteHtmlPlugin({ minify: true })]
    }
  ])
}

export { loadApplicationPlugins }
