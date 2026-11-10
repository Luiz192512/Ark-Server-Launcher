//! Manual check against a real running server. Ignored by default.
//!
//! ```text
//! $env:ENZ_PROBE_PID = "<pid of ShooterGameServer.exe>"
//! cargo test --test real_server -- --ignored --nocapture
//! ```

use enz_launcher_lib::a2s::query_info;
use enz_launcher_lib::ports::udp_ports_of;
use std::time::Duration;

#[test]
#[ignore = "needs a real server PID in ENZ_PROBE_PID and its console window visible"]
fn hides_the_console_window_of_the_probed_process() {
    let pid: u32 = std::env::var("ENZ_PROBE_PID")
        .expect("set ENZ_PROBE_PID")
        .parse()
        .expect("ENZ_PROBE_PID must be a number");
    let hidden = enz_launcher_lib::console_window::hide_console_windows(pid);
    println!("console windows hidden for pid {pid}: {hidden}");
    assert!(hidden > 0, "no visible console window found");
    assert_eq!(
        enz_launcher_lib::console_window::hide_console_windows(pid),
        0
    );
}

#[test]
#[ignore = "needs a running server; ENZ_QUERY_ADDR defaults to 127.0.0.1:27015"]
fn prints_the_player_count_from_the_query_port() {
    let addr = std::env::var("ENZ_QUERY_ADDR").unwrap_or_else(|_| "127.0.0.1:27015".into());
    let info = query_info(&addr, Duration::from_secs(2)).expect("the server must answer");
    println!(
        "query {addr}: name={:?} map={:?} players={}/{} bots={}",
        info.name, info.map, info.players, info.max_players, info.bots
    );
}

#[test]
#[ignore = "needs a real server PID in ENZ_PROBE_PID"]
fn prints_the_udp_ports_of_the_probed_process() {
    let pid: u32 = std::env::var("ENZ_PROBE_PID")
        .expect("set ENZ_PROBE_PID")
        .parse()
        .expect("ENZ_PROBE_PID must be a number");
    let mut ports = udp_ports_of(pid);
    ports.sort_unstable();
    println!("udp ports of pid {pid}: {ports:?}");
    assert!(!ports.is_empty(), "the process holds no UDP port");
}
