import { Base } from '@/generate/lua/wireshark'
import { FieldType } from '@/struct/field-type.enum'
import { Struct } from '@/struct/struct'
import { field, format, ipcEnum } from '@/struct/struct.decorator'
import { ActorControlType } from './common/actor-control-type.enum'
import { createConditionFactory } from './factory/condition'

type ActorControlField =
  | 'type'
  | 'category'
  | 'data0'
  | 'data1'
  | 'data2'
  | 'data3'
  | 'data4'
  | 'data5'
  | 'data6'

const actorControlField = createConditionFactory<
  ActorControlField,
  ActorControlType | number
>('type', {
  [ActorControlType.StatusEffectLose]: {
    data0: { label: 'Status', db: 'Status' },
  },
  [ActorControlType.HPFloatingText]: {
    data0: { label: 'Status', db: 'Status' },
    data1: { label: 'Type' },
    data2: { label: 'Value' },
    data3: { label: 'ActorId', base: Base.HEX },
  },
  [ActorControlType.AchievementMsg]: {
    data0: { label: 'Achievement' },
  },
  [ActorControlType.FishingLightChange]: {
    data1: { label: 'Enabled' },
  },
  [ActorControlType.SetItemLevel]: {
    category: { label: 'JobLevel' },
    data0: { label: 'ItemLevel' },
  },

  [ActorControlType.FateInit]: {
    data0: { label: 'Fate', db: 'Fate' },
  },
  [ActorControlType.FateEnd]: {
    data0: { label: 'Fate', db: 'Fate' },
  },
  [ActorControlType.FateNpc]: {
    data0: { label: 'Fate', db: 'Fate' },
  },
  [ActorControlType.FateProgress]: {
    data0: { label: 'Fate', db: 'Fate' },
    data1: { label: 'Progress(%)' },
  },
  [ActorControlType.FishingMsg]: {
    data0: { label: 'Item', db: 'Item' },
  },
  [ActorControlType.FishingBaitMsg]: {
    data0: { label: 'Bait', db: 'Item' },
  },
  [ActorControlType.FatePosition]: {
    data1: { label: 'NpcId', base: Base.HEX },
    data2: { label: 'Radius' },
    data3: { label: 'X' },
    data4: { label: 'Y' },
    data5: { label: 'Z' },
  },
  [ActorControlType.AchievementPopup]: {
    data0: { label: 'Achievement' },
  },
  [ActorControlType.TripleTriadCard]: {
    data0: { label: 'TripleTriadCardId' },
  },
  [ActorControlType.TripleTriadUnknown]: {
    data0: { label: 'TriadId' },
  },
  [ActorControlType.GainExpMsg]: {
    data1: { label: 'Exp' },
    data2: { label: 'Bouns(%)' },
  },
  310: {
    data0: { label: 'Marker', enum: 'ActorControl144Marker' },
  },
})

@ipcEnum('ActorControlType', ActorControlType)
@ipcEnum('ActorControl144Marker', {
  Marker_A: 0,
  Marker_B: 1,
  Marker_C: 2,
  Marker_D: 3,
  Marker_1: 4,
  Marker_2: 5,
})
export class ActorControl extends Struct {
  @field(FieldType.uint, 0, 2)
  @format({ enum: 'ActorControlType' })
  type!: ActorControlType

  @field(FieldType.uint, 2, 2)
  @actorControlField('category')
  category!: number

  @field(FieldType.uint, 4, 4)
  @actorControlField('data0')
  data0!: number

  @field(FieldType.uint, 8, 4)
  @actorControlField('data1')
  data1!: number

  @field(FieldType.uint, 12, 4)
  @actorControlField('data2')
  data2!: number

  @field(FieldType.uint, 16, 4)
  @actorControlField('data3')
  data3!: number

  @field(FieldType.uint, 20, 4)
  @actorControlField('data4')
  data4!: number
}

export class ActorControlSelf extends ActorControl {
  @field(FieldType.uint, 24, 4)
  @actorControlField('data5')
  data5!: number

  @field(FieldType.uint, 28, 4)
  @actorControlField('data6')
  data6!: number
}

export class ActorControlTarget extends ActorControl {
  @field(FieldType.biguint, 24, 8)
  targetId!: number
}
