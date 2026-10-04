import { readFileSync, writeFileSync } from 'node:fs'
const schema = JSON.parse(readFileSync(new URL('./generated/schema.json', import.meta.url)))
function type(s) {
  if (s.$ref) return s.$ref.split('/').at(-1)
  if (s.enum) return s.enum.map(v => JSON.stringify(v)).join(' | ')
  if (s.anyOf || s.oneOf) return (s.anyOf || s.oneOf).map(type).join(' | ')
  if (Array.isArray(s.type)) return s.type.map(t => type({...s, type:t})).join(' | ')
  if (s.type === 'null') return 'null'
  if (s.type === 'integer' || s.type === 'number') return 'number'
  if (s.type === 'string' || s.type === 'boolean') return s.type
  if (s.type === 'array') return Array.isArray(s.items) ? `[${s.items.map(type).join(', ')}]` : `Array<${type(s.items || {})}>`
  if (s.type === 'object' || s.properties) {
    if (!s.properties) return `Record<string, ${type(s.additionalProperties || {})}>`
    return `{\n${Object.entries(s.properties).map(([key,v])=>`  ${JSON.stringify(key)}${(s.required || []).includes(key) ? '' : '?'}: ${type(v)}`).join('\n')}\n}`
  }
  return 'unknown'
}
const output = '// Generated from crates/protocol by xtask and contracts/generate.mjs.\n' + Object.entries(schema.definitions).map(([name,s]) => `export type ${name} = ${type(s)}\n`).join('\n')
writeFileSync(new URL('./generated/types.ts', import.meta.url), output)
