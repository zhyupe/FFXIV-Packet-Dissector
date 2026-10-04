use ffxiv_protocol::*;
use std::collections::{BTreeMap, BTreeSet, VecDeque};
use std::time::{Duration, Instant};

fn number(value: &serde_json::Value) -> Option<u32> {
    if let Some(n) = value.as_u64() {
        u32::try_from(n).ok()
    } else {
        value.as_str().and_then(|v| v.parse().ok())
    }
}
pub fn matches(condition: &Condition, bytes: &[u8], inputs: &Inputs) -> bool {
    match condition {
        Condition::All { conditions } => conditions.iter().all(|c| matches(c, bytes, inputs)),
        Condition::Any { conditions } => conditions.iter().any(|c| matches(c, bytes, inputs)),
        Condition::Field {
            offset,
            width,
            equals,
            mask,
        } => {
            let Some(data) = offset
                .checked_add(*width as usize)
                .and_then(|end| bytes.get(*offset..end))
            else {
                return false;
            };
            let mut buf = [0u8; 4];
            if ![1, 2, 4].contains(width) {
                return false;
            }
            buf[..data.len()].copy_from_slice(data);
            let expected = match equals {
                ValueRef::Constant { value } => Some(*value),
                ValueRef::Input { key } => inputs.get(key).and_then(number),
            };
            expected.is_some_and(|v| u32::from_le_bytes(buf) & mask.unwrap_or(u32::MAX) == v)
        }
    }
}
fn valid_condition(c: &Condition, step: &Step, depth: usize, count: &mut usize) -> bool {
    *count += 1;
    if depth > 8 || *count > 128 {
        return false;
    }
    match c {
        Condition::All { conditions } | Condition::Any { conditions } => {
            !conditions.is_empty()
                && conditions
                    .iter()
                    .all(|c| valid_condition(c, step, depth + 1, count))
        }
        Condition::Field {
            offset,
            width,
            equals,
            ..
        } => {
            [1, 2, 4].contains(width)
                && offset
                    .checked_add(*width as usize)
                    .is_some_and(|end| end <= step.length.max)
                && match equals {
                    ValueRef::Constant { .. } => true,
                    ValueRef::Input { key } => step.fields.iter().any(|f| &f.key == key),
                }
        }
    }
}
pub fn validate_manifest(m: &Manifest) -> Result<()> {
    if m.version != VERSION
        || m.hash.len() != 64
        || !m.hash.bytes().all(|c| c.is_ascii_hexdigit())
        || m.steps.is_empty()
        || m.steps.len() > 4096
    {
        return Err("INVALID_RULE_PACK".into());
    }
    let mut previous = BTreeSet::new();
    for step in &m.steps {
        if step.name.is_empty()
            || step.name.len() > 128
            || !["S", "C"].contains(&step.source.as_str())
            || step.category.is_empty()
            || step.length.max > MAX_FRAME
            || step.length.min > step.length.max
            || step.requires.iter().any(|r| !previous.contains(r))
            || !previous.insert(step.name.clone())
        {
            return Err("INVALID_RULE_PACK".into());
        }
        let mut fields = BTreeSet::new();
        if step.fields.len() > 32
            || step
                .fields
                .iter()
                .any(|f| !fields.insert(&f.key) || !["text", "number"].contains(&f.r#type.as_str()))
            || step
                .probe
                .as_ref()
                .is_some_and(|c| !valid_condition(c, step, 0, &mut 0))
        {
            return Err("INVALID_RULE_PACK".into());
        }
    }
    Ok(())
}
struct Pending {
    task: WorkerTask,
    packet: Packet,
    at: Instant,
}
pub struct Engine {
    pub manifest: Manifest,
    index: usize,
    status: String,
    mode: String,
    token: u32,
    run: u32,
    answers: Inputs,
    context: Inputs,
    results: BTreeMap<String, OpcodeResult>,
    completed: BTreeSet<String>,
    plan: VecDeque<usize>,
    error: String,
    conflict: Option<String>,
    pending: Option<Pending>,
    pub unsaved: bool,
}
impl Engine {
    pub fn new(manifest: Manifest) -> Result<Self> {
        validate_manifest(&manifest)?;
        Ok(Self {
            manifest,
            index: 0,
            status: "idle".into(),
            mode: "sequence".into(),
            token: 0,
            run: 0,
            answers: Inputs::new(),
            context: Inputs::new(),
            results: BTreeMap::new(),
            completed: BTreeSet::new(),
            plan: VecDeque::new(),
            error: String::new(),
            conflict: None,
            pending: None,
            unsaved: false,
        })
    }
    pub fn snapshot(&self) -> WizardSnapshot {
        WizardSnapshot {
            status: self.status.clone(),
            mode: self.mode.clone(),
            current: self.step().map(|s| s.name.clone()),
            input_token: self.token,
            fields: if self.status == "input" {
                self.step()
                    .unwrap()
                    .fields
                    .iter()
                    .filter(|f| !self.answers.contains_key(&f.key))
                    .cloned()
                    .collect()
            } else {
                vec![]
            },
            steps: self.manifest.steps.clone(),
            results: self
                .results
                .iter()
                .map(|(k, v)| (k.clone(), v.clone()))
                .collect(),
            error: self.error.clone(),
            conflict: self.conflict.clone(),
            unsaved: self.unsaved,
        }
    }
    pub fn step(&self) -> Option<&Step> {
        self.manifest.steps.get(self.index)
    }
    pub fn is_running(&self) -> bool {
        self.status == "running"
    }
    pub fn busy(&self) -> bool {
        self.pending.is_some()
    }
    pub fn token(&self) -> u32 {
        self.token
    }
    pub fn continuation(&self) -> bool {
        self.status == "running" && self.step().is_some_and(|s| s.continuation)
    }
    fn add_dependencies(&self, i: usize, plan: &mut VecDeque<usize>) {
        for name in &self.manifest.steps[i].requires {
            if !self.completed.contains(name) {
                let j = self
                    .manifest
                    .steps
                    .iter()
                    .position(|s| &s.name == name)
                    .unwrap();
                self.add_dependencies(j, plan);
                if !plan.contains(&j) {
                    plan.push_back(j);
                }
            }
        }
    }
    pub fn start(&mut self, name: Option<&str>) -> Result<()> {
        self.run = self.run.wrapping_add(1);
        self.pending = None;
        self.plan.clear();
        let mut plan = VecDeque::new();
        if let Some(name) = name {
            let i = self
                .manifest
                .steps
                .iter()
                .position(|s| s.name == name)
                .ok_or("UNKNOWN_STEP")?;
            self.mode = "single".into();
            self.add_dependencies(i, &mut plan);
            plan.push_back(i);
        } else {
            self.mode = "sequence".into();
            for i in self.index..self.manifest.steps.len() {
                if !self.results.contains_key(&self.manifest.steps[i].name) {
                    self.add_dependencies(i, &mut plan);
                    if !plan.contains(&i) {
                        plan.push_back(i);
                    }
                }
            }
        }
        self.plan = plan;
        self.next();
        Ok(())
    }
    fn next(&mut self) {
        self.token = self.token.wrapping_add(1);
        self.pending = None;
        self.answers.clear();
        self.error.clear();
        self.conflict = None;
        if let Some(i) = self.plan.pop_front() {
            self.index = i;
            let step = self.manifest.steps[i].clone();
            if step.requires.iter().any(|r| !self.completed.contains(r)) {
                self.fail("PREREQUISITE_REQUIRED");
                return;
            }
            for f in &step.fields {
                if f.shared {
                    if let Some(v) = self.context.get(&f.key) {
                        self.answers.insert(f.key.clone(), v.clone());
                    }
                }
            }
            self.status = if step
                .fields
                .iter()
                .any(|f| !self.answers.contains_key(&f.key))
            {
                "input"
            } else {
                "running"
            }
            .into();
        } else {
            self.status = if self.mode == "single" {
                "stopped"
            } else {
                "completed"
            }
            .into();
            if self.mode == "sequence" {
                self.index = self.manifest.steps.len();
            }
        }
        self.unsaved = true;
    }
    pub fn inputs(&mut self, token: u32, answers: Inputs) -> Result<()> {
        if token != self.token || self.status != "input" {
            return Err("STALE_INPUT".into());
        }
        let mut pending = self.answers.clone();
        for f in &self.step().unwrap().fields {
            let v = pending
                .get(&f.key)
                .or_else(|| answers.get(&f.key))
                .ok_or("INVALID_INPUT")?
                .clone();
            let valid = if f.r#type == "number" {
                v.as_f64().is_some_and(|n| {
                    n.is_finite() && n >= 0.0 && n <= u32::MAX as f64 && n.fract() == 0.0
                })
            } else {
                v.as_str()
                    .is_some_and(|s| s.len() <= 4096 && (!f.required || !s.trim().is_empty()))
            };
            if !valid {
                return Err("INVALID_INPUT".into());
            }
            pending.insert(f.key.clone(), v);
        }
        self.answers = pending;
        for f in &self.manifest.steps[self.index].fields {
            if f.shared {
                self.context
                    .insert(f.key.clone(), self.answers[&f.key].clone());
            }
        }
        self.status = "running".into();
        Ok(())
    }
    pub fn observe(&mut self, packet: &Packet, session: u32) -> Option<WorkerTask> {
        if self.status != "running" || self.pending.is_some() {
            return None;
        }
        let step = self.step()?;
        if packet.source != step.source
            || packet.channel != step.channel
            || !step.length.accepts(packet.body.len())
        {
            return None;
        }
        if let Some(probe) = &step.probe {
            if matches(probe, &packet.body, &self.answers) {
                self.commit(packet, Inputs::new(), None);
            }
            return None;
        }
        let task = WorkerTask {
            version: VERSION,
            session_id: session,
            run_id: self.run,
            input_generation: self.token,
            rule_pack_hash: self.manifest.hash.clone(),
            rule_id: step.name.clone(),
            packet_sequence: packet.sequence.to_string(),
            source_actor: packet.source_actor,
            target_actor: packet.target_actor,
            inputs: self.answers.clone(),
            context: self.context.clone(),
        };
        self.pending = Some(Pending {
            task: task.clone(),
            packet: packet.clone(),
            at: Instant::now(),
        });
        Some(task)
    }
    pub fn accept(&mut self, response: WorkerResult) -> bool {
        let Some(p) = &self.pending else {
            return false;
        };
        let t = &p.task;
        if response.version != VERSION
            || response.session_id != t.session_id
            || response.run_id != t.run_id
            || response.input_generation != t.input_generation
            || response.rule_pack_hash != t.rule_pack_hash
            || response.rule_id != t.rule_id
            || response.packet_sequence != t.packet_sequence
        {
            return false;
        }
        let p = self.pending.take().unwrap();
        if response.error {
            self.fail("WORKER_FAILED");
        } else if response.matched {
            let step = self.step().unwrap();
            if response.updates.iter().any(|(k, v)| {
                !step.produces.contains(k)
                    || !(v.as_u64().is_some_and(|n| n <= u32::MAX as u64)
                        || v.as_str().is_some_and(|s| s.len() <= 4096))
            }) {
                self.fail("INVALID_WORKER_RESULT");
            } else {
                self.commit(&p.packet, response.updates, response.base_offset);
            }
        }
        true
    }
    fn commit(&mut self, packet: &Packet, updates: Inputs, offset: Option<u16>) {
        let step = self.step().unwrap();
        if let Some((name, _)) = self.results.iter().find(|(name, r)| {
            **name != step.name && r.category == step.category && r.value == packet.opcode()
        }) {
            self.conflict = Some(name.clone());
            self.status = "conflict".into();
            self.pending = None;
            return;
        }
        let name = step.name.clone();
        self.results.insert(
            name.clone(),
            OpcodeResult {
                source: step.source.clone(),
                category: step.category.clone(),
                value: packet.opcode(),
                comment: offset.map(|n| format!("Base offset: 0x{n:04x}")),
            },
        );
        self.context.extend(updates);
        self.completed.insert(name);
        self.unsaved = true;
        self.next();
    }
    pub fn skip(&mut self) {
        self.next();
    }
    pub fn stop(&mut self, clear: bool) {
        self.status = "stopped".into();
        self.pending = None;
        self.token = self.token.wrapping_add(1);
        self.answers.clear();
        if clear {
            self.context.clear();
            self.completed.clear();
        }
        self.unsaved = true;
    }
    pub fn fail(&mut self, error: &str) {
        self.pending = None;
        self.status = "failed".into();
        self.error = error.into();
        self.token = self.token.wrapping_add(1);
    }
    pub fn check_timeout(&mut self) {
        if self
            .pending
            .as_ref()
            .is_some_and(|p| p.at.elapsed() > Duration::from_secs(5))
        {
            self.fail("WORKER_TIMEOUT");
        }
    }
    pub fn saved(&mut self) {
        self.unsaved = false;
        if self.error == "SAVE_FAILED" {
            self.error.clear();
            self.status = "stopped".into();
        }
    }
    pub fn persistent(&self) -> serde_json::Value {
        serde_json::json!({"version":VERSION,"hash":self.manifest.hash,"current":self.step().map(|s| &s.name),"results":self.results})
    }
    pub fn restore(&mut self, value: serde_json::Value) -> Result<()> {
        if value["version"] != VERSION || value["hash"] != self.manifest.hash {
            return Err("STATE_VERSION_MISMATCH".into());
        }
        let results: BTreeMap<String, OpcodeResult> =
            serde_json::from_value(value["results"].clone()).map_err(|_| "INVALID_STATE")?;
        let mut used = BTreeSet::new();
        for (name, r) in &results {
            let s = self
                .manifest
                .steps
                .iter()
                .find(|s| &s.name == name)
                .ok_or("INVALID_STATE")?;
            if s.source != r.source
                || s.category != r.category
                || !used.insert((&r.category, r.value))
                || r.comment.as_ref().is_some_and(|c| {
                    !c.strip_prefix("Base offset: 0x").is_some_and(|s| {
                        s.len() <= 4 && !s.is_empty() && s.bytes().all(|c| c.is_ascii_hexdigit())
                    })
                })
            {
                return Err("INVALID_STATE".into());
            }
        }
        self.index = match value["current"].as_str() {
            Some(name) => self
                .manifest
                .steps
                .iter()
                .position(|s| s.name == name)
                .ok_or("INVALID_STATE")?,
            None => self.manifest.steps.len(),
        };
        self.results = results;
        self.status = "stopped".into();
        Ok(())
    }
    pub fn export(&self) -> serde_json::Value {
        serde_json::json!(self
            .results
            .iter()
            .map(|(n, r)| serde_json::json!([n, format!("0x{:04x}", r.value), r.comment]))
            .collect::<Vec<_>>())
    }
}

#[cfg(test)]
mod tests;
