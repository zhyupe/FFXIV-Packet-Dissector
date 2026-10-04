# Windows Desktop

The portable application uses Tauri and a shared Rust capture core. It does not
require or include Node.js. Windows x64 and an installed WebView2 runtime are
required. No NSIS installer is published.

## Capture

1. Extract the complete ZIP; preserve its directory layout.
2. Copy `wireshark/` contents into Wireshark's personal Lua plugin directory and
   reload Lua plugins.
3. Start the game, refresh the process list, select a process and connect.
4. Enable the default named-pipe output, then click **打开 Wireshark**. If Wireshark
   is not in its standard installation path, select `Wireshark.exe` in the dialog.
5. Switch to Wizard as needed. Navigating pages does not stop either task.

The UDP compatibility mode uses a loopback capture interface and the filter
`udp and host 127.0.0.11`. Stop output before changing modes. After Wireshark closes,
stop/restart output before connecting a new reader.

To capture directly from Wireshark without opening Desktop, copy
`extcap/ffxiv-extcap.exe` and the complete sibling `ffxiv-resources/` directory into
Wireshark's personal extcap directory. Refresh interfaces and select the game PID.
Enumeration is read-only; only starting capture can inject. This starts a separate
session, not a connection to an existing Desktop instance.

## Wizard and progress

The bundled step list is available for browsing and filtering before connecting.
Recognition starts only after a game process is connected.

Sequence mode preserves the original scanner order. Direct selection includes
missing prerequisites. Inputs and context are held only in memory; a new game
session requires them again. Results are isolated by installation, build and rule
pack, and exported through a file dialog in the existing opcode JSON format.

Conflicting matches do not overwrite results. Save errors stop recognition and
keep results available in memory for retry/export. Closing saves progress and
releases the connection; disconnecting does not unload the injected DLL.

No automatic injection or task resumption occurs at startup. Application logs and
progress contain no raw packets or character data. Wireshark captures themselves
contain game data and may be saved by Wireshark.

Build from source with `./build-desktop.ps1` in the repository root. Add
`-RunTests` to run tests; the default builds and packages only. Development
instructions and architecture are in `docs/` in the source repository.

The UI uses shadcn/ui components with Radix primitives and Tailwind CSS. Components
are maintained in `src/components/ui`, theme tokens in `src/theme.css`, and layout
in `src/style.css`. `components.json` configures the official shadcn generator.
