import { FieldType } from '@/struct/field-type.enum'
import { Struct } from '@/struct/struct'
import { child, field } from '@/struct/struct.decorator'
import { Position } from './common/position'

export class UpdatePositionHandler extends Struct {
  @field(FieldType.float, 0)
  rotation!: number

  @field(FieldType.byte, 4)
  animationType!: number

  @field(FieldType.byte, 5)
  animationState!: number

  @field(FieldType.byte, 6)
  clientAnimationType!: number

  @field(FieldType.byte, 7)
  headPosition!: number

  @field(FieldType.object, 8, Position.byteLength)
  @child(Position)
  pos!: Position
}
