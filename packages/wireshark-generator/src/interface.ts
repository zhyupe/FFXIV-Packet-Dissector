import type { IPCFieldFormat, IPCFieldCondition } from '@ffcafe/elpis-struct'
export type { IPCFieldFormat, IPCFieldCondition } from '@ffcafe/elpis-struct'
export interface IPCEnum {
  /**
   * Enum name
   */
  name: string
  /**
   * Enum values
   */
  values: Array<{
    /**
     * Enum key, see `IPCSchema.type`
     */
    key: string
    /**
     * Enum value, see `IPCSchema.type`
     */
    value: number | string
  }>
}

export interface IPCField {
  /**
   * Field name, used for variable name and displaying.
   * The name should be in CamelCase, though it would be converted to snake_case when used in Lua variables.
   * It's okay for names to contain spaces ` ` for better understanding.
   */
  name: string
  /**
   * Reading offset (bytes) in IPC body
   */
  offset: number
  /**
   * Reading length (bytes) in IPC body
   * If omitted, this field would take all the bytes starting from `offset`
   */
  length?: number
  /**
   * Field type, must be a method name of `ProtoField`.
   * Only methods with `abbr, [name], [base], [valuestring]` arguments can be used at this time.
   * See https://www.wireshark.org/docs/wsdg_html_chunked/lua_module_Proto.html#lua_class_ProtoField
   */
  type: string

  /**
   * Formatting options
   */
  format?: IPCFieldFormat

  /**
   * Modify some of the field properties under certain condition
   * fieldName: name of the field that conditions are compared to.
   * Please notice that only the fields declared before current field are valid
   * (as others are not dissected yet)
   */
  condition?: Record<string, IPCFieldCondition[]>

  /**
   * Referenced child struct name when `type` is `children`.
   * If omitted, `name` is used for legacy JSON schemas.
   */
  child_name?: string

  count?: number
}

export interface IPCSchema {
  /**
   * IPC name, used for dissector name and displaying.
   * The name should be in CamelCase, though it would be converted to snake_case when used in Lua variables.
   */
  name: string

  /**
   * IPC types.
   * Version is the major and minor version (e.g. 5.0, 5.1), as the type can be changed in minor version.
   * Value is a 16-bit unsigned integer and can be declared in decimal number or or string (should be a valid format of number in Lua)
   */
  type: {
    [version: string]: string | number
  }

  /**
   * Packet version, just for noting when the packet is analyzed.
   * It would be generated as comment in ipc types' enum in `ffxiv_ipc.lua`
   */
  version: string

  /**
   * Enums used by IPC Packet
   */
  enums?: IPCEnum[]

  /**
   * Packet fields
   */
  fields?: IPCField[]

  /**
   * Children, used to generate sub-dissectors
   */
  children?: IPCSchema[]

  /**
   * Invisible unless specified field is not zero
   */
  if?: string

  skip?: boolean
  length?: number
  aliases?: Partial<IPCSchema>[]
}
