const fs = require('fs')
let files = fs.readdirSync('./cs')

const structRegexp = /struct (\w+)\s+\{([\s\S]+?)\}/g
const fieldRegexp = /\[FieldOffset\((\d+)\)\]\s+public (\w+) (\w+);/g
const enumRegexp = /enum (\w+)(?: ?: ?(\w+))\s+\{([\s\S]+?)\}/g
const enumItemRegexp = /(\w+)(?: ?= ?([xa-fA-F0-9]+))?/g

const typeMap = {
  ulong: {
    type: 'uint64',
    length: 8
  },
  uint: {
    type: 'uint',
    length: 4
  },
  ushort: {
    type: 'uint16',
    length: 2
  },
  byte: {
    type: 'uint8',
    length: 1
  },
  float: {
    type: 'float',
    length: 4
  },
  FFXIVChinaServer: {
    type: 'uint16',
    length: 2,
    enum: '$server'
  }
}

const execAll = function (content, regex) {
  let result = []
  let match
  while ((match = regex.exec(content))) {
    result.push(match)
  }

  return result
}

const extractStructs = function (content) {
  return execAll(content, structRegexp).map(match => {
    return {
      name: match[1],
      fields: execAll(content, fieldRegexp).map(match => {
        let type = match[2]
        let field = {
          offset: +match[1],
          name: match[3],
          type
        }

        if (typeMap[type]) {
          Object.assign(field, typeMap[type])
        } else {
          console.log('Unknown type', type)
        }

        return field
      })
    }
  })
}

const extractEnums = function (content) {
  return execAll(content, enumRegexp).map(match => {
    let enumValue = -1
    const enumWrap = {
      name: match[1],
      type: match[2],
      values: execAll(match[3], enumItemRegexp).map(match => {
        enumValue = match[2] ? parseInt(match[2]) : enumValue + 1
        return {
          key: match[1],
          value: enumValue
        }
      })
    }

    if (typeMap[match[2]]) {
      typeMap[match[1]] = {
        ...typeMap[match[2]],
        enum: match[1]
      }
    } else {
      console.log(match[2])
    }

    return enumWrap
  })
}

for (let file of files) {
  const content = fs.readFileSync('./cs/' + file)
  const output = {}
  const meta = /\* ?\w+ (\w{4}) \(([\w ]+)\)/.exec(content)
  if (meta) {
    output.name = meta[2]
    output.type = parseInt(meta[1], 16)
  } else {
    console.log(file)
  }

  output.enums = extractEnums(content)
  output.structs = extractStructs(content)

  if (output.structs.length > 1) {
    console.warn(`${file} has more than 1 structs`)
  } else if (output.structs.length < 1) {
    console.warn(`${file} has no struct`)
  }

  fs.writeFileSync('./json/' + file.replace('.cs', '.json'), JSON.stringify(output, null, 2))
}
