export interface Position3 {
  x: number
  y: number
  z: number
}

export enum Origin {
  Client = 'C',
  Server = 'S',
}

export enum ErrorCodes {
  GAME_NOT_RUNNING = -1,
  GAME_RUNNING_AS_ADMIN = 1,
  DLL_NOT_FOUND = 7,
}

export interface DeucalionPacket {
  origin: Origin
  header: DeucalionPacketHeader
  data: Buffer
}

export interface DeucalionPacketHeader {
  sourceActor: number
  targetActor: number
  ipcTimestamp: bigint
  reserved: number
  type: number
  padding: number
  serverId: number
  timestamp: number
  padding1: number
}

export interface DeucalionPayload {
  size: number
  op: number
  channel: number
  data: Buffer
}

export interface DeucalionOptions {
  dll: string
  shasum: string
}

export type Logger = (payload: {
  type: 'info' | 'log' | 'warn' | 'error'
  message: string
}) => void
