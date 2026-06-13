import { Struct } from '@/struct/struct'
import { field } from '@/struct/struct.decorator'
import { FieldType } from '@/struct/field-type.enum'
import { ActorControlType } from './common/actor-control-type.enum'

export class ActorControl extends Struct {
  @field(FieldType.uint, 0, 2)
  type!: ActorControlType

  @field(FieldType.uint, 2, 2)
  category!: number

  @field(FieldType.uint, 4, 4)
  data0!: number

  @field(FieldType.uint, 8, 4)
  data1!: number

  @field(FieldType.uint, 12, 4)
  data2!: number

  @field(FieldType.uint, 16, 4)
  data3!: number

  @field(FieldType.uint, 20, 4)
  data4!: number
}

export class ActorControlSelf extends Struct {
  @field(FieldType.uint, 0, 2)
  type!: ActorControlType

  @field(FieldType.uint, 2, 2)
  category!: number

  @field(FieldType.uint, 4, 4)
  data0!: number

  @field(FieldType.uint, 8, 4)
  data1!: number

  @field(FieldType.uint, 12, 4)
  data2!: number

  @field(FieldType.uint, 16, 4)
  data3!: number

  @field(FieldType.uint, 20, 4)
  data4!: number

  @field(FieldType.uint, 24, 4)
  data5!: number

  @field(FieldType.uint, 28, 4)
  data6!: number
}
