use crate::ini_catalog::{self, IniFile};
use crate::ini_file::set_value;
use crate::ini_settings;
use std::collections::HashMap;
use std::path::{Path, PathBuf};

const SESSION_SECTION: &str = "[/Script/Engine.GameSession]";
const SERVER_SECTION: &str = "[ServerSettings]";

fn ini_path(server_root: &Path) -> PathBuf {
    ini_settings::path(server_root, IniFile::Gus)
}

fn is_legacy(key: &str) -> bool {
    ini_catalog::find(key).is_some_and(|e| e.legacy)
}

/// Current values of the settings the SERVIDOR E MAPA tab edits. Keys missing from the ini are absent.
pub fn read_options(server_root: &Path) -> HashMap<String, String> {
    let mut options = ini_settings::read_raw(server_root);
    options.retain(|key, _| is_legacy(key));
    options
}

/// Writes the given options into the ini, keeping every other line as it was, after a backup.
/// `Err` carries the name of the first unknown key or invalid value.
pub fn write_options(
    server_root: &Path,
    backup_root: &Path,
    options: &HashMap<String, String>,
) -> Result<(), String> {
    if let Some(key) = options.keys().find(|k| !is_legacy(k)) {
        return Err(format!("invalid_option:{key}"));
    }
    let changes = options
        .iter()
        .map(|(k, v)| (k.clone(), Some(v.clone())))
        .collect();
    ini_settings::write_values(server_root, backup_root, &changes)
}

const ACTIVE_MODS_KEY: &str = "ActiveMods";

/// Mod ids the server loads (`ActiveMods`), in order.
pub fn read_active_mods(server_root: &Path) -> Vec<String> {
    parse_active_mods(&std::fs::read_to_string(ini_path(server_root)).unwrap_or_default())
}

fn parse_active_mods(ini: &str) -> Vec<String> {
    let mut in_section = false;
    for line in ini.lines().map(str::trim) {
        if line.starts_with('[') {
            in_section = line.eq_ignore_ascii_case(SERVER_SECTION);
        } else if in_section
            && let Some((key, value)) = line.split_once('=')
            && key.trim().eq_ignore_ascii_case(ACTIVE_MODS_KEY)
        {
            return value
                .split(',')
                .map(str::trim)
                .filter(|id| !id.is_empty())
                .map(str::to_owned)
                .collect();
        }
    }
    Vec::new()
}

/// Sets `ActiveMods`, keeping every other line. The caller checks that the ids are numbers.
pub fn write_active_mods(server_root: &Path, ids: &[String]) -> Result<(), String> {
    let path = ini_path(server_root);
    let ini = std::fs::read_to_string(&path).unwrap_or_default();
    let ini = set_value(&ini, SERVER_SECTION, ACTIVE_MODS_KEY, &ids.join(","));
    if let Some(dir) = path.parent() {
        std::fs::create_dir_all(dir).map_err(|e| e.to_string())?;
    }
    std::fs::write(path, ini).map_err(|e| e.to_string())
}

/// `MaxPlayers` from the server's own `GameUserSettings.ini`. The query port
/// of the real server reports a maximum of 0, so this is where the limit comes from.
pub fn max_players(server_root: &Path) -> Option<u8> {
    let path = server_root.join("ShooterGame/Saved/Config/WindowsServer/GameUserSettings.ini");
    parse_max_players(&std::fs::read_to_string(path).ok()?)
}

const DEFAULT_RCON_PORT: u16 = 27020;

/// What the launcher needs to talk RCON to the server.
#[derive(Debug, PartialEq)]
pub struct RconConfig {
    pub port: u16,
    pub password: String,
}

/// RCON settings from the server's ini. `None` unless `RCONEnabled=True` and a
/// `ServerAdminPassword` exist, which is exactly when the server accepts RCON.
pub fn rcon_config(server_root: &Path) -> Option<RconConfig> {
    let path = server_root.join("ShooterGame/Saved/Config/WindowsServer/GameUserSettings.ini");
    parse_rcon(&std::fs::read_to_string(path).ok()?)
}

fn parse_rcon(ini: &str) -> Option<RconConfig> {
    let (mut enabled, mut port, mut password) = (false, DEFAULT_RCON_PORT, String::new());
    let mut in_section = false;
    for line in ini.lines().map(str::trim) {
        if line.starts_with('[') {
            in_section = line.eq_ignore_ascii_case("[ServerSettings]");
        } else if in_section && let Some((key, value)) = line.split_once('=') {
            let value = value.trim();
            match key.trim().to_ascii_lowercase().as_str() {
                "rconenabled" => enabled = value.eq_ignore_ascii_case("true"),
                "rconport" => port = value.parse().unwrap_or(DEFAULT_RCON_PORT),
                "serveradminpassword" => password = value.to_owned(),
                _ => {}
            }
        }
    }
    (enabled && !password.is_empty()).then_some(RconConfig { port, password })
}

fn parse_max_players(ini: &str) -> Option<u8> {
    let mut in_section = false;
    for line in ini.lines().map(str::trim) {
        if line.starts_with('[') {
            in_section = line.eq_ignore_ascii_case(SESSION_SECTION);
        } else if in_section
            && let Some((key, value)) = line.split_once('=')
            && key.trim().eq_ignore_ascii_case("MaxPlayers")
        {
            return value.trim().parse().ok().filter(|n| *n > 0);
        }
    }
    None
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn reads_the_value_from_the_game_session_section() {
        let ini = "[ServerSettings]\nMaxPlayers=5\n[/Script/Engine.GameSession]\nMaxPlayers=70\n";
        assert_eq!(parse_max_players(ini), Some(70));
    }

    #[test]
    fn ignores_the_key_in_other_sections_and_bad_values() {
        assert_eq!(parse_max_players("[Other]\nMaxPlayers=9\n"), None);
        assert_eq!(
            parse_max_players("[/Script/Engine.GameSession]\nMaxPlayers=abc\n"),
            None
        );
        assert_eq!(
            parse_max_players("[/Script/Engine.GameSession]\nMaxPlayers=0\n"),
            None
        );
    }

    #[test]
    fn rcon_needs_both_the_switch_and_a_password() {
        let on = "[ServerSettings]\nRCONEnabled=True\nRCONPort=27021\nServerAdminPassword=abc\n";
        assert_eq!(
            parse_rcon(on),
            Some(RconConfig {
                port: 27021,
                password: "abc".into()
            })
        );
        assert_eq!(
            parse_rcon("[ServerSettings]\nServerAdminPassword=abc\n"),
            None
        );
        assert_eq!(parse_rcon("[ServerSettings]\nRCONEnabled=True\n"), None);
        assert_eq!(
            parse_rcon("[ServerSettings]\nRCONEnabled=False\nServerAdminPassword=a\n"),
            None
        );
    }

    #[test]
    fn rcon_port_defaults_and_other_sections_are_ignored() {
        let ini = "[Other]\nServerAdminPassword=no\nRCONEnabled=True\n[ServerSettings]\nRCONEnabled=true\nServerAdminPassword=yes\n";
        assert_eq!(
            parse_rcon(ini),
            Some(RconConfig {
                port: 27020,
                password: "yes".into()
            })
        );
    }

    #[test]
    fn set_value_replaces_inserts_and_adds_sections() {
        let ini = "[ServerSettings]\r\nXPMultiplier=1.0\r\nRCONEnabled=True\r\n\r\n[Other]\r\nA=1\r\n";
        let out = set_value(ini, SERVER_SECTION, "xpmultiplier", "3");
        assert!(out.contains("xpmultiplier=3\r\nRCONEnabled=True\r\n\r\n[Other]"));
        let out = set_value(ini, SERVER_SECTION, "ServerPVE", "True");
        assert!(out.contains("RCONEnabled=True\r\nServerPVE=True\r\n\r\n[Other]"));
        let out = set_value("[Other]\nA=1\n", SESSION_SECTION, "MaxPlayers", "10");
        assert_eq!(out, "[Other]\nA=1\n[/Script/Engine.GameSession]\nMaxPlayers=10\n");
    }

    #[test]
    fn options_round_trip_and_reject_bad_input() {
        let root = std::env::temp_dir().join(format!("enz-opt-{}", std::process::id()));
        let mut o = HashMap::new();
        o.insert("MaxPlayers".to_owned(), "20".to_owned());
        o.insert("serverPVE".to_owned(), "True".to_owned());
        let backups = root.join("backups");
        write_options(&root, &backups, &o).unwrap();
        assert_eq!(read_options(&root), o);
        for (k, v) in [("MaxPlayers", "0"), ("serverPVE", "yes"), ("XPMultiplier", "-1"), ("ServerPassword", "a\nb"), ("RCONPort", "1")] {
            let bad = HashMap::from([(k.to_owned(), v.to_owned())]);
            assert!(write_options(&root, &backups, &bad).is_err(), "{k}={v}");
        }
        std::fs::remove_dir_all(root).unwrap();
    }

    #[test]
    fn a_missing_file_gives_none() {
        assert_eq!(max_players(Path::new("Z:/nope")), None);
    }
}
