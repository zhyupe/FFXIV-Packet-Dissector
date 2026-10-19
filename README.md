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

Packet structures, opcode tables and field metadata come from the pinned npm packages
[`@ffcafe/elpis-network`](https://www.npmjs.com/package/@ffcafe/elpis-network) and
[`@ffcafe/elpis-struct`](https://www.npmjs.com/package/@ffcafe/elpis-struct).
This repository maintains the Wireshark Lua generator in `packages/wireshark-generator`.
Protocol definitions and opcode synchronization are maintained in
[elpis](https://github.com/thewakingsands/elpis).

With Node.js 22 or newer:

```sh
pnpm install --frozen-lockfile
pnpm --filter wireshark-generator typecheck
pnpm --filter wireshark-generator test
pnpm --filter wireshark-generator generate
# From the repository root, with Lua 5.3 or newer:
lua packages/wireshark-generator/test/dissectors.lua src/*_gen.lua
lua packages/wireshark-generator/test/segments.lua
```

Generation uses only installed packages; it does not fetch opcode data. To update
protocol data, upgrade both elpis dependencies to the same exact released version,
update `pnpm-lock.yaml`, regenerate Lua, review the differences and run the tests.
The `@ffcafe` scope uses the official npm registry because mirrors may lag behind releases.
Load network and struct through ESM together: mixing ESM and CommonJS breaks the
Symbol-based field metadata. No npm packages or Node.js runtime are needed by Wireshark
or the portable desktop application.

`generate` writes to this repository's `src/`, independent of the working directory.
Use `generate --output /path/to/output` to override it; the destination must already
contain `ffxiv.lua`. Dependency license notices are copied into `src/licenses/`,
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
