//! What the app does when Windows starts it with `--autostart`: wait for the
//! network, open Radmin VPN if needed, then start the server under the
//! app's own supervisor. This replaces the old PowerShell watchdog loop.

use crate::config::Settings;
use std::path::Path;
use std::time::Duration;

const NETWORK_WAIT: Duration = Duration::from_secs(180);
const NETWORK_POLL: Duration = Duration::from_secs(5);

#[derive(Debug, PartialEq)]
pub enum Outcome {
    Started(String),
    AlreadyRunning,
    /// No map in the arguments and none used before: the launcher will not guess.
    NoMapChosen,
    StartFailed(String),
}

/// Everything that touches the machine, so the sequence can be tested.
pub struct Deps<'a> {
    pub network_ready: &'a dyn Fn() -> bool,
    pub radmin_running: &'a dyn Fn() -> bool,
    pub start_radmin: &'a dyn Fn(&Path),
    pub server_running: &'a dyn Fn() -> bool,
    pub start_server: &'a dyn Fn(&str) -> Result<(), String>,
    pub sleep: &'a dyn Fn(Duration),
}

fn wait_for_network(deps: &Deps) {
    let mut waited = Duration::ZERO;
    while !(deps.network_ready)() && waited < NETWORK_WAIT {
        (deps.sleep)(NETWORK_POLL);
        waited += NETWORK_POLL;
    }
}

pub fn run(settings: &Settings, map_arg: Option<&str>, deps: &Deps) -> Outcome {
    let Some(map) = map_arg
        .map(str::to_owned)
        .or_else(|| settings.last_map.clone())
    else {
        return Outcome::NoMapChosen;
    };
    // The old script carried on after the wait even without a network.
    wait_for_network(deps);
    let radmin = Path::new(&settings.radmin_path);
    if settings.autostart_radmin && radmin.is_file() && !(deps.radmin_running)() {
        (deps.start_radmin)(radmin);
    }
    if (deps.server_running)() {
        return Outcome::AlreadyRunning;
    }
    match (deps.start_server)(&map) {
        Ok(()) => Outcome::Started(map),
        Err(code) => Outcome::StartFailed(code),
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::cell::{Cell, RefCell};

    struct Fakes {
        network_after_polls: u32,
        polls: Cell<u32>,
        radmin_running: bool,
        server_running: bool,
        start_result: Result<(), String>,
        events: RefCell<Vec<String>>,
    }

    impl Fakes {
        fn new() -> Self {
            Fakes {
                network_after_polls: 0,
                polls: Cell::new(0),
                radmin_running: false,
                server_running: false,
                start_result: Ok(()),
                events: RefCell::new(Vec::new()),
            }
        }

        fn run(&self, settings: &Settings, map: Option<&str>) -> Outcome {
            let network = || {
                self.polls.set(self.polls.get() + 1);
                self.polls.get() > self.network_after_polls
            };
            let radmin_running = || self.radmin_running;
            let start_radmin = |_: &Path| self.events.borrow_mut().push("radmin".into());
            let server_running = || self.server_running;
            let start_server = |m: &str| {
                self.events.borrow_mut().push(format!("server:{m}"));
                self.start_result.clone()
            };
            let sleep = |_: Duration| self.events.borrow_mut().push("wait".into());
            run(
                settings,
                map,
                &Deps {
                    network_ready: &network,
                    radmin_running: &radmin_running,
                    start_radmin: &start_radmin,
                    server_running: &server_running,
                    start_server: &start_server,
                    sleep: &sleep,
                },
            )
        }
    }

    /// Settings whose Radmin path points at a file that exists.
    fn settings_with_radmin(last_map: Option<&str>) -> Settings {
        Settings {
            last_map: last_map.map(str::to_owned),
            radmin_path: std::env::current_exe()
                .unwrap()
                .to_string_lossy()
                .into_owned(),
            ..Settings::default()
        }
    }

    #[test]
    fn waits_for_the_network_then_radmin_then_the_last_map() {
        let fakes = Fakes {
            network_after_polls: 2,
            ..Fakes::new()
        };
        let outcome = fakes.run(&settings_with_radmin(Some("theisland")), None);
        assert_eq!(outcome, Outcome::Started("theisland".into()));
        assert_eq!(
            *fakes.events.borrow(),
            vec!["wait", "wait", "radmin", "server:theisland"]
        );
    }

    #[test]
    fn a_map_in_the_arguments_beats_the_last_map() {
        let fakes = Fakes::new();
        fakes.run(&settings_with_radmin(Some("theisland")), Some("ragnarok"));
        assert!(
            fakes
                .events
                .borrow()
                .contains(&"server:ragnarok".to_string())
        );
    }

    #[test]
    fn does_not_start_a_second_radmin_or_server() {
        let fakes = Fakes {
            radmin_running: true,
            server_running: true,
            ..Fakes::new()
        };
        let outcome = fakes.run(&settings_with_radmin(Some("theisland")), None);
        assert_eq!(outcome, Outcome::AlreadyRunning);
        assert!(fakes.events.borrow().is_empty());
    }

    #[test]
    fn never_guesses_a_map() {
        let fakes = Fakes::new();
        assert_eq!(
            fakes.run(&settings_with_radmin(None), None),
            Outcome::NoMapChosen
        );
        assert!(fakes.events.borrow().is_empty());
    }

    #[test]
    fn skips_radmin_when_disabled_or_missing() {
        let fakes = Fakes::new();
        let mut off = settings_with_radmin(Some("theisland"));
        off.autostart_radmin = false;
        fakes.run(&off, None);
        let mut missing = settings_with_radmin(Some("theisland"));
        missing.radmin_path = "Z:/nope/radmin.exe".into();
        fakes.run(&missing, None);
        assert!(!fakes.events.borrow().contains(&"radmin".to_string()));
    }

    #[test]
    fn gives_up_waiting_for_the_network_and_still_starts() {
        let fakes = Fakes {
            network_after_polls: u32::MAX,
            ..Fakes::new()
        };
        let outcome = fakes.run(&settings_with_radmin(Some("theisland")), None);
        assert_eq!(outcome, Outcome::Started("theisland".into()));
        let waits = fakes
            .events
            .borrow()
            .iter()
            .filter(|e| *e == "wait")
            .count();
        assert_eq!(
            waits as u64,
            NETWORK_WAIT.as_secs() / NETWORK_POLL.as_secs()
        );
    }

    #[test]
    fn reports_why_the_server_did_not_start() {
        let fakes = Fakes {
            start_result: Err("port_in_use:7777".into()),
            ..Fakes::new()
        };
        let outcome = fakes.run(&settings_with_radmin(Some("theisland")), None);
        assert_eq!(outcome, Outcome::StartFailed("port_in_use:7777".into()));
    }
}
