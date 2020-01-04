const common = {}

common.objToArray = obj => Object.entries(obj).map(([key, value]) => ({ key, value }))

common.table = function (name, array, rawValue = false) {
  if (!Array.isArray(array) || !array[0].key) {
    array = common.objToArray(array)
  }
  return `${name} = ${common.tableContent(array, rawValue)}`
}

common.tableContent = function (array, rawValue = false, prefix = '') {
  return `{\n${array.map(({ key, value }) => `${prefix}  ${common.tableKey(key)} = ${common.tableValue(value, rawValue, prefix + '  ')},`).join('\n')}\n${prefix}}`
}

common.tableKey = function (key) {
  let isNumber = typeof key === 'number' || (+key).toString() === key
  return isNumber ? `[${key}]` : `${key}`
}

common.tableValue = function (val, raw = false, prefix = '') {
  if (raw || typeof val === 'number') {
    return `${val}`
  }

  if (typeof val !== 'object') {
    return `"${val}"`
  }

  return common.tableContent(common.objToArray(val), raw, prefix)
}

common.snakeCase = name => name.replace(/\s*([A-Z]+)/g, (m0, m1, index) => `${index ? '_' : ''}${m1.toLowerCase()}`)

module.exports = common
