const fs = require('fs')
let enumContent = fs.readFileSync('../../Sapphire/src/common/Network/PacketDef/Ipcs.h', 'utf-8').replace(/\/\/.+/g, '')

const typeMap = {
  char: {
    type: 'int8',
    length: 1
  },
  uint8_t: {
    type: 'uint8',
    length: 1
  },
  int8_t: {
    type: 'int8',
    length: 1
  },
  uint16_t: {
    type: 'uint16',
    length: 2
  },
  int16_t: {
    type: 'int16',
    length: 2
  },
  short: {
    type: 'int16',
    length: 2
  },
  uint32_t: {
    type: 'uint32',
    length: 4
  },
  int: {
    type: 'int32',
    length: 4
  },
  uint64_t: {
    type: 'uint64',
    length: 8
  },
  float: {
    type: 'float',
    length: 4
  }
}

const structRegexp = /struct (\w+)\s*(?::\s*(\w+)\s*)?(?:<\s*(\w+)\s*>\s*)?\s*\{([\s\S]+?)\}/g
const fieldRegexp = /\s*(\w+)\s+(\w+?)(?:\[([xa-fA-F0-9]+)\])?\s*;/g
const enumRegexp = /enum (\w+)(?:\s*:\s*(\w+))?\s+\{([\s\S]+?)\}/g
const enumItemRegexp = /(\w+)(?: ?= ?([xa-fA-F0-9]+))?/g

const execAll = function (content, regex) {
  let result = []
  let match
  while ((match = regex.exec(content))) {
    result.push(match)
  }

  return result
}

try {
  fs.mkdirSync('./sapphire')
} catch (e) {}

let types = {}

execAll(enumContent, enumRegexp).forEach(match => {
  let name = match[1]
  let type = match[2]
  let content = match[3]

  types[name] = {
    type,
    values: execAll(content, enumItemRegexp).reduce((result, match) => {
      result[match[1]] = match[2]
      return result
    }, {})
  }
})

function extractStruct (content, typeScope) {
  execAll(content, structRegexp).forEach(match => {
    let structName = match[1]
    let ipcName = match[3]
    let content = match[4]

    let offset = 0
    let result = {
      name: match[1],
      type: {
        '5.0': types[typeScope].values[ipcName]
      },
      fields: []
    }

    execAll(content, fieldRegexp).forEach(match => {
      let type = match[1]
      let name = match[2]
      let arrayLength = match[3]

      let field = {
        offset,
        name,
        type
      }

      if (typeMap[type]) {
        Object.assign(field, typeMap[type])
      } else {
        console.log('Unknown type', type)
      }

      if (arrayLength) {
        arrayLength = parseInt(arrayLength)
        for (let i = 0; i < arrayLength; ++i) {
          result.fields.push({
            ...field,
            offset,
            name: `${field.name}${i}`
          })
          offset += field.length
        }
      } else {
        result.fields.push(field)
        offset += field.length
      }
    })

    fs.writeFileSync(`./sapphire/${structName}.json`, JSON.stringify(result, null, 2))
  })
}

// for testing
extractStruct(`struct Unknown {
  uint32_t unknown[100];
}`, 'ServerZoneIpcType')

extractStruct(
  fs.readFileSync('../../Sapphire/src/common/Network/PacketDef/Zone/ServerZoneDef.h', 'utf-8').replace(/\/\/.+/g, '')
  , 'ServerZoneIpcType')
extractStruct(
  fs.readFileSync('../../Sapphire/src/common/Network/PacketDef/Zone/ClientZoneDef.h', 'utf-8').replace(/\/\/.+/g, '')
  , 'ClientZoneIpcType')
