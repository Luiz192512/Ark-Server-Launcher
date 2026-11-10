//! End to end flow of the core with a fake server: pick a map, plan the
//! start, run it under the supervisor, stop it and back up the save.

use enz_launcher_lib::backup::backup_saves;
use enz_launcher_lib::config::Settings;
use enz_launcher_lib::ports::udp_port_is_free;
use enz_launcher_lib::restart::RestartPolicy;
use enz_launcher_lib::service::{PlanError, plan_start};
use enz_launcher_lib::supervisor::{ServerState, Supervisor, SupervisorConfig};
use std::fs;
use std::net::UdpSocket;
use std::path::PathBuf;
use std::sync::Arc;
use std::time::{Duration, Instant};

/// A server folder laid out like the real one, with the fake server as the exe.
fn fake_server_root(tag: &str) -> PathBuf {
    let root = std::env::temp_dir().join(format!("enz-e2e-{}-{tag}", std::process::id()));
    let _ = fs::remove_dir_all(&root);
    let bin = root.join("ShooterGame/Binaries/Win64");
    let level = root.join("ShooterGame/Content/Maps/TheIslandSubMaps");
    let saves = root.join("ShooterGame/Saved/SavedArks");
    for dir in [&bin, &level, &saves] {
        fs::create_dir_all(dir).unwrap();
    }
    fs::copy(
        env!("CARGO_BIN_EXE_fake_server"),
        bin.join("ShooterGameServer.exe"),
    )
    .unwrap();
    fs::write(level.join("TheIsland.umap"), b"level").unwrap();
    fs::write(saves.join("TheIsland.ark"), b"world data").unwrap();
    root
}

fn settings_for(root: &std::path::Path) -> Settings {
    Settings {
        server_root: root.to_string_lossy().into_owned(),
        ..Settings::default()
    }
}

fn supervisor() -> Supervisor {
    Supervisor::new(SupervisorConfig {
        policy: RestartPolicy::default(),
        ready_marker: Some("advertising for join".into()),
        ready_port: None,
        port_grace: Duration::from_millis(100),
        stop_timeout: Duration::from_millis(300),
        graceful: Arc::new(|_| {}),
        listener: None,
    })
}

fn wait_for_state(sup: &Supervisor, wanted: ServerState) -> bool {
    let deadline = Instant::now() + Duration::from_secs(10);
    while Instant::now() < deadline {
        if sup.state() == wanted {
            return true;
        }
        std::thread::sleep(Duration::from_millis(50));
    }
    false
}

#[test]
fn select_map_start_run_stop_and_back_up() {
    let root = fake_server_root("flow");
    let backups = root.join("backups");
    let settings = settings_for(&root);

    let spec = plan_start(&settings, "theisland", |_| true).expect("plan must succeed");
    assert_eq!(spec.args[0], "TheIsland?listen?SessionName=ENZ");

    let sup = supervisor();
    sup.start(spec).unwrap();
    assert!(
        wait_for_state(&sup, ServerState::Running),
        "never reached Running"
    );

    sup.stop().unwrap();
    assert_eq!(sup.state(), ServerState::Stopped);

    let target = backup_saves(&root, &backups, 10)
        .unwrap()
        .expect("a backup");
    assert_eq!(
        fs::read(target.join("TheIsland.ark")).unwrap(),
        b"world data"
    );
    fs::remove_dir_all(&root).unwrap();
}

#[test]
fn start_is_refused_when_the_game_port_is_taken() {
    let root = fake_server_root("port");
    let held = UdpSocket::bind(("0.0.0.0", 0)).unwrap();
    let port = held.local_addr().unwrap().port();
    let settings = Settings {
        game_port: Some(port),
        ..settings_for(&root)
    };
    let err = plan_start(&settings, "theisland", udp_port_is_free).unwrap_err();
    assert_eq!(err, PlanError::PortInUse(port));
    fs::remove_dir_all(&root).unwrap();
}

#[test]
fn a_map_missing_from_disk_never_reaches_the_supervisor() {
    let root = fake_server_root("missing");
    let err = plan_start(&settings_for(&root), "ragnarok", |_| true).unwrap_err();
    assert_eq!(err, PlanError::MapNotInstalled);
    fs::remove_dir_all(&root).unwrap();
}
