use serde::{Deserialize, Serialize};
use std::io;
use std::path::{Path, PathBuf};

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase", default)]
pub struct Settings {
    pub server_root: String,
    pub session_name: String,
    pub game_port: Option<u16>,
    pub query_port: Option<u16>,
    /// Log text that marks the server as ready. The default is the line the
    /// real server writes when startup ends (about 30 s after it opens its
    /// game port).
    pub ready_marker: String,
    pub stop_timeout_secs: u64,
    pub backup_on_stop: bool,
    /// Map id used by the last start started from this launcher.
    pub last_map: Option<String>,
    /// Open Radmin VPN before the server when started with `--autostart`.
    pub autostart_radmin: bool,
    pub radmin_path: String,
}

impl Default for Settings {
    fn default() -> Self {
        Self {
            server_root: String::new(),
            session_name: "ENZ".into(),
            game_port: None,
            query_port: None,
            ready_marker: "has successfully started!".into(),
            stop_timeout_secs: 60,
            backup_on_stop: true,
            last_map: None,
            autostart_radmin: true,
            radmin_path: r"C:\Program Files (x86)\Radmin VPN\RvRvpnGui.exe".into(),
        }
    }
}

/// `%APPDATA%\enz-launcher\settings.json`. Secrets are never stored here.
pub fn default_path() -> PathBuf {
    let base = std::env::var_os("APPDATA")
        .map(PathBuf::from)
        .unwrap_or_else(std::env::temp_dir);
    base.join("enz-launcher").join("settings.json")
}

pub fn load(path: &Path) -> io::Result<Settings> {
    match std::fs::read_to_string(path) {
        Ok(text) => serde_json::from_str(&text).map_err(io::Error::other),
        Err(e) if e.kind() == io::ErrorKind::NotFound => Ok(Settings::default()),
        Err(e) => Err(e),
    }
}

pub fn save(path: &Path, settings: &Settings) -> io::Result<()> {
    if let Some(dir) = path.parent() {
        std::fs::create_dir_all(dir)?;
    }
    let text = serde_json::to_string_pretty(settings).map_err(io::Error::other)?;
    std::fs::write(path, text)
}

#[cfg(test)]
mod tests {
    use super::*;

    fn temp(name: &str) -> PathBuf {
        std::env::temp_dir().join(format!("enz-cfg-{}-{name}", std::process::id()))
    }

    #[test]
    fn missing_file_yields_defaults() {
        let s = load(&temp("missing.json")).unwrap();
        assert_eq!(s, Settings::default());
    }

    #[test]
    fn save_then_load_round_trips() {
        let path = temp("round").join("settings.json");
        let s = Settings {
            session_name: "Casa".into(),
            game_port: Some(7777),
            ..Settings::default()
        };
        save(&path, &s).unwrap();
        assert_eq!(load(&path).unwrap(), s);
        std::fs::remove_dir_all(path.parent().unwrap()).unwrap();
    }

    #[test]
    fn partial_file_fills_missing_fields_with_defaults() {
        let path = temp("partial.json");
        std::fs::write(&path, r#"{ "sessionName": "X" }"#).unwrap();
        let s = load(&path).unwrap();
        assert_eq!(s.session_name, "X");
        assert_eq!(s.stop_timeout_secs, 60);
        std::fs::remove_file(&path).unwrap();
    }

    #[test]
    fn corrupt_file_is_an_error() {
        let path = temp("bad.json");
        std::fs::write(&path, "{").unwrap();
        assert!(load(&path).is_err());
        std::fs::remove_file(&path).unwrap();
    }
}
