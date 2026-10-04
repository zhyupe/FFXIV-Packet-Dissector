#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]
use ffxiv_app_core::App;
use ffxiv_protocol::Manifest;
use serde_json::Value;
use std::{
    path::PathBuf,
    sync::{
        atomic::{AtomicBool, Ordering},
        Arc, Mutex,
    },
};
use tauri::{
    ipc::{Channel, Response},
    Emitter, Manager, State,
};
use tauri_plugin_dialog::DialogExt;
struct Host {
    app: App,
    worker: Arc<Mutex<Option<Channel<Response>>>>,
    closing: Arc<AtomicBool>,
}
#[tauri::command]
async fn service_request(
    action: String,
    params: Value,
    session_id: u32,
    state: State<'_, Host>,
) -> Result<Value, String> {
    if !params.is_object()
        || serde_json::to_vec(&params)
            .map_err(|_| "INVALID_INPUT")?
            .len()
            > 512 * 1024
    {
        return Err("INVALID_INPUT".into());
    }
    state.app.request(&action, params, session_id).await
}
#[tauri::command]
fn attach_worker(channel: Channel<Response>, state: State<'_, Host>) {
    *state.worker.lock().unwrap() = Some(channel);
}
#[tauri::command]
async fn export_results(
    app: tauri::AppHandle,
    session_id: u32,
    state: State<'_, Host>,
) -> Result<bool, String> {
    let value = state
        .app
        .request("wizard.export", serde_json::json!({}), session_id)
        .await?;
    let (tx, rx) = tokio::sync::oneshot::channel();
    app.dialog()
        .file()
        .set_file_name("opcode.json")
        .add_filter("JSON", &["json"])
        .save_file(move |path| {
            let _ = tx.send(path);
        });
    let Some(path) = rx.await.map_err(|_| "DIALOG_FAILED")? else {
        return Ok(false);
    };
    let path = path.into_path().map_err(|_| "INVALID_PATH")?;
    tokio::task::spawn_blocking(move || {
        ffxiv_app_core::storage::atomic_write(
            &path,
            &serde_json::to_vec_pretty(&value).map_err(|_| "SAVE_FAILED")?,
        )
    })
    .await
    .map_err(|_| "SAVE_FAILED")??;
    Ok(true)
}
#[tauri::command]
async fn open_wireshark(app: tauri::AppHandle, state: State<'_, Host>) -> Result<(), String> {
    let snapshot = state.app.snapshots.borrow().clone();
    if !snapshot.forwarder.running || snapshot.forwarder.mode != "pipe" {
        return Err("OUTPUT_NOT_RUNNING".into());
    }
    let path = find_wireshark();
    let path = if let Some(path) = path {
        path
    } else {
        let (tx, rx) = tokio::sync::oneshot::channel();
        app.dialog()
            .file()
            .add_filter("Wireshark", &["exe"])
            .pick_file(move |path| {
                let _ = tx.send(path);
            });
        rx.await
            .map_err(|_| "DIALOG_FAILED")?
            .ok_or("CANCELLED")?
            .into_path()
            .map_err(|_| "INVALID_PATH")?
    };
    if !path
        .file_name()
        .is_some_and(|s| s.to_string_lossy().eq_ignore_ascii_case("wireshark.exe"))
    {
        return Err("INVALID_WIRESHARK".into());
    }
    // Only fixed capture arguments; never invoke a shell.
    let mut child = std::process::Command::new(path)
        .args(["-k", "-i", &snapshot.forwarder.pipe])
        .spawn()
        .map_err(|_| "WIRESHARK_START_FAILED")?;
    std::thread::spawn(move || {
        let _ = child.wait();
    });
    Ok(())
}
fn find_wireshark() -> Option<PathBuf> {
    ["ProgramFiles", "ProgramW6432"]
        .iter()
        .filter_map(std::env::var_os)
        .map(|p| PathBuf::from(p).join("Wireshark/Wireshark.exe"))
        .find(|p| p.is_file())
}
fn main() {
    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .setup(|app| {
            // Enter Tauri's runtime; the core itself never creates a nested runtime.
            let resource = app.path().resource_dir()?;
            let manifest: Manifest =
                serde_json::from_str(include_str!("../../../wizard/generated/manifest.json"))?;
            let dll = resource.join("extcap/ffxiv-resources/deucalion.dll");
            let data = app.path().app_data_dir()?;
            let (core, mut jobs) =
                tauri::async_runtime::block_on(async { App::start(manifest, data, dll) })
                    .map_err(std::io::Error::other)?;
            let worker: Arc<Mutex<Option<Channel<Response>>>> = Arc::new(Mutex::new(None));
            let target = worker.clone();
            let core_copy = core.clone();
            tauri::async_runtime::spawn(async move {
                while let Some(bytes) = jobs.recv().await {
                    let failed = target
                        .lock()
                        .unwrap()
                        .as_ref()
                        .is_none_or(|c| c.send(Response::new(bytes)).is_err());
                    if failed {
                        let session = core_copy.snapshots.borrow().session_id;
                        let _ = core_copy
                            .request("worker.failed", serde_json::json!({}), session)
                            .await;
                    }
                }
            });
            let handle = app.handle().clone();
            let mut snapshots = core.snapshots.clone();
            tauri::async_runtime::spawn(async move {
                while snapshots.changed().await.is_ok() {
                    let snapshot = snapshots.borrow().clone();
                    let _ = handle.emit("service-state", snapshot);
                }
            });
            app.manage(Host {
                app: core,
                worker,
                closing: Arc::new(AtomicBool::new(false)),
            });
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            service_request,
            attach_worker,
            export_results,
            open_wireshark
        ])
        .on_window_event(|window, event| {
            if let tauri::WindowEvent::CloseRequested { api, .. } = event {
                api.prevent_close();
                let host = window.state::<Host>();
                if host.closing.swap(true, Ordering::SeqCst) {
                    return;
                }
                let core = host.app.clone();
                let closing = host.closing.clone();
                let handle = window.app_handle().clone();
                tauri::async_runtime::spawn(async move {
                    let session = core.snapshots.borrow().session_id;
                    match core
                        .request("shutdown", serde_json::json!({}), session)
                        .await
                    {
                        Ok(_) => handle.exit(0),
                        Err(code) => {
                            closing.store(false, Ordering::SeqCst);
                            let _ = handle.emit("service-error", code);
                        }
                    }
                });
            }
        })
        .run(tauri::generate_context!())
        .expect("Desktop initialization failed");
}
