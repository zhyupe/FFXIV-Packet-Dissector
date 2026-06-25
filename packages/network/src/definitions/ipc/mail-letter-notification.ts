import { FieldType } from '@/struct/field-type.enum'
import { Struct } from '@/struct/struct'
import { field } from '@/struct/struct.decorator'

export class MailLetterNotification extends Struct {
  @field(FieldType.uint, 0, 4)
  sendbackCount!: number

  @field(FieldType.uint, 4, 2)
  friendLetters!: number

  @field(FieldType.uint, 6, 2)
  unreadCount!: number

  @field(FieldType.uint, 8, 2)
  rewardLetters!: number

  @field(FieldType.byte, 10)
  isGmLetter!: number

  @field(FieldType.byte, 11)
  isSupportDesk!: number
}
