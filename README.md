# FFXIV-Packet-Dissector

This repository contains Wireshark plugins for analyzing network packets of Final Fantasy XIV.

## Usage

Copy all the files under `src/` to [the plugin folder](https://www.wireshark.org/docs/wsug_html_chunked/ChPluginFolders.html), then click \[Analyze] - 
\[Reload Lua Plugins] (or press `Ctrl + Shift + L`). There should be packets recognized by the plugin with `Protocol` set to `FFXIV`.

![image](https://user-images.githubusercontent.com/2197479/68070741-31e87c00-fdad-11e9-9ced-86f2fce3d17e.png)

Please notice that the plugin checks **all tcp packets** and determines packet types only by magic (`0x41a05252` or 16 bytes of `0`). So its highly
recommended to set capture filters properly to reduce packets to be processed.

## Supported Packets

FFXIV Segments (Both compressed and uncompressed), and detailed segment arguments for following types: 
* `3` - IPC
* `7` - ClientKeepAlive
* `8` - ServerKeepAlive

Detailed arguments for IPC packets whose type is already supported by [FFXIV-Packet-Analyzer](https://github.com/zhyupe/FFXIV-Packet-Analyzer) would be 
migrated here in the near future. For now, all IPC packets would show `IPC: Unknown` in the info column.

All the packet analyzing works are done with the Chinese Version of FFXIV. Most of the packets are dumped from version 4.56, but seems to remain unchanged 
in version 5.0. 

## IPC Protocol Schema

This repository uses a JSON-based schema to describe IPC packets and generate dissectors. The schema follows 
the following TypeScript interface:

```typescript
interface IPCAlias {
  /**
   * IPC Name, see `IPCSchema.name`
   */
  name: string;
  /**
   * IPC Type, see `IPCSchema.type`
   */
  type: string | number;
}

interface IPCEnum {
  /**
   * Enum name
   */
  name: string;
  /**
   * Enum type, not used in generator, just for type noting
   */
  type: string;
  /**
   * Enum values
   */
  values: Array<{
    /**
     * Enum key, see `IPCSchema.type`
     */
    key: string;
    /**
     * Enum value, see `IPCSchema.type`
     */
    value: number | string;
  }>
}

interface IPCField {
  /**
   * Field name, used for variable name and displaying.
   * The name should be in CamelCase, though it would be converted to snake_case when used in Lua variables.
   * It's okay for names to contain spaces ` ` for better understanding.
   */
  name: string;
  /**
   * Reading offset (bytes) in IPC body
   */
  offset: number;
  /**
   * Reading length (bytes) in IPC body
   * If omitted, this field would take all the bytes starting from `offset`
   */
  length?: number;
  /**
   * Field type, must be a method name of `ProtoField`.
   * Only methods with `abbr, [name], [base], [valuestring]` arguments can be used at this time.
   * See https://www.wireshark.org/docs/wsdg_html_chunked/lua_module_Proto.html#lua_class_ProtoField
   */
  type: string;
  /**
   * Enum name. Can be a Enum name declared in `IPCSchema.enums`, or `$Name` to use the database.
   * Example: `$Action`, `$Item`, `$World`, `ItemType`
   */
  enum?: string;
  /**
   * Displaying style in Wireshark. Must be a property of `base`.
   * Default: `DEC`
   */
  base?: string;
  /**
   * Override the default method to convert tvbr to Lua varible, which is set to corresponding packet field.
   * Example: `string(ENC_UTF_8)` - Read a UTF-8 string (Can be used for almost all UGC in FF14)
   */
  tvb_method?: string;
  /**
   * Use `add_le` instead of `add`. Most fields in FF14 packets are in Little-Endian, but just in case.
   * Default: `true`
   */
  add_le?: boolean;
  /**
   * Set decoded varible to packet field instead of tvbr. It's useful when Wireshark cannot handle the 
   * buffer correctly (like UTF-8 string)
   * Default: `false`
   */
  add_val: boolean;
  /**
   * Check packet length before parsing field. Useful when the packet length varys. (Sometimes different 
   * packets can use same the IPC type and cannot be recognized, like `0x0065`, used for both GroupMessage 
   * and Ping)
   * Default: `false`
   */
  check_length: boolean;
  /**
   * Whether to append the parsed value to tree title.
   * If a falsy value (like empty string, `false`, `null` or nothing) is passed, it would append nothing
   * which is the default behavior.
   * If an unlisted truthy value is passed, the appended value would depend on the to-string implementation 
   * of Lua. It's recommended to use `"val"` for this behavior.
   */
  append?: 'enum' | 'hex' | any;
  /**
   * Whether to append field name before the value.
   * Default: `false`
   */
  append_name: boolean;
}

interface IPCSchema {
  /**
   * IPC name, used for dissector name and displaying.
   * The name should be in CamelCase, though it would be converted to snake_case when used in Lua variables.
   */
  name: string;
  /**
   * IPC type, a 16-bit unsigned integer. 
   * Can be a decimal number (since JSON does not support hexadecimal numbers) or string (should be a valid format of number in Lua)
   */
  type: string | number;
  /**
   * Packet version, just for noting when the packet is analyzed.
   * It would be generated as comment in ipc types' enum in `ffxiv_ipc.lua`
   */
  version: string;
  /**
   * Enums used by IPC Packet
   */
  enums?: IPCEnum[];

  /**
   * Packet fields
   */
  fields?: IPCField[];

  /**
   * Packet structs. This property exists since there can be multiple structs in the original C# file.
   * However, as a packet name usually has just one struct, the generator only takes the first struct in the array.
   * And it's deprecated in favor of `IPCSchema.fields`
   * @deprecated
   */
  structs?: Array<{
    /**
     * Same as IPCSchema.fields
     */
    fields?: IPCField[];
  }>;
}

```

## LICENSE
 
[GPL v3](LICENSE)

FINAL FANTASY, FINAL FANTASY XIV, FFXIV, SQUARE ENIX, and the SQUARE ENIX logo are registered trademarks or trademarks of Square Enix Holdings Co., Ltd.
