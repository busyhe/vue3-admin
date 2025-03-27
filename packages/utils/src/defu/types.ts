/**
 * 表示可以作为输入的对象类型
 * 键可以是字符串、数字或符号，值可以是任意类型
 */
export type Input = Record<string | number | symbol, any>

/**
 * 表示被忽略的输入类型
 * 这些类型在合并过程中会被忽略
 */
export type IgnoredInput = boolean | number | null | any[] | Record<never, any> | undefined

/**
 * 自定义合并函数类型
 * @param object - 目标对象
 * @param key - 当前处理的键
 * @param value - 当前处理的值
 * @param namespace - 当前键的命名空间路径
 * @returns 如果返回 true，则跳过默认合并逻辑
 */
export type Merger = <T extends Input, K extends keyof T>(
  object: T,
  key: keyof T,
  value: T[K],
  namespace: string
) => any

/**
 * 表示 null、undefined 或 void 的类型
 */
type nullish = null | undefined | void

/**
 * 合并两个对象的类型
 * 复杂的类型计算，用于计算两个对象合并后的类型
 */
export type MergeObjects<
  Destination extends Input,
  Defaults extends Input
> = Destination extends Defaults
  ? Destination
  : Omit<Destination, keyof Destination & keyof Defaults> &
      Omit<Defaults, keyof Destination & keyof Defaults> & {
        -readonly [Key in keyof Destination & keyof Defaults]: Destination[Key] extends nullish
          ? Defaults[Key] extends nullish
            ? nullish
            : Defaults[Key]
          : Defaults[Key] extends nullish
            ? Destination[Key]
            : Merge<Destination[Key], Defaults[Key]> // eslint-disable-line no-use-before-define
      }

/**
 * Defu 函数的返回类型
 * 递归类型定义，处理多个输入对象的合并结果类型
 */
export type Defu<S extends Input, D extends Array<Input | IgnoredInput>> = D extends [
  infer F,
  ...infer Rest
]
  ? F extends Input
    ? Rest extends Array<Input | IgnoredInput>
      ? Defu<MergeObjects<S, F>, Rest>
      : MergeObjects<S, F>
    : F extends IgnoredInput
      ? Rest extends Array<Input | IgnoredInput>
        ? Defu<S, Rest>
        : S
      : S
  : S

/**
 * Defu 函数的类型定义
 * 接受一个源对象和多个默认值对象，返回合并后的结果
 */
export type DefuFn = <Source extends Input, Defaults extends Array<Input | IgnoredInput>>(
  source: Source,
  ...defaults: Defaults
) => Defu<Source, Defaults>

/**
 * Defu 实例的接口定义
 * 包含基本函数、函数合并版本、数组函数合并版本和扩展方法
 */
export interface DefuInstance {
  <Source extends Input, Defaults extends Array<Input | IgnoredInput>>(
    source: Source | IgnoredInput,
    ...defaults: Defaults
  ): Defu<Source, Defaults>
  fn: DefuFn
  arrayFn: DefuFn
  extend(merger?: Merger): DefuFn
}

/**
 * 合并数组的类型
 * 定义两个数组合并后的类型
 */
export type MergeArrays<Destination, Source> =
  Destination extends Array<infer DestinationType>
    ? Source extends Array<infer SourceType>
      ? Array<DestinationType | SourceType>
      : Source | Array<DestinationType>
    : Source | Destination

/**
 * 通用合并类型
 * 处理各种类型合并的复杂逻辑
 */
export type Merge<Destination extends Input, Defaults extends Input> =
  // 处理空值类型
  Destination extends nullish
    ? Defaults extends nullish
      ? nullish
      : Defaults
    : Defaults extends nullish
      ? Destination
      : // 处理数组类型
        Destination extends Array<any>
        ? Defaults extends Array<any>
          ? MergeArrays<Destination, Defaults>
          : Destination | Defaults
        : // 不尝试合并函数、正则表达式、Promise
          // eslint-disable-next-line @typescript-eslint/ban-types
          Destination extends Function
          ? Destination | Defaults
          : Destination extends RegExp
            ? Destination | Defaults
            : Destination extends Promise<any>
              ? Destination | Defaults
              : // 不尝试合并函数、正则表达式、Promise
                // eslint-disable-next-line @typescript-eslint/ban-types
                Defaults extends Function
                ? Destination | Defaults
                : Defaults extends RegExp
                  ? Destination | Defaults
                  : Defaults extends Promise<any>
                    ? Destination | Defaults
                    : // 确保只合并普通对象
                      Destination extends Input
                      ? Defaults extends Input
                        ? MergeObjects<Destination, Defaults>
                        : Destination | Defaults
                      : Destination | Defaults
