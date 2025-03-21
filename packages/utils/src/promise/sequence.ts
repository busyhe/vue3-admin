import { EventEmitter } from '../event'
import { isFunction, isPromise } from '@vue/shared'

/**
 * 检查一个值是否为 undefined
 * @param val 需要检查的值
 * @returns 如果值为 undefined 则返回 true，否则返回 false
 */
function isUndefined(val: unknown) {
  return val === undefined
}

/**
 * 创建并返回 Sequence 类的默认配置对象
 * @returns 包含 Sequence 初始状态的配置对象
 */
function config() {
  return {
    promises: [], // 存储 Promise 对象的数组
    results: [], // 存储执行结果的数组
    index: 0, // 当前执行的步骤索引
    steps: [], // 存储待执行步骤的数组
    busy: false, // 标记当前是否有步骤正在执行
    promise: Promise.resolve() // 当前执行的 Promise 链
  }
}
/**
 * Sequence 类的构造函数支持的调用方式示例：
 * new Sequence( false, [] )
 * new Sequence( [] )
 */

/**
 * Sequence 类的配置选项接口
 */
interface SequenceOptions {
  emitEndIfEmpty?: boolean // 当序列为空时是否触发 end 事件
  interval?: number // 步骤之间的时间间隔（毫秒）
  autoRun?: boolean // 是否自动运行序列
  muteEndIfEmpty?: boolean // 当序列为空时是否不触发 end 事件
}

/**
 * parseArguments 函数的返回值接口
 */
interface ParseArgumentsResult {
  steps: any[] // 执行步骤数组
  interval: number // 步骤之间的时间间隔
  cb?: (seq: Sequence) => void // 回调函数
}

/**
 * Sequence 类 - 用于管理和执行一系列异步操作
 * 继承自 EventEmitter，可以触发和监听事件
 */
class Sequence extends EventEmitter {
  static SUCCEEDED = 1 // 表示步骤执行成功的状态码
  static FAILED = 0 // 表示步骤执行失败的状态码

  /**
   * 自定义错误类，用于表示序列执行过程中的错误
   */
  static Error = class {
    constructor(options: { errno: number; errmsg: string }) {
      Object.assign(this, options)
    }
  }

  private running: boolean = false // 标记序列是否正在运行
  private suspended: boolean = false // 标记序列是否被暂停
  private suspendTimeout: NodeJS.Timeout | null = null // 暂停的定时器
  private muteEndIfEmpty: boolean = false // 当序列为空时是否不触发 end 事件
  private interval: number = 0 // 步骤之间的时间间隔（毫秒）
  private index: number = 0 // 当前执行的步骤索引
  private steps: any[] = [] // 存储待执行步骤的数组
  private results: any[] = [] // 存储执行结果的数组
  public busy: boolean = false // 标记当前是否有步骤正在执行
  private promise: Promise<any> = Promise.resolve() // 当前执行的 Promise 链

  /**
   * 构造函数
   * @param steps 要执行的步骤数组
   * @param options 配置选项
   */
  constructor(steps: any[] = [], options: SequenceOptions = {}) {
    super()

    this.running = false
    this.suspended = false
    this.suspendTimeout = null
    this.muteEndIfEmpty = !!options.emitEndIfEmpty
    this.interval = options.interval || 0

    // 使用默认配置初始化实例
    Object.assign(this, config())

    // 如果提供了步骤，则添加到序列中
    if (steps && steps.length) {
      this.append(steps)
    } else if (!this.muteEndIfEmpty) {
      // 如果序列为空且没有禁用 end 事件，则在下一个事件循环中触发 end 事件
      if (typeof process === 'object' && isFunction(process.nextTick)) {
        process.nextTick(() => {
          this.emit('end', this.results, this)
        })
      } else if (typeof setImmediate === 'function') {
        setImmediate(() => {
          this.emit('end', this.results, this)
        })
      } else {
        setTimeout(() => {
          this.emit('end', this.results, this)
        }, 0)
      }
    }

    // 如果 autoRun 不为 false，则在下一个事件循环中自动运行序列
    options.autoRun !== false &&
      setTimeout(() => {
        this.run()
      }, 0)
  }

  /**
   * 向序列中添加新的步骤
   * @param steps 要添加的步骤，可以是函数数组或单个函数
   */
  append(steps: any[] | (() => any)): void {
    // 检查当前序列是否已经执行完毕
    const dead = this.index >= this.steps.length

    // 如果参数是函数，直接添加到步骤数组
    if (isFunction(steps)) {
      this.steps.push(steps)
    } else {
      // 如果参数是数组，将数组中的每个元素添加到步骤数组
      for (let step of steps) {
        this.steps.push(step)
      }
    }

    // 如果序列正在运行且已经执行完毕，则执行新添加的步骤
    this.running && dead && this.next(true)
  }

  /**
   * 跳转到指定的步骤索引
   * @param n 目标步骤索引
   */
  go(n: number): void {
    if (isUndefined(n)) return
    this.index = n
    // 确保索引不超过步骤数组的长度
    if (this.index > this.steps.length) {
      this.index = this.steps.length
    }
  }

  /**
   * 清空序列，重置所有状态
   * @returns 当前实例，支持链式调用
   */
  override clear(): this {
    Object.assign(this, config())
    return this
  }

  /**
   * 执行序列中的下一个步骤
   * @param inner 是否是内部调用，用于防止外部直接调用 next() 导致的问题
   * @returns 当前执行步骤的 Promise 对象
   */
  next(inner = false) {
    // 如果不是内部调用且序列正在运行，则禁止调用
    if (!inner && this.running) {
      console.warn('Please do not call next() while the sequence is running.')
      return Promise.reject(
        new Sequence.Error({
          errno: 2,
          errmsg: 'Cannot call next during the sequence is running.'
        })
      )
    }

    /**
     * 如果有步骤正在执行或序列被暂停，
     * 返回当前正在执行的 Promise 对象
     */
    if (this.busy || this.suspended) return this.promise

    // 如果序列为空，根据配置决定是否触发 end 事件
    if (this.steps.length === 0) {
      // 如果序列完全为空，触发 end 事件而不是抛出错误
      if (!this.muteEndIfEmpty) {
        setTimeout(() => {
          this.emit('end', this.results, this)
        }, 0)
      }
      return Promise.resolve()
    }

    /**
     * 如果已经到达序列的末尾，
     * 返回一个被拒绝的 Promise，原因是没有更多的步骤
     */
    if (!this.steps[this.index]) {
      return Promise.reject(
        new Sequence.Error({
          errno: 1,
          errmsg: 'no more steps.'
        })
      )
    }

    // 标记当前有步骤正在执行
    this.busy = true

    // 执行当前步骤，并将结果添加到 Promise 链中
    return (this.promise = this.promise.then(() => {
      const step = this.steps[this.index]
      let promise

      try {
        // 执行当前步骤，传入上一步的结果、当前索引和所有结果
        promise = step(this.results[this.results.length - 1], this.index, this.results)
        /**
         * 如果步骤函数没有返回 Promise 对象，
         * 创建一个已解决的 Promise 对象，其值为返回值
         */
        if (!isPromise(promise)) {
          promise = Promise.resolve(promise)
        }
      } catch (e) {
        // 如果步骤执行过程中抛出异常，创建一个被拒绝的 Promise
        promise = Promise.reject(e)
      }

      return promise
        .then((value) => {
          // 步骤执行成功，创建结果对象并添加到结果数组
          const result = {
            status: Sequence.SUCCEEDED, // 状态为成功
            index: this.index, // 当前步骤索引
            value, // 步骤返回的值
            time: +new Date() // 执行完成的时间戳
          }
          this.results.push(result)
          // 触发 success 事件
          this.emit('success', result, this.index, this)
          return result
        })
        .catch((reason) => {
          // 步骤执行失败，创建结果对象并添加到结果数组
          const result = {
            status: Sequence.FAILED, // 状态为失败
            index: this.index, // 当前步骤索引
            reason, // 失败原因
            time: +new Date() // 执行完成的时间戳
          }
          this.results.push(result)
          // 触发 failed 事件
          this.emit('failed', result, this.index, this)
          return result
        })
        .then((result) => {
          // 步骤执行完成后，增加索引并标记为未忙碌
          this.index++
          this.busy = false

          // 如果没有更多步骤，触发 end 事件
          if (!this.steps[this.index]) {
            this.emit('end', this.results, this)
          } else {
            // 如果还有更多步骤且序列正在运行，在指定间隔后执行下一个步骤
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
  run() {
    if (this.running) return
    this.running = true
    this.next(true)
  }

  /**
   * 停止运行序列
   */
  stop() {
    this.running = false
    if (this.suspendTimeout) {
      clearTimeout(this.suspendTimeout)
      this.suspendTimeout = null
    }
    this.suspended = false
  }

  /**
   * 暂停序列执行一段时间
   * @param duration 暂停的时间（毫秒），默认为 1000
   */
  suspend(duration = 1000) {
    this.suspended = true
    // 清除之前的暂停定时器
    this.suspendTimeout && clearTimeout(this.suspendTimeout)
    // 设置新的暂停定时器
    this.suspendTimeout = setTimeout(() => {
      this.suspended = false
      // 如果序列仍在运行，恢复执行下一个步骤
      this.running && this.next(true)
    }, duration)
  }

  /**
   * 静态方法：同时执行所有步骤，只要有一个步骤失败，整个序列就会停止
   * 类似于 Promise.all
   * @param args 步骤数组、时间间隔和回调函数
   * @returns 包含所有结果的 Promise
   */
  static all(...args: [any[], number?, ((seq: Sequence) => void)?]): Promise<any[]> {
    const { steps, interval, cb } = parseArguments(...args)
    if (!steps.length) return Promise.resolve([])
    const sequence = new Sequence(steps, { interval, muteEndIfEmpty: true })
    isFunction(cb) && cb.call(sequence, sequence)
    return new Promise((resolve, reject) => {
      sequence.on('end', (results: any[]) => {
        resolve(results)
      })
      sequence.on('failed', () => {
        sequence.stop()
        reject(sequence.results)
      })
    })
  }

  /**
   * 静态方法：按顺序执行所有步骤，无论成功或失败都会继续执行
   * 类似于 Promise.allSettled
   * @param args 步骤数组、时间间隔和回调函数
   * @returns 包含所有结果的 Promise
   */
  static chain(...args: [any[], number?, ((seq: Sequence) => void)?]): Promise<any[]> {
    const { steps, interval, cb } = parseArguments(...args)
    if (!steps.length) return Promise.resolve([])
    const sequence = new Sequence(steps, { interval, muteEndIfEmpty: true })
    isFunction(cb) && cb.call(sequence, sequence)
    return new Promise((resolve) => {
      sequence.on('end', (results: any[]) => {
        resolve(results)
      })
    })
  }

  /**
   * 静态方法：执行步骤直到有一个成功，一旦有一个步骤成功就停止并返回结果
   * 类似于 Promise.any
   * @param args 步骤数组、时间间隔和回调函数
   * @returns 包含成功结果的 Promise
   */
  static any(...args: [any[], number?, ((seq: Sequence) => void)?]): Promise<any[]> {
    const { steps, interval, cb } = parseArguments(...args)
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

/**
 * 解析传入的参数，统一处理不同的调用方式
 * @param steps 步骤数组
 * @param intervalOrCb 时间间隔或回调函数
 * @param cb 回调函数
 * @returns 解析后的参数对象
 */
function parseArguments(
  steps: any[],
  intervalOrCb?: number | ((seq: Sequence) => void),
  cb?: (seq: Sequence) => void
): ParseArgumentsResult {
  if (isFunction(intervalOrCb)) {
    cb = intervalOrCb
    intervalOrCb = 0
  }
  return { steps, interval: (intervalOrCb as number) || 0, cb }
}

export { Sequence }
