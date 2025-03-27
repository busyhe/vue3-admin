// Forked from sindresorhus/is-plain-obj (MIT)
// Copyright (c) Sindre Sorhus <sindresorhus@gmail.com> (https://sindresorhus.com)

/**
 * 判断一个值是否为普通对象
 * 普通对象的定义为：
 * 1. 直接从 Object 构造函数创建的对象
 * 2. 没有自定义原型链的对象
 * 3. 不是可迭代对象或模块对象
 *
 * @param value - 需要检查的值
 * @returns 如果是普通对象则返回 true，否则返回 false
 */
export function isPlainObject(value: unknown): boolean {
  // 如果值为 null 或不是对象类型，直接返回 false
  if (value === null || typeof value !== 'object') {
    return false
  }

  // 获取值的原型
  const prototype = Object.getPrototypeOf(value)

  // 检查原型链
  // 普通对象的原型应该是 Object.prototype 或 null（如 Object.create(null)）
  // 如果原型不是 null 且不是 Object.prototype 且原型自身也有原型，则不是普通对象
  if (
    prototype !== null &&
    prototype !== Object.prototype &&
    Object.getPrototypeOf(prototype) !== null
  ) {
    return false
  }

  // 如果对象实现了 Symbol.iterator，说明它是可迭代对象（如 Map, Set 等），不是普通对象
  if (Symbol.iterator in value) {
    return false
  }

  // 特殊情况：ES 模块对象
  // 如果对象有 Symbol.toStringTag 属性，检查它是否是 ES 模块
  if (Symbol.toStringTag in value) {
    return Object.prototype.toString.call(value) === '[object Module]'
  }

  // 通过所有检查，确认是普通对象
  return true
}
