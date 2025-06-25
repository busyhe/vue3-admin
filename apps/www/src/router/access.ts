import type { ComponentRecordType, GenerateMenuAndRoutesOptions } from '@vben/types'

import { generateAccessible } from '@vben/access'
import { preferences } from '@vben/preferences'

import { message } from 'ant-design-vue'

import { getAllMenusApi } from '#/api'
import { BasicLayout } from '@/layouts'

const forbiddenComponent = () => import('#/views/_core/fallback/forbidden.vue')

async function generateAccess(options: GenerateMenuAndRoutesOptions) {
  const pageMap: ComponentRecordType = import.meta.glob('../views/**/*.vue')

  const layoutMap: ComponentRecordType = {
    BasicLayout
  }

  return await generateAccessible(preferences.app.accessMode, {
    ...options,
    fetchMenuListAsync: async () => {
      message.loading({
        content: `loading...`,
        duration: 1.5
      })
      return await getAllMenusApi()
    },
    // 可以指定没有权限跳转403页面
    forbiddenComponent,
    // 如果 route.meta.menuVisibleWithForbidden = true
    layoutMap,
    pageMap
  })
}

export { generateAccess }
