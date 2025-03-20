import { createDefu } from 'defu'

export { createDefu as createMerge, defu as merge } from 'defu'

/**
 * 合并对象，如果原对象的属性是数组，则使用更新对象的数组覆盖原对象的数组
 * @param originObj - 原始对象
 * @param key - 属性名
 * @param updates - 更新对象
 * @returns 是否覆盖
 */
export const mergeWithArrayOverride = createDefu((originObj, key, updates) => {
  if (Array.isArray(originObj[key]) && Array.isArray(updates)) {
    originObj[key] = updates
    return true
  }
})
