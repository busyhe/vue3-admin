import { EventEmitter } from '../event'
import { isFunction, isPromise } from '@vue/shared'

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
  interval?: number // 步骤之间的时间间隔（毫秒）
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
  sequence?: Sequence
) => void

/**
 * 序列配置接口
 */
interface SequenceConfig {
  promises: Promise<any>[] // 存储 Promise 对象的数组
  results: SequenceResult[] // 存储执行结果的数组
  index: number // 当前执行的步骤索引
  steps: SequenceStep[] // 存储待执行步骤的数组
  busy: boolean // 标记当前是否有步骤正在执行
  promise: Promise<any> // 当前执行的 Promise 链
}

/**
 * 序列错误类
 */
class SequenceError extends Error {
  constructor(options: { errno: number; errmsg: string }) {
    super(options.errmsg)
    this.name = 'SequenceError'
    Object.assign(this, options)
  }
}

/**
 * 序列类 - 用于管理和执行一系列异步操作
 * 继承自 EventEmitter，可以触发和监听事件
 */
class Sequence extends EventEmitter {
  // 静态常量
  static readonly SUCCEEDED = 1 // 表示步骤执行成功的状态码
  static readonly FAILED = 0 // 表示步骤执行失败的状态码
  static readonly Error = SequenceError // 序列错误类

  // 私有属性
  private running: boolean = false // 标记序列是否正在运行
  private suspended: boolean = false // 标记序列是否被暂停
  private suspendTimeout: NodeJS.Timeout | null = null // 暂停的定时器
  private muteEndIfEmpty: boolean = false // 当序列为空时是否不触发 end 事件
  private interval: number = 0 // 步骤之间的时间间隔（毫秒）
  private index: number = 0 // 当前执行的步骤索引
  private steps: SequenceStep[] = [] // 存储待执行步骤的数组
  private results: SequenceResult[] = [] // 存储执行结果的数组
  public busy: boolean = false // 标记当前是否有步骤正在执行
  private promise: Promise<any> = Promise.resolve() // 当前执行的 Promise 链

  /**
   * 创建并返回序列的默认配置
   */
  private static createConfig(): SequenceConfig {
    return {
      promises: [],
      results: [],
      index: 0,
      steps: [],
      busy: false,
      promise: Promise.resolve()
    }
  }

  /**
   * 构造函数
   * @param steps 要执行的步骤数组
   * @param options 配置选项
   */
  constructor(steps: SequenceStep[] = [], options: SequenceOptions = {}) {
    super()

    // 初始化序列状态
    this.running = false
    this.suspended = false
    this.suspendTimeout = null
    this.muteEndIfEmpty = !!options.emitEndIfEmpty
    this.interval = options.interval || 0

    // 使用默认配置初始化实例
    Object.assign(this, Sequence.createConfig())

    // 如果提供了步骤，则添加到序列中
    if (steps && steps.length) {
      this.append(steps)
    } else if (!this.muteEndIfEmpty) {
      // 如果序列为空且没有禁用 end 事件，则在下一个事件循环中触发 end 事件
      this.scheduleEndEvent()
    }

    // 如果 autoRun 不为 false，则在下一个事件循环中自动运行序列
    options.autoRun !== false && setTimeout(() => this.run(), 0)
  }

  /**
   * 调度 end 事件的触发
   */
  private scheduleEndEvent(): void {
    if (typeof process === 'object' && isFunction(process.nextTick)) {
      process.nextTick(() => this.emit('end', this.results, this))
    } else if (typeof setImmediate === 'function') {
      setImmediate(() => this.emit('end', this.results, this))
    } else {
      setTimeout(() => this.emit('end', this.results, this), 0)
    }
  }

  /**
   * 向序列中添加新的步骤
   * @param steps 要添加的步骤，可以是函数数组或单个函数
   */
  append(steps: SequenceStep[] | SequenceStep): void {
    const dead = this.index >= this.steps.length

    if (isFunction(steps)) {
      this.steps.push(steps)
    } else {
      this.steps.push(...steps)
    }

    this.running && dead && this.next(true)
  }

  /**
   * 跳转到指定的步骤索引
   * @param n 目标步骤索引
   */
  go(n: number): void {
    if (n === undefined) return
    this.index = Math.min(n, this.steps.length)
  }

  /**
   * 清空序列，重置所有状态
   */
  override clear(): this {
    Object.assign(this, Sequence.createConfig())
    return this
  }

  /**
   * 执行序列中的下一个步骤
   * @param inner 是否是内部调用
   */
  next(inner = false): Promise<any> {
    if (!inner && this.running) {
      console.warn('Please do not call next() while the sequence is running.')
      return Promise.reject(
        new SequenceError({
          errno: 2,
          errmsg: 'Cannot call next during the sequence is running.'
        })
      )
    }

    if (this.busy || this.suspended) return this.promise

    if (this.steps.length === 0) {
      if (!this.muteEndIfEmpty) {
        setTimeout(() => this.emit('end', this.results, this), 0)
      }
      return Promise.resolve()
    }

    if (!this.steps[this.index]) {
      return Promise.reject(
        new SequenceError({
          errno: 1,
          errmsg: 'no more steps.'
        })
      )
    }

    this.busy = true

    return (this.promise = this.promise.then(() => {
      const step = this.steps[this.index]
      let promise: Promise<any>
      try {
        promise = step?.(this.results[this.results.length - 1], this.index, this.results)
        if (!isPromise(promise)) {
          promise = Promise.resolve(promise)
        }
      } catch (e) {
        promise = Promise.reject(e)
      }

      return promise
        .then((value) => {
          const result: SequenceResult = {
            status: Sequence.SUCCEEDED,
            index: this.index,
            value,
            time: +new Date()
          }
          this.results.push(result)
          this.emit('success', result, this.index, this)
          return result
        })
        .catch((reason) => {
          const result: SequenceResult = {
            status: Sequence.FAILED,
            index: this.index,
            reason,
            time: +new Date()
          }
          this.results.push(result)
          this.emit('failed', result, this.index, this)
          return result
        })
        .then((result) => {
          this.index++
          this.busy = false

          if (!this.steps[this.index]) {
            this.emit('end', this.results, this)
          } else {
            setTimeout(() => {
              this.running && this.next(true)
            }, this.interval)
          }
          return result
        })
    }))
  }

  /**
   * 开始运行序列
   */
  run(): void {
    if (this.running) return
    this.running = true
    this.next(true)
  }

  /**
   * 停止运行序列
   */
  stop(): void {
    this.running = false
    if (this.suspendTimeout) {
      clearTimeout(this.suspendTimeout)
      this.suspendTimeout = null
    }
    this.suspended = false
  }

  /**
   * 暂停序列执行一段时间
   * @param duration 暂停的时间（毫秒）
   */
  suspend(duration = 1000): void {
    this.suspended = true
    this.suspendTimeout && clearTimeout(this.suspendTimeout)
    this.suspendTimeout = setTimeout(() => {
      this.suspended = false
      this.running && this.next(true)
    }, duration)
  }

  /**
   * 静态方法：同时执行所有步骤，只要有一个步骤失败，整个序列就会失败
   */
  static all(
    steps: SequenceStep[],
    interval?: number,
    cb?: (seq: Sequence) => void
  ): Promise<SequenceResult[]> {
    if (!steps.length) return Promise.resolve([])
    const sequence = new Sequence(steps, { interval, muteEndIfEmpty: true })
    isFunction(cb) && cb.call(sequence, sequence)
    return new Promise((resolve, reject) => {
      sequence.on('end', (results: SequenceResult[]) => resolve(results))
      sequence.on('failed', () => {
        sequence.stop()
        reject(sequence.results)
      })
    })
  }

  /**
   * 静态方法：按顺序执行所有步骤，无论成功或失败都会继续执行
   */
  static chain(
    steps: SequenceStep[],
    interval?: number,
    cb?: (seq: Sequence) => void
  ): Promise<SequenceResult[]> {
    if (!steps.length) return Promise.resolve([])
    const sequence = new Sequence(steps, { interval, muteEndIfEmpty: true })
    isFunction(cb) && cb.call(sequence, sequence)
    return new Promise((resolve) => {
      sequence.on('end', (results: SequenceResult[]) => resolve(results))
    })
  }

  /**
   * 静态方法：执行步骤直到有一个成功，一旦有一个步骤成功就停止并返回结果
   */
  static any(
    steps: SequenceStep[],
    interval?: number,
    cb?: (seq: Sequence) => void
  ): Promise<SequenceResult[]> {
    if (!steps.length) return Promise.reject([])
    const sequence = new Sequence(steps, { interval, muteEndIfEmpty: true })
    isFunction(cb) && cb.call(sequence, sequence)
    return new Promise((resolve, reject) => {
      sequence.on('success', () => {
        resolve(sequence.results)
        sequence.stop()
      })
      sequence.on('end', () => {
        reject(sequence.results)
      })
    })
  }
}

export { Sequence }
