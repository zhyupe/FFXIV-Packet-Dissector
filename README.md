# FFXIV-Packet-Dissector

This repository contains Wireshark plugins for analyzing network packets of Final Fantasy XIV.

## Usage

### Install the dissector

Copy all the files under `src/` to [the plugin folder](https://www.wireshark.org/docs/wsug_html_chunked/ChPluginFolders.html), then click \[Analyze] -
\[Reload Lua Plugins] (or press `Ctrl + Shift + L`).

For Windows users, `mklink.bat` is provided to create a symbolic link from the plugin folder to the cloned repository.

### Desktop GUI

The [Windows desktop GUI](packages/desktop/README.md) provides process selection,
independent forwarder and wizard controls, graphical wizard inputs and result export.
It uses Tauri with a bundled Node.js backend; users do not need to install Node.js.
The **Desktop Windows** workflow builds an NSIS installer and a portable ZIP.

### Run the forwarder

The [forwarder](packages/forwarder) can read raw packets from the game and send them to loopback udp ports. Therefore you can use Wireshark and this dissector
without concern for the lower-level TCP layer.

> Since patch 6.3, the game uses oodle for packet compression. It now requires a socket level state to retrive the raw packet data and therefore the
> dissector can no longer directly read the communication.
>
> Thankfully, the community developed [deucalion](https://github.com/ff14wed/deucalion) which could be injected into the game and directly read the
> decompressed packets. The forwarder uses a modified version of [pcap-ffxiv](https://github.com/ffxiv-teamcraft/pcap-ffxiv), a deucalion wrapper
> created by TeamCraft team.

To use the forwarder, please follow the instructions:

1. Install [Node.js](https://nodejs.org/) if you haven't.
2. Install yarn by `npm i -g yarn` or enable corepack by `corepack enable`.
3. Enter `packages/forwarder` directory, and run `yarn run build`.

Steps above only need to be run once unless there are updates to the forwarder. You can then run `yarn run start` **after starting the game**.

### Capture packets

You can now start capturing packets on your **loopback device** with following filter:

```
# This filters all packets sent by the forwarder
udp and host 127.0.0.11
```

Note that `127.0.0.11` represents the client, and `127.0.0.12` represents the server.

![image](https://user-images.githubusercontent.com/2197479/68070741-31e87c00-fdad-11e9-9ced-86f2fce3d17e.png)

## Supported Packets

FFXIV Segments (Both compressed and uncompressed), and detailed segment arguments for following types:

- `3` - IPC
- `7` - ClientKeepAlive
- `8` - ServerKeepAlive

Some structure of the IPC packets are converted from [Sapphire](https://github.com/SapphireServer/Sapphire/).

All the packet analyzing and verifying works are done with the Chinese server of FFXIV, there is no guarantee
that the dissectors would work in the international server.

## IPC Protocol Schema

Packet structures live in `packages/network/src/definitions/ipc`. Their field metadata
generates the Wireshark Lua dissectors in `src/` and also drives the TypeScript reader.

```sh
pnpm install
pnpm --filter network sync
pnpm --filter network generate
pnpm --filter network typecheck
pnpm --filter network test
# From the repository root, with Lua 5.3 or newer:
lua packages/network/test/dissectors.lua src/*_gen.lua
```

`sync` reads the `FFXIVOpcodes` aliases from
[opcode-worker's packets.yaml](https://github.com/zhyupe/ffxiv-opcode-worker/blob/master/packets.yaml)
and caches the validated file for one hour. ACT and OverlayPlugin mappings are not
applied to this opcode source. To use a local checkout, run
`pnpm --filter network sync --packets /path/to/ffxiv-opcode-worker/packets.yaml`.
Packet categories and directions are read from the same catalog. Top-level IPC
categories contain `direction` and `packets`; FFXIVOpcodes, ACT, and OverlayPlugin aliases
remain attached to each project packet name. Direction is read directly from YAML
and validated as `server-to-client` or `client-to-server`. Category names come
from YAML without a built-in list; duplicate packet names across categories
are rejected.

`sync` refreshes the latest opcode table, including newly added upstream names;
historical TypeScript opcode tables are retained. `generate` regenerates all Lua
tables from the shared definitions. `src/ffxiv_ipc_map.lua` stores shared dissector
names and minimum payload lengths, keyed by packet type. Version tables contain
only opcode-to-type mappings, directions, and any explicit title or length
overrides. The resolver looks up shared metadata at runtime, so changing a
structure's length or adding a dissector does not change every version table.
An opcode entry's explicit `size` takes precedence over the shared length.

For offline tests, the requested 7.56a JSON is
pinned in `packages/network/test/fixtures/7.56a.json`, alongside a `packets.yaml`
snapshot for reproducible offline name normalization.

## LICENSE

[GPL v3](LICENSE)

FINAL FANTASY, FINAL FANTASY XIV, FFXIV, SQUARE ENIX, and the SQUARE ENIX logo are registered trademarks or trademarks of Square Enix Holdings Co., Ltd.
