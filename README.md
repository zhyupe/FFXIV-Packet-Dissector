# FFXIV-Packet-Dissector

This repository contains Wireshark plugins for analyzing network packets of Final Fantasy XIV.

## Usage

### Install the dissector

Copy all the files under `src/` to [the plugin folder](https://www.wireshark.org/docs/wsug_html_chunked/ChPluginFolders.html), then click \[Analyze] -
\[Reload Lua Plugins] (or press `Ctrl + Shift + L`).

For Windows users, `mklink.bat` is provided to create a symbolic link from the plugin folder to the cloned repository.

### Desktop GUI and Wireshark capture

The [Windows desktop application](packages/desktop/README.md) provides process
selection, independent capture output and wizard controls, graphical inputs and
result export. Tauri calls the shared Rust core directly; the portable ZIP contains
no Node.js runtime or native Node addon. WebView2 must already be installed.

On Windows, run `./build-desktop.ps1` to build the portable ZIP. Tests are optional:
use `./build-desktop.ps1 -RunTests` to include them.

Default capture streams decoded IPC as pcapng over a named pipe into Wireshark.
Install the Lua plugins, connect a game process, enable output and click **打开
Wireshark**. The packaged extcap helper also allows selecting a game process
directly in Wireshark without running Desktop. Interface discovery never injects.

UDP loopback forwarding remains available in Desktop as a compatibility option:
use `udp and host 127.0.0.11` on the loopback interface. Client and server addresses
remain `127.0.0.11` and `127.0.0.12`. The old forwarder/wizard CLIs are removed.

See [architecture](docs/architecture.md), [wizard rules](docs/wizard-rules.md),
[capture format](docs/capture-format.md), and [development](docs/development.md).

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
