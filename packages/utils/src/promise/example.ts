import { Sequence } from './sequence'

/**
 * Sequence 类使用示例文件
 * 本文件展示了 Sequence 类的各种使用方式和功能特性
 */

// 基础用法示例
async function basicExample() {
  console.log('Basic Sequence Example:')

  // 创建一个新的序列，包含三个步骤函数
  const sequence = new Sequence([
    () => {
      console.log('Step 1')
      return 'Result from step 1' // 返回值会传递给下一个步骤
    },
    (prevResult: string) => {
      // prevResult 参数接收上一步骤的返回值
      console.log('Step 2, previous result:', prevResult)
      return 'Result from step 2'
    },
    (prevResult: string) => {
      console.log('Step 3, previous result:', prevResult)
      return 'Result from step 3'
    }
  ])

  // 监听事件 - 成功事件
  sequence.on('success', (result: { index: number; value: any }) => {
    // result 对象包含步骤索引和返回值
    console.log(`Step ${result.index} succeeded with value:`, result.value)
  })

  // 监听事件 - 失败事件
  sequence.on('failed', (result: { index: number; reason: any }) => {
    // result 对象包含步骤索引和失败原因
    console.log(`Step ${result.index} failed with reason:`, result.reason)
  })

  // 监听事件 - 序列结束事件
  sequence.on('end', (results: any[]) => {
    // results 数组包含所有步骤的执行结果
    console.log('Sequence completed with results:', results)
  })

  // 开始执行序列
  sequence.run()
}

// 基于 Promise 的示例
async function promiseExample() {
  console.log('\nPromise-based Sequence Example:')

  // 创建序列，所有步骤都返回 Promise
  const sequence = new Sequence(
    [
      // 直接返回已解决的 Promise
      () => Promise.resolve('Promise result 1'),
      (prevResult: string) => {
        console.log('Previous result:', prevResult)
        // 返回一个延迟解决的 Promise
        return new Promise((resolve) => setTimeout(() => resolve('Promise result 2'), 500))
      },
      (prevResult: string) => {
        console.log('Previous result:', prevResult)
        return Promise.resolve('Promise result 3')
      }
    ],
    { interval: 1000 }
  ) // 设置步骤之间的间隔为 1 秒

  // 只监听序列结束事件
  sequence.on('end', (results: any[]) => {
    console.log('Promise sequence completed with results:', results)
  })

  sequence.run()
}

// 错误处理示例
async function errorHandlingExample() {
  console.log('\nError Handling Example:')

  // 创建包含失败步骤的序列
  const sequence = new Sequence([
    () => 'Success step', // 成功步骤
    () => {
      throw new Error('Simulated error')
    }, // 抛出错误的步骤
    () => 'This step will still run despite previous error' // 尽管前一步失败，这一步仍会执行
  ])

  // 监听成功事件
  sequence.on('success', (result: { value: any }) => {
    console.log('Success:', result.value)
  })

  // 监听失败事件
  sequence.on('failed', (result: { reason: Error }) => {
    console.log('Failed:', result.reason.message)
  })

  // 监听序列结束事件
  sequence.on('end', () => {
    // 即使某些步骤失败，序列仍会完成
    console.log('Sequence completed despite errors')
  })

  sequence.run()
}

// 动态添加步骤示例
async function dynamicAdditionExample() {
  console.log('\nDynamic Step Addition Example:')

  // 创建空序列
  const sequence = new Sequence()

  // 初始化后添加单个步骤
  sequence.append(() => 'First dynamic step')

  // 一次添加多个步骤
  sequence.append([() => 'Second dynamic step', () => 'Third dynamic step'])

  // 延迟添加另一个步骤
  setTimeout(() => {
    // 即使序列已经开始执行，也可以继续添加步骤
    sequence.append(() => 'Late addition step')
  }, 1000)

  // 监听成功事件
  sequence.on('success', (result: { value: any }) => {
    console.log('Dynamic step success:', result.value)
  })

  // 监听序列结束事件
  sequence.on('end', () => {
    console.log('Dynamic sequence completed')
  })

  // 开始执行序列
  sequence.run()
}

// 序列暂停示例
async function suspensionExample() {
  console.log('\nSequence Suspension Example:')

  // 创建将被暂停的序列
  const sequence = new Sequence([
    () => {
      console.log('Step 1 executed')
      return 'Step 1'
    },
    () => {
      console.log('Step 2 executed')
      // 在此步骤后暂停序列 2 秒
      setTimeout(() => sequence.suspend(2000), 0)
      return 'Step 2'
    },
    () => {
      console.log('Step 3 executed after suspension')
      return 'Step 3'
    }
  ])

  // 监听序列结束事件
  sequence.on('end', () => {
    console.log('Suspension example completed')
  })

  // 开始执行序列
  sequence.run()
}

// Sequence.all 静态方法示例（类似于 Promise.all）
async function sequenceAllExample() {
  console.log('\nSequence.all Example:')

  try {
    // Sequence.all 会同时执行所有步骤，如果有一个步骤失败，整个序列就会失败
    const results = await Sequence.all(
      [
        () => Promise.resolve('All result 1'),
        () => new Promise((resolve) => setTimeout(() => resolve('All result 2'), 500)),
        () => Promise.resolve('All result 3')
      ],
      200,
      (seq) => {
        // 可选的回调函数，在序列开始执行时调用
        console.log('Sequence.all started')
      }
    )

    // 所有步骤都成功完成
    console.log('All steps succeeded:', results)
  } catch (results) {
    // 至少有一个步骤失败
    console.log('At least one step failed:', results)
  }
}

// Sequence.chain 静态方法示例（类似于 Promise.allSettled）
async function sequenceChainExample() {
  console.log('\nSequence.chain Example:')

  // Sequence.chain 会按顺序执行所有步骤，无论成功或失败
  const results = await Sequence.chain(
    [
      () => Promise.resolve('Chain result 1'),
      () => Promise.reject(new Error('Simulated chain error')), // 这个步骤会失败
      () => Promise.resolve('Chain result 3') // 但这个步骤仍会执行
    ],
    200
  ) // 设置步骤间隔为 200 毫秒

  // 所有步骤都会执行，结果数组包含成功和失败的结果
  console.log('Chain completed with all results (including failures):', results)
}

// Sequence.any 静态方法示例（类似于 Promise.any）
async function sequenceAnyExample() {
  console.log('\nSequence.any Example:')

  try {
    // Sequence.any 会执行所有步骤，只要有一个步骤成功就返回
    const results = await Sequence.any([
      // 这个步骤会在 300ms 后失败
      () => new Promise((_, reject) => setTimeout(() => reject(new Error('Any error 1')), 300)),
      // 这个步骤会在 500ms 后成功
      () => new Promise((resolve) => setTimeout(() => resolve('Any successful result'), 500)),
      // 这个步骤会在 700ms 后失败
      () => new Promise((_, reject) => setTimeout(() => reject(new Error('Any error 3')), 700))
    ])

    // 只要有一个步骤成功，整个序列就视为成功
    console.log('At least one step succeeded:', results)
  } catch (results) {
    // 所有步骤都失败的情况
    console.log('All steps failed:', results)
  }
}

// 运行所有示例的函数
async function runAllExamples() {
  // 按顺序执行所有示例函数
  await basicExample()
  await promiseExample()
  await errorHandlingExample()
  await dynamicAdditionExample()
  await suspensionExample()
  await sequenceAllExample()
  await sequenceChainExample()
  await sequenceAnyExample()
}

// 执行所有示例并捕获可能的错误
runAllExamples().catch(console.error)
