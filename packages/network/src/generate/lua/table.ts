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
  if (!Array.isArray(obj) || !obj[0].key) {
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
  return isNumberLike ? `[${key}]` : `${key}`
}

export const tableValue = (val: any, raw = false, prefix = ''): string => {
  if (raw || typeof val === 'number') {
    return `${val}`
  }

  if (typeof val !== 'object') {
    return `"${val}"`
  }

  return tableContent(objToPairs(val), raw, prefix)
}
