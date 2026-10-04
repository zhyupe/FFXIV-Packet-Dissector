Windows x64 portable desktop application for FFXIV packet capture and opcode recognition.

- Select and connect to a game process through the Tauri interface.
- Capture to Wireshark through a named pipe or extcap, with optional UDP output.
- Run the ordered Wizard alongside capture, save recognition progress and export opcodes.
- Includes Lua dissectors, verified Deucalion resources and third-party licenses.

Download `ffxiv-packet-desktop-windows-x64.zip` and extract the complete directory.
Windows x64 and Microsoft Edge WebView2 Runtime are required. Node.js is neither
required nor bundled. See the included README for Wireshark setup. `SHA256SUMS`
contains the portable ZIP checksum. No NSIS installer is included.

The Windows workflow builds this package from the release tag. Its optional test
suite is not enabled by the tag build; a successful build does not establish
real-game injection or capture compatibility on every installation.
