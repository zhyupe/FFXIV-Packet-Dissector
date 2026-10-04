use ffxiv_protocol::Result;
use std::{
    fs::{self, File, OpenOptions},
    io::Write,
    path::{Path, PathBuf},
};
pub struct Store {
    path: PathBuf,
    _lock: File,
}
impl Store {
    pub fn open(path: PathBuf) -> Result<Self> {
        fs::create_dir_all(path.parent().ok_or("SAVE_FAILED")?).map_err(|_| "SAVE_FAILED")?;
        let lock = OpenOptions::new()
            .create(true)
            .truncate(false)
            .read(true)
            .write(true)
            .open(path.with_extension("lock"))
            .map_err(|_| "SAVE_FAILED")?;
        lock.try_lock().map_err(|_| "PROFILE_IN_USE")?;
        Ok(Self { path, _lock: lock })
    }
    pub fn read(&self) -> Result<Option<serde_json::Value>> {
        match fs::metadata(&self.path) {
            Err(e) if e.kind() == std::io::ErrorKind::NotFound => Ok(None),
            Ok(m) if m.len() <= 1024 * 1024 => {
                let bytes = fs::read(&self.path).map_err(|_| "STATE_READ_FAILED")?;
                Ok(Some(
                    serde_json::from_slice(&bytes).map_err(|_| "INVALID_STATE")?,
                ))
            }
            _ => Err("STATE_READ_FAILED".into()),
        }
    }
    pub fn save(&self, value: &serde_json::Value) -> Result<()> {
        atomic_write(
            &self.path,
            &serde_json::to_vec_pretty(value).map_err(|_| "SAVE_FAILED")?,
        )
    }
}
pub fn atomic_write(path: &Path, bytes: &[u8]) -> Result<()> {
    let temporary = path.with_extension(format!("{}.tmp", std::process::id()));
    let result = (|| -> std::io::Result<()> {
        let mut file = OpenOptions::new()
            .create(true)
            .truncate(true)
            .write(true)
            .open(&temporary)?;
        file.write_all(bytes)?;
        file.sync_all()?;
        drop(file);
        replace(&temporary, path)?;
        #[cfg(unix)]
        File::open(path.parent().unwrap())?.sync_all()?;
        Ok(())
    })();
    if result.is_err() {
        let _ = fs::remove_file(&temporary);
        return Err("SAVE_FAILED".into());
    }
    Ok(())
}
#[cfg(not(windows))]
fn replace(from: &Path, to: &Path) -> std::io::Result<()> {
    fs::rename(from, to)
}
#[cfg(windows)]
fn replace(from: &Path, to: &Path) -> std::io::Result<()> {
    use std::os::windows::ffi::OsStrExt;
    use windows_sys::Win32::Storage::FileSystem::{
        MoveFileExW, MOVEFILE_REPLACE_EXISTING, MOVEFILE_WRITE_THROUGH,
    };
    let from: Vec<_> = from.as_os_str().encode_wide().chain(Some(0)).collect();
    let to: Vec<_> = to.as_os_str().encode_wide().chain(Some(0)).collect();
    if unsafe {
        MoveFileExW(
            from.as_ptr(),
            to.as_ptr(),
            MOVEFILE_REPLACE_EXISTING | MOVEFILE_WRITE_THROUGH,
        )
    } == 0
    {
        Err(std::io::Error::last_os_error())
    } else {
        Ok(())
    }
}
#[cfg(test)]
mod tests {
    use super::*;
    #[test]
    fn lock_and_replace() {
        let dir = std::env::temp_dir().join(format!("ffxiv-store-test-{}", std::process::id()));
        fs::create_dir_all(&dir).unwrap();
        let path = dir.join("state.json");
        let store = Store::open(path.clone()).unwrap();
        assert!(Store::open(path).is_err());
        store.save(&serde_json::json!({"count":1})).unwrap();
        store.save(&serde_json::json!({"count":2})).unwrap();
        assert_eq!(store.read().unwrap().unwrap()["count"], 2);
        drop(store);
        fs::remove_dir_all(dir).unwrap();
    }
}
