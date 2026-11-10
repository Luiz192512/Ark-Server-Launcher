use enz_launcher_lib::launch::LaunchSpec;
use enz_launcher_lib::restart::RestartPolicy;
use enz_launcher_lib::supervisor::{
    ServerState, StartError, StopError, Supervisor, SupervisorConfig,
};
use std::path::PathBuf;
use std::sync::Arc;
use std::time::{Duration, Instant};

/// Copies the fake server to a unique path so tests never see each other's
/// processes (the single-instance guard matches by executable path).
fn fake_spec(tag: &str, args: &[&str]) -> LaunchSpec {
    let dir = std::env::temp_dir().join(format!("enz-fake-{}-{tag}", std::process::id()));
    std::fs::create_dir_all(&dir).unwrap();
    let exe = dir.join("fake_server.exe");
    std::fs::copy(env!("CARGO_BIN_EXE_fake_server"), &exe).unwrap();
    LaunchSpec {
        exe,
        args: args.iter().map(|s| s.to_string()).collect(),
        log_file: PathBuf::from("does-not-exist.log"),
    }
}

fn supervisor(policy: RestartPolicy, stop_timeout_ms: u64) -> Supervisor {
    supervisor_with(
        policy,
        stop_timeout_ms,
        Some("advertising for join".into()),
        None,
    )
}

fn supervisor_with(
    policy: RestartPolicy,
    stop_timeout_ms: u64,
    ready_marker: Option<String>,
    ready_port: Option<u16>,
) -> Supervisor {
    Supervisor::new(SupervisorConfig {
        policy,
        ready_marker,
        ready_port,
        port_grace: Duration::from_millis(300),
        stop_timeout: Duration::from_millis(stop_timeout_ms),
        graceful: Arc::new(|_| {}),
        listener: None,
    })
}

fn free_udp_port() -> u16 {
    let socket = std::net::UdpSocket::bind(("0.0.0.0", 0)).unwrap();
    socket.local_addr().unwrap().port()
}

#[test]
fn an_open_game_port_marks_the_server_ready_without_any_log() {
    let port = free_udp_port();
    let sup = supervisor_with(quick_policy(), 300, None, Some(port));
    let args = ["--ready-after-ms", "600", "--bind-port", &port.to_string()];
    sup.start(fake_spec("port", &args)).unwrap();
    std::thread::sleep(Duration::from_millis(200));
    assert_eq!(sup.state(), ServerState::Starting, "ready too early");
    assert!(
        wait_for(&sup, |s| *s == ServerState::Running),
        "port never detected"
    );
    sup.stop().unwrap();
}

#[test]
fn an_open_port_does_not_count_while_the_log_is_speaking() {
    let port = free_udp_port();
    let sup = supervisor_with(quick_policy(), 300, None, Some(port));
    let mut spec = fake_spec(
        "speaking",
        &["--ready-after-ms", "100", "--bind-port", &port.to_string()],
    );
    // A log with content but without the ready marker: the server is "speaking".
    spec.log_file = spec.exe.with_file_name("ShooterGame.log");
    std::fs::write(&spec.log_file, "BattlEye successfully started.\n").unwrap();
    sup.start(spec).unwrap();
    std::thread::sleep(Duration::from_millis(1500)); // port open, grace long gone
    assert_eq!(sup.state(), ServerState::Starting);
    sup.stop().unwrap();
}

#[test]
fn the_log_marker_marks_the_server_ready_before_any_port_grace() {
    let sup = supervisor_with(
        quick_policy(),
        300,
        Some("has successfully started!".into()),
        None,
    );
    let mut spec = fake_spec("marker", &["--ready-after-ms", "100"]);
    spec.log_file = spec.exe.with_file_name("ShooterGame.log");
    std::fs::write(&spec.log_file, "").unwrap();
    let log = spec.log_file.clone();
    sup.start(spec).unwrap();
    std::thread::sleep(Duration::from_millis(300));
    assert_eq!(sup.state(), ServerState::Starting);
    std::fs::write(&log, "Server: \"ENZ\" has successfully started!\n").unwrap();
    assert!(
        wait_for(&sup, |s| *s == ServerState::Running),
        "log marker never detected"
    );
    sup.stop().unwrap();
}

#[test]
fn cancelling_while_the_server_loads_stops_it_at_once() {
    // No ready signal, so the server stays in Starting. The graceful step must
    // not run and the long stop timeout must not be waited for.
    let sup = Supervisor::new(SupervisorConfig {
        policy: quick_policy(),
        ready_marker: None,
        ready_port: None,
        port_grace: Duration::from_millis(300),
        stop_timeout: Duration::from_secs(30),
        graceful: Arc::new(|_| panic!("graceful stop must be skipped while loading")),
        listener: None,
    });
    sup.start(fake_spec("cancel", &[])).unwrap();
    std::thread::sleep(Duration::from_millis(400));
    assert_eq!(sup.state(), ServerState::Starting);
    let started = Instant::now();
    sup.stop().unwrap();
    assert_eq!(sup.state(), ServerState::Stopped);
    assert!(
        started.elapsed() < Duration::from_secs(5),
        "took {:?}",
        started.elapsed()
    );
}

#[test]
fn without_any_ready_signal_the_server_stays_starting() {
    let sup = supervisor_with(quick_policy(), 300, None, None);
    sup.start(fake_spec("nosignal", &[])).unwrap();
    std::thread::sleep(Duration::from_millis(900));
    assert_eq!(sup.state(), ServerState::Starting);
    sup.stop().unwrap();
}

fn quick_policy() -> RestartPolicy {
    RestartPolicy {
        max_failures: 3,
        window: Duration::from_secs(60),
        base_delay: Duration::from_millis(20),
        max_delay: Duration::from_millis(40),
    }
}

fn wait_for(sup: &Supervisor, wanted: impl Fn(&ServerState) -> bool) -> bool {
    let deadline = Instant::now() + Duration::from_secs(10);
    while Instant::now() < deadline {
        if wanted(&sup.state()) {
            return true;
        }
        std::thread::sleep(Duration::from_millis(50));
    }
    false
}

#[test]
fn starts_reaches_running_and_stops() {
    let sup = supervisor(quick_policy(), 300);
    sup.start(fake_spec("run", &[])).unwrap();
    assert!(
        wait_for(&sup, |s| *s == ServerState::Running),
        "never reached Running"
    );
    assert!(
        sup.logs()
            .iter()
            .any(|l| l.contains("advertising for join"))
    );
    sup.stop().unwrap();
    assert_eq!(sup.state(), ServerState::Stopped);
}

#[test]
fn second_start_on_the_same_supervisor_is_busy() {
    let sup = supervisor(quick_policy(), 300);
    sup.start(fake_spec("busy", &[])).unwrap();
    assert_eq!(sup.start(fake_spec("busy2", &[])), Err(StartError::Busy));
    sup.stop().unwrap();
}

#[test]
fn another_supervisor_cannot_start_the_same_executable() {
    let first = supervisor(quick_policy(), 300);
    let spec = fake_spec("guard", &[]);
    first.start(spec.clone()).unwrap();
    let second = supervisor(quick_policy(), 300);
    assert!(matches!(
        second.start(spec),
        Err(StartError::AlreadyRunning(_))
    ));
    first.stop().unwrap();
}

#[test]
fn stopping_when_stopped_reports_not_running() {
    let sup = supervisor(quick_policy(), 300);
    assert_eq!(sup.stop(), Err(StopError::NotRunning));
}

#[test]
fn repeated_crashes_end_in_failed_after_the_limit() {
    let sup = supervisor(quick_policy(), 300);
    sup.start(fake_spec("crash", &["--exit-after-ms", "50"]))
        .unwrap();
    assert!(
        wait_for(&sup, |s| matches!(s, ServerState::Failed(_))),
        "never gave up"
    );
    let boots = sup.logs().iter().filter(|l| l.contains("booting")).count();
    assert_eq!(boots, 3);
}

#[test]
fn stop_during_the_restart_delay_ends_stopped() {
    let policy = RestartPolicy {
        base_delay: Duration::from_secs(30),
        max_delay: Duration::from_secs(30),
        ..quick_policy()
    };
    let sup = supervisor(policy, 300);
    sup.start(fake_spec("delay", &["--exit-after-ms", "50"]))
        .unwrap();
    std::thread::sleep(Duration::from_millis(600));
    sup.stop().unwrap();
    assert_eq!(sup.state(), ServerState::Stopped);
}

#[test]
fn a_missing_executable_fails_the_start() {
    let sup = supervisor(quick_policy(), 300);
    let spec = LaunchSpec {
        exe: PathBuf::from("Z:/nope/server.exe"),
        args: vec![],
        log_file: PathBuf::new(),
    };
    assert!(matches!(sup.start(spec), Err(StartError::Spawn(_))));
    assert!(matches!(sup.state(), ServerState::Failed(_)));
}
