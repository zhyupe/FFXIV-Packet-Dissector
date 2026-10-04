//! Shared wire contracts. Capture payloads deliberately do not implement Debug/Serialize.
use bytes::Bytes;
use schemars::JsonSchema;
use serde::{Deserialize, Serialize};
use std::collections::BTreeMap;

pub const VERSION: u32 = 1;
pub const MAX_FRAME: usize = 16 * 1024 * 1024;
pub type Result<T> = std::result::Result<T, String>;
pub type Inputs = BTreeMap<String, serde_json::Value>;

#[derive(Clone)]
pub struct Packet {
    pub sequence: u64,
    pub channel: u32,
    pub source: String,
    pub source_actor: u32,
    pub target_actor: u32,
    pub timestamp_ms: u64,
    pub ipc: [u8; 16],
    pub body: Bytes,
}
impl Packet {
    pub fn opcode(&self) -> u16 {
        u16::from_le_bytes([self.ipc[2], self.ipc[3]])
    }
}

#[derive(Clone, Debug, Serialize, Deserialize, JsonSchema, PartialEq, Eq)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct Target {
    pub pid: u32,
    pub started_at: String,
}
#[derive(Clone, Debug, Serialize, Deserialize, JsonSchema)]
#[serde(rename_all = "camelCase")]
pub struct GameProcess {
    pub pid: u32,
    pub started_at: String,
    pub executable: String,
    pub version: String,
}
impl GameProcess {
    pub fn target(&self) -> Target {
        Target {
            pid: self.pid,
            started_at: self.started_at.clone(),
        }
    }
}

#[derive(Clone, Debug, Serialize, Deserialize, JsonSchema)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct InputField {
    pub key: String,
    pub label: String,
    pub r#type: String,
    pub required: bool,
    #[serde(default)]
    pub shared: bool,
}
#[derive(Clone, Debug, Serialize, Deserialize, JsonSchema)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct Length {
    #[serde(default)]
    pub one_of: Vec<usize>,
    #[serde(default)]
    pub min: usize,
    pub max: usize,
}
impl Length {
    pub fn accepts(&self, n: usize) -> bool {
        n >= self.min && n <= self.max && (self.one_of.is_empty() || self.one_of.contains(&n))
    }
}
#[derive(Clone, Debug, Serialize, Deserialize, JsonSchema)]
#[serde(tag = "kind", rename_all = "camelCase", deny_unknown_fields)]
pub enum ValueRef {
    Constant { value: u32 },
    Input { key: String },
}
#[derive(Clone, Debug, Serialize, Deserialize, JsonSchema)]
#[serde(tag = "op", rename_all = "camelCase", deny_unknown_fields)]
pub enum Condition {
    All {
        conditions: Vec<Condition>,
    },
    Any {
        conditions: Vec<Condition>,
    },
    Field {
        offset: usize,
        width: u8,
        equals: ValueRef,
        #[serde(default)]
        mask: Option<u32>,
    },
}
#[derive(Clone, Debug, Serialize, Deserialize, JsonSchema)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct Step {
    pub name: String,
    pub instruction: String,
    pub source: String,
    pub category: String,
    pub channel: u32,
    pub fields: Vec<InputField>,
    #[serde(default)]
    pub requires: Vec<String>,
    /// Continue the preceding observation window without replaying across user interactions.
    #[serde(default)]
    pub continuation: bool,
    #[serde(default)]
    pub produces: Vec<String>,
    pub length: Length,
    #[serde(default)]
    pub probe: Option<Condition>,
}
#[derive(Clone, Debug, Serialize, Deserialize, JsonSchema)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct Manifest {
    pub version: u32,
    pub hash: String,
    pub steps: Vec<Step>,
}
#[derive(Clone, Debug, Serialize, Deserialize, JsonSchema)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct OpcodeResult {
    pub source: String,
    pub category: String,
    pub value: u16,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub comment: Option<String>,
}
#[derive(Clone, Debug, Serialize, Deserialize, JsonSchema)]
#[serde(rename_all = "camelCase")]
pub struct WizardSnapshot {
    pub status: String,
    pub mode: String,
    pub current: Option<String>,
    pub input_token: u32,
    pub fields: Vec<InputField>,
    pub steps: Vec<Step>,
    pub results: Vec<(String, OpcodeResult)>,
    pub error: String,
    pub conflict: Option<String>,
    pub unsaved: bool,
}
#[derive(Clone, Debug, Default, Serialize, Deserialize, JsonSchema)]
#[serde(rename_all = "camelCase")]
pub struct OutputStatus {
    pub running: bool,
    pub mode: String,
    pub pipe: String,
    pub client_port: u16,
    pub server_port: u16,
    pub sent: u64,
    pub received: u64,
    pub dropped: u64,
    pub error: String,
}
#[derive(Clone, Debug, Serialize, Deserialize, JsonSchema)]
#[serde(rename_all = "camelCase")]
pub struct Snapshot {
    pub session_id: u32,
    pub connection: String,
    pub target: Option<GameProcess>,
    pub forwarder: OutputStatus,
    pub wizard: Option<WizardSnapshot>,
    pub error: String,
}
#[derive(Clone, Serialize, Deserialize, JsonSchema)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct WorkerTask {
    pub version: u32,
    pub session_id: u32,
    pub run_id: u32,
    pub input_generation: u32,
    pub rule_pack_hash: String,
    pub rule_id: String,
    pub packet_sequence: String,
    pub source_actor: u32,
    pub target_actor: u32,
    pub inputs: Inputs,
    pub context: Inputs,
}
#[derive(Clone, Serialize, Deserialize, JsonSchema)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct WorkerResult {
    pub version: u32,
    pub session_id: u32,
    pub run_id: u32,
    pub input_generation: u32,
    pub rule_pack_hash: String,
    pub rule_id: String,
    pub packet_sequence: String,
    pub matched: bool,
    #[serde(default)]
    pub updates: Inputs,
    #[serde(default)]
    pub base_offset: Option<u16>,
    #[serde(default)]
    pub error: bool,
}
/// All public types are reachable from one schema; generated contracts are checked in CI.
#[derive(JsonSchema)]
pub struct Contracts {
    pub manifest: Manifest,
    pub snapshot: Snapshot,
    pub target: Target,
    pub worker_task: WorkerTask,
    pub worker_result: WorkerResult,
}
