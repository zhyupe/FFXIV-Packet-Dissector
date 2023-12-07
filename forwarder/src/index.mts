import { Socket, createSocket } from 'dgram'
import { CaptureInterface } from './pcap/index.mjs'
import { DeucalionPacket, Origin } from './pcap/interface.mjs'

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

  from.send(Buffer.concat([header, packet.data]), toPort, toAddress)
}

const bind = (socket: Socket, address: string) =>
  new Promise<number>((resolve) => {
    socket.bind(undefined, address, () => {
      resolve(socket.address().port)
    })
  })

const clientAddress = '127.0.0.11'
const serverAddress = '127.0.0.12'

;(async () => {
  const capture = new CaptureInterface()

  const clientSocket = createSocket('udp4')
  const serverSocket = createSocket('udp4')

  const [clientPort, serverPort] = await Promise.all([
    bind(clientSocket, clientAddress),
    bind(serverSocket, serverAddress),
  ])

  capture.on('packet', (packet) => {
    if (packet.origin === Origin.Client) {
      ipc(clientSocket, serverAddress, serverPort, packet)
    } else {
      ipc(serverSocket, clientAddress, clientPort, packet)
    }
  })

  capture.on('closed', () => {
    clientSocket.close()
    serverSocket.close()
  })

  await capture.start()
})()
