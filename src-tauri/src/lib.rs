pub mod a2s;
pub mod autostart;
pub mod backup;
pub mod cli;
mod commands;
pub mod config;
pub mod console_cmd;
pub mod console_window;
pub mod credentials;
pub mod ini_catalog;
pub mod ini_custom;
pub mod ini_file;
pub mod ini_settings;
pub mod launch;
pub mod logs;
pub mod maps;
pub mod metrics;
pub mod mods;
pub mod ports;
pub mod process;
pub mod rcon;
pub mod restart;
pub mod server_ini;
pub mod service;
pub mod shutdown;
pub mod supervisor;

use commands::AppState;
use metrics::Probe;
use restart::RestartPolicy;
use serde::Serialize;
use std::sync::{Arc, Mutex};
use std::time::Duration;
use supervisor::{Supervisor, SupervisorConfig};
use tauri::{Emitter, Manager};

#[derive(Serialize)]
struct AppInfo {
    name: &'static str,
    version: &'static str,
}

#[tauri::command]
fn app_info() -> AppInfo {
    AppInfo {
        name: env!("CARGO_PKG_NAME"),
        version: env!("CARGO_PKG_VERSION"),
    }
}

/// Value after `flag` in the command line, if any.
fn arg_value(args: &[String], flag: &str) -> Option<String> {
    args.iter()
        .position(|a| a == flag)
        .and_then(|i| args.get(i + 1))
        .cloned()
}

/// Boot flow on its own thread: network, Radmin, then the server under the
/// app's supervisor. Nothing is shown on screen.
fn spawn_autostart(supervisor: Supervisor, settings_path: std::path::PathBuf, map: Option<String>) {
    std::thread::spawn(move || {
        let settings = config::load(&settings_path).unwrap_or_default();
        let exe = launch::server_exe(std::path::Path::new(&settings.server_root));
        let network = || {
            let target = std::net::SocketAddr::from(([1, 1, 1, 1], 443));
            std::net::TcpStream::connect_timeout(&target, Duration::from_secs(2)).is_ok()
        };
        let radmin_running = || process::is_running_named("RvRvpnGui.exe");
        let start_radmin = |path: &std::path::Path| {
            let _ = std::process::Command::new(path).spawn();
        };
        let server_running = || process::find_running(&exe).is_some();
        let start_server = |id: &str| -> Result<(), String> {
            let mut current = config::load(&settings_path).map_err(|e| e.to_string())?;
            let spec =
                service::plan_start(&current, id, ports::udp_port_is_free).map_err(|e| e.code())?;
            supervisor.start(spec).map_err(|e| format!("{e:?}"))?;
            current.last_map = Some(id.to_owned());
            config::save(&settings_path, &current).map_err(|e| e.to_string())
        };
        let sleep = |d: Duration| std::thread::sleep(d);
        let _ = autostart::run(
            &settings,
            map.as_deref(),
            &autostart::Deps {
                network_ready: &network,
                radmin_running: &radmin_running,
                start_radmin: &start_radmin,
                server_running: &server_running,
                start_server: &start_server,
                sleep: &sleep,
            },
        );
    });
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .setup(|app| {
            let settings_path = config::default_path();
            let settings = config::load(&settings_path).unwrap_or_default();
            let handle = app.handle().clone();
            let stop_settings_path = settings_path.clone();
            let supervisor = Supervisor::new(SupervisorConfig {
                policy: RestartPolicy::default(),
                ready_marker: Some(settings.ready_marker.clone()).filter(|m| !m.is_empty()),
                ready_port: Some(settings.game_port.unwrap_or(service::DEFAULT_GAME_PORT)),
                port_grace: Duration::from_secs(45),
                stop_timeout: Duration::from_secs(settings.stop_timeout_secs),
                graceful: Arc::new(move |pid| {
                    let root = config::load(&stop_settings_path)
                        .map(|s| s.server_root)
                        .unwrap_or_default();
                    shutdown::graceful_shutdown(pid, std::path::Path::new(&root));
                }),
                listener: Some(Arc::new(move |state| {
                    let _ = handle.emit("server-state", state.clone());
                })),
            });
            let args: Vec<String> = std::env::args().skip(1).collect();
            let autostart = args.iter().any(|a| a == "--autostart");
            app.manage(AppState {
                supervisor: supervisor.clone(),
                settings_path: settings_path.clone(),
                probe: Mutex::new(Probe::new()),
            });
            if autostart {
                // Started by Windows at logon: stay out of the way in the
                // taskbar and bring the server up by itself.
                if let Some(window) = app.get_webview_window("main") {
                    let _ = window.minimize();
                }
                spawn_autostart(supervisor, settings_path, arg_value(&args, "--map"));
            }
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            app_info,
            commands::list_maps,
            commands::get_settings,
            commands::save_settings,
            commands::get_server_options,
            commands::save_server_options,
            commands::get_ini_catalog,
            commands::get_ini_values,
            commands::save_ini_values,
            commands::list_ini_backups,
            commands::restore_ini_backup,
            commands::get_custom_ini,
            commands::save_custom_ini,
            commands::list_mods,
            commands::apply_mods,
            commands::server_overview,
            commands::check_server_root,
            commands::save_admin_password,
            commands::has_admin_password,
            commands::server_logs,
            commands::start_server,
            commands::stop_server,
            commands::save_world,
            commands::regen_wild_dinos,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
