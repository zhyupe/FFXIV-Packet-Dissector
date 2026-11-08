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

Packet structures and field metadata come from the pinned npm packages
[`@ffcafe/elpis-network`](https://www.npmjs.com/package/@ffcafe/elpis-network) and
[`@ffcafe/elpis-struct`](https://www.npmjs.com/package/@ffcafe/elpis-struct).
This repository maintains the Wireshark Lua generator in `packages/wireshark-generator`.
The separate `@ffcafe/elpis-opcode-worker` package reads opcode names, directions and
values from [opcode-worker](https://github.com/zhyupe/ffxiv-opcode-worker).

With Node.js 22 or newer and Lua 5.3 or newer (`LUA` selects the test executable;
the default is `lua5.4`):

```sh
pnpm install --frozen-lockfile
pnpm --filter wireshark-generator typecheck
pnpm --filter wireshark-generator test
pnpm --filter wireshark-generator generate
# From the repository root, with Lua 5.3 or newer:
lua packages/wireshark-generator/test/dissectors.lua src/*_gen.lua
lua packages/wireshark-generator/test/segments.lua
```

Generation is offline. Its input in `packages/wireshark-generator/resources/opcodes/`
records the worker repository and full commit SHA in `source.json`, the explicit
selection in `selected-versions.json`, and the raw YAML/version JSON files.
The initial selection is empty, preserving the 68 existing version modules and
latest 7.57. To add or update a version, fetch it explicitly:

```sh
pnpm --filter wireshark-generator sync:opcodes --revision <40-character-worker-sha> --version 7.57
pnpm --filter wireshark-generator generate
```

`--version` may be repeated. Switching commits refreshes every selected version.
Only selected version modules are written; all other historical modules are left
untouched. Latest follows the worker version list without moving behind the existing
pointer. Review input and Lua differences in git. Errors return a nonzero status and
identify the source file/version/name; review only this command's changes when fixing
an unsuccessful run, preserving any pre-existing work.

Upgrade the two exact elpis structure dependencies together only when updating
protocol layouts, then regenerate and run the tests. Opcode updates do not require
upgrading those packages or the reader.
The `@ffcafe` scope uses the official npm registry because mirrors may lag behind releases.
Load network and struct through ESM together: mixing ESM and CommonJS breaks the
Symbol-based field metadata. No npm packages or Node.js runtime are needed by Wireshark
or the portable desktop application.

`generate` writes to this repository's `src/`, independent of the working directory.
Use `generate --output /path/to/output` to override it; the destination must already
contain `ffxiv.lua`; it does not receive unselected historical modules.
Use `--opcode-source /path/to/input` with either command to select another input
directory. Dependency and data source license notices are copied into `src/licenses/`,
which is also included in the portable Wireshark files.

`src/ffxiv_ipc_map.lua` stores shared dissector names and minimum payload lengths.
Version tables contain only opcode-to-type mappings, directions and explicit title
or length overrides. Changing a structure length does not rewrite every version table.
An opcode entry's explicit `size` takes precedence over the shared length.

The wizard's pinned `resources/metadata/packets.yaml` catalog and its scanner rules
remain independent of this generator. Update that catalog explicitly as described
in [development.md](docs/development.md).

## LICENSE

[GPL v3](LICENSE)

FINAL FANTASY, FINAL FANTASY XIV, FFXIV, SQUARE ENIX, and the SQUARE ENIX logo are registered trademarks or trademarks of Square Enix Holdings Co., Ltd.
