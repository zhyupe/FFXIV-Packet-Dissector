# Wizard rules

Rules and their Web Worker intentionally share one package. `src/scanner` retains
the existing ordered predicates; `src/flows.mts` declares gameplay prerequisites,
continuation windows and permitted context outputs. `src/probes.mts` overrides
simple predicates with Rust IR. All offsets start at the IPC body, excluding the
Deucalion and IPC headers; no empty transport header is synthesized.

Build with `pnpm --filter wizard build`. It creates:

- `generated/manifest.json`: ordered steps, inputs, dependencies, category and IR.
- `generated/names.json`: original scanner identifiers to canonical catalog names.
- `generated/probe-fixtures.json`: exclusively synthetic cross-language cases.

The Desktop build bundles `src/worker/entry.mts` with the matching manifest.
The manifest hash covers rule sources and compiled step definitions. CI regenerates
these files and checks for differences. Production bundles contain no Node imports.

`defineProbe` declares a rule with no JS handler; `defineWorkerProbe` supplies a
complex handler and length prefilter. Add the returned definition to the ordered
list in `src/scanner/index.mts`. Explicit rule metadata overrides legacy flow
adapter declarations. Both resolve canonical names and categories from the catalog.

A simple probe uses `field(offset, width, valueOrInputKey)`, `all(...)` and
`any(...)`. Width is 1, 2 or 4 bytes, little-endian; field predicates can specify
an optional mask. Body length is a range and/or exact set. The Rust loader rejects
invalid widths, missing inputs, cyclic/forward dependencies, excessive nesting and
out-of-bounds offsets. More complex numeric, string or variable-length predicates
remain in TS. New integer inputs should be declared as numbers.

Inputs marked `shared` live only in the current session. A handler works on a copy
of context. Declare derived values in `produces`; only a successful result commits
those values. Do not use module-level mutable state to communicate between steps.
Do not log packets, coordinates, text inputs, character names or actor IDs.

`requires` means a prior operation must be observed in this session. Selecting a
step directly includes its missing prerequisites. `continuation` means the next
step may examine the bounded observation window accumulated during the previous
Worker call; use it only for an uninterrupted response sequence, not across prompts
or independent user actions. Failure or an input wait ends that window.

Test new predicates with artificial bodies and invented inputs. Never paste live
captures into fixtures, comments, documentation or commit messages. The retained
TS predicate is the oracle for migrated Rust-probe equivalence tests; game-semantic
changes require separate evidence.
