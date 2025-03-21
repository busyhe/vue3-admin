type EventHandler<T extends (...args: any[]) => void> = T

export class EventEmitter<Events extends Record<string | symbol, (...args: any[]) => void> = any> {
  #events = new Map<keyof Events, Set<EventHandler<Events[keyof Events]>>>()

  #ensureEvent<K extends keyof Events>(eventName: K): void {
    if (!eventName) throw new Error('事件名称不能为空')
  }

  #ensureExecutor<K extends keyof Events>(executor: EventHandler<Events[K]>): void {
    if (typeof executor !== 'function') throw new Error('执行器必须是函数')
  }

  /**
   * 订阅事件
   * @param eventName
   * @param executor
   * @returns
   */
  on<K extends keyof Events>(eventName: K, executor: EventHandler<Events[K]>): this {
    this.#ensureEvent(eventName)
    this.#ensureExecutor(executor)

    if (!this.#events.has(eventName)) {
      this.#events.set(eventName, new Set())
    }
    this.#events.get(eventName)?.add(executor)

    return this
  }

  /**
   * 一次性订阅事件
   * @param eventName
   * @param executor
   * @returns
   */
  once<K extends keyof Events>(eventName: K, executor: EventHandler<Events[K]>): this {
    this.#ensureEvent(eventName)
    this.#ensureExecutor(executor)
    const wrapper = (...args: Parameters<Events[K]>): void => {
      executor.call(this, ...args)
      this.off(eventName, wrapper as unknown as EventHandler<any>)
    }
    this.on(eventName, wrapper as unknown as EventHandler<any>)
    return this
  }

  /**
   * 触发事件
   * @param eventName
   * @param args
   * @returns
   */
  emit<K extends keyof Events>(eventName: K, ...args: Parameters<Events[K]>): this {
    this.#ensureEvent(eventName)

    const listeners = this.#events.get(eventName)
    if (!listeners) return this

    Array.from(listeners).forEach((listener) => {
      try {
        listener.call(this, ...args)
      } catch (error) {
        console.error(`事件 "${String(eventName)}" 执行出错:`, error)
      }
    })
    return this
  }

  /**
   * 取消订阅事件
   * @param eventName
   * @param executor
   * @returns
   */
  off<K extends keyof Events>(eventName: K, executor?: EventHandler<Events[K]>): this {
    this.#ensureEvent(eventName)
    const listeners = this.#events.get(eventName)
    if (!listeners) return this

    if (executor) {
      listeners.delete(executor)
    } else {
      listeners.clear()
    }

    if (listeners.size === 0) {
      this.#events.delete(eventName)
    }

    return this
  }

  /**
   * 清空所有事件
   * @returns
   */
  clear(): this {
    this.#events.clear()

    return this
  }
}
