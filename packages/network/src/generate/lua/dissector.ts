import { existsSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { CNOpcode, type OpcodeMap } from '@/opcode'
import type { OpcodeItem } from '@/opcode/opcode-item.type'
import { FieldType } from '@/struct/field-type.enum'
import { fieldLength } from '@/struct/helper'
import type { Struct, StructConstructor } from '@/struct/struct'
import {
  type ChildMetadata,
  type FieldMetadata,
  getChildren,
  getEnums,
  getFields,
  getStructIf,
} from '@/struct/struct.decorator'
import type { IPCEnum, IPCField, IPCFieldFormat, IPCSchema } from '../interface'
import { snakeCase } from '../utils'
import { type Pair, table, tableValue } from './table'
import { Base } from './wireshark'

/** Path to repository root */
const root = join(__dirname, '../../../../../')

const typeDefaults: Record<string, Partial<IPCFieldFormat>> = {
  bytes: {
    base: Base.NONE,
    add_le: false,
  },
  string: {
    base: Base.UNICODE,
    add_le: false,
  },
}

const protoFieldType = ({ type, length }: IPCField) => {
  if (type === 'uint') {
    return `uint${(length ?? 4) * 8}`
  }

  if (type === 'int') {
    return `int${(length ?? 4) * 8}`
  }

  return type
}

const tvbMethod = ({ type }: IPCField) => {
  if (type === 'string') {
    return 'string(ENC_UTF_8)'
  } else if (type === 'bytes') {
    return 'raw()'
  } else if (type.startsWith('uint')) {
    return type === 'uint64' ? 'le_uint64()' : 'le_uint()'
  } else if (type.startsWith('int')) {
    return type === 'int64' ? 'le_int64()' : 'le_int()'
  } else if (type === 'float') {
    return 'le_float()'
  }

  return `${type}()`
}

const hasConditionAppend = (item: IPCField) =>
  Object.values(item.condition ?? {}).some((values) =>
    values.some((value) => !!value.append),
  )

const renderOpcodeKey = (opcode: string | number) => {
  const opcodeNumber =
    typeof opcode === 'number'
      ? opcode
      : /^0x[0-9a-f]+$/i.test(opcode)
        ? parseInt(opcode, 16)
        : /^\d+$/.test(opcode)
          ? Number(opcode)
          : NaN

  return Number.isFinite(opcodeNumber)
    ? `[0x${opcodeNumber.toString(16).padStart(4, '0')}]`
    : `[${opcode}]`
}

const fieldTypeMap: Record<FieldType, string> = {
  [FieldType.string]: 'string',
  [FieldType.int]: 'int',
  [FieldType.uint]: 'uint',
  [FieldType.bigint]: 'int64',
  [FieldType.biguint]: 'uint64',
  [FieldType.float]: 'float',
  [FieldType.double]: 'double',
  [FieldType.byte]: 'uint8',
  [FieldType.bytes]: 'bytes',
  [FieldType.array]: 'bytes',
  [FieldType.object]: 'bytes',
}

const isStructConstructor = (
  value: StructConstructor | ChildMetadata,
): value is StructConstructor => typeof value === 'function'

const structToIPCSchema = (
  struct: StructConstructor,
  name = struct.name,
  seen = new Set<StructConstructor>(),
): IPCSchema => {
  const prototype = struct.prototype as Struct
  const fields = getFields(prototype)
  const children = getChildren(prototype)
  const schemaChildren: IPCSchema[] = []

  if (!fields) {
    return {
      name,
      type: {},
      version: '',
      length: struct.byteLength ?? 0,
      fields: [],
      enums: getStructEnums(struct),
    }
  }

  const ipcFields = Object.entries(fields).flatMap(([key, metadata]) => {
    if (!metadata) return []

    const child = children?.[key]
    if (child && isStructConstructor(child)) {
      const childName = child.name
      const childLength = child.byteLength ?? metadata.length
      if (!seen.has(child)) {
        seen.add(child)
        schemaChildren.push(structToIPCSchema(child, childName, seen))
      }

      return [
        {
          name: key,
          child_name: childName,
          type: 'children',
          offset: metadata.offset,
          length: metadata.length,
          count:
            metadata.type === FieldType.array && childLength
              ? metadata.length && metadata.length / childLength
              : 1,
        } satisfies IPCField,
      ]
    }

    const field = fieldMetadataToIPCField(key, metadata, child)
    field.format = {
      ...typeDefaults[field.type],
      ...field.format,
    }
    return [field]
  })

  return {
    name,
    type: {},
    version: '',
    length: struct.byteLength ?? getPacketLength({ fields: ipcFields }),
    fields: ipcFields,
    children: schemaChildren,
    enums: getStructEnums(struct),
    if: getStructIf(struct),
  }
}

const getStructEnums = (struct: StructConstructor): IPCEnum[] | undefined => {
  const enums = getEnums(struct)
  if (!enums?.length) return undefined

  return enums.map(({ name, values }) => ({
    name,
    values: Object.entries(values)
      .filter(([key]) => !/^\d+$/.test(key))
      .map(([key, value]) => ({ key, value })),
  }))
}

const fieldMetadataToIPCField = (
  name: string,
  metadata: FieldMetadata,
  child?: StructConstructor | ChildMetadata,
): IPCField => {
  const { format, condition } = metadata

  if (!child || isStructConstructor(child)) {
    return {
      name,
      type: fieldTypeMap[metadata.type],
      offset: metadata.offset,
      length: getFieldMetadataLength(metadata),
      format,
      condition,
    }
  }

  if (metadata.type === FieldType.array) {
    const itemLength =
      metadata.length && child.byteLength
        ? metadata.length / child.byteLength
        : undefined

    return {
      name,
      type: fieldTypeMap[child.type],
      offset: metadata.offset,
      length: child.byteLength,
      count: itemLength,
      format,
      condition,
    }
  }

  return {
    name,
    type: fieldTypeMap[child.type],
    offset: metadata.offset,
    length: metadata.length ?? child.byteLength,
    format,
    condition,
  }
}

const getFieldMetadataLength = (metadata: FieldMetadata) =>
  fieldLength(metadata.type, metadata.length)

class DissectorFile {
  requires = {
    db: false,
    enum: false,
  }

  name: string
  snakeName: string
  fields: Record<string, any> = {}

  constructor(
    name: string,
    private renderer: DissectorRenderer,
  ) {
    this.name = name.replace(/ /g, '')
    this.snakeName = snakeCase(this.name)
  }

  handleSchema = (obj: IPCSchema) => {
    const length = obj.length || getPacketLength(obj)
    this.renderer.registerLength(this.name, length)

    const fields = (obj.fields ?? []).map((oldItem) => {
      const item = { key: snakeCase(oldItem.name), ...oldItem }
      if (typeDefaults[item.type]) {
        Object.assign(item, typeDefaults[item.type])
      }
      return item
    })

    if (!fields.length) return ''

    if (obj.enums) {
      for (const item of obj.enums) {
        this.renderer.registerIPCEnum(item)
      }
    }

    const snakeName = snakeCase(obj.name)
    const maxLength = fields.reduce(
      (max, item) => Math.max(max, item.key.length),
      0,
    )

    const fieldContent = fields
      .map((item) => this.#renderField(item.key, item))
      .join('\n\n')
    const ifContent = obj.if
      ? `\n
  if ${snakeCase(obj.if)}_val == 0 then
    tree:set_hidden(true)
  end`
      : ''

    const output: string[] = []

    // field condition
    output.push('')
    for (const item of fields) {
      const { type, condition } = item
      if (type === 'children' || !condition) continue

      const text = Object.keys(condition)
        .map((key) =>
          table(
            `local label_${item.key}_${snakeCase(key)}`,
            condition[key]
              .filter((row) => row.label)
              .map((row) => ({ key: row.value, value: row.label })),
          ),
        )
        .join('\n')

      if (text) output.push(text)
    }

    output.push('')
    output.push(
      `local ffxiv_ipc_${snakeName} = Proto("ffxiv_ipc_${snakeName}", "FFXIV-IPC ${obj.name}")`,
    )

    // fields
    output.push(
      '',
      `local ${snakeName}_fields = {`,
      ...fields
        .filter((item) => item.type !== 'children')
        .map((item) => {
          const { format = {} } = item
          const enumRef = this.#resolveEnum(format)
          return `  ${item.key}${' '.repeat(maxLength - item.key.length)} = ProtoField.${protoFieldType(item)}("ffxiv_ipc_${snakeName}.${
            item.key
          }", "${item.name}", base.${format.base || 'DEC'}${enumRef ? `, ${enumRef}` : ''}),`
        }),
      '}',
      '',
      `ffxiv_ipc_${snakeName}.fields = ${snakeName}_fields`,
    )

    // dissector
    output.push(
      '',
      `function ffxiv_ipc_${snakeName}.dissector(tvbuf, pktinfo, root)`,
      `  local tree = root:add(ffxiv_ipc_${snakeName}, tvbuf)`,
      `  local len = tvbuf:len()`,
      '',
      fieldContent,
      ifContent,
      '',
      '  return len',
      'end',
    )

    if (this.requires.enum) {
      output.unshift(`local enum = require('ffxiv_enum')`)
    }
    if (this.requires.db) {
      output.unshift(`local db = require('ffxiv_db')`)
    }

    this.renderer.commit(
      `ffxiv_ipc_${this.snakeName}_gen.lua`,
      output.join('\n').replace(/\n[\s\n]*\n/g, '\n\n'),
    )
  }

  #resolveEnum = (format: Pick<IPCFieldFormat, 'db' | 'enum'>) => {
    if (format.db) {
      this.requires.db = true
      return `db.${format.db}`
    }

    if (format.enum) {
      this.requires.enum = true
      return `enum.reverse.${snakeCase(format.enum)}`
    }

    return null
  }

  #renderChildren = (
    fieldKey: string,
    item: {
      /** Referenced struct name */
      name: string
      child_name?: string
      /** Children struct count */
      count?: number
      /** Byte offset */
      offset: number
    },
  ) => {
    const childName = item.child_name ?? item.name
    const length = this.renderer.ipcLength[childName.replace(/ /g, '')]
    if (!length) {
      throw new Error(
        `Dissector '${childName}' cannot be found. Please make sure the structure is placed in 'children' property, or loaded before this file`,
      )
    }

    const count = item.count
      ? `local ${fieldKey}_count = ${typeof item.count === 'number' ? item.count : `${snakeCase(item.count)}_val`}`
      : ''

    return `  -- dissect ${fieldKey}
  local ${fieldKey}_dissector = Dissector.get('ffxiv_ipc_${snakeCase(childName)}')
  local ${fieldKey}_pos = ${item.offset}
  local ${fieldKey}_len = ${length}
  ${count}

  while ${fieldKey}_pos + ${fieldKey}_len <= len do
    local ${fieldKey}_tvbr = tvbuf:range(${fieldKey}_pos, ${length})
    ${fieldKey}_dissector:call(${fieldKey}_tvbr:tvb(), pktinfo, root)
    ${fieldKey}_pos = ${fieldKey}_pos + ${fieldKey}_len
    ${
      count
        ? `${fieldKey}_count = ${fieldKey}_count - 1
    if ${fieldKey}_count <= 0 then
      break
    end`
        : ''
    }
  end`
  }

  #renderField = (fieldKey: string, item: IPCField) => {
    if (item.type === 'children') {
      return this.#renderChildren(fieldKey, item)
    }

    const { format = {} } = item

    let indent = '  '
    let prefix = `${indent}-- dissect the ${fieldKey} field\n`
    let suffix = ''

    if (format.check_length) {
      prefix += `${indent}if tvbuf:len() >= ${item.offset + (item.length || 0)} then\n`
      suffix = `\n${indent}end${suffix}`
      indent += '  '
    }

    const hasPrimitiveArray =
      typeof item.count === 'number' && item.count > 1 && !!item.length

    if (hasPrimitiveArray) {
      const addMethod = format.add_le === false ? 'add' : 'add_le'
      const length = item.length as number
      const valueMethod = format.tvb_method || tvbMethod(item)

      const content = `${indent}local ${fieldKey}_pos = ${item.offset}
${indent}local ${fieldKey}_len = ${length}
${indent}local ${fieldKey}_count = ${item.count}

${indent}while ${fieldKey}_pos + ${fieldKey}_len <= len do
${indent}  local ${fieldKey}_tvbr = tvbuf:range(${fieldKey}_pos, ${fieldKey}_len)
${indent}  local ${fieldKey}_val  = ${fieldKey}_tvbr:${valueMethod}
${indent}  tree:${addMethod}(${this.snakeName}_fields.${fieldKey}, ${fieldKey}_tvbr, ${fieldKey}_val)${
        format.append ? this.#renderAppend(item, `${indent}  `) : ''
      }
${indent}  ${fieldKey}_pos = ${fieldKey}_pos + ${fieldKey}_len
${indent}  ${fieldKey}_count = ${fieldKey}_count - 1
${indent}  if ${fieldKey}_count <= 0 then
${indent}    break
${indent}  end
${indent}end`

      return prefix + content + suffix
    }

    let content = `${indent}local ${fieldKey}_tvbr = tvbuf:range(${item.offset}${item.length ? `, ${item.length}` : ''})
${indent}local ${fieldKey}_val  = ${fieldKey}_tvbr:${format.tvb_method || tvbMethod(item)}`

    let labelKeyVar: string | null = null
    let labelValVar: string | null = null
    const conditionHasAppend = hasConditionAppend(item)
    if (item.condition) {
      labelKeyVar = `${fieldKey}_label_key`
      labelValVar = `${fieldKey}_label_val`
      content += `\n${indent}local ${labelKeyVar} = "${item.name}"`
      content += `\n${indent}local ${labelValVar} = ${fieldKey}_val`
      if (conditionHasAppend) {
        content += `\n${indent}local ${fieldKey}_append_mode = ${
          format.append ? tableValue(format.append) : 'nil'
        }`
      }

      let isFirst = true
      for (const [conditionKey, arr] of Object.entries(item.condition)) {
        for (const modifier of arr) {
          if (typeof modifier.value === 'undefined') continue

          content += `\n${indent}${isFirst ? 'if' : 'elseif'} ${snakeCase(conditionKey)}_val == ${tableValue(modifier.value)} then`
          if (modifier.label) {
            content += `\n${indent}  ${labelKeyVar} = ${tableValue(modifier.label)}`
          }

          const enumRef = this.#resolveEnum(modifier)
          if (enumRef) {
            content += `\n${indent}  ${labelValVar} = (${enumRef}[${fieldKey}_val] or "Unknown") .. " (" .. ${fieldKey}_val .. ")"`
          } else if (modifier.base === 'HEX') {
            content += `\n${indent}  ${labelValVar} = string.format('%0${(item.length ?? 1) * 2}x', ${fieldKey}_val)`
          }

          if (modifier.append) {
            content += `\n${indent}  ${fieldKey}_append_mode = ${tableValue(modifier.append)}`
          }
          isFirst = false
        }
      }

      if (!isFirst) {
        content += `\n${indent}end`
      }
    }

    const addMethod = format.add_le === false ? 'add' : 'add_le'
    let labelArg = ''
    if (labelKeyVar) {
      labelArg = `, ${labelKeyVar} .. ": " .. ${labelValVar || `${fieldKey}_val`}`
    }

    content += `\n${indent}tree:${addMethod}(${this.snakeName}_fields.${fieldKey}, ${fieldKey}_tvbr, ${fieldKey}_val${labelArg})`
    if (format.append || conditionHasAppend) {
      const appendModeExpr = conditionHasAppend
        ? `${fieldKey}_append_mode`
        : undefined
      content += `\n${this.#renderAppend(item, indent, {
        appendModeExpr,
        conditionValueExpr: labelValVar ?? undefined,
      })}`
    }
    return prefix + content + suffix
  }

  #renderAppend = (
    item: IPCField,
    indent = '  ',
    options: {
      appendModeExpr?: string
      conditionValueExpr?: string
    } = {},
  ) => {
    const { format = {} } = item
    const snakeName = snakeCase(item.name)
    const baseValueExpr = `${snakeName}_val`

    const enumRef = this.#resolveEnum(format)
    const enumValueExpr = enumRef
      ? `(${enumRef}[${baseValueExpr}] or "(unknown)")`
      : baseValueExpr
    const hexValueExpr = `string.format('%0${(item.length ?? 1) * 2}x', ${baseValueExpr})`
    const conditionValueExpr = options.conditionValueExpr ?? baseValueExpr

    let output = baseValueExpr
    if (options.appendModeExpr) {
      output = `(function()
${indent}  local _append = ${options.appendModeExpr}
${indent}  if _append == "enum" then
${indent}    return ${item.condition ? conditionValueExpr : enumValueExpr}
${indent}  end
${indent}  if _append == "hex" then
${indent}    return ${item.condition ? conditionValueExpr : hexValueExpr}
${indent}  end
${indent}  return ${baseValueExpr}
${indent}end)()`
    } else if (format.append === 'enum') {
      output = item.condition ? conditionValueExpr : enumValueExpr
    } else if (format.append === 'hex') {
      output = item.condition ? conditionValueExpr : hexValueExpr
    }

    let outputName = `${item.name}: `
    if (format.append_name === false) {
      outputName = ''
    } else if (item.condition) {
      outputName = `" .. (${Object.keys(item.condition)
        .map(
          (key) =>
            `label_${snakeName}_${snakeCase(key)}[${snakeCase(key)}_val]`,
        )
        .join(' or ')}) .. "`
    }

    return `
${indent}local ${snakeName}_display = ", ${outputName}" .. ${output}
${indent}pktinfo.cols.info:append(${snakeName}_display)
${indent}tree:append_text(${snakeName}_display)`
  }
}

export class DissectorRenderer {
  enums: Record<string, Pair<number | string>[]> = {}
  ipcLength: Record<string, number> = {}

  output: string
  constructor() {
    this.output = join(root, 'src')
    if (!existsSync(join(this.output, 'ffxiv.lua'))) {
      throw new Error('Missing ffxiv.lua in output dir')
    }
  }

  registerIPCEnum(val: IPCEnum) {
    this.enums[snakeCase(val.name)] = val.values
  }

  registerEnum(name: string, val: Record<string, number | string>) {
    this.enums[name] = Object.entries(val)
      .filter(([key]) => !/^\d+$/.test(key))
      .map(([key, value]) => ({ key, value }))
  }

  registerLength(name: string, length: number) {
    console.log(name, length)
    this.ipcLength[name] = length
  }

  handleIPCSchema(obj: IPCSchema) {
    const handleSchemaTree = (schema: IPCSchema) => {
      if (schema.children) {
        for (const child of schema.children) {
          handleSchemaTree(child)
        }
      }

      if (schema.name) {
        new DissectorFile(schema.name, this).handleSchema(schema)
      }
    }

    handleSchemaTree(obj)

    if (obj.aliases?.length) {
      for (const alias of obj.aliases) {
        const aliasObj = Object.freeze({ ...obj, ...alias })
        new DissectorFile(aliasObj.name, this).handleSchema(aliasObj)
      }
    }
  }

  handleStruct(name: string, struct: StructConstructor) {
    this.handleIPCSchema(structToIPCSchema(struct, name))
  }

  commitEnums() {
    const enums = Object.entries(this.enums)
    if (enums.length) {
      const enumContent = `local M = {
  forward = {},
  reverse = {}
}

local function makeValString(enumTable)
  local t = {}
  for name,num in pairs(enumTable) do
      t[num] = name
  end
  return t
end

${enums
  .map(([key, values]) => {
    values.forEach((row) => {
      if (typeof row.value === 'string' && row.value.startsWith('0x')) {
        row.value = parseInt(row.value, 16)
      }
    })

    return `
${table(`M.forward.${key}`, values)}
M.reverse.${key} = makeValString(M.forward.${key})`
  })
  .join('\n')}

return M
`

      this.commit('ffxiv_enum.lua', enumContent)
    }
  }

  commitOpcodes() {
    const entries = Object.entries(CNOpcode)
    for (const [version, opcodes] of entries) {
      this.commit(
        `ffxiv_ipc_type_${version.replace(/\./g, '_')}_cn.lua`,
        this.#renderOpcodes(opcodes),
      )
    }

    const latestVersion = entries.at(-1)?.[0].replace(/\./g, '_')
    if (latestVersion) {
      this.commit(
        'ffxiv_ipc_type_latest.lua',
        `local M = require("ffxiv_ipc_type_${latestVersion}_cn")\nreturn M`,
      )
    }
  }

  commit(name: string, content: string) {
    writeFileSync(
      join(this.output, name),
      `-- This file is generated by network:generate\n\n${content.trim()}\n`,
    )
  }

  #getOpcodeItemType(item: OpcodeItem | string) {
    return typeof item === 'string' ? item : item.type
  }

  #getOpcodeItemTitle(item: OpcodeItem | string) {
    const type = this.#getOpcodeItemType(item)
    return typeof item === 'string' || !item.title ? type : item.title
  }

  #renderOpcodes(opcodeMap: OpcodeMap) {
    const typesObject: Record<
      string,
      Array<{ name?: string; length?: number; title: string }>
    > = {}
    for (const [opcode, config] of Object.entries(opcodeMap)) {
      if (!config) continue

      const types = (Array.isArray(config) ? config : [config]).map((item) => {
        const type = this.#getOpcodeItemType(item)
        const length =
          typeof item === 'string' || typeof item.size !== 'number'
            ? this.ipcLength[type]
            : item.size
        const entry: { name?: string; length?: number; title: string } = {
          title: this.#getOpcodeItemTitle(item),
        }

        if (typeof length === 'number') {
          entry.name = `ffxiv_ipc_${snakeCase(type)}`
          entry.length = length
        }

        return entry
      })

      if (!types.length) continue

      typesObject[renderOpcodeKey(opcode)] = types
    }

    return `local M = {}
${table('M.types', typesObject)}

function M.getDissector(typeNum, length)
  local types = M.types[typeNum]
  if type(types) ~= "table" then
    return nil
  end

  local title = nil
  if types[0] ~= nil then
    title = types[0].title
  end

  for k, v in pairs(types) do
    if v.name ~= nil and v.length ~= nil and v.length == length then
      return Dissector.get(v.name), v.title
    end
  end

  for k, v in pairs(types) do
    if v.name ~= nil and v.length ~= nil and v.length < length then
      return Dissector.get(v.name), v.title
    end
  end

  return nil, title
end

return M`
  }
}

const getPacketLength = ({ fields }: Pick<IPCSchema, 'fields'>) => {
  if (!fields?.length) return 0

  return fields.reduce(
    (length, item) =>
      Math.max(
        length,
        item.offset +
          (item.type === 'children'
            ? item.length || 0
            : (item.length || 0) * (item.count || 1)),
      ),
    0,
  )
}
