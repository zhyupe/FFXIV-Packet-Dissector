import {
  getFields,
  getChildren,
  FieldMetadata,
  ChildMetadata,
} from './struct.decorator'
import { FieldType } from './field-type.enum'

export type StructConstructor<T extends Struct = Struct> = {
  new (buffer: Buffer): T
  byteLength: number | undefined
}

export abstract class Struct {
  static byteLength: number | undefined

  private getChildConfig(key?: string) {
    if (!key) {
      throw new Error(
        `Invalid field: you may using array/object in type of child, which is not allowed.`,
      )
    }

    const children = getChildren(this)
    const struct = children && children[key]

    if (!struct) {
      throw new Error(
        `Invalid field '${key}': Cannot find corresponding child struct`,
      )
    }

    if (!struct.byteLength) {
      throw new Error(`Child must have byteLength set`)
    }

    return struct
  }

  private readChild(
    buffer: Buffer,
    offset: number,
    config: StructConstructor | ChildMetadata,
  ) {
    const length = config.byteLength
    if (typeof config === 'function') {
      return new config(buffer.slice(offset, offset + (length as number)))
    }

    return this.readField(buffer, undefined, {
      type: config.type,
      offset: offset,
      length: config.byteLength,
    })
  }

  private readField(buffer: Buffer, key?: string, config?: FieldMetadata) {
    if (!config) return

    const { type, offset, length } = config
    let value: unknown
    switch (type) {
      case FieldType.double:
        value = buffer.readDoubleLE(offset)
        break
      case FieldType.float:
        value = buffer.readFloatLE(offset)
        break
      case FieldType.bigint:
        value = buffer.readBigInt64LE(offset)
        break
      case FieldType.biguint:
        value = buffer.readBigUInt64LE(offset)
        break
      case FieldType.int:
        value = buffer.readIntLE(offset, length as number)
        break
      case FieldType.uint:
        value = buffer.readUIntLE(offset, length as number)
        break
      case FieldType.string: {
        let end = offset + (length as number)
        while (end > offset && buffer[end - 1] === 0) {
          --end
        }

        value = buffer.slice(offset, end).toString('utf-8')
        break
      }
      case FieldType.byte:
        value = buffer[offset]
        break
      case FieldType.bytes:
        value = buffer.slice(offset, offset + (length as number))
        break
      case FieldType.array: {
        const child = this.getChildConfig(key)
        const arr = []
        const end = offset + (length as number) - (child.byteLength as number)
        for (let pos = offset; pos <= end; pos += child.byteLength as number) {
          arr.push(this.readChild(buffer, pos, child))
        }
        value = arr
        break
      }
      case FieldType.object: {
        const child = this.getChildConfig(key)
        value = this.readChild(buffer, offset, child)
        break
      }
    }

    return value
  }

  constructor(buffer: Buffer) {
    const fields = getFields(this)
    if (!fields) return

    for (const [key, config] of Object.entries(fields)) {
      if (!config) continue

      try {
        const value = this.readField(buffer, key, config)
        Object.defineProperty(this, key, {
          enumerable: true,
          value: value,
        })
      } catch (e) {
        if (e instanceof RangeError) {
          const { type, offset, length } = config
          console.error(e.message, {
            className: this.constructor.name,
            key,
            type: FieldType[type],
            offset,
            length,
            buffer: buffer.toString('hex'),
          })
          process.exit(1)
        } else {
          throw e
        }
      }
    }
  }
}
