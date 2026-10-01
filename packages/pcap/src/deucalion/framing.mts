// Incremental framing; incomplete reads are held only until the next pipe chunk.
export class DeucalionFramer {
  private pending = Buffer.alloc(0)
  write(chunk: Buffer): Buffer[] {
    const data = this.pending.length
      ? Buffer.concat([this.pending, chunk])
      : chunk
    const frames: Buffer[] = []
    let offset = 0
    while (data.length - offset >= 4) {
      const size = data.readUInt32LE(offset)
      if (size < 9 || size > 16 * 1024 * 1024) {
        this.pending = Buffer.alloc(0)
        throw new Error('INVALID_DEUCALION_FRAME')
      }
      if (data.length - offset < size) break
      frames.push(data.subarray(offset, offset + size))
      offset += size
    }
    this.pending = Buffer.from(data.subarray(offset))
    return frames
  }
  clear() {
    this.pending = Buffer.alloc(0)
  }
}
