/**
 * 序列执行结果接口
 */
export interface SequenceResult {
  status: number // 执行状态：1 成功，0 失败
  index: number // 步骤索引
  value?: any // 成功时的返回值
  reason?: any // 失败时的错误原因
  time: number // 执行完成的时间戳
}

/**
 * 序列配置选项接口
 */
export interface SequenceOptions {
  emitEndIfEmpty?: boolean // 当序列为空时是否触发 end 事件
  interval?: number | undefined // 步骤之间的时间间隔（毫秒）
  autoRun?: boolean // 是否自动运行序列
  muteEndIfEmpty?: boolean // 当序列为空时是否不触发 end 事件
}

/**
 * 序列步骤函数类型
 */
export type SequenceStep = (prevResult?: any, index?: number, results?: SequenceResult[]) => any

/**
 * 序列事件类型
 */
export type SequenceEvent = 'success' | 'failed' | 'end'

/**
 * 序列事件回调函数类型
 */
export type SequenceEventCallback = (
  result: SequenceResult,
  index?: number,
  sequence?: ISequence
) => void

/**
 * 序列配置接口
 */
export interface SequenceConfig {
  promises: Promise<any>[] // 存储 Promise 对象的数组
  results: SequenceResult[] // 存储执行结果的数组
  index: number // 当前执行的步骤索引
  steps: SequenceStep[] // 存储待执行步骤的数组
  busy: boolean // 标记当前是否有步骤正在执行
  promise: Promise<any> // 当前执行的 Promise 链
}

/**
 * 序列错误类接口
 */
export interface SequenceErrorOptions {
  errno: number
  errmsg: string
}

/**
 * 序列类接口
 */
export interface ISequence {
  running: boolean
  suspended: boolean
  suspendTimeout: NodeJS.Timeout | null
  muteEndIfEmpty: boolean
  interval: number
  index: number
  steps: SequenceStep[]
  results: SequenceResult[]
  busy: boolean
  promise: Promise<any>

  append(steps: SequenceStep[] | SequenceStep): void
  go(n: number): void
  clear(): this
  next(inner?: boolean): Promise<any>
  run(): void
  stop(): void
  suspend(duration?: number): void
  on(
    event: SequenceEvent,
    callback: (result: SequenceResult, index?: number, sequence?: any) => void
  ): this
  emit(event: SequenceEvent, ...args: any[]): this
}

/**
 * 序列类静态方法接口
 */
export interface ISequenceStatic {
  readonly SUCCEEDED: number
  readonly FAILED: number
  readonly Error: typeof SequenceError

  all(
    steps: SequenceStep[],
    interval?: number,
    cb?: (seq: ISequence) => void
  ): Promise<SequenceResult[]>

  chain(
    steps: SequenceStep[],
    interval?: number,
    cb?: (seq: ISequence) => void
  ): Promise<SequenceResult[]>

  any(
    steps: SequenceStep[],
    interval?: number,
    cb?: (seq: ISequence) => void
  ): Promise<SequenceResult[]>
}

/**
 * 序列错误类
 */
export class SequenceError extends Error {
  errno: number
  errmsg: string

  constructor(options: SequenceErrorOptions) {
    super(options.errmsg)
    this.name = 'SequenceError'
    this.errno = options.errno
    this.errmsg = options.errmsg
  }
}
