import { FieldType } from './field-type.enum'

export function fieldLength(type: FieldType, length = 0): number {
  switch (type) {
    case FieldType.double:
    case FieldType.bigint:
    case FieldType.biguint:
      return 8
    case FieldType.float:
      return 4
    case FieldType.byte:
      return 1
    case FieldType.int:
    case FieldType.uint:
    case FieldType.array:
    case FieldType.string:
    case FieldType.bytes:
    case FieldType.object:
    default:
      return length
  }
}
