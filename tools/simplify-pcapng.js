/**
 * This tool is used to simplify a .pcapng file captured by Wireshark.
 *
 * Usage: `node simplify-pcapng in-file <out-file>`
 *
 * It perform the following procedures:
 * 1. Remove all packets that cannot be recognized as a FFXIV Bundle
 *    (starts with magic `0x41a05252` or 16 bytes of `0`)
 * 2. Decompress the payload if the bundle header indicates that the
 *    payload is compressed.
 * 3. Generate a stub UDP header for each segment.
 *
 * After processing, the TCP stream of bundles would be convert to UDP
 * packets of segments. So dissectors can take use of the Info column
 * to display packet data.
 */

const fs = require('fs')
const zlib = require('zlib')

const inFile = process.argv[2]
if (!inFile) {
  // console.log('Usage: node simplify-pcapng in-file <out-file>')
}

const outFile = process.argv[3] || inFile.replace(/.pcapng$/, '-out.pcapng')

const inFileData = fs.readFileSync(inFile)
const outBuffers = []

/**
 * @param {Buffer} buf
 * @param {number} offset
 */
const readBlock = function (buf, offset) {
  const type = buf.readUInt32LE(offset)
  const length = buf.readUInt32LE(offset + 4)
  // console.log(`[block] Type=${type}, Len=${length}`)
  return {
    type,
    length,
    bodyLength: length - 12,
    body: buf.slice(offset + 8, offset + length - 4)
  }
}

/**
 * @param {Buffer} buf
 * @param {number} offset
 */
const readPktHeader = function (buf, offset) {
  return {
    length: 20,
    interfaceId: buf.readUInt32LE(offset),
    timestampHigh: buf.readUInt32LE(offset + 4),
    timestampLow: buf.readUInt32LE(offset + 8),
    lenCapture: buf.readUInt32LE(offset + 12),
    lenPacket: buf.readUInt32LE(offset + 16)
  }
}

/**
 * @param {Buffer} buf
 * @param {number} offset
 */
const readIPv4 = function (buf, offset) {
  let headerLength = (buf[offset] & 0x0F) * 32 / 8
  let totalLength = buf.readUInt16BE(offset + 2)

  // console.log(`[ipv4] Header=${headerLength}, Total=${totalLength}`)
  return {
    headerLength,
    totalLength,
    source: buf.readUInt32BE(offset + 12),
    target: buf.readUInt32BE(offset + 16),
    header: buf.slice(offset, offset + headerLength),
    body: buf.slice(offset + headerLength, offset + totalLength),
    protocol: buf[offset + 9]
  }
}

/**
 * @param {Buffer} buf
 * @param {number} offset
 */
const readTCP = function (buf, offset) {
  let headerLength = ((buf[offset + 12] & 0xF0) >> 4) * 4
  let flags = buf[offset + 13]

  return {
    headerLength,
    sourcePort: buf.readUInt16BE(offset),
    destPort: buf.readUInt16BE(offset + 2),
    sequence: buf.readUInt32BE(offset + 4),
    header: buf.slice(offset, offset + headerLength),
    protocol: buf[offset + 9],
    flags: {
      flags,
      CWR: !!(flags & 0x80),
      ECE: !!(flags & 0x40),
      URG: !!(flags & 0x20),
      ACK: !!(flags & 0x10),
      PSH: !!(flags & 0x08),
      RST: !!(flags & 0x04),
      SYN: !!(flags & 0x02),
      FIN: !!(flags & 0x01)
    },
    body: buf.slice(offset + headerLength)
  }
}

const createUDPBlock = function (pktHeader, l1Packet, ipv4Packet, tcpPacket, data) {
  let udpHeader = Buffer.alloc(8)
  udpHeader.writeUInt16BE(tcpPacket.sourcePort, 0)
  udpHeader.writeUInt16BE(tcpPacket.destPort, 2)
  udpHeader.writeUInt16BE(data.length + 8, 4)
  udpHeader.writeUInt16BE(0, 6)

  let udpPacket = Buffer.concat([udpHeader, data])

  let ipHeader = Buffer.alloc(ipv4Packet.headerLength)
  ipv4Packet.header.copy(ipHeader)

  ipHeader.writeUInt16BE(udpPacket.length + ipHeader.length, 2) // Override length
  ipHeader.writeUInt8(17, 9) // Override protocol to udp

  let pktData = Buffer.concat([l1Packet, ipHeader, udpPacket])
  let pktHeaderBuf = Buffer.alloc(20)
  pktHeaderBuf.writeUInt32LE(pktHeader.interfaceId, 0) // Block type
  pktHeaderBuf.writeUInt32LE(pktHeader.timestampHigh, 4) // Block type
  pktHeaderBuf.writeUInt32LE(pktHeader.timestampLow, 8) // Block type
  pktHeaderBuf.writeUInt32LE(pktData.length, 12) // Block type
  pktHeaderBuf.writeUInt32LE(pktData.length, 16) // Block type

  let pktBufs = [pktHeaderBuf, pktData]
  if (pktData.length % 4) {
    pktBufs.push(Buffer.alloc(4 - (pktData.length % 4), 0))
  }

  let blockData = Buffer.concat(pktBufs)
  let blockHeader = Buffer.alloc(8)
  blockHeader.writeUInt32LE(6, 0) // Block type
  blockHeader.writeUInt32LE(blockData.length + 12, 4) // Block size
  let blockFooter = Buffer.alloc(4)
  blockFooter.writeUInt32LE(blockData.length + 12, 0) // Block size

  outBuffers.push(blockHeader, blockData, blockFooter)
}

const ipToString = num => `${Math.floor(num / 0x1000000) & 0xff}.${Math.floor(num / 0x10000) & 0xff}.${Math.floor(num / 0x100) & 0xff}.${num & 0xff}`

let pos = 0
let sockets = {}
while (pos < inFileData.length) {
  let block = readBlock(inFileData, pos)
  if (block.type !== 6) {
    // Not a packet, pass
    outBuffers.push(inFileData.slice(pos, pos + block.length))
    pos += block.length
    continue
  }

  pos += block.length

  let pktHeader = readPktHeader(block.body, 0)
  if (pktHeader.lenCapture !== pktHeader.lenPacket) {
    // Length mismatch, ignore
    continue
  }

  let cur = pktHeader.length // pktHeader length
  let l1Packet = block.body.slice(cur, cur + 14)
  let l2Protocol = l1Packet.readUInt16LE(12)
  if (l2Protocol !== 8) {
    // Not an IPv4 packet, ignore
    continue
  }

  cur += 14 // l1 length
  let ipv4Packet = readIPv4(block.body, cur)
  if (ipv4Packet.protocol !== 6) {
    // Not a TCP packet, ignore
    continue
  }

  let tcpPacket = readTCP(ipv4Packet.body, 0)
  if (!tcpPacket.flags.PSH) {
    // Have no data, ignore
    continue
  }

  // Assume the lower is client, higher is server
  // Note: Since we are converting packets to UDP packets, it doesn't matter who the client is
  let client, server
  let direction = 'receive'
  if (ipv4Packet.source > ipv4Packet.target || tcpPacket.sourcePort > tcpPacket.destPort) {
    client = { ip: ipv4Packet.target, port: tcpPacket.destPort }
    server = { ip: ipv4Packet.source, port: tcpPacket.sourcePort }
  } else {
    server = { ip: ipv4Packet.target, port: tcpPacket.destPort }
    client = { ip: ipv4Packet.source, port: tcpPacket.sourcePort }
    direction = 'send'
  }

  // socketName is client => server
  let socketName = `${ipToString(client.ip)}:${client.port} => ${ipToString(server.ip)}:${server.port}`
  // console.log(socketName, tcpPacket.body)
  let socket = sockets[socketName]
  if (!socket) {
    socket = {
      client,
      server,
      // send: client => server
      sendSeq: null,
      sendBuf: [],
      sendPackets: [],
      // receive: server => client
      receiveSeq: null,
      receiveBuf: [],
      receivePackets: []
    }
    sockets[socketName] = socket
  }

  let seq = socket[`${direction}Seq`]
  if (seq === null) {
    // First received packet, assume the sequence starts here
    seq = tcpPacket.sequence
    socket[`${direction}Seq`] = seq
  } else if (seq > tcpPacket.sequence) {
    // Duplicate packet, ignore
    continue
  }

  let bufArray = socket[`${direction}Buf`]
  let packetArray = socket[`${direction}Packets`]
  packetArray.push({
    sequence: tcpPacket.sequence,
    length: tcpPacket.body.length,
    body: tcpPacket.body
  })

  // Merge received packets if possible
  let packetIndex
  while ((packetIndex = packetArray.findIndex(({ sequence }) => sequence === seq)) !== -1) {
    let packet = packetArray[packetIndex]
    seq += packet.length

    // console.log(`[tcp] Received Seq=${packet.sequence}, Len=${packet.length}, Next=${seq}`)
    bufArray.push(packet.body)
    packetArray.splice(packetIndex, 1)
  }
  socket[`${direction}Seq`] = seq

  if (bufArray.length === 0) {
    // Just in case
    continue
  }

  const bundleHeaderLength = 40
  /**
   * @param {*} bytes Bytes required
   * @returns `-1`: Cannot be satisfied; `number > 0`: packets used
   */
  const requireBytes = function (bytes) {
    if (bufArray.length === 0) return -1

    let packetsLength = bufArray[0].length
    let usePackets = 1
    while (packetsLength < bundleHeaderLength) {
      if (bufArray <= usePackets) break

      packetsLength += bufArray[usePackets].length
      ++usePackets
    }

    return packetsLength < bundleHeaderLength ? -1 : usePackets
  }
  // Start checking packets
  while (true) {
    let headerPackets = requireBytes(bundleHeaderLength)
    if (headerPackets === -1) {
      // Don't have enough packets for header
      break
    }

    let buf = headerPackets > 1 ? Buffer.concat(bufArray.slice(0, headerPackets)) : bufArray[0]
    let magics = [0, 1, 2, 3].map(i => buf.readUInt32LE(i * 4))
    if (magics[0] !== 0x41a05252 && !(magics.every(item => item === 0))) {
      // Detection failed, skip the first packet and try again
      bufArray.shift()
      continue
    }

    let bundleLength = buf.readUInt16LE(24)
    if (bundleLength < bundleHeaderLength) {
      throw new Error(`bundleLength(${bundleLength}) should never be less than bundleHeaderLength(40)`)
    }

    let bundlePackets = requireBytes(bundleLength)
    if (bundlePackets === -1) {
      // Don't have enough packets for entire bundle
      // We can replace the first `headerPackets` packets with concatted buffer now
      if (headerPackets > 1) {
        bufArray.splice(0, headerPackets, buf)
      }
      break
    }

    buf = bundlePackets > 1 ? Buffer.concat(bufArray.slice(0, bundlePackets)) : bufArray[0]
    let bundle = buf.length > bundleLength ? buf.slice(0, bundleLength) : buf
    let bundleHeader = bundle.slice(0, bundleHeaderLength)
    let bundleData = bundle.slice(bundleHeaderLength)

    // Decompress
    let compressed = bundleHeader[33]
    if (compressed) {
      bundleData = zlib.inflateSync(bundleData)
      bundleHeader[33] = 0
    }

    // Generate a stub UDP Packet
    let count = bundleHeader.readUInt16LE(30)
    let segmentPos = 0
    for (let i = 0; i < count; ++i) {
      let newBundleHeader = Buffer.alloc(bundleHeader.length)
      bundleHeader.copy(newBundleHeader)

      let segmentLength = bundleData.readUInt16LE(segmentPos)
      // console.log(`[${i}/${count}] ${segmentLength} ${segmentPos}`)

      newBundleHeader.writeUInt16LE(segmentLength + bundleHeaderLength, 24) // Override message count
      newBundleHeader.writeUInt16LE(0, 30) // Override length
      createUDPBlock(pktHeader, l1Packet, ipv4Packet, tcpPacket,
        Buffer.concat([newBundleHeader, bundleData.slice(segmentPos, segmentPos + segmentLength)]))

      segmentPos += segmentLength
    }

    // We can replace the first `bundlePackets` packets with concatted buffer now
    if (buf.length > bundleLength) {
      bufArray.splice(0, bundlePackets, buf.slice(bundleLength))
    } else {
      bufArray.splice(0, bundlePackets)
    }
  }
}

fs.writeFileSync(outFile, Buffer.concat(outBuffers))
