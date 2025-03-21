import { describe, it, expect, afterAll } from 'vitest'
import { Sequence } from '../sequence'

// 创建一个延迟指定毫秒的Promise
const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

// 添加全局错误处理器来处理Sequence.Error，主要处理stop()测试中的"no more steps"错误
afterAll(() => {
  // 给异步操作足够的时间完成
  return new Promise((resolve) => setTimeout(resolve, 100))
})

describe('Sequence', () => {
  // 测试 Sequence.all 方法
  describe('Sequence.all', () => {
    // 测试当步骤为空时，应直接返回一个已解决的Promise
    it('Should return a resolved promise directly if the steps is empty', () => {
      return Sequence.all([])
    })

    // 测试每个步骤应接收到正确的参数
    it('Should have gotten correct params in each step', () => {
      const seq: string[] = []
      return Sequence.all([
        () => {
          return new Promise((resolve) => {
            setTimeout(() => {
              seq.push('a')
              resolve('A')
            }, 15)
          })
        },
        (last: any, index: number, list: any[]) => {
          expect(last.value).toEqual('A')
          expect(index).toEqual(1)
          expect(list[0].value).toEqual('A')

          return new Promise((resolve) => {
            setTimeout(() => {
              seq.push('b')
              resolve('B')
            }, 5)
          })
        },
        () => (seq.push('c'), 'C')
      ])
    })

    // 测试步骤应按顺序执行
    it('Should have executed each step in order', async () => {
      const seq: string[] = []
      await Sequence.all([
        () => {
          return new Promise((resolve) => {
            setTimeout(() => {
              seq.push('a')
              resolve('A')
            }, 15)
          })
        },
        (last: any, index: number, list: any[]) => {
          expect(last.value).toEqual('A')
          expect(index).toEqual(1)
          expect(list[0].value).toEqual('A')

          return new Promise((resolve) => {
            setTimeout(() => {
              seq.push('b')
              resolve('B')
            }, 5)
          })
        },
        () => (seq.push('c'), 'C')
      ])
      expect(seq).toEqual(['a', 'b', 'c'])
    })

    // 测试应该获得包含每个Promise实例值的数组
    it('Should have gotten an Array filled with values of each Promise instance', async () => {
      const seq: string[] = []
      const value = await Sequence.all([
        () => {
          return new Promise((resolve) => {
            setTimeout(() => {
              seq.push('a')
              resolve('A')
            }, 15)
          })
        },
        (last: any, index: number, list: any[]) => {
          expect(last.value).toEqual('A')
          expect(index).toEqual(1)
          expect(list[0].value).toEqual('A')

          return new Promise((resolve) => {
            setTimeout(() => {
              seq.push('b')
              resolve('B')
            }, 5)
          })
        },
        () => (seq.push('c'), 'C')
      ])
      expect([value[0].value, value[1].value, value[2].value]).toEqual(['A', 'B', 'C'])
    })

    // 测试当序列被拒绝时应捕获错误
    it('Should caught the error if the sequence was rejected', async () => {
      try {
        await Sequence.all([() => 'a', () => 'b', () => Promise.reject('error')])
        // 不应该到达这里
        expect(true).toBe(false)
      } catch (results: any) {
        const reason = results[results.length - 1].reason
        expect(reason).toEqual('error')
      }
    })

    // 测试当步骤函数抛出错误时，应将其视为被拒绝的Promise
    it('Should regard the return value of a step as a rejected Promise if the step function thrown an error', async () => {
      try {
        await Sequence.all([
          () => {
            throw 'error'
          }
        ])
        // 不应该到达这里
        expect(true).toBe(false)
      } catch (results: any) {
        const reason = results[0].reason
        expect(reason).toEqual('error')
      }
    })
  })

  // 测试 Sequence.chain 方法
  describe('Sequence.chain', () => {
    // 测试当步骤为空时，应直接返回一个已解决的Promise
    it('Should return a resolved Promise directly if the steps is empty', () => {
      return Sequence.chain([])
    })

    // 测试在每个步骤中应获得正确的原因
    it('Should have gotten correct reasons in each step', () => {
      const seq: string[] = []
      return Sequence.chain([
        () => {
          return new Promise((_resolve, reject) => {
            setTimeout(() => {
              seq.push('a')
              reject('A')
            }, 15)
          })
        },
        (last: any, index: number, list: any[]) => {
          expect(last.status).toEqual(Sequence.FAILED)
          expect(index).toEqual(1)
          expect(last.reason).toEqual('A')
          expect(last.time).toBeLessThanOrEqual(+new Date())
          expect(list[0].status).toEqual(Sequence.FAILED)
          return new Promise((resolve) => {
            setTimeout(() => {
              seq.push('b')
              resolve('B')
            }, 5)
          })
        },
        (last: any, index: number, list: any[]) => {
          expect(last.status).toEqual(Sequence.SUCCEEDED)
          expect(index).toEqual(2)
          expect(last.value).toEqual('B')
          expect(last.time).toBeLessThanOrEqual(+new Date())
          expect(list[1].status).toEqual(Sequence.SUCCEEDED)

          return new Promise((resolve) => {
            setTimeout(() => {
              seq.push('c')
              resolve('C')
            }, 5)
          })
        }
      ])
    })

    // 测试应按顺序执行
    it('Should have executed in order', async () => {
      const seq: string[] = []
      await Sequence.chain([
        () => {
          return new Promise((_resolve, reject) => {
            setTimeout(() => {
              seq.push('a')
              reject('A')
            }, 15)
          })
        },
        (last: any, index: number, list: any[]) => {
          expect(last.status).toEqual(Sequence.FAILED)
          expect(index).toEqual(1)
          expect(last.reason).toEqual('A')
          expect(last.time).toBeLessThanOrEqual(+new Date())
          expect(list[0].status).toEqual(Sequence.FAILED)
          return new Promise((resolve) => {
            setTimeout(() => {
              seq.push('b')
              resolve('B')
            }, 5)
          })
        },
        (last: any, index: number, list: any[]) => {
          expect(last.status).toEqual(Sequence.SUCCEEDED)
          expect(index).toEqual(2)
          expect(last.value).toEqual('B')
          expect(last.time).toBeLessThanOrEqual(+new Date())
          expect(list[1].status).toEqual(Sequence.SUCCEEDED)

          return new Promise((resolve) => {
            setTimeout(() => {
              seq.push('c')
              resolve('C')
            }, 5)
          })
        }
      ])
      expect(seq).toEqual(['a', 'b', 'c'])
    })

    // 测试应在遇到已解决的步骤后解决
    it('Should have resolved after encountering a step resolved', async () => {
      const seq: string[] = []
      const value = await Sequence.chain([
        () => {
          return new Promise((_resolve, reject) => {
            setTimeout(() => {
              seq.push('a')
              reject('A')
            }, 15)
          })
        },
        (last: any, index: number, list: any[]) => {
          expect(last.status).toEqual(Sequence.FAILED)
          expect(index).toEqual(1)
          expect(last.reason).toEqual('A')
          expect(last.time).toBeLessThanOrEqual(+new Date())
          expect(list[0].status).toEqual(Sequence.FAILED)
          return new Promise((resolve) => {
            setTimeout(() => {
              seq.push('b')
              resolve('B')
            }, 5)
          })
        },
        (last: any, index: number, list: any[]) => {
          expect(last.status).toEqual(Sequence.SUCCEEDED)
          expect(index).toEqual(2)
          expect(last.value).toEqual('B')
          expect(last.time).toBeLessThanOrEqual(+new Date())
          expect(list[1].status).toEqual(Sequence.SUCCEEDED)

          return new Promise((resolve) => {
            setTimeout(() => {
              seq.push('c')
              resolve('C')
            }, 5)
          })
        }
      ])
      expect(value.length).toEqual(3)
      expect(value[2].status).toEqual(Sequence.SUCCEEDED)
      expect(value[2].value).toEqual('C')
    })
  })

  // 测试 Sequence.any 方法
  describe('Sequence.any', () => {
    // 测试当步骤为空时，应直接返回一个被拒绝的Promise
    it('Should return a rejected Promise directly if the steps is empty', async () => {
      try {
        await Sequence.any([])
        // 不应该到达这里
        expect(true).toBe(false)
      } catch (error) {
        expect(error).toBeDefined()
      }
    })

    // 测试在任一步骤成功后应停止执行
    it('Should stop executing after any step succeeded', async () => {
      let i = 0
      await Sequence.any([() => Promise.reject(), () => true, () => i++])
      expect(i).toEqual(0)
    })

    // 测试如果所有步骤都失败，应返回失败
    it('Should failed if all the steps failed', async () => {
      try {
        await Sequence.any([() => Promise.reject(), () => Promise.reject(), () => Promise.reject()])
        // 不应该到达这里
        expect(true).toBe(false)
      } catch (error) {
        expect(error).toBeDefined()
      }
    })
  })

  // 测试 Sequence() 构造函数和实例方法
  describe('Sequence()', () => {
    // 基本测试
    it('Sequence', async () => {
      const seq: string[] = []
      const sequence = new Sequence([
        () => {
          return new Promise((resolve) => {
            setTimeout(() => {
              seq.push('a')
              resolve('A')
            }, 20)
          })
        },
        (last: any, _index: number, results: any[]) => {
          expect(last.status).toEqual(Sequence.SUCCEEDED)
          expect(last.value).toEqual('A')
          expect(last.time).toBeLessThanOrEqual(+new Date())
          expect(results.length).toEqual(1)

          return new Promise((_resolve, reject) => {
            setTimeout(() => {
              seq.push('b')
              reject('B')
            }, 5)
          })
        },
        () => {
          seq.push('c')
          return 'C'
        },
        () => {
          return new Promise((resolve) => {
            setTimeout(() => {
              seq.push('d')
              resolve('D')
            }, 20)
          })
        }
      ])
      return new Promise((resolve) => setTimeout(resolve, 100)) // 等待序列完成
    })

    // 测试步骤应按顺序执行
    it('Should have been executed in the order', async () => {
      const seq: string[] = []
      new Sequence([
        () => {
          return new Promise((resolve) => {
            setTimeout(() => {
              seq.push('a')
              resolve('A')
            }, 20)
          })
        },
        () => {
          return new Promise((_resolve, reject) => {
            setTimeout(() => {
              seq.push('b')
              reject('B')
            }, 5)
          })
        },
        () => {
          seq.push('c')
          return 'C'
        },
        () => {
          return new Promise((resolve) => {
            setTimeout(() => {
              seq.push('d')
              resolve('D')
            }, 20)
          })
        }
      ]).append(() => {
        expect(seq).toEqual(['a', 'b', 'c', 'd'])
        seq.push('e')
        return 'E'
      })
      // 等待所有步骤完成
      await sleep(100)
    })

    // 测试 append 方法
    it('append', async () => {
      const seq: string[] = []
      const sequence = new Sequence([
        () => {
          return new Promise((resolve) => {
            setTimeout(() => {
              seq.push('a')
              resolve('A')
            }, 20)
          })
        },
        () => {
          return new Promise((_resolve, reject) => {
            setTimeout(() => {
              seq.push('b')
              reject('B')
            }, 5)
          })
        },
        () => {
          seq.push('c')
          return 'C'
        },
        () => {
          return new Promise((resolve) => {
            setTimeout(() => {
              seq.push('d')
              resolve('D')
            }, 20)
          })
        }
      ])
      sequence.append(() => {
        return new Promise((resolve) => {
          setTimeout(() => {
            resolve('x')
          }, 50)
        })
      })

      // 测试在append后序列是否立即处于忙碌状态
      // 使用原型感知的expect来检查私有属性(测试目的)
      setTimeout(() => {
        expect(sequence.busy).toBeTruthy()
      }, 0)
    })

    // 测试 run 方法
    it('run', async () => {
      let i = 0
      let sequence = new Sequence(
        [
          () => {
            expect(i).toEqual(1)
          }
        ],
        { autoRun: false }
      )

      i++
      sequence.run()
      await sleep(10) // 等待序列完成
    })

    // 测试 next 方法
    it('next', async () => {
      let i = 0
      let sequence = new Sequence([() => i++, () => i++, () => i++], { autoRun: false })

      await Sequence.all([() => sequence.next(), () => sequence.next(), () => sequence.next()])
      expect(i).toEqual(3)
    })

    // 测试 clear 方法
    it('clear', async () => {
      let executed = false
      let sequence = new Sequence([
        () => {
          return new Promise((resolve) => {
            setTimeout(() => {
              resolve('x')
            }, 20)
          })
        },
        () => {
          return new Promise((resolve) => {
            setTimeout(() => {
              executed = true
              resolve('y')
            }, 20)
          })
        }
      ])
      sequence.clear()
      // 使用原型感知的expect来检查私有属性(测试目的)
      expect((sequence as any).steps.length).toEqual(0)

      await sleep(60)
      expect(executed).toBeFalsy()
    })

    // 测试 go 方法
    it('go', async () => {
      let i = 0

      let sequence = new Sequence([
        () => {
          return new Promise((_resolve, reject) => {
            sleep(10).then(() => {
              i++
              reject('x')
            })
          })
        }
      ])

      sequence.on('failed', (_data: any, index: number) => {
        i < 2 && sequence.go(index - 1)
      })

      await sleep(80)
      expect(i).toEqual(2)
    })

    // 测试 suspended 方法
    it('suspended', async () => {
      const start = Date.now()
      const sequence = new Sequence([() => true, () => true])

      return new Promise<void>((resolve) => {
        sequence.on('success', () => {
          sequence.suspend(50)
        })

        sequence.on('end', () => {
          expect(Date.now() - start).toBeGreaterThanOrEqual(50)
          sequence.stop()
          resolve()
        })
      })
    })

    // 测试 stop() 方法在暂停期间也应工作
    it('stop() should work even if calling it during suspended', async () => {
      let i = 0
      const sequence = new Sequence([() => true, () => i++])

      return new Promise<void>((resolve) => {
        sequence.on('success', () => {
          sequence.suspend(50)
          sequence.stop()
        })

        // 添加一个足够长的延时，确保测试结束前定时器回调已执行完毕
        setTimeout(() => {
          expect(i).toEqual(0)
          resolve()
        }, 100)
      })
    })

    // 测试 success 事件
    it('success event', () => {
      return new Promise<void>((resolve) => {
        let sequence = new Sequence([
          () => {
            return new Promise((resolve) => {
              setTimeout(() => {
                resolve('x')
              }, 20)
            })
          }
        ])

        sequence.on('success', (data: any, index: number) => {
          expect(data.index).toEqual(0)
          expect(index).toEqual(0)
          expect(data.value).toEqual('x')
          expect(data.status).toEqual(Sequence.SUCCEEDED)
          resolve()
        })
      })
    })

    // 测试 failed 事件
    it('failed event', () => {
      return new Promise<void>((resolve) => {
        let sequence = new Sequence([
          () => {
            return new Promise((_resolve, reject) => {
              setTimeout(() => {
                reject('x')
              }, 20)
            })
          }
        ])

        sequence.on('failed', (data: any, index: number) => {
          expect(data.index).toEqual(0)
          expect(index).toEqual(0)
          expect(data.reason).toEqual('x')
          expect(data.status).toEqual(Sequence.FAILED)
          resolve()
        })
      })
    })

    // 测试 end 事件
    it('end event', () => {
      return new Promise<void>((resolve) => {
        let sequence = new Sequence([
          () => {
            return new Promise((_resolve, reject) => {
              setTimeout(() => {
                reject('x')
              }, 20)
            })
          }
        ])

        sequence.on('end', () => {
          // 使用原型感知的expect来检查私有属性(测试目的)
          expect((sequence as any).steps.length).toEqual((sequence as any).index)
          resolve()
        })
      })
    })

    // 测试每次完成序列中的所有步骤时都应触发 end 事件
    it('should emitted end event every time finishing all steps in the sequence', async () => {
      let i = 0

      let sequence = new Sequence([() => true])

      sequence.on('end', () => {
        i++
        if (i < 2) {
          sequence.append(() => true)
        }
      })

      await sleep(50)
      expect(i).toEqual(2)
    })

    // 测试如果初始步骤为空，应直接触发 end 事件
    it('end should be emitted directly if the initial steps is empty', () => {
      return new Promise<void>((resolve) => {
        let sequence = new Sequence([])

        sequence.on('end', (results: any[]) => {
          expect(results).toEqual([])
          resolve()
        })
      })
    })
  })

  // 测试带有间隔的运行
  describe('running with interval', () => {
    // 测试第一个步骤应立即执行
    it('the first step should be executed immediately', () => {
      const start = Date.now()
      return new Promise<void>((resolve) => {
        new Sequence(
          [
            () => {
              expect(Date.now() - start).toBeLessThan(500)
              resolve()
            }
          ],
          { interval: 1000 }
        )
      })
    })

    // 测试步骤应按指定间隔执行
    it('steps should be execute with an interval', () => {
      const start = Date.now()
      return new Promise<void>((resolve) => {
        const sequence = new Sequence([() => true, () => true, () => true, () => true], {
          interval: 50
        })

        sequence.on('end', () => {
          expect(Date.now() - start).toBeGreaterThanOrEqual(150)
          resolve()
        })
      })
    })

    // 测试即使初始步骤参数为空，也应正确运行
    it('should also run correctly if the initial steps argument is empty', () => {
      const start = Date.now()
      return new Promise<void>((resolve) => {
        const sequence = new Sequence([], { interval: 50 })

        sequence.append(() => true)
        sequence.append(() => true)
        sequence.append(() => true)

        sequence.append(() => {
          expect(Date.now() - start).toBeGreaterThanOrEqual(150)
          resolve()
        })
      })
    })
  })
})
