use std::path::Path;
use std::process::Command;
use sysinfo::{ProcessRefreshKind, ProcessesToUpdate, System, UpdateKind};

#[cfg(windows)]
const CREATE_NO_WINDOW: u32 = 0x0800_0000;

#[derive(Debug, Clone, PartialEq)]
pub struct RunningInfo {
    pub pid: u32,
    pub args: Vec<String>,
    /// When the process started, as seconds since the Unix epoch.
    pub started_at_secs: u64,
}

fn normalize(p: &Path) -> String {
    p.to_string_lossy().replace('/', "\\").to_lowercase()
}

/// A running process whose executable is exactly `exe`, with its arguments.
pub fn running_info(exe: &Path) -> Option<RunningInfo> {
    let mut sys = System::new();
    sys.refresh_processes_specifics(
        ProcessesToUpdate::All,
        true,
        ProcessRefreshKind::nothing()
            .with_exe(UpdateKind::Always)
            .with_cmd(UpdateKind::Always),
    );
    let wanted = normalize(exe);
    sys.processes()
        .values()
        .find(|p| p.exe().is_some_and(|e| normalize(e) == wanted))
        .map(|p| RunningInfo {
            pid: p.pid().as_u32(),
            started_at_secs: p.start_time(),
            args: p
                .cmd()
                .iter()
                .skip(1)
                .map(|a| a.to_string_lossy().into_owned())
                .collect(),
        })
}

/// True when any process has this executable file name (case-insensitive).
pub fn is_running_named(file_name: &str) -> bool {
    let mut sys = System::new();
    sys.refresh_processes_specifics(ProcessesToUpdate::All, true, ProcessRefreshKind::nothing());
    sys.processes()
        .values()
        .any(|p| p.name().to_string_lossy().eq_ignore_ascii_case(file_name))
}

/// PID of a running process whose executable is exactly `exe`.
pub fn find_running(exe: &Path) -> Option<u32> {
    running_info(exe).map(|i| i.pid)
}

/// The map token at the start of the server's first argument, e.g. `TheIsland`.
pub fn map_token(args: &[String]) -> Option<String> {
    let first = args.first()?;
    let token = first.split('?').next()?.trim_matches('"');
    (!token.is_empty() && !token.starts_with('-')).then(|| token.to_owned())
}

fn taskkill(args: &[&str]) {
    let mut cmd = Command::new("taskkill");
    cmd.args(args);
    #[cfg(windows)]
    {
        use std::os::windows::process::CommandExt;
        cmd.creation_flags(CREATE_NO_WINDOW);
    }
    let _ = cmd.output();
}

/// Asks the process to close (WM_CLOSE). It may be ignored or refused.
pub fn request_graceful_stop(pid: u32) {
    taskkill(&["/PID", &pid.to_string()]);
}

/// Terminates the process tree immediately.
pub fn force_kill(pid: u32) {
    taskkill(&["/F", "/T", "/PID", &pid.to_string()]);
}

#[cfg(test)]
mod tests {
    use super::*;

    fn args(list: &[&str]) -> Vec<String> {
        list.iter().map(|s| s.to_string()).collect()
    }

    #[test]
    fn map_token_is_the_text_before_the_first_question_mark() {
        let a = args(&["TheIsland?listen?SessionName=ENZ", "-server", "-log"]);
        assert_eq!(map_token(&a), Some("TheIsland".into()));
    }

    #[test]
    fn map_token_ignores_flags_and_empty_input() {
        assert_eq!(map_token(&args(&["-server"])), None);
        assert_eq!(map_token(&[]), None);
    }

    #[test]
    fn finds_a_process_by_file_name_ignoring_case() {
        let me = std::env::current_exe().unwrap();
        let name = me.file_name().unwrap().to_string_lossy().to_uppercase();
        assert!(is_running_named(&name));
        assert!(!is_running_named("definitely-not-running.exe"));
    }

    #[test]
    fn finds_this_test_process_by_its_executable() {
        let exe = std::env::current_exe().unwrap();
        let info = running_info(&exe).expect("own process must be found");
        assert!(info.pid > 0);
    }
}
