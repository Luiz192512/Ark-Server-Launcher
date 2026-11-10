use crate::maps::MapEntry;
use std::path::PathBuf;

const MAX_SESSION_NAME: usize = 64;

#[derive(Debug, Clone, PartialEq)]
pub struct LaunchSettings {
    pub server_root: PathBuf,
    pub session_name: String,
    pub game_port: Option<u16>,
    pub query_port: Option<u16>,
}

#[derive(Debug, Clone, PartialEq)]
pub struct LaunchSpec {
    pub exe: PathBuf,
    pub args: Vec<String>,
    pub log_file: PathBuf,
}

#[derive(Debug, PartialEq)]
pub enum LaunchError {
    EmptySessionName,
    InvalidSessionName,
}

pub fn server_exe(server_root: &std::path::Path) -> PathBuf {
    server_root
        .join("ShooterGame")
        .join("Binaries")
        .join("Win64")
        .join("ShooterGameServer.exe")
}

fn session_name_is_valid(name: &str) -> bool {
    name.chars().count() <= MAX_SESSION_NAME
        && !name.chars().any(|c| c == '?' || c == '"' || c.is_control())
}

/// Builds the executable and argument vector. No shell is involved, so the
/// session name is passed as data and cannot inject extra arguments.
pub fn build_command(map: &MapEntry, s: &LaunchSettings) -> Result<LaunchSpec, LaunchError> {
    let name = s.session_name.trim();
    if name.is_empty() {
        return Err(LaunchError::EmptySessionName);
    }
    if !session_name_is_valid(name) {
        return Err(LaunchError::InvalidSessionName);
    }
    let mut level = format!("{}?listen?SessionName={}", map.launch_token, name);
    if let Some(port) = s.game_port {
        level.push_str(&format!("?Port={port}"));
    }
    if let Some(port) = s.query_port {
        level.push_str(&format!("?QueryPort={port}"));
    }
    Ok(LaunchSpec {
        exe: server_exe(&s.server_root),
        // No -log: it makes the server open its own console window, which the
        // launcher cannot hide. The log file is written anyway, and
        // -forcelogflush is what keeps ShooterGame.log from staying empty.
        args: vec![level, "-server".into(), "-forcelogflush".into()],
        log_file: s
            .server_root
            .join("ShooterGame")
            .join("Saved")
            .join("Logs")
            .join("ShooterGame.log"),
    })
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::maps::{find, load_registry};

    fn settings(name: &str) -> LaunchSettings {
        LaunchSettings {
            server_root: PathBuf::from(r"C:\ark"),
            session_name: name.into(),
            game_port: None,
            query_port: None,
        }
    }

    fn island() -> MapEntry {
        find(&load_registry().unwrap(), "theisland")
            .unwrap()
            .clone()
    }

    #[test]
    fn builds_the_current_command_line() {
        let spec = build_command(&island(), &settings("ENZ")).unwrap();
        assert_eq!(
            spec.args,
            vec![
                "TheIsland?listen?SessionName=ENZ",
                "-server",
                "-forcelogflush"
            ]
        );
        assert!(
            spec.exe
                .ends_with("ShooterGame/Binaries/Win64/ShooterGameServer.exe")
        );
    }

    #[test]
    fn appends_ports_only_when_set() {
        let mut s = settings("ENZ");
        s.game_port = Some(7777);
        s.query_port = Some(27015);
        let spec = build_command(&island(), &s).unwrap();
        assert_eq!(
            spec.args[0],
            "TheIsland?listen?SessionName=ENZ?Port=7777?QueryPort=27015"
        );
    }

    #[test]
    fn rejects_empty_and_injecting_session_names() {
        assert_eq!(
            build_command(&island(), &settings("  ")),
            Err(LaunchError::EmptySessionName)
        );
        assert_eq!(
            build_command(&island(), &settings("a?b")),
            Err(LaunchError::InvalidSessionName)
        );
        assert_eq!(
            build_command(&island(), &settings("a\"b")),
            Err(LaunchError::InvalidSessionName)
        );
        assert_eq!(
            build_command(&island(), &settings(&"x".repeat(65))),
            Err(LaunchError::InvalidSessionName)
        );
    }

    #[test]
    fn keeps_spaces_inside_one_argument() {
        let spec = build_command(&island(), &settings("My Server")).unwrap();
        assert_eq!(spec.args.len(), 3);
        assert!(
            !spec.args.iter().any(|a| a == "-log"),
            "-log opens a window"
        );
        assert!(spec.args[0].ends_with("SessionName=My Server"));
    }
}
