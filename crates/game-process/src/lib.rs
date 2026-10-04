use ffxiv_protocol::{GameProcess, Result, Target};
use sha2::{Digest, Sha256};
use std::path::Path;
pub const DLL_HASH: &str = "326be4db261064ebb51b8c46d2940f55701d79887e2c65070aff00de4c8c65ef";
pub fn verify_dll(path: &Path) -> Result<()> {
    let bytes = std::fs::read(path).map_err(|_| "DLL_READ_FAILED")?;
    if format!("{:x}", Sha256::digest(bytes)) != DLL_HASH {
        return Err("DLL_HASH_MISMATCH".into());
    }
    Ok(())
}
#[cfg(windows)]
mod windows;
#[cfg(windows)]
pub use windows::{inject, inspect, list};
#[cfg(not(windows))]
pub fn list() -> Result<Vec<GameProcess>> {
    Ok(vec![])
}
#[cfg(not(windows))]
pub fn inspect(_: &Target) -> Result<GameProcess> {
    Err("WINDOWS_REQUIRED".into())
}
#[cfg(not(windows))]
pub fn inject(_: &Target, _: &Path) -> Result<()> {
    Err("WINDOWS_REQUIRED".into())
}
