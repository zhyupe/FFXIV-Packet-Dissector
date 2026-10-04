# Desktop capture architecture

The release has two entry points: Tauri Desktop and Wireshark extcap. Neither
requires Node.js. Node is a development tool for network generation, frontend
builds and wizard rule compilation; there is no CLI wizard, Node backend or addon.

## Boundaries

- `protocol`: common packet types, versioned rule IR and host contracts. `xtask`
  generates JSON Schema; `packages/contracts` derives TypeScript declarations.
- `game-process`: Windows process identity, read-only enumeration, verified DLL
  injection. A target is PID plus the exact creation FILETIME string.
- `deucalion-client`: bounded RPC framing, handshake and named pipe transport.
- `capture-core`: cancellable connection and packet delivery. Existing pipes are
  preferred; only a missing pipe permits injection. Disconnect is not DLL unload.
- `capture-output`: pcapng/Exported PDU and compatibility UDP. Each output owns a
  bounded queue, byte budget, timeout and counters independent of the wizard.
- `wizard-engine`: the only owner of step order, input generations, opcode
  conflicts and results. Simple predicates execute here, complex predicates in
  a Web Worker from the same `packages/wizard` rule package.
- `app-core`: serializes host commands, owns one game connection and coordinates
  output, worker responses and atomic profile storage. Cancellation bypasses
  queued commands. A watch channel publishes coalesced state snapshots.
- `extcap`: Wireshark discovery is read-only. Capture creates a separate session;
  it does not attach to Desktop's in-process session or launch a background broker.
- `desktop`: React and a thin Tauri adapter. Worker candidates use a binary Tauri
  Channel and transferable ArrayBuffers; ordinary UI updates contain no payload.
- `network` and root `src`: existing packet definitions and Lua generation remain.

## Ordering and bounded work

Only the active step observes packets. A Worker task includes protocol version,
rule-pack hash, session, run, input generation, rule ID and packet sequence. Rust
retains the original candidate and determines the opcode itself. A stale reply
cannot commit results. Only declared context outputs are accepted; arbitrary
comments and context do not enter saved state.

One worker candidate is in flight. While it runs, at most 256 packets / 4 MiB are
retained. A step declaring `continuation` can observe packets received while its
predecessor's result was in flight. Other transitions discard this pending window.
Input waits do not buffer traffic. Overflow or a five-second Worker timeout stops
recognition without stopping capture output.

Shared text and numeric inputs and derived operation identifiers are explicit.
Direct selection schedules missing prerequisite steps in their original order;
skipping a prerequisite does not silently authorize dependent recognition.
Results restored from disk do not recreate session context or satisfy gameplay
prerequisites. Re-identification replaces a result only after a successful match;
conflicts use category + opcode, rather than opcode alone.

## Storage and resources

Profiles are isolated by SHA-256 of executable path, build version and rule-pack
hash. One writer locks each profile. Temporary writes are flushed and atomically
replaced (MoveFileEx on Windows). A failed save retains results in memory, marks
them unsaved and stops recognition. Explicit save can retry. Closing a window
with a save failure leaves it open so results can be exported or saved.

Only progress, canonical names, categories, opcodes and whitelisted derived base
offsets persist. Inputs, actor identifiers and captured bytes never enter state,
logs or tests. Explicit Wireshark output intentionally contains captured data;
Wireshark may write temporary or user-saved capture files.

`resources/metadata/packets.yaml` is a checked-in opcode-worker snapshot. Direction
and canonical names are taken from it, with no second category-direction table.
Channel numbers bind the Deucalion transport to the catalog's channel names.
The rule manifest and Worker come from one build and must have identical hashes.
No runtime network fetch is needed. `resources/dependencies.lock.json` fixes the
Deucalion DLL hash; its license is distributed beside the DLL.

## Validation boundary

Synthetic core, rule, browser and packaging tests run in CI. Linux cross-checks
can compile Windows branches but cannot prove real injection, WebView2 behavior,
Wireshark named-pipe interoperability or game packet semantics. Windows release
acceptance must exercise process switching, an already-injected process, concurrent
wizard/output operation and clean disconnect. Historical scanner predicates are
preserved where possible; this migration is not a revalidation of their game logic.
