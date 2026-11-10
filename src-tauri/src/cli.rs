use crate::config;
use crate::console_window;
use crate::launch::server_exe;
use crate::ports::udp_port_is_free;
use crate::process;
use crate::service::{PlanError, plan_start};
use crate::shutdown;
use std::path::PathBuf;
use std::process::Command;
use std::time::{Duration, Instant};

pub const EXIT_OK: i32 = 0;
pub const EXIT_ERROR: i32 = 1;
pub const EXIT_ALREADY_RUNNING: i32 = 2;
pub const EXIT_NOT_RUNNING: i32 = 3;
pub const EXIT_PORT_IN_USE: i32 = 4;
pub const EXIT_MAP_UNAVAILABLE: i32 = 5;

#[derive(Debug, PartialEq)]
pub enum CliCommand {
    Start { map: String },
    Stop,
    Status,
}

/// `Ok(None)` means no CLI flag was given and the GUI should open.
pub fn parse(args: &[String]) -> Result<Option<CliCommand>, String> {
    let has = |flag: &str| args.iter().any(|a| a == flag);
    let map = args
        .iter()
        .position(|a| a == "--map")
        .map(|i| args.get(i + 1).cloned().ok_or("--map needs a map id"))
        .transpose()?;
    match (has("--start"), has("--stop"), has("--status")) {
        (true, false, false) => match map {
            Some(map) => Ok(Some(CliCommand::Start { map })),
            None => Err("--start needs --map <id>".into()),
        },
        (false, true, false) => Ok(Some(CliCommand::Stop)),
        (false, false, true) => Ok(Some(CliCommand::Status)),
        (false, false, false) => Ok(None),
        _ => Err("use only one of --start, --stop, --status".into()),
    }
}

#[cfg(windows)]
fn attach_parent_console() {
    use windows_sys::Win32::System::Console::{ATTACH_PARENT_PROCESS, AttachConsole};
    unsafe {
        AttachConsole(ATTACH_PARENT_PROCESS);
    }
}

#[cfg(not(windows))]
fn attach_parent_console() {}

/// Runs the CLI when flags are present. Returns the process exit code.
pub fn try_run(args: Vec<String>) -> Option<i32> {
    match parse(&args) {
        Ok(None) => None,
        Err(msg) => {
            attach_parent_console();
            eprintln!("error: {msg}");
            Some(EXIT_ERROR)
        }
        Ok(Some(cmd)) => {
            attach_parent_console();
            Some(execute(cmd))
        }
    }
}

fn load_settings() -> Result<config::Settings, String> {
    config::load(&config::default_path()).map_err(|e| format!("settings unreadable: {e}"))
}

fn execute(cmd: CliCommand) -> i32 {
    let settings = match load_settings() {
        Ok(s) => s,
        Err(msg) => {
            eprintln!("error: {msg}");
            return EXIT_ERROR;
        }
    };
    let exe = server_exe(&PathBuf::from(&settings.server_root));
    match cmd {
        CliCommand::Status => match process::find_running(&exe) {
            Some(pid) => {
                println!("running pid={pid}");
                EXIT_OK
            }
            None => {
                println!("stopped");
                EXIT_NOT_RUNNING
            }
        },
        CliCommand::Stop => stop(
            &PathBuf::from(&settings.server_root),
            Duration::from_secs(settings.stop_timeout_secs),
        ),
        CliCommand::Start { map } => start(&settings, &map, &exe),
    }
}

fn start(settings: &config::Settings, map: &str, exe: &std::path::Path) -> i32 {
    if let Some(pid) = process::find_running(exe) {
        println!("already running pid={pid}");
        return EXIT_ALREADY_RUNNING;
    }
    let spec = match plan_start(settings, map, udp_port_is_free) {
        Ok(spec) => spec,
        Err(err) => {
            eprintln!("error: {}", err.code());
            return match err {
                PlanError::PortInUse(_) => EXIT_PORT_IN_USE,
                PlanError::MapNotFound | PlanError::MapNotInstalled => EXIT_MAP_UNAVAILABLE,
                _ => EXIT_ERROR,
            };
        }
    };
    let mut cmd = Command::new(&spec.exe);
    cmd.args(&spec.args);
    #[cfg(windows)]
    {
        use std::os::windows::process::CommandExt;
        // A console without a window: Ctrl+C can still reach it, and no cmd
        // window is left open on screen.
        const CREATE_NO_WINDOW: u32 = 0x0800_0000;
        cmd.creation_flags(CREATE_NO_WINDOW);
    }
    match cmd.spawn() {
        Ok(child) => {
            println!("started pid={}", child.id());
            hide_new_console(child.id());
            EXIT_OK
        }
        Err(e) => {
            eprintln!("error: spawn failed: {e}");
            EXIT_ERROR
        }
    }
}

/// The server opens its console window a few seconds after it starts. Wait
/// for it (at most 30 s) and hide it, since nothing supervises this start.
fn hide_new_console(pid: u32) {
    for _ in 0..100 {
        if console_window::hide_console_windows(pid) > 0 {
            return;
        }
        std::thread::sleep(Duration::from_millis(300));
    }
}

fn stop(root: &std::path::Path, timeout: Duration) -> i32 {
    let exe = server_exe(root);
    let exe = exe.as_path();
    let Some(pid) = process::find_running(exe) else {
        println!("stopped");
        return EXIT_NOT_RUNNING;
    };
    let outcome = shutdown::graceful_shutdown(pid, root);
    println!("shutdown: {outcome:?}");
    let deadline = Instant::now() + timeout;
    while Instant::now() < deadline {
        if process::find_running(exe).is_none() {
            println!("stopped");
            return EXIT_OK;
        }
        std::thread::sleep(Duration::from_millis(500));
    }
    process::force_kill(pid);
    println!("killed pid={pid}");
    EXIT_OK
}

#[cfg(test)]
mod tests {
    use super::*;

    fn args(list: &[&str]) -> Vec<String> {
        list.iter().map(|s| s.to_string()).collect()
    }

    #[test]
    fn no_flags_opens_the_gui() {
        assert_eq!(parse(&args(&[])), Ok(None));
    }

    #[test]
    fn start_with_map_parses() {
        assert_eq!(
            parse(&args(&["--map", "theisland", "--start"])),
            Ok(Some(CliCommand::Start {
                map: "theisland".into()
            }))
        );
    }

    #[test]
    fn start_without_map_is_an_error() {
        assert!(parse(&args(&["--start"])).is_err());
        assert!(parse(&args(&["--start", "--map"])).is_err());
    }

    #[test]
    fn stop_and_status_parse() {
        assert_eq!(parse(&args(&["--stop"])), Ok(Some(CliCommand::Stop)));
        assert_eq!(parse(&args(&["--status"])), Ok(Some(CliCommand::Status)));
    }

    #[test]
    fn conflicting_commands_are_an_error() {
        assert!(parse(&args(&["--stop", "--status"])).is_err());
    }
}
