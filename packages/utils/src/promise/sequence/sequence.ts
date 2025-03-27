import { EventEmitter } from '../../event'
import { isFunction, isPromise } from '@vue/shared'
import type {
  SequenceResult,
  SequenceOptions,
  SequenceStep,
  SequenceConfig,
  ISequence
} from './type'
import { SequenceError } from './type'

/**
 * 序列类 - 用于管理和执行一系列异步操作
 * 继承自 EventEmitter，可以触发和监听事件
 */
class Sequence extends EventEmitter implements ISequence {
  // 静态常量
  /** 表示步骤执行成功的状态码 */
  static readonly SUCCEEDED = 1
  /** 表示步骤执行失败的状态码 */
  static readonly FAILED = 0
  /** 序列错误类 */
  static readonly Error = SequenceError

  // 私有属性
  /** 标记序列是否正在运行 */
  public running: boolean = false
  /** 标记序列是否被暂停 */
  public suspended: boolean = false
  /** 暂停的定时器 */
  public suspendTimeout: NodeJS.Timeout | null = null
  /** 当序列为空时是否不触发 end 事件 */
  public muteEndIfEmpty: boolean = false
  /** 步骤之间的时间间隔（毫秒）*/
  public interval: number = 0
  /** 当前执行的步骤索引 */
  public index: number = 0
  /** 存储待执行步骤的数组 */
  public steps: SequenceStep[] = []
  /** 存储执行结果的数组 */
  public results: SequenceResult[] = []
  /** 标记当前是否有步骤正在执行 */
  public busy: boolean = false
  /** 当前执行的 Promise 链 */
  public promise: Promise<any> = Promise.resolve()

  /**
   * 创建并返回序列的默认配置
   * @returns {SequenceConfig} 默认的序列配置对象
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
   * @param {SequenceStep[]} steps - 要执行的步骤数组
   * @param {SequenceOptions} options - 配置选项
   * @param {boolean} [options.emitEndIfEmpty] - 当序列为空时是否触发 end 事件
   * @param {number} [options.interval] - 步骤之间的时间间隔（毫秒）
   * @param {boolean} [options.autoRun=true] - 是否自动运行序列
   * @param {boolean} [options.muteEndIfEmpty] - 当序列为空时是否不触发 end 事件
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
   * @private
   * @returns {void} 无返回值
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
   * @param {SequenceStep[] | SequenceStep} steps - 要添加的步骤，可以是函数数组或单个函数
   * @returns {void} 无返回值
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
   * @param {number} n - 目标步骤索引
   * @returns {void} 无返回值
   */
  go(n: number): void {
    if (n === undefined) return
    this.index = Math.min(n, this.steps.length)
  }

  /**
   * 清空序列，重置所有状态
   * @returns {this} 返回当前实例，支持链式调用
   */
  override clear(): this {
    Object.assign(this, Sequence.createConfig())
    return this
  }

  /**
   * 执行序列中的下一个步骤
   * @param {boolean} [inner=false] - 是否是内部调用
   * @returns {Promise<any>} 返回当前执行步骤的 Promise
   * @throws {SequenceError} 如果在序列运行时外部调用，或者没有更多步骤可执行时抛出错误
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
   * @returns {void} 无返回值
   */
  run(): void {
    if (this.running) return
    this.running = true
    this.next(true)
  }

  /**
   * 停止运行序列
   * @returns {void} 无返回值
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
   * @param {number} [duration=1000] - 暂停的时间（毫秒）
   * @returns {void} 无返回值
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
   * @param {SequenceStep[]} steps - 要执行的步骤数组
   * @param {number} [interval] - 步骤之间的时间间隔（毫秒）
   * @param {Function} [cb] - 序列创建后、执行前的回调函数
   * @returns {Promise<SequenceResult[]>} 包含所有执行结果的 Promise
   */
  static all(
    steps: SequenceStep[],
    interval?: number,
    cb?: (seq: ISequence) => void
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
   * @param {SequenceStep[]} steps - 要执行的步骤数组
   * @param {number} [interval] - 步骤之间的时间间隔（毫秒）
   * @param {Function} [cb] - 序列创建后、执行前的回调函数
   * @returns {Promise<SequenceResult[]>} 包含所有执行结果的 Promise
   */
  static chain(
    steps: SequenceStep[],
    interval?: number,
    cb?: (seq: ISequence) => void
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
   * @param {SequenceStep[]} steps - 要执行的步骤数组
   * @param {number} [interval] - 步骤之间的时间间隔（毫秒）
   * @param {Function} [cb] - 序列创建后、执行前的回调函数
   * @returns {Promise<SequenceResult[]>} 包含所有执行结果的 Promise，当有一个步骤成功时解析，全部失败时拒绝
   */
  static any(
    steps: SequenceStep[],
    interval?: number,
    cb?: (seq: ISequence) => void
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
