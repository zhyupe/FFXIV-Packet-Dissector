import 'reflect-metadata'
import type { IPCFieldCondition, IPCFieldFormat } from '@/generate/interface'
import type { FieldType } from './field-type.enum'
import { fieldLength } from './helper'
import type { Struct, StructConstructor } from './struct'

export const fieldMetadataKey = Symbol('field')
export const childrenMetadataKey = Symbol('children')
export const enumMetadataKey = Symbol('enum')
export const ifMetadataKey = Symbol('if')

export interface FieldMetadata {
  type: FieldType
  offset: number
  length?: number
  children?: FieldMetadata[]
  format?: IPCFieldFormat
  condition?: Record<string, IPCFieldCondition[]>
}

export interface ChildMetadata {
  type: FieldType
  byteLength: number
}

export interface EnumMetadata {
  name: string
  values: Record<string, number | string>
}

type Store<T> = Record<string, T | undefined>
type Child = StructConstructor | ChildMetadata

type ClassDecorator = (target: StructConstructor) => void
type PropertyDecorator = (target: Struct, propertyKey: string) => void

function setField(
  handler: (target: Struct, prev: FieldMetadata) => FieldMetadata,
) {
  return (target: Struct, propertyKey: string) => {
    let store: Store<FieldMetadata> = {}
    if (Reflect.hasOwnMetadata(fieldMetadataKey, target)) {
      store = Reflect.getMetadata(
        fieldMetadataKey,
        target,
      ) as Store<FieldMetadata>
    }

    store[propertyKey] = handler(
      target,
      (store[propertyKey] || {}) as FieldMetadata,
    )
    Reflect.defineMetadata(fieldMetadataKey, store, target)
  }
}

export function field(
  type: FieldType,
  offset?: number,
  length?: number,
): PropertyDecorator {
  return setField((target, prev) => {
    const structConstructor = target.constructor as StructConstructor
    if (offset === undefined || offset < 0) {
      offset = structConstructor.byteLength ?? 0
    }

    const endByte = offset + fieldLength(type, length)

    if (
      !structConstructor.byteLength ||
      endByte > structConstructor.byteLength
    ) {
      structConstructor.byteLength = endByte
    }

    return { ...prev, type, offset, length }
  })
}

export function format(format: IPCFieldFormat): PropertyDecorator {
  return setField((_, prev) => ({ ...prev, format }))
}

export function condition(
  condition: Record<string, IPCFieldCondition[]>,
): PropertyDecorator {
  return setField((_, prev) => ({ ...prev, condition }))
}

export function getFields(target: Struct): Store<FieldMetadata> | undefined {
  return Reflect.getMetadata(fieldMetadataKey, target) as Store<FieldMetadata>
}

export function child(struct: Child): PropertyDecorator {
  return (target: Struct, propertyKey: string): void => {
    let store: Store<Child> = {}
    if (Reflect.hasOwnMetadata(childrenMetadataKey, target)) {
      store = Reflect.getMetadata(childrenMetadataKey, target) as Store<Child>
    }

    store[propertyKey] = struct
    Reflect.defineMetadata(childrenMetadataKey, store, target)
  }
}

export function getChildren(target: Struct): Store<Child> | undefined {
  return Reflect.getMetadata(childrenMetadataKey, target) as Store<Child>
}

export type Enum = Record<string, number | string>
export function ipcEnum(enums: Record<string, Enum>): ClassDecorator
export function ipcEnum(name: string, values: Enum): ClassDecorator
export function ipcEnum(
  arg0: string | Record<string, Enum>,
  arg1?: Enum,
): ClassDecorator {
  return (target: StructConstructor): void => {
    const store = getEnums(target)?.slice() ?? []
    if (typeof arg0 === 'object') {
      for (const [name, values] of Object.entries(arg0)) {
        store.push({ name, values })
      }
    } else if (arg1) {
      store.push({ name: arg0, values: arg1 })
    }

    Reflect.defineMetadata(enumMetadataKey, store, target)
  }
}

export function getEnums(
  target: StructConstructor,
): EnumMetadata[] | undefined {
  return Reflect.getMetadata(enumMetadataKey, target) as
    | EnumMetadata[]
    | undefined
}

export function ipcIf(fieldName: string) {
  return (target: StructConstructor): void => {
    Reflect.defineMetadata(ifMetadataKey, fieldName, target)
  }
}

export function getStructIf(target: StructConstructor): string | undefined {
  return Reflect.getMetadata(ifMetadataKey, target) as string | undefined
}
