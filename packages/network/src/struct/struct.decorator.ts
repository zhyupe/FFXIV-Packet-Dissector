import 'reflect-metadata'
import { FieldType } from './field-type.enum'
import { Struct, StructConstructor } from './struct'
import { fieldLength } from './helper'

export const fieldMetadataKey = Symbol('field')
export const childrenMetadataKey = Symbol('children')

export interface FieldMetadata {
  type: FieldType
  offset: number
  length?: number
  children?: FieldMetadata[]
}

export interface ChildMetadata {
  type: FieldType
  byteLength: number
}

type Store<T> = Record<string, T | undefined>
type Child = StructConstructor | ChildMetadata

export function field(type: FieldType, offset?: number, length?: number) {
  return function (target: Struct, propertyKey: string): void {
    let store: Store<FieldMetadata> = {}
    if (Reflect.hasOwnMetadata(fieldMetadataKey, target)) {
      store = Reflect.getMetadata(
        fieldMetadataKey,
        target,
      ) as Store<FieldMetadata>
    }

    const constructor = target.constructor as StructConstructor
    if (offset === undefined || offset < 0) {
      offset = constructor.byteLength ?? 0
    }

    store[propertyKey] = { type, offset, length }
    Reflect.defineMetadata(fieldMetadataKey, store, target)

    const endByte = offset + fieldLength(type, length)

    if (!constructor.byteLength || endByte > constructor.byteLength) {
      constructor.byteLength = endByte
    }
  }
}

export function getFields(target: Struct): Store<FieldMetadata> | undefined {
  return Reflect.getMetadata(fieldMetadataKey, target) as Store<FieldMetadata>
}

export function child(struct: Child) {
  return function (target: Struct, propertyKey: string): void {
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
