use super::*;
use std::{
    ffi::c_void,
    mem::{size_of, zeroed},
    os::windows::ffi::OsStrExt,
    ptr::{null, null_mut},
};
use windows_sys::Win32::{
    Foundation::*,
    System::{
        Diagnostics::{Debug::WriteProcessMemory, ToolHelp::*},
        LibraryLoader::*,
        Memory::*,
        Threading::*,
    },
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
fn wide(s: &std::ffi::OsStr) -> Vec<u16> {
    s.encode_wide().chain(Some(0)).collect()
}
unsafe fn open(pid: u32, rights: u32) -> Result<Handle> {
    let h = OpenProcess(rights, 0, pid);
    if h.is_null() {
        Err("PROCESS_ACCESS_FAILED".into())
    } else {
        Ok(Handle(h))
    }
}
unsafe fn describe(h: HANDLE, pid: u32) -> Result<GameProcess> {
    let (mut created, mut exited, mut kernel, mut user) = (zeroed(), zeroed(), zeroed(), zeroed());
    if GetProcessTimes(h, &mut created, &mut exited, &mut kernel, &mut user) == 0 {
        return Err("PROCESS_QUERY_FAILED".into());
    }
    let started_at =
        (((created.dwHighDateTime as u64) << 32) | created.dwLowDateTime as u64).to_string();
    let mut path = vec![0u16; 32768];
    let mut size = path.len() as u32;
    if QueryFullProcessImageNameW(h, 0, path.as_mut_ptr(), &mut size) == 0 {
        return Err("PROCESS_QUERY_FAILED".into());
    }
    let executable = String::from_utf16_lossy(&path[..size as usize]);
    let p = Path::new(&executable);
    if !p
        .file_name()
        .is_some_and(|n| n.to_string_lossy().eq_ignore_ascii_case("ffxiv_dx11.exe"))
    {
        return Err("INVALID_TARGET".into());
    }
    let version = p
        .parent()
        .and_then(|p| std::fs::read_to_string(p.join("ffxivgame.ver")).ok())
        .map(|s| s.trim().to_owned())
        .unwrap_or_else(|| "unknown".into());
    Ok(GameProcess {
        pid,
        started_at,
        executable,
        version,
    })
}
pub fn inspect(target: &Target) -> Result<GameProcess> {
    unsafe {
        let h = open(target.pid, PROCESS_QUERY_LIMITED_INFORMATION)?;
        let p = describe(h.0, target.pid)?;
        if p.started_at != target.started_at {
            return Err("PROCESS_CHANGED_OR_EXITED".into());
        }
        Ok(p)
    }
}
pub fn list() -> Result<Vec<GameProcess>> {
    unsafe {
        let snap = CreateToolhelp32Snapshot(TH32CS_SNAPPROCESS, 0);
        if snap == INVALID_HANDLE_VALUE {
            return Err("PROCESS_QUERY_FAILED".into());
        }
        let snap = Handle(snap);
        let mut entry: PROCESSENTRY32W = zeroed();
        entry.dwSize = size_of::<PROCESSENTRY32W>() as u32;
        let mut result = vec![];
        let mut valid = Process32FirstW(snap.0, &mut entry);
        while valid != 0 {
            let name = String::from_utf16_lossy(
                &entry.szExeFile[..entry
                    .szExeFile
                    .iter()
                    .position(|n| *n == 0)
                    .unwrap_or(entry.szExeFile.len())],
            );
            if name.eq_ignore_ascii_case("ffxiv_dx11.exe") {
                if let Ok(h) = open(entry.th32ProcessID, PROCESS_QUERY_LIMITED_INFORMATION) {
                    if let Ok(p) = describe(h.0, entry.th32ProcessID) {
                        result.push(p);
                    }
                }
            }
            valid = Process32NextW(snap.0, &mut entry);
        }
        result.sort_by_key(|p| p.pid);
        Ok(result)
    }
}
struct Allocation {
    process: Handle,
    ptr: *mut c_void,
}
unsafe impl Send for Allocation {}
impl Drop for Allocation {
    fn drop(&mut self) {
        unsafe {
            VirtualFreeEx(self.process.0, self.ptr, 0, MEM_RELEASE);
        }
    }
}
/// Resolve the owning module as exports may be forwarded to KernelBase.
unsafe fn remote_loader(pid: u32) -> Result<unsafe extern "system" fn(*mut c_void) -> u32> {
    let kernel = GetModuleHandleW(wide(std::ffi::OsStr::new("kernel32.dll")).as_ptr());
    let function =
        GetProcAddress(kernel, c"LoadLibraryW".as_ptr() as _).ok_or("INJECTION_FAILED")?;
    let address = function as *const () as usize;
    let mut owner = null_mut();
    if GetModuleHandleExW(
        GET_MODULE_HANDLE_EX_FLAG_FROM_ADDRESS | GET_MODULE_HANDLE_EX_FLAG_UNCHANGED_REFCOUNT,
        address as *const u16,
        &mut owner,
    ) == 0
    {
        return Err("INJECTION_FAILED".into());
    }
    let mut path = vec![0u16; 32768];
    let n = GetModuleFileNameW(owner, path.as_mut_ptr(), path.len() as u32);
    let owner_path = String::from_utf16_lossy(&path[..n as usize]);
    let name = Path::new(&owner_path)
        .file_name()
        .ok_or("INJECTION_FAILED")?
        .to_string_lossy();
    let snap = CreateToolhelp32Snapshot(TH32CS_SNAPMODULE, pid);
    if snap == INVALID_HANDLE_VALUE {
        return Err("INJECTION_FAILED".into());
    }
    let snap = Handle(snap);
    let mut entry: MODULEENTRY32W = zeroed();
    entry.dwSize = size_of::<MODULEENTRY32W>() as u32;
    let mut valid = Module32FirstW(snap.0, &mut entry);
    while valid != 0 {
        let module = String::from_utf16_lossy(
            &entry.szModule[..entry
                .szModule
                .iter()
                .position(|v| *v == 0)
                .unwrap_or(entry.szModule.len())],
        );
        if module.eq_ignore_ascii_case(&name) {
            return Ok(std::mem::transmute::<
                usize,
                unsafe extern "system" fn(*mut c_void) -> u32,
            >(
                entry.modBaseAddr as usize + address - owner as usize
            ));
        }
        valid = Module32NextW(snap.0, &mut entry);
    }
    Err("INJECTION_FAILED".into())
}
pub fn inject(target: &Target, dll: &Path) -> Result<()> {
    verify_dll(dll)?;
    let path = std::fs::canonicalize(dll).map_err(|_| "DLL_READ_FAILED")?;
    unsafe {
        let process = open(
            target.pid,
            PROCESS_QUERY_INFORMATION
                | PROCESS_CREATE_THREAD
                | PROCESS_VM_OPERATION
                | PROCESS_VM_WRITE
                | PROCESS_VM_READ
                | PROCESS_SYNCHRONIZE,
        )?;
        if describe(process.0, target.pid)?.started_at != target.started_at {
            return Err("PROCESS_CHANGED_OR_EXITED".into());
        }
        let path = wide(path.as_os_str());
        let bytes = path.len() * 2;
        let loader = remote_loader(target.pid)?;
        let ptr = VirtualAllocEx(
            process.0,
            null(),
            bytes,
            MEM_RESERVE | MEM_COMMIT,
            PAGE_READWRITE,
        );
        if ptr.is_null() {
            return Err("INJECTION_FAILED".into());
        }
        let allocation = Allocation { process, ptr };
        let mut written = 0;
        if WriteProcessMemory(
            allocation.process.0,
            ptr,
            path.as_ptr() as _,
            bytes,
            &mut written,
        ) == 0
            || written != bytes
        {
            return Err("INJECTION_FAILED".into());
        }
        let thread = CreateRemoteThread(
            allocation.process.0,
            null(),
            0,
            Some(loader),
            ptr,
            0,
            null_mut(),
        );
        if thread.is_null() {
            return Err("INJECTION_FAILED".into());
        }
        let thread = Handle(thread);
        if WaitForSingleObject(thread.0, 10000) != WAIT_OBJECT_0 {
            // LoadLibrary may still read the argument. A detached reaper owns it until completion.
            std::thread::spawn(move || {
                WaitForSingleObject(thread.0, INFINITE);
                drop(thread);
                drop(allocation);
            });
            return Err("INJECTION_TIMEOUT".into());
        }
        // Readiness is determined by the protocol handshake, not a truncated HMODULE exit code.
        Ok(())
    }
}
