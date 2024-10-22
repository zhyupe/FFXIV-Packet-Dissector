import { execSync } from 'child_process'
import { createHash } from 'crypto'
import { existsSync, readFileSync } from 'fs'
import { dirname, join } from 'path'
import iconv from 'iconv-lite'

function getGameExecutable() {
  const cmd = `wmic process where "name='ffxiv_dx11.exe'" get ExecutablePath`
  const result = execSync(cmd)

  const exe = iconv.decode(result, 'gbk').split('\n')[1]?.trim()
  if (existsSync(exe)) {
    return exe
  }

  return null
}

export function getGameHash() {
  const exe = getGameExecutable()
  if (!exe) return null

  const buf = readFileSync(exe)
  return createHash('sha1').update(buf).digest().toString()
}

export function getGameVersion() {
  const exe = getGameExecutable()
  if (!exe) return null

  return readFileSync(join(dirname(exe), 'ffxivgame.ver'), 'utf-8')
}
