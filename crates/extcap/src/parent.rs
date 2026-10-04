//! Wireshark owns the helper lifetime even if capture is idle when its parent exits.
#[cfg(windows)]
pub async fn exited() {
    use std::mem::{size_of, zeroed};
    use windows_sys::Win32::{
        Foundation::*,
        System::{Diagnostics::ToolHelp::*, Threading::*},
    };
    struct Handle(HANDLE);
    unsafe impl Send for Handle {}
    impl Drop for Handle {
        fn drop(&mut self) {
            unsafe {
                CloseHandle(self.0);
            }
        }
    }
    let parent = unsafe {
        let snapshot = CreateToolhelp32Snapshot(TH32CS_SNAPPROCESS, 0);
        if snapshot == INVALID_HANDLE_VALUE {
            return;
        }
        let snapshot = Handle(snapshot);
        let mut entry: PROCESSENTRY32W = zeroed();
        entry.dwSize = size_of::<PROCESSENTRY32W>() as u32;
        let mut found = Process32FirstW(snapshot.0, &mut entry);
        let mut pid = 0;
        while found != 0 {
            if entry.th32ProcessID == GetCurrentProcessId() {
                pid = entry.th32ParentProcessID;
                break;
            }
            found = Process32NextW(snapshot.0, &mut entry);
        }
        let handle = OpenProcess(PROCESS_SYNCHRONIZE, 0, pid);
        if handle.is_null() {
            return;
        }
        Handle(handle)
    };
    loop {
        if unsafe { WaitForSingleObject(parent.0, 0) } != WAIT_TIMEOUT {
            return;
        }
        tokio::time::sleep(std::time::Duration::from_millis(250)).await;
    }
}
#[cfg(not(windows))]
pub async fn exited() {
    std::future::pending::<()>().await;
}
