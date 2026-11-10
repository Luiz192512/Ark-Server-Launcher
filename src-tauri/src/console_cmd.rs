/// Sends Ctrl+C to the console of process `pid`.
///
/// The ARK server treats Ctrl+C as a request to save the world and quit.
/// (Typed commands are ignored by its console and a window close skips the
/// save, both checked against the real server.)
#[cfg(windows)]
pub fn send_ctrl_c(pid: u32) -> Result<(), String> {
    use windows_sys::Win32::System::Console::{
        ATTACH_PARENT_PROCESS, AttachConsole, CTRL_C_EVENT, FreeConsole, GenerateConsoleCtrlEvent,
        SetConsoleCtrlHandler,
    };

    // A process has one console at a time, so attaching must not overlap.
    static CONSOLE_LOCK: std::sync::Mutex<()> = std::sync::Mutex::new(());
    let _guard = CONSOLE_LOCK.lock().unwrap_or_else(|e| e.into_inner());

    // SAFETY: plain Win32 calls. This process ignores Ctrl+C while attached,
    // so the event only reaches the target, and the console is detached again
    // before returning, whatever happens in between.
    unsafe {
        FreeConsole();
        let result = if AttachConsole(pid) == 0 {
            Err(format!("could not attach to the console of pid {pid}"))
        } else {
            SetConsoleCtrlHandler(None, 1);
            let sent = GenerateConsoleCtrlEvent(CTRL_C_EVENT, 0);
            // Let the event be delivered before the console goes away.
            std::thread::sleep(std::time::Duration::from_millis(300));
            SetConsoleCtrlHandler(None, 0);
            if sent == 0 {
                Err("could not send Ctrl+C".to_string())
            } else {
                Ok(())
            }
        };
        FreeConsole();
        // Give the console back to the shell that started the CLI, if any.
        AttachConsole(ATTACH_PARENT_PROCESS);
        result
    }
}

#[cfg(not(windows))]
pub fn send_ctrl_c(_pid: u32) -> Result<(), String> {
    Err("Ctrl+C delivery is only supported on Windows".into())
}
