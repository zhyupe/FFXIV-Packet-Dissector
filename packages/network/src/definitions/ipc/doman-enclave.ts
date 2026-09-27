import { FieldType } from '@/struct/field-type.enum'
import { Struct } from '@/struct/struct'
import { field, format } from '@/struct/struct.decorator'

export class DomanEnclaveState extends Struct {
  // Index into DomanEnclaveManager's milestones, not a DomaStoryProgress row ID.
  @field(FieldType.byte, 0)
  currentMilestone!: number

  @field(FieldType.byte, 1)
  isAcceptingDonations!: number

  @field(FieldType.uint, 2, 2)
  donated!: number

  // The wire factor stores the percentage above the base reimbursement rate.
  @field(FieldType.byte, 4)
  @format({ addend: 100 })
  priceRatioPercent!: number

  @field(FieldType.byte, 5)
  refreshUi!: number

  // A value of 1 refreshes zone shared groups when the milestone changes in Doma.
  @field(FieldType.byte, 6)
  refreshZone!: number

  @field(FieldType.byte, 7)
  unknown7!: number

  @field(FieldType.uint, 8, 2)
  allowance!: number

  @field(FieldType.bytes, 10, 6)
  unknownTail!: Buffer
}
