#[cfg(windows)]
mod platform {
    use std::{io, mem, os::windows::io::AsRawHandle, process::Child};
    use windows_sys::Win32::{
        Foundation::{CloseHandle, HANDLE},
        System::JobObjects::*,
    };
    pub struct Job(HANDLE);
    unsafe impl Send for Job {}
    unsafe impl Sync for Job {}
    impl Job {
        pub fn attach(child: &Child) -> io::Result<Self> {
            unsafe {
                let handle = CreateJobObjectW(std::ptr::null(), std::ptr::null());
                if handle.is_null() {
                    return Err(io::Error::last_os_error());
                }
                let job = Job(handle);
                let mut limits: JOBOBJECT_EXTENDED_LIMIT_INFORMATION = mem::zeroed();
                limits.BasicLimitInformation.LimitFlags = JOB_OBJECT_LIMIT_KILL_ON_JOB_CLOSE;
                if SetInformationJobObject(
                    handle,
                    JobObjectExtendedLimitInformation,
                    &limits as *const _ as _,
                    mem::size_of_val(&limits) as u32,
                ) == 0
                    || AssignProcessToJobObject(handle, child.as_raw_handle() as HANDLE) == 0
                {
                    return Err(io::Error::last_os_error());
                }
                Ok(job)
            }
        }
    }
    impl Drop for Job {
        fn drop(&mut self) {
            unsafe {
                CloseHandle(self.0);
            }
        }
    }
}
#[cfg(not(windows))]
mod platform {
    use std::{io, process::Child};
    pub struct Job;
    impl Job {
        pub fn attach(_: &Child) -> io::Result<Self> {
            Ok(Self)
        }
    }
}
pub use platform::Job;

#[cfg(all(test, windows))]
mod tests {
    use super::Job;
    use std::{
        path::PathBuf,
        process::Command,
        thread,
        time::{Duration, Instant},
    };

    #[test]
    fn closing_job_terminates_backend() {
        let node = PathBuf::from(env!("CARGO_MANIFEST_DIR")).join("resources/node.exe");
        let mut child = Command::new(node)
            .args(["-e", "setInterval(() => {}, 1000)"])
            .spawn()
            .expect("prepare:runtime must run before Windows tests");
        let job = match Job::attach(&child) {
            Ok(job) => job,
            Err(error) => {
                let _ = child.kill();
                let _ = child.wait();
                panic!("Job attachment failed: {error}");
            }
        };
        drop(job);
        let deadline = Instant::now() + Duration::from_secs(5);
        while child.try_wait().unwrap().is_none() {
            if Instant::now() >= deadline {
                let _ = child.kill();
                let _ = child.wait();
                panic!("Backend survived job closure");
            }
            thread::sleep(Duration::from_millis(10));
        }
    }
}
