import { Origin } from 'pcap'
export { Origin as PacketSource }

export const Encoding = {
  UTF8: {
    GetBytes(input: string) {
      return Buffer.from(input)
    },
  },
}

export const int = {
  Parse(input: string) {
    return parseInt(input, 10)
  },
}

export const BitConverter = {
  ToUInt64(input: Buffer, offset: number) {
    return input.readBigUInt64LE(offset)
  },
  ToUInt32(input: Buffer, offset: number) {
    return input.readUInt32LE(offset)
  },
  ToUInt16(input: Buffer, offset: number) {
    return input.readUInt16LE(offset)
  },
  ToSingle(input: Buffer, offset: number) {
    return input.readFloatLE(offset)
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
  IpcData: 0x20,
}

export const IncludesBytes = (source: Buffer, search: Buffer) => {
  if (search == null) return false

  for (var i = 0; i < source.length - search.length; ++i) {
    var result = true
    for (var j = 0; j < search.length; ++j) {
      if (search[j] != source[i + j]) {
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
  constructor(public X: number, public Y: number, public Z: number) {}

  minus(v: Vector3) {
    return new Vector3(this.X - v.X, this.Y - v.Y, this.Z - v.Z)
  }
}

export const hex = (value: number) => `0x${value.toString(16).padStart(4, '0')}`
