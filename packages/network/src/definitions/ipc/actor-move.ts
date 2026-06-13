import { Struct } from '@/struct/struct'
import { field } from '@/struct/struct.decorator'
import { FieldType } from '@/struct/field-type.enum'

export class ActorMove extends Struct {
  @field(FieldType.byte, 0)
  headRotation!: number

  @field(FieldType.byte, 1)
  rotation!: number

  @field(FieldType.byte, 2)
  animationType!: number

  @field(FieldType.byte, 3)
  animationState!: number

  @field(FieldType.byte, 4)
  animationSpeed!: number

  @field(FieldType.byte, 5)
  unknownRotation!: number

  @field(FieldType.uint, 6, 2)
  x!: number

  @field(FieldType.uint, 8, 2)
  y!: number

  @field(FieldType.uint, 10, 2)
  z!: number
}
