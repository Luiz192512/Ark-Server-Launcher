//! Keys the owner adds by hand (CONFIGURAÇÕES AVANÇADAS / INI PERSONALIZADO). The launcher
//! remembers which keys it created (`custom-ini.json` beside its settings) and only ever edits
//! those lines; keys another screen manages are refused, so two screens never fight over a line.

use crate::ini_catalog::{self, IniFile};
use crate::ini_file;
use crate::ini_settings::{backup_files, path, read_text};
use serde::{Deserialize, Serialize};
use std::fs;
use std::path::Path;

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CustomKey {
    pub file: IniFile,
    pub section: String,
    pub key: String,
}

impl CustomKey {
    fn same(&self, other: &Self) -> bool {
        self.file == other.file
            && self.section.eq_ignore_ascii_case(&other.section)
            && self.key.eq_ignore_ascii_case(&other.key)
    }
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CustomChange {
    #[serde(flatten)]
    pub id: CustomKey,
    /// New value; `None` removes the line and forgets the key.
    pub value: Option<String>,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct IniLine {
    pub key: String,
    /// `None` for a key that looks secret: only `is_set` is told.
    pub value: Option<String>,
    pub secret: bool,
    pub is_set: bool,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct IniSection {
    pub file: IniFile,
    pub section: String,
    pub lines: Vec<IniLine>,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct CustomState {
    /// The keys this screen created, in the order they were added.
    pub tracked: Vec<CustomKey>,
    /// Every section of both files with its lines, so the UI can warn before replacing one.
    pub sections: Vec<IniSection>,
}

const FILES: [IniFile; 2] = [IniFile::Game, IniFile::Gus];

pub fn is_secret(key: &str) -> bool {
    let k = key.to_ascii_lowercase();
    ["password", "token", "secret"].iter().any(|w| k.contains(w))
}

/// `Err` with the code the UI translates; `Ok` when the key may be written here.
fn check(id: &CustomKey, value: Option<&str>) -> Result<(), String> {
    let key = id.key.trim();
    if key.starts_with('-') || key.starts_with('?') {
        return Err("custom_cmdline".into());
    }
    let (name, index) = match key.strip_suffix(']').and_then(|k| k.split_once('[')) {
        Some((n, i)) => (n, Some(i)),
        None => (key, None),
    };
    let ident = |s: &str| !s.is_empty() && s.bytes().all(|b| b.is_ascii_alphanumeric() || b == b'_');
    if key.len() > 128 || !ident(name) || index.is_some_and(|i| i.is_empty() || !i.bytes().all(|b| b.is_ascii_digit())) {
        return Err("custom_bad_key".into());
    }
    if let Some(e) = ini_catalog::find(key).or_else(|| ini_catalog::find(name)) {
        return Err(format!("custom_managed:{}", e.group));
    }
    if id.file == IniFile::Gus && name.eq_ignore_ascii_case("ActiveMods") {
        return Err("custom_managed:mods".into());
    }
    let inner = id.section.strip_prefix('[').and_then(|s| s.strip_suffix(']'));
    if id.section.len() > 160
        || !inner.is_some_and(|s| !s.trim().is_empty() && !s.contains(['[', ']']) && !s.chars().any(char::is_control))
    {
        return Err("custom_bad_section".into());
    }
    // A line break would start a new key or a new section, so it is never accepted.
    if value.is_some_and(|v| v.len() > 1024 || v.chars().any(char::is_control)) {
        return Err("custom_bad_value".into());
    }
    Ok(())
}

pub fn read_tracked(list: &Path) -> Vec<CustomKey> {
    fs::read_to_string(list)
        .ok()
        .and_then(|t| serde_json::from_str(&t).ok())
        .unwrap_or_default()
}

pub fn read(server_root: &Path, list: &Path) -> CustomState {
    let mut sections = Vec::new();
    for file in FILES {
        let text = read_text(&path(server_root, file)).unwrap_or_default();
        for section in ini_file::sections(&text) {
            let lines = ini_file::lines(&text, &section)
                .into_iter()
                .map(|(key, value)| {
                    let secret = is_secret(&key);
                    IniLine {
                        is_set: !value.is_empty(),
                        value: (!secret).then_some(value),
                        secret,
                        key,
                    }
                })
                .collect();
            sections.push(IniSection { file, section, lines });
        }
    }
    CustomState { tracked: read_tracked(list), sections }
}

/// Applies the changes after a backup of both ini files, then updates the tracked list.
/// Nothing is written when any change is refused.
pub fn write(server_root: &Path, backup_root: &Path, list: &Path, changes: &[CustomChange]) -> Result<(), String> {
    for c in changes {
        check(&c.id, c.value.as_deref())?;
    }
    let mut edits = Vec::new();
    for file in FILES.into_iter().filter(|f| changes.iter().any(|c| c.id.file == *f)) {
        let original = read_text(&path(server_root, file))?;
        let mut text = original.clone();
        for c in changes.iter().filter(|c| c.id.file == file) {
            let key = c.id.key.trim();
            text = match &c.value {
                Some(v) => ini_file::set_value(&text, c.id.section.trim(), key, v),
                None => ini_file::remove_value(&text, c.id.section.trim(), key),
            };
        }
        if text != original {
            edits.push((file, text));
        }
    }
    if !edits.is_empty() {
        backup_files(server_root, backup_root)?;
        for (file, text) in edits {
            let target = path(server_root, file);
            if let Some(dir) = target.parent() {
                fs::create_dir_all(dir).map_err(|e| e.to_string())?;
            }
            fs::write(target, text).map_err(|e| e.to_string())?;
        }
    }

    let mut tracked = read_tracked(list);
    for c in changes {
        let id = CustomKey { key: c.id.key.trim().to_owned(), section: c.id.section.trim().to_owned(), file: c.id.file };
        tracked.retain(|t| !t.same(&id));
        if c.value.is_some() {
            tracked.push(id);
        }
    }
    if let Some(dir) = list.parent() {
        fs::create_dir_all(dir).map_err(|e| e.to_string())?;
    }
    let json = serde_json::to_string_pretty(&tracked).map_err(|e| e.to_string())?;
    fs::write(list, json).map_err(|e| e.to_string())
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::ini_settings::list_backups;
    use std::path::PathBuf;

    fn temp(tag: &str) -> PathBuf {
        let p = std::env::temp_dir().join(format!("enz-custom-{}-{tag}", std::process::id()));
        let _ = fs::remove_dir_all(&p);
        fs::create_dir_all(&p).unwrap();
        p
    }
    fn put(root: &Path, file: IniFile, text: &str) {
        let p = path(root, file);
        fs::create_dir_all(p.parent().unwrap()).unwrap();
        fs::write(p, text).unwrap();
    }
    fn change(file: IniFile, section: &str, key: &str, value: Option<&str>) -> CustomChange {
        CustomChange {
            id: CustomKey { file, section: section.into(), key: key.into() },
            value: value.map(str::to_owned),
        }
    }
    const GM: &str = "[/script/shootergame.shootergamemode]";

    #[test]
    fn adds_edits_and_removes_only_its_own_line() {
        let (root, bk, list) = (temp("rw"), temp("rw-bk"), temp("rw-list").join("custom-ini.json"));
        let game = "[/Script/ShooterGame.ShooterGameMode]\r\nKillXPMultiplier=2\r\nbUseSingleplayerSettings=True\r\n";
        put(&root, IniFile::Game, game);
        write(&root, &bk, &list, &[change(IniFile::Game, GM, "bUseSingleplayerSettings", Some("False"))]).unwrap();
        write(&root, &bk, &list, &[change(IniFile::Gus, "[ServerSettings]", "KickIdlePlayersPeriod", Some("3600"))]).unwrap();
        assert_eq!(
            fs::read_to_string(path(&root, IniFile::Game)).unwrap(),
            "[/Script/ShooterGame.ShooterGameMode]\r\nKillXPMultiplier=2\r\nbUseSingleplayerSettings=False\r\n"
        );
        assert_eq!(fs::read_to_string(path(&root, IniFile::Gus)).unwrap(), "[ServerSettings]\nKickIdlePlayersPeriod=3600\n");
        let state = read(&root, &list);
        assert_eq!(state.tracked.len(), 2);
        assert!(state.sections.iter().any(|s| s.section == "[ServerSettings]" && s.lines[0].key == "KickIdlePlayersPeriod"));
        assert_eq!(list_backups(&bk).len(), 2, "each write backs up the files that exist");

        write(&root, &bk, &list, &[change(IniFile::Game, GM, "BUSESINGLEPLAYERSETTINGS", None)]).unwrap();
        assert_eq!(
            fs::read_to_string(path(&root, IniFile::Game)).unwrap(),
            "[/Script/ShooterGame.ShooterGameMode]\r\nKillXPMultiplier=2\r\n"
        );
        assert_eq!(read_tracked(&list), vec![CustomKey { file: IniFile::Gus, section: "[ServerSettings]".into(), key: "KickIdlePlayersPeriod".into() }]);
    }

    #[test]
    fn refuses_managed_keys_command_line_options_and_injection() {
        let (root, bk, list) = (temp("bad"), temp("bad-bk"), temp("bad-list").join("c.json"));
        put(&root, IniFile::Game, "[/script/shootergame.shootergamemode]\nA=1\n");
        let refused = |c: CustomChange| write(&root, &bk, &list, &[c]).unwrap_err();
        assert_eq!(refused(change(IniFile::Game, GM, "KillXPMultiplier", Some("2"))), "custom_managed:xp");
        assert_eq!(refused(change(IniFile::Game, GM, "PerLevelStatsMultiplier_Player[0]", Some("2"))), "custom_managed:player");
        assert_eq!(refused(change(IniFile::Gus, "[ServerSettings]", "ActiveMods", Some("1"))), "custom_managed:mods");
        assert_eq!(refused(change(IniFile::Game, GM, "-ForceRespawnDinos", Some(""))), "custom_cmdline");
        assert_eq!(refused(change(IniFile::Game, GM, "A=B", Some("1"))), "custom_bad_key");
        assert_eq!(refused(change(IniFile::Game, "ServerSettings", "Foo", Some("1"))), "custom_bad_section");
        assert_eq!(refused(change(IniFile::Game, GM, "Foo", Some("1\n[ServerSettings]"))), "custom_bad_value");
        assert_eq!(fs::read_to_string(path(&root, IniFile::Game)).unwrap(), "[/script/shootergame.shootergamemode]\nA=1\n");
        assert!(list_backups(&bk).is_empty() && !list.exists());
    }

    #[test]
    fn secret_looking_values_are_never_returned() {
        let (root, list) = (temp("sec"), temp("sec-list").join("c.json"));
        put(&root, IniFile::Gus, "[ServerSettings]\nSpectatorPassword=hunter2\nKickIdlePlayersPeriod=3600\n");
        let state = read(&root, &list);
        let lines = &state.sections[0].lines;
        assert!(lines[0].secret && lines[0].is_set && lines[0].value.is_none());
        assert_eq!(lines[1].value.as_deref(), Some("3600"));
    }
}
