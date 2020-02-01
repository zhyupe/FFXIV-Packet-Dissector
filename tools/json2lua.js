/*
 * This tool is used to convert JSON IPC schemas to Lua dissectors.
 */

const fs = require('fs')
const common = require('./common')
let files = fs.readdirSync('./json')
fs.readdirSync('../src').forEach(file => {
  if (file.startsWith('ffxiv_ipc_') && file.endsWith('_gen.lua')) {
    fs.unlinkSync(`../src/${file}`)
  }
})

const tvbMethod = function (type) {
  if (type.startsWith('uint')) {
    return type === 'uint64' ? 'le_uint64' : 'le_uint'
  } else if (type === 'float') {
    return 'le_float'
  }

  return type
}

const itemAppend = function (item, indent = '  ') {
  let output = `${common.snakeCase(item.name)}_val`
  switch (item.append) {
    case 'enum':
      if (item.enum) {
        output = `(${item.enum}[${output}] or "(unknown)")`
      }
      break
    case 'hex':
      output = `string.format('%0${item.length / 4}x', ${output}))`
      break
    case 'val':
    default:
      break
  }

  let outputName = `${item.name}: `
  if (item.append_name === false) {
    outputName = ''
  } else if (item.label) {
    outputName = `" .. (${Object.keys(item.label)
      .map(key => `label_${item.key}_${common.snakeCase(key)}[${common.snakeCase(key)}_val]`).join(' or ')}) .. "`
  }

  return `
${indent}local ${item.key}_display = ", ${outputName}" .. ${output}
${indent}pktinfo.cols.info:append(${item.key}_display)
${indent}tree:append_text(${item.key}_display)`
}

const resolveEnum = function (value) {
  if (value.startsWith('$')) {
    this.db = true
    return value.replace('$', 'db.')
  } else {
    this.enum = true
    return `enum.reverse.${common.snakeCase(value)}`
  }
}

const renderField = function (snakeName, item) {
  let indent = '  '
  let prefix = `${indent}-- dissect the ${item.key} field\n`
  let suffix = ''

  if (item.check_length) {
    prefix += `${indent}if tvbuf:len() > ${item.offset + (item.length || 0)} then\n`
    suffix = `\n${indent}end` + suffix
    indent += '  '
  }

  let content = `${indent}local ${item.key}_tvbr = tvbuf:range(${item.offset}${item.length ? `, ${item.length}` : ''})
${indent}local ${item.key}_val  = ${item.key}_tvbr:${item.tvb_method || `${tvbMethod(item.type)}()`}`

  let labelKeyVar = null
  let labelValVar = null
  if (item.label) {
    labelKeyVar = `${item.key}_label_key`
    let labelExp = Object.keys(item.label)
      .map(key => `label_${item.key}_${common.snakeCase(key)}[${common.snakeCase(key)}_val]`)
      .join(' or ')
    content += `\n${indent}local ${labelKeyVar} = (${labelExp} or "${item.name}")`
  } else if (item.condition) {
    labelKeyVar = `${item.key}_label_key`
    labelValVar = `${item.key}_label_val`
    content += `\n${indent}local ${labelKeyVar} = "${item.name}"`
    content += `\n${indent}local ${labelValVar} = ${item.key}_val`

    let isFirst = true
    Object.entries(item.condition).forEach(([conditionKey, arr]) => arr.forEach(modifier => {
      if (typeof modifier.value === 'undefined') return

      content += `\n${indent}${isFirst ? 'if' : 'elseif'} ${common.snakeCase(conditionKey)}_val == ${common.tableValue(modifier.value)} then`
      if (modifier.label) {
        content += `\n${indent}  ${labelKeyVar} = ${common.tableValue(modifier.label)}`
      }

      if (modifier.enum) {
        content += `\n${indent}  ${labelValVar} = (${resolveEnum.call(this, modifier.enum)}[${item.key}_val] or "Unknown") .. " (" .. ${item.key}_val .. ")"`
      }
      isFirst = false
    }))

    if (!isFirst) {
      content += `\n${indent}end`
    }
  }

  let addMethod = item.add_le === false ? 'add' : 'add_le'
  let labelArg = ''
  if (labelKeyVar) {
    labelArg = `, ${labelKeyVar} .. ": " .. ${labelValVar || `${item.key}_val`}`
  }

  content += `\n${indent}tree:${addMethod}(${snakeName}_fields.${item.key}, ${item.key}_tvbr, ${item.key}_val${labelArg})`
  if (item.append) {
    content += '\n' + itemAppend(item, indent)
  }
  return prefix + content + suffix
}

let globalEnums = []
const getPacketLength = function (obj) {
  let fields = obj.fields || (obj.structs && obj.structs[0] && obj.structs[0].fields)
  if (!fields || !fields.length) return 0

  return fields.reduce((length, item) => Math.max(length, item.offset + (item.length || 0)), 0)
}

const generateLuaDissector = function (name, obj) {
  let fields = obj.fields || (obj.structs && obj.structs[0] && obj.structs[0].fields)
  if (!fields || !fields.length) return ''

  let context = {
    db: false,
    enum: false
  }

  fields = fields.map(oldItem => {
    const item = { ...oldItem }
    item.key = common.snakeCase(item.name)
    if (item.enum) {
      item.enum = resolveEnum.call(context, item.enum)
    }
    return item
  })

  if (obj.enums) {
    globalEnums = globalEnums.concat(obj.enums.map(enumItem => {
      return {
        key: common.snakeCase(enumItem.name),
        ...enumItem
      }
    }))
  }

  let snakeName = common.snakeCase(name)
  let maxLength = fields.reduce((max, item) => Math.max(max, item.key.length), 0)

  let fieldContent = fields.map(item => renderField.call(context, snakeName, item)).join('\n\n')

  return `-- This file is generated by tools/json2lua.js
${context.db ? `
local db = require('ffxiv_db')` : ''
}${context.enum ? `
local enum = require('ffxiv_enum')` : ''
}${
  fields.map(item => {
    if (!item.label) return ''

    return Object.keys(item.label)
      .map(key => '\n' + common.table(`local label_${item.key}_${common.snakeCase(key)}`, item.label[key]))
      .join('')
  }).filter(a => a).join('')
}
local ffxiv_ipc_${snakeName} = Proto("ffxiv_ipc_${snakeName}", "FFXIV-IPC ${name}")

local ${snakeName}_fields = {${fields.map(item => `
  ${item.key}${' '.repeat(maxLength - item.key.length)} = ProtoField.${item.type}("ffxiv_ipc_${snakeName}.${
  item.key}", "${item.name}", base.${item.base || 'DEC'}${item.enum ? `, ${item.enum}` : ''}),`).join('')}
}

ffxiv_ipc_${snakeName}.fields = ${snakeName}_fields

function ffxiv_ipc_${snakeName}.dissector(tvbuf, pktinfo, root)
  local tree = root:add(ffxiv_ipc_${snakeName}, tvbuf)
  pktinfo.cols.info:set("${name}")

${fieldContent}

  return tvbuf:len()
end`
}

const ipcTypes = {}
const addTypes = (obj) => {
  let { name, type, version = 'unknown', length } = obj
  if (!length) {
    length = getPacketLength(obj)
  }

  if (typeof type === 'object') {
    return Object.keys(type).forEach(version => {
      addTypes({ name, type: type[version], version, length })
    })
  }

  if (!ipcTypes[version]) {
    ipcTypes[version] = []
  }

  ipcTypes[version].push({
    name: name.replace(/ /g, ''),
    type,
    length
  })
}

for (let file of files) {
  const obj = JSON.parse(fs.readFileSync('./json/' + file))
  const name = obj.name || file.replace('.json', '')

  if (obj.name) {
    addTypes(obj)
    fs.writeFileSync(`../src/ffxiv_ipc_${common.snakeCase(name)}_gen.lua`, generateLuaDissector(name, obj))
  }

  if (obj.aliases && obj.aliases.length) {
    for (let alias of obj.aliases) {
      addTypes(alias)

      fs.writeFileSync(`../src/ffxiv_ipc_${common.snakeCase(alias.name)}_gen.lua`, generateLuaDissector(alias.name, obj))
    }
  }
}

Object.keys(ipcTypes).forEach(version => {
  const typesObject = {}
  ipcTypes[version].forEach(({ name, type, length }) => {
    let key = `[${typeof type === 'number' ? `0x${('000' + type.toString(16)).substr(-4)}` : type}]`

    if (!typesObject[key]) {
      typesObject[key] = []
    }

    typesObject[key].push({
      name: `ffxiv_ipc_${common.snakeCase(name)}`,
      length
    })
  })

  const ipcTypeContent = `-- This file is generated by tools/json2lua.js

local M = {}
${common.table('M.types', typesObject)}

function M.getDissector(typeNum, length)
  local types = M.types[typeNum]
  if type(types) ~= "table" then
    return nil
  end

  for k, v in pairs(types) do
    if v.length == length then
      return Dissector.get(v.name)
    end
  end

  for k, v in pairs(types) do
    if v.length < length then
      return Dissector.get(v.name)
    end
  end

  return nil
end

return M
`
  fs.writeFileSync(`../src/ffxiv_ipc_type_${version.replace(/\./g, '_')}.lua`, ipcTypeContent)
})

if (globalEnums.length) {
  const enumContent = `-- This file is generated by tools/json2lua.js

local M = {
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

${globalEnums.map(item => {
  item.values.forEach(row => {
    if (typeof row.value === 'string' && row.value.startsWith('0x')) {
      row.value = parseInt(row.value, 16)
    }
  })

  return `
${common.table(`M.forward.${item.key}`, item.values)}
M.reverse.${item.key} = makeValString(M.forward.${item.key})`
}).join('\n')}

return M
`

  fs.writeFileSync(`../src/ffxiv_enum.lua`, enumContent)
}
