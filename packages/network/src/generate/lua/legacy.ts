import { readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { kebabCase, root, writeCode } from '../utils'
import { DissectorRenderer } from './dissector'

export function generateFromJSON() {
  const jsonRoot = join(root, 'tools/json')
  const files = readdirSync(jsonRoot)
  const renderer = new DissectorRenderer()

  for (const file of files) {
    try {
      const obj: IPCSchema = Object.freeze(
        JSON.parse(readFileSync(join(jsonRoot, file), 'utf-8')),
      )

      if (obj.skip) continue
      renderer.handleIPCSchema(obj)
    } catch (e: any) {
      e.message = `[${file}]: ${e.message}`
      throw e
    }
  }

  renderer.commitEnums()
  renderer.commitOpcodes()
}

async function migrateSchema(schema: IPCSchema, isCommon = false) {
  if (schema.enums) {
    for (const item of schema.enums) {
      const fileName = kebabCase(item.name)
      await writeCode(
        `definitions/ipc/enums/${fileName}.ts`,
        `export enum ${item.name} {
          ${item.values.map(({ key, value }) => `${key} = ${JSON.stringify(value)},`).join('\n')}
        }`,
      )
    }
  }

  // children
  if (schema.children) {
    for (const item of schema.children) {
      await migrateSchema(item)
    }
  }

  if (!schema.fields) {
    return
  }

  // alias
  const fileName = `definitions/ipc/${isCommon ? 'common/' : ''}${kebabCase(schema.name)}.ts`
  const hasChild = schema.fields.some((item) => item.type === 'children')
  await writeCode(
    fileName,
    `
import { Struct } from '@/struct/struct'
import { field${hasChild ? ', child' : ''} } from '@/struct/struct.decorator'
import { FieldType } from '@/struct/field-type.enum'

export class ${schema.name} extends Struct {
${schema.fields
  .map((item) => {
    return `@field(FieldType.uint, 28, 2)
  ${kebabCase(item.name)}!: number`
  })
  .join('\n\n')}

}

    `,
  )
}

export async function migrateFromJSON() {
  const jsonRoot = join(root, 'tools/json')
  const files = readdirSync(jsonRoot)

  for (const file of files) {
    try {
      const obj: IPCSchema = Object.freeze(
        JSON.parse(readFileSync(join(jsonRoot, file), 'utf-8')),
      )

      if (obj.skip) continue
      if (obj.children) {
        for (const child of obj.children) {
          await migrateSchema(child)
        }
      }

      if (obj.name) {
        await migrateSchema(obj)
      }
    } catch (e: any) {
      e.message = `[${file}]: ${e.message}`
      throw e
    }
  }
}
