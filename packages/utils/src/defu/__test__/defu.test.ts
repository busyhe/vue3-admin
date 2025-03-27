import { expectTypeOf } from 'expect-type'
import { it, describe, expect } from 'vitest'
import { defu, createDefu, defuFn, defuArrayFn } from '../index'
import * as asteriskImport from './fixtures/'

// 定义非对象类型的值数组，用于测试非对象参数的情况
const nonObject = [null, undefined, [], false, true, 123]

// 测试 defu 函数的主要测试套件
describe('defu', () => {
  // 测试只复制缺失属性的功能
  it('should copy only missing properties defaults', () => {
    const result = defu({ a: 'c' }, { a: 'bbb', d: 'c' })
    expect(result).toEqual({ a: 'c', d: 'c' })
    expectTypeOf(result).toMatchTypeOf<{ a: string; d: string }>()
  })

  // 测试处理 null 值的情况
  it('should fill in values that are null', () => {
    const result1 = defu({ a: null as null }, { a: 'c', d: 'c' })
    expect(result1).toEqual({ a: 'c', d: 'c' })
    expectTypeOf(result1).toMatchTypeOf<{ a: string; d: string }>()

    const result2 = defu({ a: 'c' }, { a: null as null, d: 'c' })
    expect(result2).toEqual({ a: 'c', d: 'c' })
    expectTypeOf(result2).toMatchTypeOf<{ a: string; d: string }>()
  })

  // 测试嵌套对象的合并功能
  it('should copy nested values', () => {
    const result = defu({ a: { b: 'c' } }, { a: { d: 'e' } })
    expect(result).toEqual({
      a: { b: 'c', d: 'e' }
    })
    expectTypeOf(result).toMatchTypeOf<{ a: { b: string; d: string } }>()
  })

  // 测试默认情况下数组值的连接功能
  it('should concat array values by default', () => {
    const result = defu({ array: ['a', 'b'] }, { array: ['c', 'd'] })
    expect(result).toEqual({
      array: ['a', 'b', 'c', 'd']
    })
    expectTypeOf(result).toMatchTypeOf<{ array: string[] }>()
  })

  // 测试不同类型数组元素的正确类型推断
  it('should correctly type differing array values', () => {
    const item1 = { name: 'Name', age: 21 }
    const item2 = { name: 'Name', age: '42' }
    const result = defu({ items: [item1] }, { items: [item2] })
    expect(result).toEqual({ items: [item1, item2] })
    expectTypeOf(result).toMatchTypeOf<{
      items: Array<{ name: string; age: number } | { name: string; age: string }>
    }>()
  })

  // 测试避免合并具有自定义构造函数的对象
  it('should avoid merging objects with custom constructor', () => {
    class Test {
      // eslint-disable-next-line no-useless-constructor
      constructor(public value: string) {}
    }
    const result = defu({ test: new Test('a') }, { test: new Test('b') })
    expect(result).toEqual({ test: new Test('a') })
  })

  // 测试正确处理日期对象
  it('should assign date properly', () => {
    const date1 = new Date('2020-01-01')
    const date2 = new Date('2020-01-02')
    const result = defu({ date: date1 }, { date: date2 })
    expect(result).toEqual({ date: date1 })
  })

  // 测试正确合并不同对象类型
  it('should correctly merge different object types', () => {
    // eslint-disable-next-line unicorn/consistent-function-scoping
    const fn = () => 42
    const re = /test/i

    const result = defu({ a: fn }, { a: re })
    expect(result).toEqual({ a: fn })
    expectTypeOf(result).toMatchTypeOf<{ a: (() => number) | RegExp }>()
  })

  // 测试处理第一个参数为非对象的情况
  it('should handle non object first param', () => {
    for (const val of nonObject) {
      expect(defu(val, { d: true })).toEqual({ d: true })
    }
  })

  // 测试处理第二个参数为非对象的情况
  it('should handle non object second param', () => {
    for (const val of nonObject) {
      expect(defu({ d: true }, val)).toEqual({ d: true })
    }
  })

  // 测试多个默认值对象的合并
  it('multi defaults', () => {
    const result = defu({ a: 1 }, { b: 2, a: 'x' }, { c: 3, a: 'x', b: 'x' })
    expect(result).toEqual({
      a: 1,
      b: 2,
      c: 3
    })
    expectTypeOf(result).toMatchTypeOf<{
      a: string | number
      b: string | number
      c: number
    }>()
  })

  // 测试不会覆盖 Object 原型
  it('should not override Object prototype', () => {
    const payload = JSON.parse('{"constructor": {"prototype": {"isAdmin": true}}}')
    defu({}, payload)
    defu(payload, {})
    defu(payload, payload)
    // @ts-ignore
    expect({}.isAdmin).toBe(undefined)
  })

  // 测试忽略非对象参数
  it('should ignore non-object arguments', () => {
    expect(defu(null, { foo: 1 }, false, 123, { bar: 2 })).toEqual({
      foo: 1,
      bar: 2
    })
  })

  // 测试合并两个以上对象的类型
  it('should merge types of more than two objects', () => {
    interface SomeConfig {
      foo: string
    }
    interface SomeOtherConfig {
      bar: string[]
    }
    interface ThirdConfig {
      baz: number[]
    }
    interface ExpectedMergedType {
      foo: string
      bar: string[]
      baz: number[]
    }
    expectTypeOf(
      defu({} as SomeConfig, {} as SomeOtherConfig, {} as ThirdConfig)
    ).toMatchTypeOf<ExpectedMergedType>()
  })

  // 测试允许在合并链中使用部分类型
  it('should allow partials within merge chain', () => {
    interface SomeConfig {
      foo: string[]
    }
    interface SomeOtherConfig {
      bar: string[]
    }
    interface ExpectedMergedType {
      foo: string[]
      bar: string[]
    }
    let options: (SomeConfig & SomeOtherConfig) | undefined

    expectTypeOf(
      defu(options ?? {}, { foo: ['test'] }, { bar: ['test2'] }, {})
    ).toMatchTypeOf<ExpectedMergedType>()

    expectTypeOf(
      defu({ foo: ['test'] }, {}, { bar: ['test2'] }, {})
    ).toMatchTypeOf<ExpectedMergedType>()
  })

  // 测试自定义合并函数
  it('custom merger', () => {
    const ext = createDefu((obj, key, val) => {
      if (typeof val === 'number') {
        ;(obj as any)[key] += val
        return true
      }
    })
    expect(ext({ cost: 15 }, { cost: 10 })).toEqual({ cost: 25 })
  })

  // 测试 defuFn 函数
  it('defuFn()', () => {
    // eslint-disable-next-line unicorn/consistent-function-scoping
    const num = () => 20
    expect(
      defuFn(
        {
          ignore: (val: any) => val.filter((i: any) => i !== 'dist'),
          num,
          ignored: num
        },
        {
          ignore: ['node_modules', 'dist'],
          num: 10
        }
      )
    ).toEqual({
      ignore: ['node_modules'],
      num: 20,
      ignored: num
    })
  })

  // 测试 defuArrayFn 函数
  it('defuArrayFn()', () => {
    // eslint-disable-next-line unicorn/consistent-function-scoping
    const num = () => 20
    expect(
      defuArrayFn(
        {
          arr: () => ['c'],
          num
        },
        {
          arr: ['a', 'b'],
          num: 10
        }
      )
    ).toEqual({
      arr: ['c'],
      num
    })
  })

  // 测试带命名空间的自定义合并函数
  it('custom merger with namespace', () => {
    const ext = createDefu((obj, key, val, namespace) => {
      // console.log({ obj, key, val, namespace })
      if (key === 'modules') {
        // TODO: It is not possible to override types with extend()
        // @ts-ignore
        obj[key] = namespace + ':' + [...val, ...obj[key]].sort().join(',')
        return true
      }
    })

    const obj1 = { modules: ['A'], foo: { bar: { modules: ['X'] } } }
    const obj2 = { modules: ['B'], foo: { bar: { modules: ['Y'] } } }
    expect(ext(obj1, obj2)).toEqual({
      modules: ':A,B',
      foo: { bar: { modules: 'foo.bar:X,Y' } }
    })
  })

  // 测试与星号导入一起工作
  it('works with asterisk-import', () => {
    expect(
      defu(asteriskImport, {
        a: 2,
        exp: {
          anotherNested: 2
        }
      })
    ).toStrictEqual({
      a: 2,
      exp: {
        anotherNested: 2,
        nested: 1
      }
    })
  })
})
