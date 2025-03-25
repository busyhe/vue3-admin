import { readdir, readFile } from 'node:fs/promises'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { expect, test, describe, assert } from 'vitest'
import { imageMeta } from '../image-meta'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)
const fixtureDir = resolve(__dirname, 'fixtures')

describe('image-meta', () => {
  // 测试输入类型验证
  describe('input validation', () => {
    test('should throw TypeError when input is not Uint8Array', () => {
      // @ts-expect-error - Testing invalid input type
      expect(() => imageMeta('not a Uint8Array')).toThrow(TypeError)
      // @ts-expect-error - Testing invalid input type
      expect(() => imageMeta(123)).toThrow(TypeError)
      // @ts-expect-error - Testing invalid input type
      expect(() => imageMeta(null)).toThrow(TypeError)
      // @ts-expect-error - Testing invalid input type
      expect(() => imageMeta(undefined)).toThrow(TypeError)
    })

    test('should throw error when input is empty', () => {
      expect(() => imageMeta(new Uint8Array(0))).toThrow()
    })

    test('should throw error when input is too small', () => {
      // 创建一个很小的数据块，不足以包含完整图像头信息
      expect(() => imageMeta(new Uint8Array([0x00, 0x01, 0x02]))).toThrow()
    })
  })

  // 测试手动构造的边界情况
  describe('edge cases', () => {
    test('should handle truncated data', () => {
      // 创建一个看起来像AVIF但被截断的数据
      const truncatedAvif = new Uint8Array(16)
      // 设置AVIF标记，但不提供完整数据
      truncatedAvif.set([0, 0, 0, 16, 0x66, 0x74, 0x79, 0x70, 0x61, 0x76, 0x69, 0x66], 0)
      expect(() => imageMeta(truncatedAvif)).toThrow()
    })

    test('should reject malformed size information', () => {
      // 创建具有无效大小信息的数据
      const invalidSizeData = new Uint8Array(24)
      // 设置可能导致溢出的大小值
      invalidSizeData.set([0xff, 0xff, 0xff, 0xff], 0) // 极大的大小值
      expect(() => imageMeta(invalidSizeData)).toThrow()
    })
  })

  // 测试特定格式的错误情况
  describe('format specific errors', () => {
    test('should throw specific error for incomplete AVIF', () => {
      // 构造一个AVIF头部但缺少关键box的数据
      const incompleteAvif = new Uint8Array(32)
      incompleteAvif.set([0, 0, 0, 32, 0x66, 0x74, 0x79, 0x70, 0x61, 0x76, 0x69, 0x66], 0)

      try {
        imageMeta(incompleteAvif)
        assert.fail('Should have thrown an error')
      } catch (error: unknown) {
        expect(error instanceof Error).toBe(true)
        // 检查是否包含特定的错误信息
        if (error instanceof Error) {
          expect(error.message).toContain('box not found')
        }
      }
    })
  })

  // 测试fixtures中的图片文件
  for (const fixtureType of ['valid', 'invalid']) {
    const isValid = fixtureType === 'valid'
    describe(fixtureType, async () => {
      for (const format of await readdir(resolve(fixtureDir, fixtureType))) {
        describe(format, async () => {
          const formatDir = resolve(fixtureDir, fixtureType, format)
          for (const fileName of await readdir(formatDir)) {
            if (/\.(meta|md)$/.test(fileName)) {
              continue
            }
            if (isValid) {
              test(fileName, async () => {
                const filePath = resolve(formatDir, fileName)
                const data = await readFile(filePath)
                const meta = imageMeta(data)
                expect(meta.type).toBe(format)
                await expect(meta).toMatchFileSnapshot(filePath + '.meta')
              })
            } else {
              test(fileName, async () => {
                const filePath = resolve(formatDir, fileName)
                const data = await readFile(filePath)
                expect(() => imageMeta(data)).toThrow()
              })
            }
          }
        })
      }
    })
  }
})
