use crate::config::Settings;
use crate::launch::{LaunchError, LaunchSettings, LaunchSpec, build_command};
use crate::maps::{find, load_registry};
use std::path::PathBuf;

/// Defaults of the ARK dedicated server, used for the port check when the
/// owner has not set explicit ports.
pub const DEFAULT_GAME_PORT: u16 = 7777;
pub const DEFAULT_QUERY_PORT: u16 = 27015;

#[derive(Debug, PartialEq)]
pub enum PlanError {
    NotConfigured,
    RegistryUnreadable,
    MapNotFound,
    MapNotInstalled,
    Launch(LaunchError),
    PortInUse(u16),
}

impl PlanError {
    /// Stable code the UI maps to a translated message.
    pub fn code(&self) -> String {
        match self {
            Self::NotConfigured => "not_configured".into(),
            Self::RegistryUnreadable => "registry_unreadable".into(),
            Self::MapNotFound => "map_not_found".into(),
            Self::MapNotInstalled => "map_not_installed".into(),
            Self::Launch(LaunchError::EmptySessionName) => "session_name_empty".into(),
            Self::Launch(LaunchError::InvalidSessionName) => "session_name_invalid".into(),
            Self::PortInUse(p) => format!("port_in_use:{p}"),
        }
    }
}

/// Whether a server that is already running has finished starting.
///
/// The server writes `marker` to its log when startup ends. A server whose log
/// is empty (started without `-forcelogflush`) can only be judged by its open
/// game port, which opens earlier than the real end of startup.
pub fn is_ready(log_text: &str, marker: &str, game_port_open: bool) -> bool {
    if log_text.trim().is_empty() {
        return game_port_open;
    }
    !marker.is_empty() && log_text.contains(marker)
}

pub fn launch_settings(s: &Settings) -> LaunchSettings {
    LaunchSettings {
        server_root: PathBuf::from(&s.server_root),
        session_name: s.session_name.clone(),
        game_port: s.game_port,
        query_port: s.query_port,
    }
}

/// Validates everything that can be checked before spawning and returns the
/// command to run. `port_is_free` is injected so the check can be tested.
pub fn plan_start(
    settings: &Settings,
    map_id: &str,
    port_is_free: impl Fn(u16) -> bool,
) -> Result<LaunchSpec, PlanError> {
    if settings.server_root.trim().is_empty() {
        return Err(PlanError::NotConfigured);
    }
    let maps = load_registry().map_err(|_| PlanError::RegistryUnreadable)?;
    let map = find(&maps, map_id).ok_or(PlanError::MapNotFound)?;
    let ls = launch_settings(settings);
    if !map.is_installed(&ls.server_root) {
        return Err(PlanError::MapNotInstalled);
    }
    let spec = build_command(map, &ls).map_err(PlanError::Launch)?;
    let ports = [
        settings.game_port.unwrap_or(DEFAULT_GAME_PORT),
        settings.query_port.unwrap_or(DEFAULT_QUERY_PORT),
    ];
    match ports.into_iter().find(|p| !port_is_free(*p)) {
        Some(port) => Err(PlanError::PortInUse(port)),
        None => Ok(spec),
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::fs;

    fn server_root(tag: &str) -> PathBuf {
        let root = std::env::temp_dir().join(format!("enz-svc-{}-{tag}", std::process::id()));
        let dir = root.join("ShooterGame/Content/Maps/TheIslandSubMaps");
        fs::create_dir_all(&dir).unwrap();
        fs::write(dir.join("TheIsland.umap"), b"x").unwrap();
        root
    }

    fn settings(root: &std::path::Path) -> Settings {
        Settings {
            server_root: root.to_string_lossy().into_owned(),
            ..Settings::default()
        }
    }

    #[test]
    fn ready_when_the_log_carries_the_marker() {
        let log = "BattlEye successfully started.\nServer: \"ENZ\" has successfully started!";
        assert!(is_ready(log, "has successfully started!", false));
    }

    #[test]
    fn an_open_port_alone_is_not_ready_while_the_log_is_speaking() {
        let log = "BattlEye successfully started.";
        assert!(!is_ready(log, "has successfully started!", true));
    }

    #[test]
    fn a_silent_log_falls_back_to_the_port() {
        assert!(is_ready("", "has successfully started!", true));
        assert!(!is_ready("  \n", "has successfully started!", false));
    }

    #[test]
    fn empty_server_root_means_not_configured() {
        assert_eq!(
            plan_start(&Settings::default(), "theisland", |_| true),
            Err(PlanError::NotConfigured)
        );
    }

    #[test]
    fn unknown_map_is_rejected() {
        let root = server_root("unknown");
        assert_eq!(
            plan_start(&settings(&root), "nope", |_| true),
            Err(PlanError::MapNotFound)
        );
        fs::remove_dir_all(root).unwrap();
    }

    #[test]
    fn map_missing_from_disk_is_rejected() {
        let root = server_root("missing");
        assert_eq!(
            plan_start(&settings(&root), "ragnarok", |_| true),
            Err(PlanError::MapNotInstalled)
        );
        fs::remove_dir_all(root).unwrap();
    }

    #[test]
    fn busy_port_blocks_the_start() {
        let root = server_root("port");
        let err = plan_start(&settings(&root), "theisland", |p| p != 27015).unwrap_err();
        assert_eq!(err, PlanError::PortInUse(27015));
        assert_eq!(err.code(), "port_in_use:27015");
        fs::remove_dir_all(root).unwrap();
    }

    #[test]
    fn valid_plan_returns_the_command() {
        let root = server_root("ok");
        let spec = plan_start(&settings(&root), "theisland", |_| true).unwrap();
        assert_eq!(spec.args[0], "TheIsland?listen?SessionName=ENZ");
        fs::remove_dir_all(root).unwrap();
    }
}
