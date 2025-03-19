import type { PluginOption } from 'vite'
import { readPackageJSON } from '@admin/node-utils'

/**
 * 用于注入项目信息
 */
async function viteMetadataPlugin(root = process.cwd()): Promise<PluginOption | undefined> {
  const { author, description, homepage, license, version } = await readPackageJSON(root)

  return {
    async config() {
      const isAuthorObject = typeof author === 'object'
      const authorName = isAuthorObject ? author.name : author
      const authorEmail = isAuthorObject ? author.email : null
      const authorUrl = isAuthorObject ? author.url : null

      return {
        define: {
          __ADMIN_METADATA__: JSON.stringify({
            authorEmail,
            authorName,
            authorUrl,
            description,
            homepage,
            license,
            version
          }),
          'import.meta.env.VITE_APP_VERSION': JSON.stringify(version)
        }
      }
    },
    enforce: 'post',
    name: 'vite:inject-metadata'
  }
}

export { viteMetadataPlugin }
