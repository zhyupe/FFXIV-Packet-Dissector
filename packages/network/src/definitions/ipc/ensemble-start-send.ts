import { FieldType } from '@/struct/field-type.enum'
import { Struct } from '@/struct/struct'
import { dissector, field, ipcEnum } from '@/struct/struct.decorator'

const EnsembleAssistant = {
  On: 1,
  Off: 0,
} as const

@ipcEnum('EnsembleAssistant', EnsembleAssistant)
export class EnsembleStartSend extends Struct {
  @field(FieldType.uint, 6, 1)
  bpm!: number

  @field(FieldType.byte, 7)
  meter!: number

  @field(FieldType.byte, 8)
  @dissector({ enum: 'EnsembleAssistant' })
  ensembleAssistant!: number
}
