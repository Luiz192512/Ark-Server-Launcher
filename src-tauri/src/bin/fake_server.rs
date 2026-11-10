//! Stand-in for ShooterGameServer.exe, used only by the tests.
//! Flags: --ready-after-ms N, --exit-after-ms N (default: never exit),
//! --bind-port P (opens UDP port P once ready, like the real server),
//! --on-ctrl-c-save FILE (on Ctrl+C writes FILE, like the real server saving
//! its world, then quits).

use std::io::Write;
use std::net::UdpSocket;
use std::sync::OnceLock;
use std::time::Duration;
use std::{env, thread};

static SAVE_FILE: OnceLock<String> = OnceLock::new();

fn flag(args: &[String], name: &str) -> Option<u64> {
    text_flag(args, name).and_then(|v| v.parse().ok())
}

fn text_flag(args: &[String], name: &str) -> Option<String> {
    args.iter()
        .position(|a| a == name)
        .and_then(|i| args.get(i + 1))
        .cloned()
}

fn say(text: &str) {
    println!("{text}");
    let _ = std::io::stdout().flush();
}

#[cfg(windows)]
unsafe extern "system" fn on_ctrl(_kind: u32) -> i32 {
    if let Some(path) = SAVE_FILE.get() {
        let _ = std::fs::write(path, b"saved by ctrl+c");
    }
    std::process::exit(0);
}

#[cfg(windows)]
fn handle_ctrl_c() {
    use windows_sys::Win32::System::Console::SetConsoleCtrlHandler;
    // SAFETY: registers a plain handler that only writes a file and exits.
    unsafe {
        SetConsoleCtrlHandler(Some(on_ctrl), 1);
    }
}

#[cfg(not(windows))]
fn handle_ctrl_c() {}

fn main() {
    let args: Vec<String> = env::args().collect();
    say("fake server booting");
    if let Some(path) = text_flag(&args, "--on-ctrl-c-save") {
        let _ = SAVE_FILE.set(path);
        handle_ctrl_c();
    }
    // Tells a test that the Ctrl+C handler is installed and the console is up.
    if let Some(path) = text_flag(&args, "--ready-file") {
        let _ = std::fs::write(path, b"ready");
    }
    thread::sleep(Duration::from_millis(
        flag(&args, "--ready-after-ms").unwrap_or(100),
    ));
    let _socket =
        flag(&args, "--bind-port").and_then(|p| UdpSocket::bind(("0.0.0.0", p as u16)).ok());
    say("Server has completed startup and is now advertising for join.");
    match flag(&args, "--exit-after-ms") {
        Some(ms) => thread::sleep(Duration::from_millis(ms)),
        None => loop {
            thread::sleep(Duration::from_secs(1));
        },
    }
}
