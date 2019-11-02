# FFXIV-Packet-Dissector

This repository contains Wireshark plugins for analyzing network packets of Final Fantasy XIV.

## Usage

Copy all the files under `src/` to [the plugin folder](https://www.wireshark.org/docs/wsug_html_chunked/ChPluginFolders.html), then click \[Analyze] - 
\[Reload Lua Plugins] (or press `Ctrl + Shift + L`). There should be packets recognized by the plugin with `Protocol` set to `FFXIV`.

![image](https://user-images.githubusercontent.com/2197479/68070741-31e87c00-fdad-11e9-9ced-86f2fce3d17e.png)

Please be noticed that the plugin checks **all tcp packets** and determines packet types only by magic (`0x41a05252` or 32 bytes of `0`). So its highly
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

## LICENSE
 
[GPL v3](LICENSE)

FINAL FANTASY, FINAL FANTASY XIV, FFXIV, SQUARE ENIX, and the SQUARE ENIX logo are registered trademarks or trademarks of Square Enix Holdings Co., Ltd.
