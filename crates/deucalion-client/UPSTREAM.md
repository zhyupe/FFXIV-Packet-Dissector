Protocol reference: https://github.com/ff14wed/deucalion at
5cc714ad4cc66aced1519042660026edff68e850 (tag 1.5.0), specifically
`deucalion/src/rpc.rs` and `deucalion-client/src/subscriber.rs`.
This client implements the wire protocol independently, with bounded framing,
cancellation owned by capture-core, and no logging of payload or server debug text.
The bundled DLL's upstream license is in resources/deucalion/LICENSE.md.
