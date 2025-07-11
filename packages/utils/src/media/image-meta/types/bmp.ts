import type { IImage } from './interface'
import { toUTF8String, readInt32LE, readUInt32LE } from './utils'

export const BMP: IImage = {
  validate: (input) => toUTF8String(input, 0, 2) === 'BM',

  calculate: (input) => ({
    height: Math.abs(readInt32LE(input, 22)),
    width: readUInt32LE(input, 18)
  })
}
