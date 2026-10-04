// Generated from crates/protocol by xtask and contracts/generate.mjs.
export type Condition = {
  "conditions": Array<Condition>
  "op": "all"
} | {
  "conditions": Array<Condition>
  "op": "any"
} | {
  "equals": ValueRef
  "mask"?: number | null
  "offset": number
  "op": "field"
  "width": number
}

export type GameProcess = {
  "executable": string
  "pid": number
  "startedAt": string
  "version": string
}

export type InputField = {
  "key": string
  "label": string
  "required": boolean
  "shared"?: boolean
  "type": string
}

export type Length = {
  "max": number
  "min"?: number
  "oneOf"?: Array<number>
}

export type Manifest = {
  "hash": string
  "steps": Array<Step>
  "version": number
}

export type OpcodeResult = {
  "category": string
  "comment"?: string | null
  "source": string
  "value": number
}

export type OutputStatus = {
  "clientPort": number
  "dropped": number
  "error": string
  "mode": string
  "pipe": string
  "received": number
  "running": boolean
  "sent": number
  "serverPort": number
}

export type Snapshot = {
  "connection": string
  "error": string
  "forwarder": OutputStatus
  "sessionId": number
  "target"?: GameProcess | null
  "wizard"?: WizardSnapshot | null
}

export type Step = {
  "category": string
  "channel": number
  "continuation"?: boolean
  "fields": Array<InputField>
  "instruction": string
  "length": Length
  "name": string
  "probe"?: Condition | null
  "produces"?: Array<string>
  "requires"?: Array<string>
  "source": string
}

export type Target = {
  "pid": number
  "startedAt": string
}

export type ValueRef = {
  "kind": "constant"
  "value": number
} | {
  "key": string
  "kind": "input"
}

export type WizardSnapshot = {
  "conflict"?: string | null
  "current"?: string | null
  "error": string
  "fields": Array<InputField>
  "inputToken": number
  "mode": string
  "results": Array<[string, OpcodeResult]>
  "status": string
  "steps": Array<Step>
  "unsaved": boolean
}

export type WorkerResult = {
  "baseOffset"?: number | null
  "error"?: boolean
  "inputGeneration": number
  "matched": boolean
  "packetSequence": string
  "ruleId": string
  "rulePackHash": string
  "runId": number
  "sessionId": number
  "updates"?: Record<string, unknown>
  "version": number
}

export type WorkerTask = {
  "context": Record<string, unknown>
  "inputGeneration": number
  "inputs": Record<string, unknown>
  "packetSequence": string
  "ruleId": string
  "rulePackHash": string
  "runId": number
  "sessionId": number
  "sourceActor": number
  "targetActor": number
  "version": number
}
