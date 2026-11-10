//! The ARK server opens its own console window even when it is started
//! without `-log` and with `CREATE_NO_WINDOW`. The launcher hides it right
//! after it appears. Hiding keeps the console alive, so Ctrl+C still works.

/// Hides the visible console window of process `pid`. Returns how many
/// it hid, so a caller can tell the window has not appeared yet (0).
#[cfg(windows)]
pub fn hide_console_windows(pid: u32) -> usize {
    use windows_sys::Win32::Foundation::{HWND, LPARAM};
    use windows_sys::Win32::UI::WindowsAndMessaging::{
        EnumWindows, GetClassNameW, GetWindowTextW, GetWindowThreadProcessId, IsWindowVisible,
        SW_HIDE, ShowWindow,
    };

    struct Search {
        pid: u32,
        hidden: usize,
    }

    fn text(read: impl FnOnce(*mut u16, i32) -> i32) -> String {
        let mut buf = [0u16; 260];
        let len = read(buf.as_mut_ptr(), buf.len() as i32);
        String::from_utf16_lossy(&buf[..len.max(0) as usize])
    }

    // SAFETY: called by EnumWindows on this thread with the `Search` we pass
    // in `lparam`, which outlives the call.
    unsafe extern "system" fn visit(hwnd: HWND, lparam: LPARAM) -> i32 {
        let search = unsafe { &mut *(lparam as *mut Search) };
        if unsafe { IsWindowVisible(hwnd) } == 0 {
            return 1;
        }
        let class = text(|p, n| unsafe { GetClassNameW(hwnd, p, n) });
        let mut owner = 0u32;
        unsafe { GetWindowThreadProcessId(hwnd, &mut owner) };
        // Classic conhost: the window belongs to the server process.
        // Windows Terminal (the Windows 11 default) opens a window owned by WindowsTerminal.exe
        // titled with the server's path, so match that one by title.
        let ours = (class == "ConsoleWindowClass" && owner == search.pid)
            || (class == "CASCADIA_HOSTING_WINDOW_CLASS"
                && text(|p, n| unsafe { GetWindowTextW(hwnd, p, n) })
                    .to_lowercase()
                    .contains("shootergame"));
        if ours {
            unsafe { ShowWindow(hwnd, SW_HIDE) };
            search.hidden += 1;
        }
        1
    }

    let mut search = Search { pid, hidden: 0 };
    // SAFETY: `search` lives for the whole call.
    unsafe { EnumWindows(Some(visit), &mut search as *mut Search as LPARAM) };
    search.hidden
}

#[cfg(not(windows))]
pub fn hide_console_windows(_pid: u32) -> usize {
    0
}
