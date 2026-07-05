import { createConditionFactory } from '../factory/condition'

type EventField =
  | 'eventId'
  | 'playScene'
  | 'systemLogParam1'
  | 'systemLogParam2'
  | 'systemLogParam3'

export enum EventId {
  Fishing = 1376257,
}

enum FishEventType {
  Cast = 1,
  Hook = 2,
  End = 3,
  Bite = 5,
}

export const EventEnums = {
  EventId,
  FishEventType,
}

export const eventField = createConditionFactory<EventField, EventId>(
  'eventId',
  {
    [EventId.Fishing]: {
      playScene: { label: 'Type', enum: 'FishEventType' },
      systemLogParam1: { label: 'PlaceName', db: 'PlaceName', append: 'enum' },
    },
  },
)
