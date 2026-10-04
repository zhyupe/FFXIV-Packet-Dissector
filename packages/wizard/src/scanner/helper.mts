export enum PacketSource {
  Client = 'C',
  Server = 'S',
}

export const Encoding = {
  UTF8: {
    GetBytes(input: string) {
      return new TextEncoder().encode(input)
    },
  },
}

export const int = {
  Parse(input: string) {
    return parseInt(input, 10)
  },
}

export const BitConverter = {
  ToInt64(input: Uint8Array, offset: number) {
    return new DataView(
      input.buffer,
      input.byteOffset,
      input.byteLength,
    ).getBigInt64(offset, true)
  },
  ToInt32(input: Uint8Array, offset: number) {
    return new DataView(
      input.buffer,
      input.byteOffset,
      input.byteLength,
    ).getInt32(offset, true)
  },
  ToInt16(input: Uint8Array, offset: number) {
    return new DataView(
      input.buffer,
      input.byteOffset,
      input.byteLength,
    ).getInt16(offset, true)
  },
  ToUInt64(input: Uint8Array, offset: number) {
    return new DataView(
      input.buffer,
      input.byteOffset,
      input.byteLength,
    ).getBigUint64(offset, true)
  },
  ToUInt32(input: Uint8Array, offset: number) {
    return new DataView(
      input.buffer,
      input.byteOffset,
      input.byteLength,
    ).getUint32(offset, true)
  },
  ToUInt16(input: Uint8Array, offset: number) {
    return new DataView(
      input.buffer,
      input.byteOffset,
      input.byteLength,
    ).getUint16(offset, true)
  },
  ToSingle(input: Uint8Array, offset: number) {
    return new DataView(
      input.buffer,
      input.byteOffset,
      input.byteLength,
    ).getFloat32(offset, true)
  },
}

export const Offsets = {
  PacketSize: 0x00,
  SourceActor: 0x04,
  TargetActor: 0x08,
  SegmentType: 0x0c,
  IpcType: 0x12,
  ServerId: 0x16,
  Timestamp: 0x18,
  IpcData: 0,
} as const

export const IncludesBytes = (source: Uint8Array, search: Uint8Array) => {
  if (search == null || search.length === 0) return false

  for (let i = 0; i <= source.length - search.length; ++i) {
    let result = true
    for (let j = 0; j < search.length; ++j) {
      if (search[j] !== source[i + j]) {
        result = false
        break
      }
    }

    if (result) {
      return true
    }
  }

  return false
}

export class Vector3 {
  constructor(
    public X: number,
    public Y: number,
    public Z: number,
  ) {}

  minus(v: Vector3) {
    return new Vector3(this.X - v.X, this.Y - v.Y, this.Z - v.Z)
  }
}

export const hex = (value: number) => `0x${value.toString(16).padStart(4, '0')}`

export const inRange = (diff: Vector3, range: Vector3) => {
  return (
    Math.abs(diff.X) < range.X &&
    Math.abs(diff.Y) < range.Y &&
    Math.abs(diff.Z) < range.Z
  )
}
