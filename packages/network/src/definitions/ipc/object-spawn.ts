import { FieldType } from '@/struct/field-type.enum'
import { Struct } from '@/struct/struct'
import { child, field, format } from '@/struct/struct.decorator'
import { Position } from './common/position'

export class ObjectSpawn extends Struct {
  @field(FieldType.byte, 0)
  spawnIndex!: number

  @field(FieldType.byte, 1)
  objKind!: number

  @field(FieldType.byte, 2)
  state!: number

  @field(FieldType.byte, 3)
  unknown3!: number

  @field(FieldType.uint, 4, 4)
  @format({ append: 'val' })
  objId!: number

  @field(FieldType.uint, 8, 4)
  actorId!: number

  @field(FieldType.uint, 12, 4)
  levelId!: number

  @field(FieldType.uint, 16, 4)
  unknown10!: number

  @field(FieldType.uint, 20, 4)
  someActorId14!: number

  @field(FieldType.uint, 24, 4)
  gimmickId!: number

  @field(FieldType.float, 28)
  scale!: number

  @field(FieldType.int, 32, 2)
  unknown20a!: number

  @field(FieldType.uint, 34, 2)
  rotation!: number

  @field(FieldType.int, 36, 2)
  unknown24a!: number

  @field(FieldType.int, 38, 2)
  unknown24b!: number

  @field(FieldType.uint, 40, 2)
  unknown28a!: number

  @field(FieldType.int, 42, 2)
  unknown28c!: number

  @field(FieldType.uint, 44, 4)
  housingLink!: number

  @field(FieldType.object, 48, Position.byteLength)
  @child(Position)
  position3!: Position

  @field(FieldType.int, 60, 2)
  unknown3C!: number

  @field(FieldType.int, 62, 2)
  unknown3E!: number
}
