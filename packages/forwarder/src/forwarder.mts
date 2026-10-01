import { EventEmitter } from 'node:events'
import { createSocket, type Socket } from 'node:dgram'
import { type DeucalionPacket, Origin } from 'pcap'

const bundleMagic = Buffer.from([
  0x52, 0x52, 0xa0, 0x41, 0xff, 0x5d, 0x46, 0xe2,
  //
  0x7f, 0x2a, 0x64, 0x4d, 0x7b, 0x99, 0xc4, 0x75,
])

const ipc = (
  from: Socket,
  toAddress: string,
  toPort: number,
  packet: DeucalionPacket,
  callback: (error: Error | null) => void,
) => {
  // Bundle (40) + Segment (16) + IPC (16) = 72
  const headerLength = 72

  const header = Buffer.alloc(headerLength)
  bundleMagic.copy(header)

  // bundle time
  header.writeBigUint64LE(packet.header.ipcTimestamp, 16)
  // bundle size
  header.writeUint32LE(headerLength + packet.data.length, 24)
  // segment size
  header.writeUInt32LE(32 + packet.data.length, 40)
  header.writeUInt32LE(packet.header.sourceActor, 44)
  header.writeUInt32LE(packet.header.targetActor, 48)
  // segment type (3 = IPC)
  header.writeUInt16LE(3, 52)
  // ipc magic
  header.writeUint16LE(0x14, 56)
  // ipc type
  header.writeUint16LE(packet.header.type, 58)
  // ipc server
  header.writeUint16LE(packet.header.serverId, 62)
  // ipc epoch
  header.writeUint32LE(packet.header.timestamp, 64)

  from.send(Buffer.concat([header, packet.data]), toPort, toAddress, callback)
}

export class Forwarder extends EventEmitter {
  private client?: Socket
  private server?: Socket
  private generation = 0
  private pending = 0
  status = {
    running: false,
    clientPort: 0,
    serverPort: 0,
    sent: 0,
    received: 0,
    dropped: 0,
    error: '',
  }

  async start() {
    if (this.client) return
    const generation = ++this.generation
    this.status = {
      running: false,
      clientPort: 0,
      serverPort: 0,
      sent: 0,
      received: 0,
      dropped: 0,
      error: '',
    }
    const client = (this.client = createSocket('udp4'))
    const server = (this.server = createSocket('udp4'))
    const bind = (socket: Socket, host: string) =>
      new Promise<number>((resolve, reject) => {
        const failure = () => reject(new Error('UDP_BIND_FAILED'))
        socket.once('error', failure)
        socket.bind(0, host, () => {
          socket.off('error', failure)
          resolve(socket.address().port)
        })
      })
    const failed = () => {
      this.status.error = 'UDP_FAILED'
      void this.stop()
      this.emit('changed')
    }
    client.on('error', failed)
    server.on('error', failed)
    try {
      const [clientPort, serverPort] = await Promise.all([
        bind(client, '127.0.0.11'),
        bind(server, '127.0.0.12'),
      ])
      if (generation !== this.generation) throw new Error('FORWARDER_CANCELLED')
      Object.assign(this.status, { running: true, clientPort, serverPort })
      this.emit('changed')
    } catch (error) {
      await this.stop()
      throw error
    }
  }

  write(packet: DeucalionPacket) {
    if (!this.status.running || !this.client || !this.server) return
    // Bound UDP work independently of the wizard and UI update rate.
    if (this.pending >= 1024 || packet.data.length + 72 > 65507) {
      this.status.dropped++
      return
    }
    const generation = this.generation
    this.pending++
    const outgoing = packet.origin === Origin.Client
    const done = (error: Error | null) => {
      if (generation !== this.generation) return
      this.pending--
      if (error) this.status.dropped++
      else if (outgoing) this.status.sent++
      else this.status.received++
    }
    try {
      ipc(
        outgoing ? this.client : this.server,
        outgoing ? '127.0.0.12' : '127.0.0.11',
        outgoing ? this.status.serverPort : this.status.clientPort,
        packet,
        done,
      )
    } catch {
      done(new Error('UDP_SEND_FAILED'))
    }
  }

  async stop() {
    this.generation++
    this.pending = 0
    const sockets = [this.client, this.server]
    this.client = this.server = undefined
    this.status.running = false
    await Promise.all(
      sockets.map(
        (socket) =>
          new Promise<void>((resolve) => {
            if (!socket) return resolve()
            try {
              socket.close(() => resolve())
            } catch {
              resolve()
            }
          }),
      ),
    )
    this.emit('changed')
  }
}
