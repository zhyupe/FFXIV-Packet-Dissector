const common = {}

common.table = function (name, array, rawValue = false) {
  return `${name} = {
${array.map(({ key, value }) => `  ${common.tableKey(key)} = ${common.tableValue(value, rawValue)},`).join('\n')}
}`
}

common.tableKey = function (key) {
  return typeof key === 'number' ? `[${key}]` : `${key}`
}

common.tableValue = function (val, raw = false) {
  return (raw || typeof val === 'number') ? `${val}` : `"${val}"`
}

common.snakeCase = name => name.replace(/\s*([A-Z]+)/g, (m0, m1, index) => `${index ? '_' : ''}${m1.toLowerCase()}`)

module.exports = common
