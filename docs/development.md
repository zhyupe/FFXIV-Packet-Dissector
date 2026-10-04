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

### CI caches

Windows desktop builds and Linux core checks cache the pnpm store using
`pnpm-lock.yaml`, plus Cargo downloads and compiled dependencies in the root
`target` directory using [rust-cache](https://github.com/Swatinem/rust-cache).
Rust cache keys account for the compiler, Cargo manifests and lockfiles, toolchain
configuration and build environment. Windows and Linux caches are separate;
Windows runs with tests enabled also use a separate key from build-only runs.

The first successful run populates each cache. Later compatible runs reuse it;
cache misses still perform a normal build. Workspace crates, frontend assets and
the portable ZIP are rebuilt, and tests remain opt-in for desktop builds. No
`node_modules` or final release ZIP is cached. To discard the Rust caches, delete
them from the repository's Actions cache page or change the workflows' cache keys.

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

## Cross-compiling Windows executables on Linux

Tauri supports the MSVC target through
[cargo-xwin](https://v2.tauri.app/distribute/windows-installer/#build-windows-apps-on-linux-and-macos).
Install LLVM (including `llvm-rc`), LLD (including `lld-link`), and Clang, in
addition to the Rust, Node and pnpm build prerequisites. For Debian/Ubuntu:

```sh
sudo apt-get install clang lld llvm
rustup target add x86_64-pc-windows-msvc
cargo install --locked --version 0.23.1 cargo-xwin
```

After the dependency installation and contract/rule generation steps above, run
from the repository root:

```sh
export CARGO_TARGET_DIR="$PWD/target"
export XWIN_CACHE_DIR="${XDG_CACHE_HOME:-$HOME/.cache}/ffxiv-xwin"
pnpm --filter desktop exec tauri build --ci --no-bundle \
  --runner cargo-xwin --target x86_64-pc-windows-msvc -- --locked
cargo xwin build -p ffxiv-extcap --release --locked \
  --target x86_64-pc-windows-msvc
```

`cargo-xwin` downloads the Microsoft SDK/CRT on the first build. Both executables
are written to `target/x86_64-pc-windows-msvc/release/`. The frontend and icon are
embedded by the Tauri build; Deucalion resources, Lua dissectors and licenses
still need to accompany the executables as described in the portable layout.
`--no-bundle` means NSIS and WiX are unnecessary.

Verified with Rust 1.98.1, cargo-xwin 0.23.1 and LLVM 19.1.7 on Linux: both the
desktop and extcap release builds linked successfully and produced x86-64 PE32+
executables without application source changes. Missing Microsoft CRT PDB files
can produce non-fatal `LNK4099` debug-information warnings during linking.

This compiles Windows executables; it does not run Windows tests or validate
WebView2, injection or Wireshark interoperability. `build-desktop.ps1` and the
release workflow continue to use Windows for the full portable packaging process.

## Desktop releases

Push an annotated `desktop-v<version>` tag to build and publish a portable release.
The Desktop Windows workflow attaches the ZIP and `SHA256SUMS` only after the
Windows build succeeds. Branch and pull-request builds continue to upload Actions
artifacts without creating releases. Update `docs/desktop-release.md` when the
release contents or requirements change.
