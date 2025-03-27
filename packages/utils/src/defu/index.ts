import { isPlainObject } from './_utils'
import type { Merger, DefuFn as DefuFunction, DefuInstance } from './types'

/**
 * 基础函数，用于合并对象并应用默认值
 * @param baseObject - 基础对象，其属性值将覆盖默认值
 * @param defaults - 默认值对象，当基础对象中没有对应属性时使用
 * @param namespace - 命名空间，用于在递归过程中跟踪属性路径
 * @param merger - 自定义合并函数，用于处理特殊合并逻辑
 * @returns 合并后的对象
 */
function _defu<T>(baseObject: T, defaults: any, namespace = '.', merger?: Merger): T {
  // 如果默认值不是普通对象，则使用空对象作为默认值
  if (!isPlainObject(defaults)) {
    return _defu(baseObject, {}, namespace, merger)
  }

  // 创建默认值的浅拷贝，防止修改原始对象
  const object = Object.assign({}, defaults)

  // 遍历基础对象的所有属性
  for (const key in baseObject) {
    // 跳过原型链上的属性和构造函数，防止安全问题
    if (key === '__proto__' || key === 'constructor') {
      continue
    }

    const value = baseObject[key]

    // 跳过 null 或 undefined 值
    if (value === null || value === undefined) {
      continue
    }

    // 如果提供了自定义合并函数并且返回 true，则跳过默认合并逻辑
    if (merger && merger(object, key, value, namespace)) {
      continue
    }

    // 数组合并：将基础对象的数组与默认值的数组合并
    if (Array.isArray(value) && Array.isArray(object[key])) {
      object[key] = [...value, ...object[key]]
    }
    // 对象递归合并：如果两个值都是普通对象，则递归合并
    else if (isPlainObject(value) && isPlainObject(object[key])) {
      object[key] = _defu(
        value,
        object[key],
        (namespace ? `${namespace}.` : '') + key.toString(),
        merger
      )
    }
    // 简单值覆盖：否则直接用基础对象的值覆盖默认值
    else {
      object[key] = value
    }
  }

  return object
}

/**
 * 创建自定义的 defu 函数实例
 * @param merger - 可选的自定义合并函数
 * @returns defu 函数实例，可接受多个参数并依次合并
 */
export function createDefu(merger?: Merger): DefuFunction {
  return (...arguments_) =>
    // eslint-disable-next-line unicorn/no-array-reduce
    // 使用 reduce 从空对象开始，依次合并所有参数
    arguments_.reduce((p, c) => _defu(p, c, '', merger), {} as any)
}

// 标准版本：基本的对象合并函数
export const defu = createDefu() as DefuInstance
export default defu

/**
 * 带函数合并支持的 defu 版本
 * 当默认值已存在且当前值是函数时，将当前函数应用于默认值
 */
export const defuFn = createDefu((object, key, currentValue) => {
  if (object[key] !== undefined && typeof currentValue === 'function') {
    object[key] = currentValue(object[key])
    return true
  }
})

/**
 * 带函数数组合并支持的 defu 版本
 * 仅当默认值是数组且当前值是函数时，将当前函数应用于默认值数组
 */
export const defuArrayFn = createDefu((object, key, currentValue) => {
  if (Array.isArray(object[key]) && typeof currentValue === 'function') {
    object[key] = currentValue(object[key])
    return true
  }
})

// 导出类型定义
export type { Defu } from './types'
