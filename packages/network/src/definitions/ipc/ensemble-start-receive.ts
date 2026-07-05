import { FieldType } from '@/struct/field-type.enum'
import { Struct } from '@/struct/struct'
import { field, format, ipcEnum } from '@/struct/struct.decorator'

const EnsembleAssistant = {
  On: 1,
  Off: 0,
} as const

@ipcEnum('EnsembleAssistant', EnsembleAssistant)
export class EnsembleStartReceive extends Struct {
  @field(FieldType.uint, 6, 1)
  bpm!: number

  @field(FieldType.byte, 7)
  meter!: number

  @field(FieldType.byte, 8)
  @format({ enum: 'EnsembleAssistant' })
  ensembleAssistant!: number
}
