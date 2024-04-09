import { Position3 } from './interface.mjs'

type BufferFnProperties = Pick<
  Buffer,
  {
    [K in keyof Buffer]: Buffer[K] extends Function ? K : never
  }[keyof Buffer]
>

export class BufferReader {
  private offset = 0

  public get buffer(): Buffer {
    return this.buf
  }

  public get remaining(): number {
    return this.buf.byteLength - this.offset
  }

  constructor(private buf: Buffer) {}

  reset(): BufferReader {
    this.offset = 0
    return this
  }

  move(offset: number): BufferReader {
    this.offset = offset
    return this
  }

  skip(length: number): BufferReader {
    this.offset += length
    return this
  }

  slice(begin?: number, end?: number): Buffer {
    return this.buf.slice(begin, end)
  }

  nextString(length?: number) {
    if (!length) {
      length = this.buf.length - this.offset
    }
    this.offset += length
    try {
      return this.buf
        .toString('utf8', this.offset - length, this.offset)
        .replace(/\u0000/gm, '')
    } catch (e) {
      return ''
    }
  }

  // This is the only function in here that isn't failsafe, be careful when using it
  nextBuffer(length: number, asReader?: false): Buffer
  nextBuffer(length: number, asReader: true): BufferReader
  nextBuffer(length: number, asReader?: boolean): Buffer | BufferReader {
    const buf = this.buf.slice(this.offset, this.offset + length)
    this.offset += length
    if (asReader) {
      return new BufferReader(buf)
    }
    return buf
  }

  restAsBuffer(asReader?: false): Buffer
  restAsBuffer(asReader: true): BufferReader
  restAsBuffer(asReader?: boolean): Buffer | BufferReader {
    const length = this.buf.length - this.offset
    const buf = this.buf.slice(this.offset, this.offset + length)
    if (asReader) {
      return new BufferReader(buf)
    }
    return buf
  }

  nextInt8(fallback = 0): number {
    return this.tryNext('readInt8', 1, fallback)
  }

  nextUInt8(fallback = 0): number {
    return this.tryNext('readUInt8', 1, fallback)
  }

  nextUInt16(fallback = 0): number {
    return this.tryNext('readUInt16LE', 2, 0)
  }

  nextInt16(fallback = 0): number {
    return this.tryNext('readInt16LE', 2, 0)
  }

  nextUInt32(fallback = 0): number {
    return this.tryNext('readUInt32LE', 4, 0)
  }

  nextInt32(fallback = 0): number {
    return this.tryNext('readInt32LE', 4, 0)
  }

  nextUInt64(fallback = 0): bigint {
    return this.tryNext('readBigUInt64LE', 8, BigInt(0))
  }

  nextInt64(fallback = 0): bigint {
    return this.tryNext('readBigInt64LE', 8, BigInt(0))
  }

  nextFloat(fallback = 0): number {
    return this.tryNext('readFloatLE', 4, 0)
  }

  nextDouble(fallback = 0): number {
    return this.tryNext('readDoubleLE', 8, 0)
  }

  nextPosition3UInt16(): Position3 {
    return {
      x: this.nextUInt16(),
      y: this.nextUInt16(),
      z: this.nextUInt16(),
    }
  }

  nextPosition3(): Position3 {
    return {
      x: this.nextFloat(),
      y: this.nextFloat(),
      z: this.nextFloat(),
    }
  }

  debug(length?: number): BufferReader {
    console.log(`Current reader status:`)
    console.log(`Offset: ${this.offset} (0x${this.offset.toString(16)})`)
    console.log(
      `Remaining: ${this.buf.length - this.offset} (0x${(
        this.buf.length - this.offset
      ).toString(16)})`,
    )
    if (length) {
      const bufStr = this.buf
        .slice(this.offset, this.offset + length)
        .toString('hex')
      console.log(`Next ${length} Bytes: ${bufStr.replace(/(.{1,2})/g, '$1 ')}`)
    }
    return this
  }

  private tryNext<T>(
    fn: keyof BufferFnProperties,
    size: number,
    fallback: T,
  ): T {
    try {
      if (typeof this.buf[fn] !== 'function') {
        console.error(
          `Tried to read data using a non-function buffer prop, this shouldn't happen: ${String(
            fn,
          )}`,
        )
        return fallback
      }
      const value: T = (this.buf[fn] as Function)(this.offset)
      this.offset += size
      return value
    } catch (e) {
      //TODO Log a warning or something?
      return fallback
    }
  }
}
