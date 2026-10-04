# Development and verification

Use a stable Rust toolchain, Node 22.22.2 and pnpm 11.6.0. Windows desktop builds
require the MSVC C++ toolchain. Node is a build dependency, never a release dependency.

## Windows portable build

From the repository root in 64-bit PowerShell:

```powershell
.\build-desktop.ps1
```

The script installs locked JavaScript dependencies, generates contracts and wizard
rules, checks generated files and types, builds Tauri and extcap for
`x86_64-pc-windows-msvc`, and assembles
`packages/desktop/ffxiv-packet-desktop-windows-x64.zip`. It can also be invoked by
absolute path from another working directory. Install Rust with the MSVC toolchain
and Visual Studio's **Desktop development with C++** workload (including a Windows
SDK) before running it. Node and pnpm must be on PATH.

Tests are **off by default**. To also run Rust and wizard unit tests, Playwright
browser tests, extcap discovery and the packaged application startup/close check:

```powershell
.\build-desktop.ps1 -RunTests
```

This option downloads Chromium and requires an installed WebView2 runtime for the
startup check. It does not inject into the game. The separate tshark integration
test remains opt-in and requires tshark; real-game acceptance is manual.

Every build validates the Deucalion DLL hash, excludes Node runtime/addon artifacts,
and produces only a portable ZIP. Old portable output is removed before building;
any failed build command stops packaging. Existing Cargo build caches are retained.
The Windows workflow calls this same script. Its manual **run_tests** input enables
tests; push/PR builds leave tests off. The separate Core workflow still runs its
Linux checks independently.

## Core development on Linux

```sh
pnpm install --frozen-lockfile --ignore-scripts
cargo run -p xtask --locked
pnpm --filter @ffxiv/contracts generate
pnpm --filter wizard build
pnpm --filter wizard --filter desktop typecheck
pnpm --filter wizard test
cargo test --workspace --exclude ffxiv-packet-desktop --locked
pnpm --filter desktop build
pnpm --filter desktop prepare:resources
pnpm --filter desktop exec playwright install chromium
pnpm --filter desktop test:ui
```

Update `resources/metadata/packets.yaml` from the opcode-worker repository in an
explicit source update, record its revision/hash in `resources/metadata/source.json`,
and rebuild rules. Do not fetch mutable upstream content during application startup.
Updating Lua packet definitions and version maps still uses `packages/network`.

Real-machine checks, kept outside automated fixtures:

1. Open the portable application on Windows without Node on PATH.
2. Verify enumeration without injection, including Unicode and space-containing paths.
3. Connect an uninjected process; disconnect/reconnect through the existing pipe.
4. Enable Wireshark output, then wizard; waiting for input must not stop output.
5. Switch processes and confirm both consumers stop and session inputs are cleared.
6. Test cancellation, game exit, Wireshark exit, output restart and window close.
7. Launch extcap from Wireshark; discovery must not inject and capture stop must exit.
8. Restore saved results without automatic injection or restored personal inputs.

`tools/benchmarks/measure-node-icu.ps1` is retained only as a historical build-size
experiment; its output is not part of the release or required by the application.
