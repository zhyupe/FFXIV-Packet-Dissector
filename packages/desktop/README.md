# Desktop

Windows x64 GUI for choosing a game process, sharing a Deucalion capture between
UDP forwarding and the opcode wizard, and switching sessions. The UI is in Chinese.

## Windows users

Use the NSIS installer from the **Desktop Windows** workflow artifact. Node.js is
included; no developer tools are required. The installer downloads WebView2 if it
is missing, so the first installation may require internet access. The portable
ZIP requires an existing WebView2 runtime. Extract the whole directory, retaining
`runtime/` beside `ffxiv-packet-desktop.exe`.

1. Start the game, refresh the process list, then select its PID and installation.
2. Click **连接并注入**. An existing Deucalion pipe is reused when available.
3. Enable **Forwarder** to send the existing UDP format to the loopback interface.
   In Wireshark, capture using `udp and host 127.0.0.11`.
4. Open **Wizard** to run sequentially or select a single step. Supply the requested
   inputs, then perform the indicated action in the game. Legacy scanner rules
   are reused; a discovered opcode still needs manual verification.

Page navigation leaves tasks running. The forwarder and wizard have independent
stop controls. Switching processes saves results and stops both; start the desired
functions manually after connecting. Disconnecting does not unload the injected DLL.
Closing the app saves progress and shuts down its backend. There is no automatic
injection, automatic background restart, or tray mode.

Results are isolated by executable path, build version and scanner revision under
Tauri's application data directory (`io.github.zhyupe.ffxiv-packet-dissector`).
Only recognition results and the current step are saved. Packet bodies and prompt
inputs are never persisted or logged; inputs are requested again after switching
sessions. Old `context.json` files are not imported. **导出 JSON** keeps the existing
`[name, opcode, comment]` array format.

## Windows development

Install Node **22.22.2 x64**, pnpm, Rust and the Visual Studio C++ build tools required
by Tauri and node-gyp. Run from the repository root:

```sh
pnpm install --ignore-scripts
pnpm --filter dll-inject compile
pnpm --filter pcap build
pnpm --filter forwarder build
pnpm --filter wizard build
pnpm --filter desktop build
pnpm --filter desktop prepare:runtime
pnpm --filter desktop smoke:runtime
pnpm --filter desktop dev
```

`prepare:runtime` downloads and checks the pinned Node executable, verifies the native
addon loads with that runtime, and assembles the resources. `dll-inject` uses NAN and
must be built for the exact Node ABI shipped. There is no Electron ABI or separately
installed Node dependency. Resource paths are absolute and do not depend on the
working directory. Re-run resource preparation after changing the backend.

Build NSIS with `pnpm --filter desktop package`. CI also produces a portable ZIP.
Build inputs are locked with the workspace lockfile and `src-tauri/Cargo.lock`.
Runtime downloads and build outputs are ignored by Git; existing third-party
licenses and the Deucalion license accompany the distribution.

## Architecture and checks

React calls narrow Rust commands. Rust owns one Node child in a Windows Job Object
and exchanges bounded, versioned JSON lines through stdin/stdout. stdout contains
protocol messages only. Rust never exposes an arbitrary program path or shell to
the renderer. The child owns one selected capture and fans out in memory; packet
bodies are never sent to the UI. A broken backend stops visible work without
re-injecting. An explicit stop/disconnect cancels an in-progress connection.

```sh
pnpm --filter pcap --filter forwarder --filter wizard --filter desktop typecheck
pnpm --filter pcap --filter forwarder --filter wizard --filter desktop test
pnpm --filter desktop exec playwright install chromium
pnpm --filter desktop test:ui
cargo test --manifest-path packages/desktop/src-tauri/Cargo.toml --locked
```

Core and UI tests use synthetic data and mock game processes. The Windows runtime
smoke test checks the bundled Node/addon, process enumeration, protocol shutdown,
Unicode paths and an empty PATH; it does not inject into a game. Release acceptance
also requires a Windows game session: actual injection, compatible Wireshark UDP
traffic, simultaneous wizard/forwarder, process switching, and no orphan backend
after exit. Linux tests cannot substitute for that acceptance.
