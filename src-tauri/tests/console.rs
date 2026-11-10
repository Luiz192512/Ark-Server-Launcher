//! Ctrl+C delivery to another process, with a fake server that owns its own
//! console window, like the real one.

#![cfg(windows)]

use enz_launcher_lib::console_cmd::send_ctrl_c;
use enz_launcher_lib::shutdown::{ShutdownOutcome, graceful_shutdown_within};
use std::os::windows::process::CommandExt;
use std::path::{Path, PathBuf};
use std::process::{Child, Command, Stdio};
use std::sync::Mutex;
use std::time::{Duration, Instant};

/// A console without a window, which is how the launcher starts the server.
const CREATE_NO_WINDOW: u32 = 0x0800_0000;

/// The console is process-wide state, so these tests run one at a time.
static SERIAL: Mutex<()> = Mutex::new(());

/// Kills the fake server even when an assertion fails first.
struct Fake(Child);

impl Drop for Fake {
    fn drop(&mut self) {
        let _ = self.0.kill();
        let _ = self.0.wait();
    }
}

fn temp_dir(tag: &str) -> PathBuf {
    let dir = std::env::temp_dir().join(format!("enz-console-{}-{tag}", std::process::id()));
    let _ = std::fs::remove_dir_all(&dir);
    std::fs::create_dir_all(&dir).unwrap();
    dir
}

/// A fake server that writes `save_file` when it gets Ctrl+C, then quits.
fn spawn_fake(dir: &Path, save_file: &Path) -> Fake {
    let exe = dir.join("fake_server.exe");
    std::fs::copy(env!("CARGO_BIN_EXE_fake_server"), &exe).unwrap();
    let ready = dir.join("ready.txt");
    let child = Command::new(exe)
        .args(["--on-ctrl-c-save", &save_file.to_string_lossy()])
        .args(["--ready-file", &ready.to_string_lossy()])
        .creation_flags(CREATE_NO_WINDOW)
        .stdin(Stdio::null())
        .stdout(Stdio::null())
        .stderr(Stdio::null())
        .spawn()
        .unwrap();
    let fake = Fake(child);
    assert!(
        wait_for(Duration::from_secs(10), || ready.is_file()),
        "the fake server never became ready"
    );
    fake
}

fn wait_for(limit: Duration, mut check: impl FnMut() -> bool) -> bool {
    let deadline = Instant::now() + limit;
    while Instant::now() < deadline {
        if check() {
            return true;
        }
        std::thread::sleep(Duration::from_millis(100));
    }
    false
}

#[test]
fn ctrl_c_reaches_the_other_process_and_it_quits() {
    let _serial = SERIAL.lock().unwrap_or_else(|e| e.into_inner());
    let dir = temp_dir("ctrlc");
    let save = dir.join("saved.txt");
    let mut fake = spawn_fake(&dir, &save);

    send_ctrl_c(fake.0.id()).expect("console must accept Ctrl+C");

    assert!(
        wait_for(Duration::from_secs(5), || fake
            .0
            .try_wait()
            .unwrap()
            .is_some()),
        "the fake server did not quit on Ctrl+C"
    );
    assert!(save.is_file(), "the fake server did not run its save");
}

#[test]
fn graceful_shutdown_reports_the_save_the_server_makes() {
    let _serial = SERIAL.lock().unwrap_or_else(|e| e.into_inner());
    let dir = temp_dir("shutdown");
    let saves = dir.join("ShooterGame/Saved/SavedArks");
    std::fs::create_dir_all(&saves).unwrap();
    std::fs::write(saves.join("TheIsland.ark"), b"old world").unwrap();
    std::thread::sleep(Duration::from_millis(50));
    let mut fake = spawn_fake(&dir, &saves.join("TheIsland.ark"));

    let outcome = graceful_shutdown_within(fake.0.id(), &dir, Duration::from_secs(5));

    assert_eq!(outcome, ShutdownOutcome::Saved);
    assert!(
        wait_for(Duration::from_secs(5), || fake
            .0
            .try_wait()
            .unwrap()
            .is_some()),
        "the fake server did not quit"
    );
}

#[test]
#[ignore = "needs a real desktop: the test harness may run without a visible console window"]
fn a_visible_console_window_is_hidden_and_the_console_still_works() {
    use enz_launcher_lib::console_window::hide_console_windows;
    const CREATE_NEW_CONSOLE: u32 = 0x10;
    let _serial = SERIAL.lock().unwrap_or_else(|e| e.into_inner());
    let dir = temp_dir("hide");
    let save = dir.join("saved.txt");
    let exe = dir.join("fake_server.exe");
    std::fs::copy(env!("CARGO_BIN_EXE_fake_server"), &exe).unwrap();
    // A console WITH a window, like the real server creates for itself.
    let mut fake = Fake(
        Command::new(exe)
            .args(["--on-ctrl-c-save", &save.to_string_lossy()])
            .creation_flags(CREATE_NEW_CONSOLE)
            .stdin(Stdio::null())
            .stdout(Stdio::null())
            .stderr(Stdio::null())
            .spawn()
            .unwrap(),
    );
    let pid = fake.0.id();

    assert!(
        wait_for(Duration::from_secs(10), || hide_console_windows(pid) > 0),
        "no console window to hide"
    );
    assert_eq!(hide_console_windows(pid), 0, "the window is still visible");

    // Hidden, but the console is alive: Ctrl+C still reaches the process.
    std::thread::sleep(Duration::from_millis(1000));
    send_ctrl_c(pid).expect("a hidden console must still accept Ctrl+C");
    assert!(
        wait_for(Duration::from_secs(5), || fake
            .0
            .try_wait()
            .unwrap()
            .is_some()),
        "the fake server did not quit on Ctrl+C"
    );
    assert!(save.is_file());
}

#[test]
fn an_unknown_pid_cannot_be_attached() {
    let _serial = SERIAL.lock().unwrap_or_else(|e| e.into_inner());
    assert!(send_ctrl_c(u32::MAX - 1).is_err());
}
