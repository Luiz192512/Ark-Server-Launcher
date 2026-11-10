use crate::console_window;
use crate::launch::LaunchSpec;
use crate::logs::{LogBuffer, read_from};
use crate::ports;
use crate::process;
use crate::restart::{RestartDecision, RestartPolicy};
use serde::Serialize;
use std::io::{BufRead, BufReader};
use std::process::{Child, Command, Stdio};
use std::sync::{Arc, Mutex};
use std::thread;
use std::time::{Duration, Instant};

const TICK: Duration = Duration::from_millis(100);
const FORCE_WAIT: Duration = Duration::from_secs(5);
const LOG_CAPACITY: usize = 200;
const PORT_CHECK_EVERY_TICKS: u32 = 5;

#[derive(Debug, Clone, PartialEq, Serialize)]
#[serde(tag = "state", content = "detail", rename_all = "camelCase")]
pub enum ServerState {
    Stopped,
    Starting,
    Running,
    Stopping,
    Failed(String),
}

#[derive(Debug, PartialEq)]
pub enum StartError {
    Busy,
    AlreadyRunning(u32),
    Spawn(String),
}

#[derive(Debug, PartialEq)]
pub enum StopError {
    NotRunning,
}

pub type StateListener = Arc<dyn Fn(&ServerState) + Send + Sync>;

pub struct SupervisorConfig {
    pub policy: RestartPolicy,
    pub ready_marker: Option<String>,
    /// UDP port the server opens once it is ready to accept players.
    pub ready_port: Option<u16>,
    /// How long the port must stay open before it counts as "ready" when the
    /// server writes no log.
    pub port_grace: Duration,
    pub stop_timeout: Duration,
    /// Asks the server to save and quit. Runs on the caller's thread.
    pub graceful: Arc<dyn Fn(u32) + Send + Sync>,
    pub listener: Option<StateListener>,
}

struct Inner {
    state: ServerState,
    pid: Option<u32>,
    stop_requested: bool,
    force_kill: bool,
}

#[derive(Clone)]
pub struct Supervisor {
    inner: Arc<Mutex<Inner>>,
    logs: LogBuffer,
    cfg: Arc<SupervisorConfig>,
}

/// The server gets a console (needed to deliver Ctrl+C) but no window.
#[cfg(windows)]
const CREATE_NO_WINDOW: u32 = 0x0800_0000;

fn spawn(spec: &LaunchSpec) -> std::io::Result<Child> {
    let mut cmd = Command::new(&spec.exe);
    cmd.args(&spec.args)
        .stdin(Stdio::null())
        .stdout(Stdio::piped())
        .stderr(Stdio::piped());
    #[cfg(windows)]
    {
        use std::os::windows::process::CommandExt;
        cmd.creation_flags(CREATE_NO_WINDOW);
    }
    cmd.spawn()
}

impl Supervisor {
    pub fn new(cfg: SupervisorConfig) -> Self {
        Self {
            inner: Arc::new(Mutex::new(Inner {
                state: ServerState::Stopped,
                pid: None,
                stop_requested: false,
                force_kill: false,
            })),
            logs: LogBuffer::new(LOG_CAPACITY),
            cfg: Arc::new(cfg),
        }
    }

    pub fn state(&self) -> ServerState {
        self.inner.lock().unwrap().state.clone()
    }

    pub fn pid(&self) -> Option<u32> {
        self.inner.lock().unwrap().pid
    }

    pub fn logs(&self) -> Vec<String> {
        self.logs.snapshot()
    }

    fn notify(&self, state: &ServerState) {
        if let Some(listener) = &self.cfg.listener {
            listener(state);
        }
    }

    fn transition(&self, next: ServerState) {
        {
            let mut inner = self.inner.lock().unwrap();
            if inner.state == next {
                return;
            }
            inner.state = next.clone();
        }
        self.notify(&next);
    }

    fn set_pid(&self, pid: Option<u32>) {
        self.inner.lock().unwrap().pid = pid;
    }

    fn finish(&self, state: ServerState) {
        self.set_pid(None);
        self.transition(state);
    }

    fn stop_requested(&self) -> bool {
        self.inner.lock().unwrap().stop_requested
    }

    pub fn start(&self, spec: LaunchSpec) -> Result<(), StartError> {
        {
            let mut inner = self.inner.lock().unwrap();
            if !matches!(inner.state, ServerState::Stopped | ServerState::Failed(_)) {
                return Err(StartError::Busy);
            }
            if let Some(pid) = process::find_running(&spec.exe) {
                return Err(StartError::AlreadyRunning(pid));
            }
            inner.state = ServerState::Starting;
            inner.stop_requested = false;
            inner.force_kill = false;
        }
        self.notify(&ServerState::Starting);
        match spawn(&spec) {
            Ok(child) => {
                self.set_pid(Some(child.id()));
                let me = self.clone();
                thread::spawn(move || me.monitor(spec, child));
                Ok(())
            }
            Err(e) => {
                self.finish(ServerState::Failed(e.to_string()));
                Err(StartError::Spawn(e.to_string()))
            }
        }
    }

    pub fn stop(&self) -> Result<(), StopError> {
        let (pid, still_loading) = {
            let mut inner = self.inner.lock().unwrap();
            if matches!(inner.state, ServerState::Stopped | ServerState::Failed(_)) {
                return Err(StopError::NotRunning);
            }
            inner.stop_requested = true;
            let still_loading = inner.state == ServerState::Starting;
            // While the world is loading there is nothing to save, and the
            // server ignores Ctrl+C until it is up, so cancel it right away.
            inner.force_kill |= still_loading;
            (inner.pid, still_loading)
        };
        self.transition(ServerState::Stopping);
        if still_loading {
            self.wait_until_down(FORCE_WAIT);
            return Ok(());
        }
        if let Some(pid) = pid {
            (self.cfg.graceful)(pid);
        }
        if self.wait_until_down(self.cfg.stop_timeout) {
            return Ok(());
        }
        self.inner.lock().unwrap().force_kill = true;
        self.wait_until_down(FORCE_WAIT);
        Ok(())
    }

    fn wait_until_down(&self, limit: Duration) -> bool {
        let deadline = Instant::now() + limit;
        while Instant::now() < deadline {
            if matches!(self.state(), ServerState::Stopped | ServerState::Failed(_)) {
                return true;
            }
            thread::sleep(Duration::from_millis(50));
        }
        false
    }

    fn monitor(&self, spec: LaunchSpec, first: Child) {
        let mut failures: Vec<Instant> = Vec::new();
        let mut child = first;
        loop {
            self.run_child(&mut child, &spec);
            if self.stop_requested() {
                self.finish(ServerState::Stopped);
                return;
            }
            failures.push(Instant::now());
            match self.cfg.policy.decide(&failures, Instant::now()) {
                RestartDecision::GiveUp => {
                    self.finish(ServerState::Failed(
                        "crash loop: restarts paused after repeated failures".into(),
                    ));
                    return;
                }
                RestartDecision::Restart { delay } => {
                    self.finish(ServerState::Starting);
                    if !self.sleep_unless_stopped(delay) {
                        self.finish(ServerState::Stopped);
                        return;
                    }
                    match spawn(&spec) {
                        Ok(next) => {
                            self.set_pid(Some(next.id()));
                            child = next;
                        }
                        Err(e) => {
                            self.finish(ServerState::Failed(e.to_string()));
                            return;
                        }
                    }
                }
            }
        }
    }

    fn sleep_unless_stopped(&self, delay: Duration) -> bool {
        let deadline = Instant::now() + delay;
        while Instant::now() < deadline {
            if self.stop_requested() {
                return false;
            }
            thread::sleep(Duration::from_millis(20));
        }
        !self.stop_requested()
    }

    fn pipe_output(&self, child: &mut Child) {
        let streams: Vec<Box<dyn std::io::Read + Send>> = [
            child
                .stdout
                .take()
                .map(|s| Box::new(s) as Box<dyn std::io::Read + Send>),
            child
                .stderr
                .take()
                .map(|s| Box::new(s) as Box<dyn std::io::Read + Send>),
        ]
        .into_iter()
        .flatten()
        .collect();
        for stream in streams {
            let me = self.clone();
            thread::spawn(move || {
                for chunk in BufReader::new(stream).split(b'\n').map_while(Result::ok) {
                    let line = String::from_utf8_lossy(&chunk).trim_end().to_owned();
                    me.on_line(&line);
                    me.logs.push(line);
                }
            });
        }
    }

    fn on_line(&self, line: &str) {
        if let Some(marker) = &self.cfg.ready_marker
            && line.contains(marker.as_str())
        {
            self.mark_ready();
        }
    }

    /// Fallback for a server whose log stays empty. The real server opens its
    /// game port about 30 s before it finishes starting, so the port only
    /// counts after a grace period, and never when the log is speaking (the
    /// log then announces readiness itself).
    fn check_ready_port(&self, pid: u32, log_len: u64, open_since: &mut Option<Instant>) {
        let Some(port) = self.cfg.ready_port else {
            return;
        };
        if !matches!(self.state(), ServerState::Starting)
            || !ports::udp_ports_of(pid).contains(&port)
        {
            return;
        }
        let opened = *open_since.get_or_insert_with(Instant::now);
        if log_len == 0 && opened.elapsed() >= self.cfg.port_grace {
            self.mark_ready();
        }
    }

    fn mark_ready(&self) {
        let starting = matches!(self.state(), ServerState::Starting);
        if starting && !self.stop_requested() {
            self.transition(ServerState::Running);
        }
    }

    fn run_child(&self, child: &mut Child, spec: &LaunchSpec) {
        self.pipe_output(child);
        let mut offset = read_from(&spec.log_file, None).map(|(_, len)| len).ok();
        let mut ticks = 0u32;
        let mut log_len = 0u64;
        let mut port_open_since: Option<Instant> = None;
        loop {
            if matches!(child.try_wait(), Ok(Some(_)) | Err(_)) {
                return;
            }
            if self.inner.lock().unwrap().force_kill {
                let _ = child.kill();
            }
            if let Some(at) = offset
                && let Ok((text, len)) = read_from(&spec.log_file, Some(at))
            {
                if let Some(marker) = &self.cfg.ready_marker
                    && text.contains(marker.as_str())
                {
                    self.mark_ready();
                }
                offset = Some(len);
                log_len = len;
            }
            ticks = ticks.wrapping_add(1);
            if ticks.is_multiple_of(PORT_CHECK_EVERY_TICKS) {
                self.check_ready_port(child.id(), log_len, &mut port_open_since);
                // The server opens its own console window; keep it hidden.
                console_window::hide_console_windows(child.id());
            }
            thread::sleep(TICK);
        }
    }
}
