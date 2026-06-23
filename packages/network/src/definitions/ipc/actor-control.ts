import { FieldType } from '@/struct/field-type.enum'
import { Struct } from '@/struct/struct'
import { dissector, field, ipcEnum } from '@/struct/struct.decorator'
import { ActorControlType } from './common/actor-control-type.enum'

@ipcEnum('ActorControlType', ActorControlType)
export class ActorControl extends Struct {
  @field(FieldType.uint, 0, 2)
  @dissector({ enum: 'ActorControlType' })
  type!: ActorControlType

  @field(FieldType.uint, 2, 2)
  category!: number

  @field(FieldType.uint, 4, 4)
  @dissector({
    condition: {
      type: [
        {
          value: ActorControlType.StatusEffectLose,
          label: 'Status',
          enum: '$Status',
        },
        {
          value: ActorControlType.HPFloatingText,
          label: 'Status',
          enum: '$Status',
        },
        { value: 116, label: 'Fate', enum: '$Fate' },
        { value: ActorControlType.AchievementMsg, label: 'Achievement' },
      ],
    },
  })
  data0!: number

  @field(FieldType.uint, 8, 4)
  @dissector({
    condition: {
      type: [
        { value: ActorControlType.HPFloatingText, label: 'Type' },
        { value: ActorControlType.FishingLightChange, label: 'Enabled' },
      ],
    },
  })
  data1!: number

  @field(FieldType.uint, 12, 4)
  @dissector({
    condition: {
      type: [{ value: ActorControlType.HPFloatingText, label: 'Value' }],
    },
  })
  data2!: number

  @field(FieldType.uint, 16, 4)
  @dissector({
    condition: {
      type: [
        {
          value: ActorControlType.HPFloatingText,
          label: 'ActorId',
          base: 'HEX' as const,
        },
      ],
    },
  })
  data3!: number

  @field(FieldType.uint, 20, 4)
  data4!: number
}

export class ActorControlSelf extends Struct {
  @field(FieldType.uint, 0, 2)
  @dissector({ enum: 'ActorControlType' })
  type!: ActorControlType

  @field(FieldType.uint, 2, 2)
  @dissector({
    condition: {
      type: [
        {
          value: 521,
          label: 'JobLevel',
        },
      ],
    },
  })
  category!: number

  @field(FieldType.uint, 4, 4)
  @dissector({
    condition: {
      type: [
        {
          value: 2372,
          label: 'Fate',
          enum: '$Fate',
        },
        {
          value: 2353,
          label: 'Fate',
          enum: '$Fate',
        },
        {
          value: 2358,
          label: 'Fate',
          enum: '$Fate',
        },
        {
          value: 2351,
          label: 'Fate',
          enum: '$Fate',
        },
        {
          value: 2366,
          label: 'Fate',
          enum: '$Fate',
        },
        {
          value: 320,
          label: 'Item',
          enum: '$Item',
        },
        {
          value: 325,
          label: 'Bait',
          enum: '$Item',
        },
        {
          value: 515,
          label: 'Achievement',
        },
        {
          value: 521,
          label: 'ItemLevel',
        },
        {
          value: 1204,
          label: 'TripleTriadCardId',
        },
        {
          value: 1205,
          label: 'TriadId',
        },
      ],
    },
  })
  data0!: number

  @field(FieldType.uint, 8, 4)
  @dissector({
    condition: {
      type: [
        {
          value: 7,
          label: 'Exp',
        },
        {
          value: 125,
          label: 'NpcId',
          base: 'HEX',
        },
        {
          value: 155,
          label: 'Progress(%)',
        },
      ],
    },
  })
  data1!: number

  @field(FieldType.uint, 12, 4)
  @dissector({
    condition: {
      type: [
        {
          value: 7,
          label: 'Bouns(%)',
        },
        {
          value: 125,
          label: 'Radius',
        },
      ],
    },
  })
  data2!: number

  @field(FieldType.uint, 16, 4)
  @dissector({
    condition: {
      type: [
        {
          value: 125,
          label: 'X',
        },
      ],
    },
  })
  data3!: number

  @field(FieldType.uint, 20, 4)
  @dissector({
    condition: {
      type: [
        {
          value: 125,
          label: 'Y',
        },
      ],
    },
  })
  data4!: number

  @field(FieldType.uint, 24, 4)
  @dissector({
    condition: {
      type: [
        {
          value: 125,
          label: 'Z',
        },
      ],
    },
  })
  data5!: number

  @field(FieldType.uint, 28, 4)
  data6!: number
}
