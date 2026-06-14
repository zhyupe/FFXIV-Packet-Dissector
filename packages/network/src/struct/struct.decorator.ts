import 'reflect-metadata'
import type { FieldType } from './field-type.enum'
import { fieldLength } from './helper'
import type { Struct, StructConstructor } from './struct'

export const fieldMetadataKey = Symbol('field')
export const childrenMetadataKey = Symbol('children')
export const enumMetadataKey = Symbol('enum')

export interface FieldMetadata {
  type: FieldType
  offset: number
  length?: number
  children?: FieldMetadata[]
  dissector?: FieldDissectorOptions
}

export interface FieldDissectorOptions {
  enum?: string
  db?: string
  base?: 'hex' | 'dec' | 'HEX' | 'DEC'
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

export function field(type: FieldType, offset?: number, length?: number) {
  return (target: Struct, propertyKey: string): void => {
    let store: Store<FieldMetadata> = {}
    if (Reflect.hasOwnMetadata(fieldMetadataKey, target)) {
      store = Reflect.getMetadata(
        fieldMetadataKey,
        target,
      ) as Store<FieldMetadata>
    }

    const structConstructor = target.constructor as StructConstructor
    if (offset === undefined || offset < 0) {
      offset = structConstructor.byteLength ?? 0
    }

    store[propertyKey] = { ...store[propertyKey], type, offset, length }
    Reflect.defineMetadata(fieldMetadataKey, store, target)

    const endByte = offset + fieldLength(type, length)

    if (
      !structConstructor.byteLength ||
      endByte > structConstructor.byteLength
    ) {
      structConstructor.byteLength = endByte
    }
  }
}

export function dissector(options: FieldDissectorOptions) {
  return (target: Struct, propertyKey: string): void => {
    let store: Store<FieldMetadata> = {}
    if (Reflect.hasOwnMetadata(fieldMetadataKey, target)) {
      store = Reflect.getMetadata(
        fieldMetadataKey,
        target,
      ) as Store<FieldMetadata>
    }

    store[propertyKey] = {
      ...store[propertyKey],
      dissector: options,
    } as FieldMetadata
    Reflect.defineMetadata(fieldMetadataKey, store, target)
  }
}

export function getFields(target: Struct): Store<FieldMetadata> | undefined {
  return Reflect.getMetadata(fieldMetadataKey, target) as Store<FieldMetadata>
}

export function child(struct: Child) {
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

export function ipcEnum(name: string, values: Record<string, number | string>) {
  return (target: StructConstructor): void => {
    const store = getEnums(target) ?? []
    Reflect.defineMetadata(
      enumMetadataKey,
      [...store, { name, values }],
      target,
    )
  }
}

export function getEnums(
  target: StructConstructor,
): EnumMetadata[] | undefined {
  return Reflect.getMetadata(enumMetadataKey, target) as
    | EnumMetadata[]
    | undefined
}
