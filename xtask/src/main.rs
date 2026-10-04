fn main() {
    let root = std::path::Path::new(env!("CARGO_MANIFEST_DIR"))
        .parent()
        .unwrap();
    let schema = schemars::schema_for!(ffxiv_protocol::Contracts);
    std::fs::write(
        root.join("packages/contracts/generated/schema.json"),
        serde_json::to_string_pretty(&schema).unwrap() + "\n",
    )
    .unwrap();
}
