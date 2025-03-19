import type { ConfigEnv, PluginOption, UserConfig } from 'vite'

/**
 * 用于判断是否需要加载插件
 */
interface ConditionPlugin {
  // 判断条件
  condition?: boolean
  // 插件对象
  plugins: () => PluginOption[] | PromiseLike<PluginOption[]>
}

interface CommonPluginOptions {
  /** 是否开启devtools */
  devtools?: boolean
  /** 环境变量 */
  env?: Record<string, any>
  /** 是否注入metadata */
  injectMetadata?: boolean
  /** 是否构建模式 */
  isBuild?: boolean
  /** 构建模式 */
  mode?: string
}

interface ApplicationPluginOptions extends CommonPluginOptions {
  /** 开启后，会在打包dist同级生成dist.zip */
  archiver?: boolean
  /** 开启 gzip|brotli 压缩 */
  compress?: boolean
  /** 压缩类型 */
  compressTypes?: ('brotli' | 'gzip')[]
  /** 在构建的时候抽离配置文件 */
  extraAppConfig?: boolean
  /** 是否开启html插件  */
  html?: boolean
  /** 是否开启i18n */
  i18n?: boolean
  /** 是否注入app loading */
  injectAppLoading?: boolean
  /** 是否注入全局scss */
  injectGlobalScss?: boolean
  /** 是否注入版权信息 */
  license?: boolean
  /** 是否开启nitro mock */
  nitroMock?: boolean
  /** 开启控制台自定义打印 */
  print?: boolean
}

type ApplicationOptions = ApplicationPluginOptions

type DefineApplicationOptions = (config?: ConfigEnv) => Promise<{
  application?: ApplicationOptions
  vite?: UserConfig
}>

type DefineConfig = DefineApplicationOptions

export type {
  ApplicationPluginOptions,
  CommonPluginOptions,
  ConditionPlugin,
  DefineApplicationOptions,
  DefineConfig
}
