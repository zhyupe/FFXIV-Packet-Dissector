use super::*;
use serde_json::json;
fn step(name: &str) -> Step {
    serde_json::from_value(json!({"name":name,"instruction":"Synthetic operation","source":"S","category":"ServerZoneIpc","channel":1,"fields":[],"requires":[],"continuation":false,"produces":[],"length":{"min":4,"max":4,"oneOf":[4]},"probe":null})).unwrap()
}
fn engine(steps: Vec<Step>) -> Engine {
    Engine::new(Manifest {
        version: 1,
        hash: "a".repeat(64),
        steps,
    })
    .unwrap()
}
fn packet(opcode: u16) -> Packet {
    let mut ipc = [0; 16];
    ipc[2..4].copy_from_slice(&opcode.to_le_bytes());
    Packet {
        sequence: 1,
        channel: 1,
        source: "S".into(),
        source_actor: 0,
        target_actor: 0,
        timestamp_ms: 0,
        ipc,
        body: bytes::Bytes::from_static(&[1, 0, 0, 0]),
    }
}
fn reply(t: WorkerTask) -> WorkerResult {
    WorkerResult {
        version: t.version,
        session_id: t.session_id,
        run_id: t.run_id,
        input_generation: t.input_generation,
        rule_pack_hash: t.rule_pack_hash,
        rule_id: t.rule_id,
        packet_sequence: t.packet_sequence,
        matched: true,
        updates: Inputs::new(),
        base_offset: None,
        error: false,
    }
}
#[test]
fn sequence_and_direct_selection_resolve_prerequisites() {
    let a = step("First");
    let mut b = step("Second");
    b.requires = vec!["First".into()];
    b.continuation = true;
    let mut e = engine(vec![a, b]);
    e.start(Some("Second")).unwrap();
    assert_eq!(e.snapshot().current.as_deref(), Some("First"));
    let t = e.observe(&packet(1), 1).unwrap();
    assert!(e.accept(reply(t)));
    assert_eq!(e.snapshot().current.as_deref(), Some("Second"));
    let t = e.observe(&packet(2), 1).unwrap();
    e.accept(reply(t));
    assert_eq!(e.snapshot().status, "stopped");
    assert_eq!(e.snapshot().results.len(), 2);
}
#[test]
fn dependency_cycle_or_forward_reference_is_rejected() {
    let mut a = step("First");
    a.requires.push("Second".into());
    assert!(Engine::new(Manifest {
        version: 1,
        hash: "a".repeat(64),
        steps: vec![a, step("Second")]
    })
    .is_err());
}
#[test]
fn skipped_prerequisite_never_silently_runs_dependent_rule() {
    let mut b = step("Second");
    b.requires.push("First".into());
    let mut e = engine(vec![step("First"), b]);
    e.start(None).unwrap();
    e.skip();
    assert_eq!(e.snapshot().error, "PREREQUISITE_REQUIRED");
    assert!(e.observe(&packet(1), 1).is_none());
}
#[test]
fn input_wait_does_not_consume_packets_and_stale_input_is_rejected() {
    let mut a = step("First");
    a.fields.push(InputField {
        key: "value".into(),
        label: "Synthetic".into(),
        r#type: "text".into(),
        required: true,
        shared: false,
    });
    let mut e = engine(vec![a, step("Second")]);
    e.start(None).unwrap();
    let token = e.token();
    assert!(e.observe(&packet(1), 1).is_none());
    assert!(e
        .inputs(token, Inputs::from([("value".into(), json!(""))]))
        .is_err());
    e.start(Some("Second")).unwrap();
    assert_eq!(e.inputs(token, Inputs::new()).unwrap_err(), "STALE_INPUT");
}
#[test]
fn worker_reply_requires_matching_session_run_input_rule_and_packet() {
    let mut e = engine(vec![step("First")]);
    e.start(None).unwrap();
    let t = e.observe(&packet(1), 9).unwrap();
    for changed in 0..6 {
        let mut r = reply(t.clone());
        match changed {
            0 => r.session_id += 1,
            1 => r.run_id += 1,
            2 => r.input_generation += 1,
            3 => r.rule_pack_hash = "b".repeat(64),
            4 => r.rule_id = "Wrong".into(),
            _ => r.packet_sequence = "999".into(),
        };
        assert!(!e.accept(r));
        assert!(e.busy());
    }
    assert!(e.accept(reply(t)));
    assert_eq!(e.snapshot().results.len(), 1);
}
#[test]
fn stop_invalidates_in_flight_worker() {
    let mut e = engine(vec![step("First")]);
    e.start(None).unwrap();
    let t = e.observe(&packet(1), 1).unwrap();
    e.stop(false);
    assert!(!e.accept(reply(t)));
}
#[test]
fn conflicts_preserve_old_results_and_are_scoped_to_category() {
    let mut c = step("OtherChannel");
    c.channel = 2;
    c.category = "ServerChatIpc".into();
    let mut e = engine(vec![step("First"), step("Second"), c]);
    e.start(None).unwrap();
    let t = e.observe(&packet(1), 1).unwrap();
    e.accept(reply(t));
    let t = e.observe(&packet(2), 1).unwrap();
    e.accept(reply(t));
    e.start(Some("First")).unwrap();
    let t = e.observe(&packet(2), 1).unwrap();
    e.accept(reply(t));
    assert_eq!(e.snapshot().status, "conflict");
    assert_eq!(e.results["First"].value, 1);
    e.start(Some("OtherChannel")).unwrap();
    let mut p = packet(1);
    p.channel = 2;
    let t = e.observe(&p, 1).unwrap();
    e.accept(reply(t));
    assert_eq!(e.results.len(), 3);
}
#[test]
fn privacy_and_restore_never_resume_or_restore_session_inputs() {
    let mut a = step("First");
    a.fields.push(InputField {
        key: "private".into(),
        label: "Synthetic".into(),
        r#type: "text".into(),
        required: true,
        shared: true,
    });
    let mut e = engine(vec![a]);
    e.start(None).unwrap();
    e.inputs(
        e.token(),
        Inputs::from([("private".into(), json!("synthetic-secret-marker"))]),
    )
    .unwrap();
    let t = e.observe(&packet(1), 1).unwrap();
    e.accept(reply(t));
    let saved = e.persistent();
    assert!(!saved.to_string().contains("synthetic-secret-marker"));
    let mut restored = Engine::new(e.manifest.clone()).unwrap();
    restored.restore(saved).unwrap();
    assert_eq!(restored.snapshot().status, "stopped");
    restored.start(Some("First")).unwrap();
    assert_eq!(restored.snapshot().status, "input");
}
#[test]
fn rejects_undeclared_context_updates() {
    let mut e = engine(vec![step("First")]);
    e.start(None).unwrap();
    let t = e.observe(&packet(1), 1).unwrap();
    let mut r = reply(t);
    r.updates.insert("unexpected".into(), json!(1));
    e.accept(r);
    assert_eq!(e.snapshot().error, "INVALID_WORKER_RESULT");
    assert!(e.results.is_empty());
}
#[test]
fn committed_context_is_visible_to_next_step_only() {
    let mut a = step("First");
    a.produces.push("operation".into());
    let mut e = engine(vec![a, step("Second")]);
    e.start(None).unwrap();
    let t = e.observe(&packet(1), 1).unwrap();
    let mut r = reply(t);
    r.updates.insert("operation".into(), json!(123));
    e.accept(r);
    assert_eq!(e.observe(&packet(2), 1).unwrap().context["operation"], 123);
}
#[test]
fn timed_out_worker_is_not_retried_implicitly() {
    let mut e = engine(vec![step("First")]);
    e.start(None).unwrap();
    e.observe(&packet(1), 1);
    e.pending.as_mut().unwrap().at = Instant::now() - Duration::from_secs(6);
    e.check_timeout();
    assert_eq!(e.snapshot().error, "WORKER_TIMEOUT");
    assert!(e.observe(&packet(1), 1).is_none());
}
#[test]
fn loaded_rule_pack_is_valid() {
    let manifest: Manifest = serde_json::from_str(include_str!(
        "../../../packages/wizard/generated/manifest.json"
    ))
    .unwrap();
    validate_manifest(&manifest).unwrap();
}
#[test]
fn rust_probes_match_typescript_scanner_fixtures() {
    let cases: serde_json::Value = serde_json::from_str(include_str!(
        "../../../packages/wizard/generated/probe-fixtures.json"
    ))
    .unwrap();
    for case in cases.as_array().unwrap() {
        let probe: Condition = serde_json::from_value(case["probe"].clone()).unwrap();
        let length: Length = serde_json::from_value(case["length"].clone()).unwrap();
        let body: Vec<u8> = serde_json::from_value(case["body"].clone()).unwrap();
        let inputs: Inputs = serde_json::from_value(case["inputs"].clone()).unwrap();
        assert_eq!(
            length.accepts(body.len()) && matches(&probe, &body, &inputs),
            case["expected"].as_bool().unwrap(),
            "{}",
            case["name"]
        );
    }
}
