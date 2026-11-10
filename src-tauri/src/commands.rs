use crate::a2s;
use crate::backup::backup_saves;
use crate::config::{self, Settings};
use crate::credentials;
use crate::ini_catalog;
use crate::ini_settings;
use crate::launch::server_exe;
use crate::logs::{modified_since, read_from, tail_file};
use crate::maps::{MapEntry, load_registry};
use crate::metrics::{Metrics, Probe};
use crate::mods;
use crate::ports::{self, udp_port_is_free};
use crate::process;
use crate::rcon::Rcon;
use crate::server_ini;
use crate::service::{
    DEFAULT_GAME_PORT, DEFAULT_QUERY_PORT, is_ready, launch_settings, plan_start,
};
use crate::shutdown;
use crate::supervisor::{ServerState, StartError, StopError, Supervisor};
use serde::Serialize;
use std::path::PathBuf;
use std::sync::Mutex;
use std::time::{Duration, Instant};
use tauri::State;

const LOG_LINES: usize = 200;
/// Short, because the dashboard asks every 1.5 s and a busy server may not answer.
const PLAYER_QUERY_TIMEOUT: Duration = Duration::from_millis(400);
const BACKUPS_TO_KEEP: usize = 10;
/// A world save can take several seconds, so the answer may be slow.
const RCON_TIMEOUT: Duration = Duration::from_secs(30);

pub struct AppState {
    pub supervisor: Supervisor,
    pub settings_path: PathBuf,
    pub probe: Mutex<Probe>,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct MapView {
    #[serde(flatten)]
    entry: MapEntry,
    installed: bool,
    /// Size of the map's save file, when one exists.
    save_bytes: Option<u64>,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct Overview {
    state: ServerState,
    pid: Option<u32>,
    /// True when the server was started outside this launcher.
    external: bool,
    map_id: Option<String>,
    metrics: Option<Metrics>,
    /// From the server's own query port. `None` while it is not answering.
    players: Option<Players>,
    /// True when the server's ini enables RCON and has an admin password, so
    /// the save and wild dino buttons can work.
    rcon_ready: bool,
    /// RAM the system can still hand out. The server needs about 4 GB to load.
    available_memory_bytes: u64,
}

#[derive(Serialize)]
pub struct Players {
    current: u8,
    /// None when neither the query nor the server ini gives a limit.
    max: Option<u8>,
}

fn current_settings(state: &State<AppState>) -> Result<Settings, String> {
    config::load(&state.settings_path).map_err(|e| e.to_string())
}

fn log_file(settings: &Settings) -> PathBuf {
    PathBuf::from(&settings.server_root).join("ShooterGame/Saved/Logs/ShooterGame.log")
}

fn backup_dir(state: &State<AppState>) -> PathBuf {
    state
        .settings_path
        .parent()
        .map_or_else(|| PathBuf::from("backups"), |p| p.join("backups"))
}

#[tauri::command]
pub fn list_maps(state: State<AppState>) -> Result<Vec<MapView>, String> {
    let settings = current_settings(&state)?;
    let root = launch_settings(&settings).server_root;
    let maps = load_registry().map_err(|e| e.to_string())?;
    Ok(maps
        .into_iter()
        .map(|entry| MapView {
            installed: entry.is_installed(&root),
            save_bytes: std::fs::metadata(
                root.join("ShooterGame/Saved/SavedArks")
                    .join(format!("{}.ark", entry.launch_token)),
            )
            .ok()
            .map(|m| m.len()),
            entry,
        })
        .collect())
}

#[tauri::command]
pub fn get_settings(state: State<AppState>) -> Result<Settings, String> {
    current_settings(&state)
}

#[tauri::command]
pub fn save_settings(state: State<AppState>, settings: Settings) -> Result<(), String> {
    config::save(&state.settings_path, &settings).map_err(|e| e.to_string())
}

/// Host-menu options (map/server rules) stored in the server's own ini.
#[tauri::command]
pub fn get_server_options(
    state: State<AppState>,
) -> Result<std::collections::HashMap<String, String>, String> {
    let settings = current_settings(&state)?;
    Ok(server_ini::read_options(&PathBuf::from(&settings.server_root)))
}

/// Refused while the server runs: it rewrites its ini on shutdown and would undo the edit.
#[tauri::command]
pub fn save_server_options(
    state: State<AppState>,
    options: std::collections::HashMap<String, String>,
) -> Result<(), String> {
    let settings = current_settings(&state)?;
    let root = idle_server_root(&state, &settings)?;
    server_ini::write_options(&root, &ini_backup_dir(&state), &options)
}

/// Where the ini files are copied to before every write.
fn ini_backup_dir(state: &State<AppState>) -> PathBuf {
    state
        .settings_path
        .parent()
        .map_or_else(|| PathBuf::from("ini-backups"), |p| p.join("ini-backups"))
}

/// Every setting the launcher can write to the server's ini files.
#[tauri::command]
pub fn get_ini_catalog() -> &'static [ini_catalog::Entry] {
    ini_catalog::catalog()
}

/// Current values of the catalog settings. Secrets are only flagged as set, never returned.
#[tauri::command]
pub fn get_ini_values(state: State<AppState>) -> Result<ini_settings::IniValues, String> {
    let settings = current_settings(&state)?;
    Ok(ini_settings::read_values(&PathBuf::from(&settings.server_root)))
}

/// Applies `changes` (key to new value, `null` to go back to the game's default) after a
/// backup of both ini files. Refused while the server runs.
#[tauri::command]
pub fn save_ini_values(
    state: State<AppState>,
    changes: std::collections::HashMap<String, Option<String>>,
) -> Result<(), String> {
    let settings = current_settings(&state)?;
    let root = idle_server_root(&state, &settings)?;
    ini_settings::write_values(&root, &ini_backup_dir(&state), &changes)
}

fn custom_list(state: &State<AppState>) -> PathBuf {
    state
        .settings_path
        .parent()
        .map_or_else(|| PathBuf::from("custom-ini.json"), |p| p.join("custom-ini.json"))
}

/// The keys added in INI PERSONALIZADO and every section of both files (secrets masked).
#[tauri::command]
pub fn get_custom_ini(state: State<AppState>) -> Result<crate::ini_custom::CustomState, String> {
    let settings = current_settings(&state)?;
    Ok(crate::ini_custom::read(&PathBuf::from(&settings.server_root), &custom_list(&state)))
}

/// Writes the INI PERSONALIZADO changes after a backup of both files. Refused while the server runs.
#[tauri::command]
pub fn save_custom_ini(
    state: State<AppState>,
    changes: Vec<crate::ini_custom::CustomChange>,
) -> Result<(), String> {
    let settings = current_settings(&state)?;
    let root = idle_server_root(&state, &settings)?;
    crate::ini_custom::write(&root, &ini_backup_dir(&state), &custom_list(&state), &changes)
}

/// Names of the ini backups, newest first.
#[tauri::command]
pub fn list_ini_backups(state: State<AppState>) -> Vec<String> {
    ini_settings::list_backups(&ini_backup_dir(&state))
}

/// Puts an ini backup back. Refused while the server runs.
#[tauri::command]
pub fn restore_ini_backup(state: State<AppState>, name: String) -> Result<(), String> {
    let settings = current_settings(&state)?;
    let root = idle_server_root(&state, &settings)?;
    ini_settings::restore_backup(&root, &ini_backup_dir(&state), &name)
}

/// The server folder, once the server is known to be stopped and not configured empty.
fn idle_server_root(state: &State<AppState>, settings: &Settings) -> Result<PathBuf, String> {
    if settings.server_root.trim().is_empty() {
        return Err("not_configured".into());
    }
    let root = PathBuf::from(&settings.server_root);
    let idle = matches!(
        state.supervisor.state(),
        ServerState::Stopped | ServerState::Failed(_)
    );
    if !idle || process::running_info(&server_exe(&root)).is_some() {
        return Err("server_running".into());
    }
    Ok(root)
}

/// Mods in the game client and on the server, with which ones the server loads.
#[tauri::command]
pub fn list_mods(state: State<AppState>) -> Result<Vec<mods::ModView>, String> {
    let settings = current_settings(&state)?;
    Ok(mods::list(&PathBuf::from(&settings.server_root)))
}

/// Makes `ids` the mods the server loads, copying missing ones from the game client.
/// Refused while the server runs: it rewrites its ini on shutdown and would undo the edit.
#[tauri::command]
pub async fn apply_mods(state: State<'_, AppState>, ids: Vec<String>) -> Result<(), String> {
    let settings = current_settings(&state)?;
    let root = idle_server_root(&state, &settings)?;
    tauri::async_runtime::spawn_blocking(move || mods::apply(&root, &ids))
        .await
        .map_err(|e| e.to_string())?
}

/// True when `path` looks like an ARK dedicated server folder.
#[tauri::command]
pub fn check_server_root(path: String) -> bool {
    !path.trim().is_empty() && server_exe(&PathBuf::from(path)).is_file()
}

#[tauri::command]
pub fn save_admin_password(password: String) -> Result<(), String> {
    credentials::save_admin_password(&password)
}

#[tauri::command]
pub fn has_admin_password() -> bool {
    credentials::has_admin_password()
}

/// State of the server whether or not this launcher started it.
#[tauri::command]
pub fn server_overview(state: State<AppState>) -> Result<Overview, String> {
    let settings = current_settings(&state)?;
    let maps = load_registry().map_err(|e| e.to_string())?;
    let own = state.supervisor.state();
    let mut overview = Overview {
        state: own.clone(),
        pid: state.supervisor.pid(),
        external: false,
        map_id: settings.last_map.clone(),
        metrics: None,
        players: None,
        rcon_ready: server_ini::rcon_config(&PathBuf::from(&settings.server_root)).is_some(),
        available_memory_bytes: state
            .probe
            .lock()
            .map_err(|e| e.to_string())?
            .available_memory(),
    };
    if matches!(own, ServerState::Stopped | ServerState::Failed(_))
        && !settings.server_root.trim().is_empty()
    {
        let exe = server_exe(&PathBuf::from(&settings.server_root));
        if let Some(info) = process::running_info(&exe) {
            let game_port = settings.game_port.unwrap_or(DEFAULT_GAME_PORT);
            // Only this run's log counts: the previous run's file still sits
            // there, with its own "started" line, until the server rotates it.
            let log_path = log_file(&settings);
            let log = if modified_since(&log_path, info.started_at_secs) {
                read_from(&log_path, None)
                    .map(|(text, _)| text)
                    .unwrap_or_default()
            } else {
                String::new()
            };
            let port_open = ports::udp_ports_of(info.pid).contains(&game_port);
            overview.state = if is_ready(&log, &settings.ready_marker, port_open) {
                ServerState::Running
            } else {
                ServerState::Starting
            };
            overview.pid = Some(info.pid);
            overview.external = true;
            overview.map_id = process::map_token(&info.args)
                .and_then(|t| maps.iter().find(|m| m.launch_token == t))
                .map(|m| m.id.clone());
        }
    }
    if let Some(pid) = overview.pid {
        overview.metrics = state.probe.lock().map_err(|e| e.to_string())?.sample(pid);
    }
    if overview.state == ServerState::Running {
        let query_port = settings.query_port.unwrap_or(DEFAULT_QUERY_PORT);
        overview.players =
            a2s::query_info(&format!("127.0.0.1:{query_port}"), PLAYER_QUERY_TIMEOUT)
                .ok()
                .map(|info| Players {
                    current: info.players,
                    max: Some(info.max_players)
                        .filter(|m| *m > 0)
                        .or_else(|| server_ini::max_players(&PathBuf::from(&settings.server_root))),
                });
    }
    Ok(overview)
}

#[tauri::command]
pub fn server_logs(state: State<AppState>) -> Result<Vec<String>, String> {
    let buffered = state.supervisor.logs();
    if !buffered.is_empty() {
        return Ok(buffered);
    }
    let settings = current_settings(&state)?;
    let log = log_file(&settings);
    // While a server runs, the log file may still be the previous run's
    // until the new process rotates it. Show nothing rather than old lines.
    let exe = server_exe(&launch_settings(&settings).server_root);
    if let Some(info) = process::running_info(&exe)
        && !modified_since(&log, info.started_at_secs)
    {
        return Ok(Vec::new());
    }
    Ok(tail_file(&log, LOG_LINES).unwrap_or_default())
}

#[tauri::command]
pub fn start_server(state: State<AppState>, map_id: String) -> Result<(), String> {
    let mut settings = current_settings(&state)?;
    let spec = plan_start(&settings, &map_id, udp_port_is_free).map_err(|e| e.code())?;
    state.supervisor.start(spec).map_err(|e| match e {
        StartError::Busy => "busy".to_string(),
        StartError::AlreadyRunning(pid) => format!("already_running:{pid}"),
        StartError::Spawn(msg) => format!("spawn_failed:{msg}"),
    })?;
    settings.last_map = Some(map_id);
    config::save(&state.settings_path, &settings).map_err(|e| e.to_string())
}

fn stop_external(root: &std::path::Path, timeout: Duration) -> bool {
    let exe = server_exe(root);
    let exe = exe.as_path();
    let Some(pid) = process::find_running(exe) else {
        return false;
    };
    shutdown::graceful_shutdown(pid, root);
    let deadline = Instant::now() + timeout;
    while Instant::now() < deadline {
        if process::find_running(exe).is_none() {
            return true;
        }
        std::thread::sleep(Duration::from_millis(500));
    }
    process::force_kill(pid);
    true
}

#[tauri::command]
pub async fn stop_server(state: State<'_, AppState>) -> Result<(), String> {
    let settings = current_settings(&state)?;
    let supervisor = state.supervisor.clone();
    let backups = backup_dir(&state);
    tauri::async_runtime::spawn_blocking(move || {
        let root = PathBuf::from(&settings.server_root);
        match supervisor.stop() {
            Ok(()) => {}
            Err(StopError::NotRunning) => {
                let timeout = Duration::from_secs(settings.stop_timeout_secs);
                if !stop_external(&root, timeout) {
                    return Err("not_running".to_string());
                }
            }
        }
        if settings.backup_on_stop {
            backup_saves(&root, &backups, BACKUPS_TO_KEEP)
                .map_err(|e| format!("backup_failed:{e}"))?;
        }
        Ok(())
    })
    .await
    .map_err(|e| e.to_string())?
}

/// Runs one RCON command against the server on this machine.
fn rcon_command(server_root: &str, command: &str) -> Result<String, String> {
    let config = server_ini::rcon_config(&PathBuf::from(server_root))
        .ok_or_else(|| "rcon_not_configured".to_string())?;
    let addr = format!("127.0.0.1:{}", config.port);
    Rcon::connect(&addr, &config.password, RCON_TIMEOUT)
        .and_then(|mut rcon| rcon.exec(command))
        .map_err(|e| e.code())
}

async fn rcon_async(state: &State<'_, AppState>, command: &'static str) -> Result<String, String> {
    let root = current_settings(state)?.server_root;
    tauri::async_runtime::spawn_blocking(move || rcon_command(&root, command))
        .await
        .map_err(|e| e.to_string())?
}

/// Writes the world to disk now, without stopping the server.
#[tauri::command]
pub async fn save_world(state: State<'_, AppState>) -> Result<String, String> {
    rcon_async(&state, "saveworld").await
}

/// Destroys every wild creature so new ones spawn with the current difficulty.
#[tauri::command]
pub async fn regen_wild_dinos(state: State<'_, AppState>) -> Result<String, String> {
    rcon_async(&state, "DestroyWildDinos").await
}
