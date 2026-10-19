export interface Pair<T = string> {
  key: string
  value: T
}

export const objToPairs = <T>(obj: Record<string, T>): Pair<T>[] =>
  Object.entries(obj).map(([key, value]) => ({ key, value }))

export const table = <T = any>(
  name: string,
  obj: Pair<T>[] | Record<string, T>,
  rawValue = false,
) => {
  if (!Array.isArray(obj) || !obj[0]?.key) {
    obj = objToPairs(obj as Record<string, T>)
  }
  return `${name} = ${tableContent(obj as Pair<T>[], rawValue)}`
}

export const tableContent = <T>(
  array: Pair<T>[],
  rawValue = false,
  prefix = '',
) => {
  return `{\n${array.map(({ key, value }) => `${prefix}  ${tableKey(key)} = ${tableValue(value, rawValue, `${prefix}  `)},`).join('\n')}\n${prefix}}`
}

export const tableKey = (key: string | number) => {
  const isNumberLike = typeof key === 'number' || (+key).toString() === key
  if (isNumberLike) return `[${key}]`
  // Bundlers disambiguate private classes with names such as Item$1.
  if (/^\[(?:0x[0-9a-f]+|\d+)\]$/i.test(String(key))) return String(key)
  const reserved = new Set([
    'and',
    'break',
    'do',
    'else',
    'elseif',
    'end',
    'false',
    'for',
    'function',
    'goto',
    'if',
    'in',
    'local',
    'nil',
    'not',
    'or',
    'repeat',
    'return',
    'then',
    'true',
    'until',
    'while',
  ])
  return /^[A-Za-z_][A-Za-z0-9_]*$/.test(String(key)) &&
    !reserved.has(String(key))
    ? String(key)
    : `[${tableValue(String(key))}]`
}

export const tableValue = (val: any, raw = false, prefix = ''): string => {
  if (val === undefined || val === null) return 'nil'
  if (raw || typeof val === 'number' || typeof val === 'boolean') {
    return `${val}`
  }

  if (typeof val !== 'object') {
    return `"${String(val).replace(/\\/g, '\\\\').replace(/"/g, '\\"').replace(/\n/g, '\\n').replace(/\r/g, '\\r')}"`
  }

  return tableContent(objToPairs(val), raw, prefix)
}
