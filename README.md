# FFXIV-Packet-Dissector

This repository contains Wireshark plugins for analyzing network packets of Final Fantasy XIV.

## Usage

Copy all the files under `src/` to [the plugin folder](https://www.wireshark.org/docs/wsug_html_chunked/ChPluginFolders.html), then click \[Analyze] - 
\[Reload Lua Plugins] (or press `Ctrl + Shift + L`). There should be packets recognized by the plugin with `Protocol` set to `FFXIV`.

For Windows users, `mklink.bat` is provided to create a symbolic link from the plugin folder to the cloned repository.

![image](https://user-images.githubusercontent.com/2197479/68070741-31e87c00-fdad-11e9-9ced-86f2fce3d17e.png)

Please notice that the plugin checks **all tcp packets** and determines packet types only by magic (`0x41a05252` or 16 bytes of `0`). So its highly
recommended to set capture filters properly to reduce packets to be processed.

## Supported Packets

FFXIV Segments (Both compressed and uncompressed), and detailed segment arguments for following types: 
* `3` - IPC
* `7` - ClientKeepAlive
* `8` - ServerKeepAlive

Some structure of the IPC packets are converted from [Sapphire](https://github.com/SapphireServer/Sapphire/).

All the packet analyzing and verifying works are done with the Chinese server of FFXIV, there is no guarantee
that the dissectors would work in the international server. 

## IPC Protocol Schema

This repository uses a JSON-based schema to describe IPC packets and generate dissectors. See `types` folder
for structure described in TypeScript.

## LICENSE
 
[GPL v3](LICENSE)

FINAL FANTASY, FINAL FANTASY XIV, FFXIV, SQUARE ENIX, and the SQUARE ENIX logo are registered trademarks or trademarks of Square Enix Holdings Co., Ltd.
