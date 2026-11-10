use crate::console_cmd::send_ctrl_c;
use crate::process::request_graceful_stop;
use std::path::Path;
use std::thread;
use std::time::{Duration, SystemTime};

const SAVE_WAIT: Duration = Duration::from_secs(45);
const SAVE_POLL: Duration = Duration::from_millis(500);

#[derive(Debug, Clone, Copy, PartialEq)]
pub enum ShutdownOutcome {
    /// Ctrl+C was delivered and a save file changed.
    Saved,
    /// Ctrl+C was delivered but no save file changed in time.
    SaveNotConfirmed,
    /// The console was unreachable, so the window was asked to close
    /// instead. The server then exits without saving.
    ClosedWithoutSave,
}

/// Newest modification time among the `.ark` saves of the server.
pub fn newest_save_time(server_root: &Path) -> Option<SystemTime> {
    let dir = server_root.join("ShooterGame/Saved/SavedArks");
    std::fs::read_dir(dir)
        .ok()?
        .filter_map(Result::ok)
        .filter(|e| e.path().extension().is_some_and(|x| x == "ark"))
        .filter_map(|e| e.metadata().ok()?.modified().ok())
        .max()
}

/// Asks the server to save and quit with Ctrl+C. The caller still waits for
/// the process to exit and forces it after its own timeout.
pub fn graceful_shutdown(pid: u32, server_root: &Path) -> ShutdownOutcome {
    graceful_shutdown_within(pid, server_root, SAVE_WAIT)
}

/// Same as [`graceful_shutdown`] with a custom limit for the save to show up.
pub fn graceful_shutdown_within(
    pid: u32,
    server_root: &Path,
    save_wait: Duration,
) -> ShutdownOutcome {
    shutdown_with(
        || send_ctrl_c(pid),
        || newest_save_time(server_root),
        || request_graceful_stop(pid),
        save_wait,
        SAVE_POLL,
    )
}

pub fn shutdown_with(
    interrupt: impl Fn() -> Result<(), String>,
    newest_save: impl Fn() -> Option<SystemTime>,
    fallback: impl Fn(),
    save_wait: Duration,
    poll: Duration,
) -> ShutdownOutcome {
    let before = newest_save();
    if interrupt().is_err() {
        fallback();
        return ShutdownOutcome::ClosedWithoutSave;
    }
    let mut waited = Duration::ZERO;
    while waited < save_wait {
        thread::sleep(poll);
        waited += poll;
        if newest_save() > before {
            return ShutdownOutcome::Saved;
        }
    }
    ShutdownOutcome::SaveNotConfirmed
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::cell::Cell;

    const POLL: Duration = Duration::from_millis(1);

    #[test]
    fn reports_saved_when_the_save_file_changes() {
        let polls = Cell::new(0);
        let t0 = SystemTime::UNIX_EPOCH;
        let outcome = shutdown_with(
            || Ok(()),
            || {
                polls.set(polls.get() + 1);
                Some(if polls.get() > 2 {
                    t0 + Duration::from_secs(5)
                } else {
                    t0
                })
            },
            || panic!("must not fall back"),
            Duration::from_secs(1),
            POLL,
        );
        assert_eq!(outcome, ShutdownOutcome::Saved);
    }

    #[test]
    fn reports_when_no_save_is_confirmed() {
        let outcome = shutdown_with(
            || Ok(()),
            || Some(SystemTime::UNIX_EPOCH),
            || panic!("must not fall back"),
            Duration::from_millis(20),
            POLL,
        );
        assert_eq!(outcome, ShutdownOutcome::SaveNotConfirmed);
    }

    #[test]
    fn falls_back_to_closing_the_window_when_the_console_is_unreachable() {
        let closed = Cell::new(false);
        let outcome = shutdown_with(
            || Err("no console".into()),
            || None,
            || closed.set(true),
            Duration::from_millis(20),
            POLL,
        );
        assert_eq!(outcome, ShutdownOutcome::ClosedWithoutSave);
        assert!(closed.get());
    }

    #[test]
    fn newest_save_time_ignores_other_files() {
        let root = std::env::temp_dir().join(format!("enz-shut-{}", std::process::id()));
        let dir = root.join("ShooterGame/Saved/SavedArks");
        std::fs::create_dir_all(&dir).unwrap();
        assert_eq!(newest_save_time(&root), None);
        std::fs::write(dir.join("notes.txt"), b"x").unwrap();
        assert_eq!(newest_save_time(&root), None);
        std::fs::write(dir.join("TheIsland.ark"), b"x").unwrap();
        assert!(newest_save_time(&root).is_some());
        std::fs::remove_dir_all(&root).unwrap();
    }
}
