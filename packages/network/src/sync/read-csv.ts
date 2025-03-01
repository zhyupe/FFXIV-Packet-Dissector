export function readCsv(content: string, fields?: string[] | null, { header = 1, skip = 3 } = {}) {
  const lines = []
  let line = []

  let inQuote = false
  let buf = ''
  for (let i = 0; i < content.length; ++i) {
    const chr = content[i]
    if (inQuote) {
      if (chr === '"') {
        inQuote = false
      } else {
        buf += chr
      }
      continue
    }

    switch (chr) {
      case ',':
        line.push(buf)
        buf = ''
        break
      case '"':
        inQuote = !inQuote
        break
      case '\r': // @todo: find a better way to handle \r
        break
      case '\n':
        line.push(buf)
        buf = ''
        lines.push(line)
        line = []
        break
      default:
        buf += chr
        break
    }
  }

  if (buf.length) {
    line.push(buf)
  }

  if (line.length) {
    lines.push(line)
  }

  if (!Array.isArray(fields)) {
    fields = lines[header]
  }

  return lines.slice(skip).map((line) =>
    (fields as string[]).reduce(
      (obj, field, i) => {
        obj[`$${i}`] = line[i]
        if (field) {
          obj[field] = line[i]
        }
        return obj
      },
      { _: line } as { _: string[]; [x: string]: string | any },
    ),
  )
}
