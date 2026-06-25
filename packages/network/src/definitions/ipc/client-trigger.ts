import { FieldType } from '@/struct/field-type.enum'
import { Struct } from '@/struct/struct'
import { dissector, field, ipcEnum } from '@/struct/struct.decorator'

const ClientTriggerCommandId = {
  ToggleSheathe: 1,
  ToggleAutoAttack: 2,
  ChangeTarget: 3,
  DismountReq: 101,
  SpawnCompanionReq: 102,
  RemoveStatusEffect: 104,
  CastCancel: 105,
  Return: 200,
  FinishZoning: 201,
  Teleport: 202,
  Examine: 300,
  MarkPlayer: 301,
  SetTitleReq: 302,
  TitleList: 303,
  UpdatedSeenHowTos: 307,
  AllotAttribute: 309,
  ClearFieldMarkers: 314,
  CameraMode: 315,
  CharaNameReq: 317,
  HuntingLogDetails: 404,
  Timers: 427,
  DyeItem: 437,
  RequestChocoboInventory: 452,
  EmoteReq: 500,
  EmoteCancel: 502,
  PersistentEmoteCancel: 503,
  PoseChange: 505,
  PoseReapply: 506,
  PoseCancel: 507,
  AchievementCrit: 514,
  AchievementComp: 515,
  AchievementCatChat: 518,
  FishingBaitChange: 701,
  QuestJournalUpdateQuestVisibility: 702,
  QuestJournalClosed: 703,
  AbandonQuest: 800,
  DirectorInitFinish: 801,
  DirectorSync: 808,
  StartFate: 809,
  QueryFate: 810,
  ToggleFateSync: 813,
  EnterTerritoryEventFinished: 816,
  RequestInstanceLeave: 819,
  AchievementCritReq: 1000,
  AchievementList: 1001,
  SetEstateLightingLevel: 1035,
  RequestHousingBuildPreset: 1100,
  RequestEstateExteriorRemodel: 1101,
  RequestEstateInteriorRemodel: 1102,
  RequestEstateHallRemoval: 1103,
  RequestBuildPreset: 1104,
  RequestLandSignFree: 1105,
  RequestLandSignOwned: 1106,
  RequestWardLandInfo: 1107,
  RequestLandRelinquish: 1108,
  RequestLandInventory: 1112,
  RequestHousingItemRemove: 1113,
  RequestEstateRename: 1114,
  RequestEstateEditGreeting: 1115,
  RequestEstateGreeting: 1116,
  RequestEstateEditGuestAccessSettings: 1117,
  UpdateEstateGuestAccess: 1118,
  RequestEstateTagSettings: 1119,
  RequestEstateInventory: 1121,
  RequestHousingItemUI: 1123,
  RequestSharedEstateSettings: 1135,
  UpdateEstateLightingLevel: 1137,
  HousingItemSelectedInUI: 1150,
  CompanionAction: 1700,
  CompanionSetBarding: 1701,
  CompanionActionUnlock: 1702,
  OpenPerformInstrumentUI: 1820,
  StartReplay: 1980,
  EndReplay: 1981,
  OpenDuelUI: 2200,
  DuelRequestResult: 2201,
} as const

const ClientTriggerFishBaitType = {
  Light: 6,
} as const

@ipcEnum('ClientTriggerCommandId', ClientTriggerCommandId)
@ipcEnum('ClientTriggerFishBaitType', ClientTriggerFishBaitType)
export class ClientTrigger extends Struct {
  @field(FieldType.uint, 0, 2)
  @dissector({ enum: 'ClientTriggerCommandId', base: 'HEX', append: 'enum' })
  commandId!: number

  @field(FieldType.byte, 2)
  unk_20!: number

  @field(FieldType.byte, 3)
  unk_21!: number

  @field(FieldType.uint, 4, 4)
  @dissector({
    condition: {
      commandId: [
        { value: 701, label: 'Type', enum: 'ClientTriggerFishBaitType' },
        { value: 809, label: 'Fate', db: 'Fate' },
        { value: 810, label: 'Fate', db: 'Fate' },
        { value: 813, label: 'Fate', db: 'Fate' },
      ],
    },
  })
  param11!: number

  @field(FieldType.uint, 8, 4)
  @dissector({
    condition: {
      commandId: [
        { value: 104, label: 'Action', db: 'Action' },
        { value: 701, label: 'Bait', db: 'Item' },
        { value: 809, label: 'NpcId' },
        { value: 813, label: 'Sync' },
      ],
    },
  })
  param12!: number

  @field(FieldType.uint, 12, 4)
  param2!: number

  @field(FieldType.uint, 16, 4)
  param4!: number

  @field(FieldType.uint, 20, 4)
  param5!: number

  @field(FieldType.biguint, 24)
  param3!: bigint
}
