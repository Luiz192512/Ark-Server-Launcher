//! Reads and writes the catalog settings in the server's `Game.ini` and `GameUserSettings.ini`.
//! Every write backs both files up first, and only touches the lines of the keys it was given.

use crate::backup::prune;
use crate::ini_catalog::{self, IniFile, Kind};
use crate::ini_file;
use serde::Serialize;
use std::collections::HashMap;
use std::fs;
use std::io;
use std::path::{Path, PathBuf};
use std::time::{SystemTime, UNIX_EPOCH};

const FILES: [IniFile; 2] = [IniFile::Game, IniFile::Gus];
const BACKUPS_TO_KEEP: usize = 10;

pub fn path(server_root: &Path, file: IniFile) -> PathBuf {
    server_root
        .join("ShooterGame/Saved/Config/WindowsServer")
        .join(file.file_name())
}

/// A file that does not exist yet reads as empty. Any other failure is an error,
/// so an unreadable file is never overwritten by a write built from nothing.
pub(crate) fn read_text(path: &Path) -> Result<String, String> {
    match fs::read_to_string(path) {
        Ok(text) => Ok(text),
        Err(e) if e.kind() == io::ErrorKind::NotFound => Ok(String::new()),
        Err(e) => Err(e.to_string()),
    }
}

/// Current value of every catalog key that the files set (the last line wins, as in ARK).
pub fn read_raw(server_root: &Path) -> HashMap<String, String> {
    let mut out = HashMap::new();
    for file in FILES {
        let text = read_text(&path(server_root, file)).unwrap_or_default();
        for entry in ini_catalog::catalog().iter().filter(|e| e.file == file) {
            for key in entry.keys() {
                let mut values = ini_file::get_values(&text, &entry.section, &key);
                if entry.kind == Kind::List {
                    if !values.is_empty() {
                        out.insert(key, values.join("\n"));
                    }
                } else if let Some(value) = values.pop() {
                    out.insert(key, value);
                }
            }
        }
    }
    out
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct IniValues {
    /// Secret keys are left out.
    pub values: HashMap<String, String>,
    /// Secret keys that have a value in the file.
    pub secrets_set: Vec<String>,
}

pub fn read_values(server_root: &Path) -> IniValues {
    let mut values = read_raw(server_root);
    let mut secrets_set = Vec::new();
    values.retain(|key, value| {
        let secret = ini_catalog::find(key).is_some_and(|e| e.secret);
        if secret && !value.is_empty() {
            secrets_set.push(key.clone());
        }
        !secret
    });
    secrets_set.sort();
    IniValues { values, secrets_set }
}

/// Copies the existing ini files to `<backup_root>/<unix ms>/` and keeps the newest 10 folders.
pub(crate) fn backup_files(server_root: &Path, backup_root: &Path) -> Result<(), String> {
    let existing: Vec<(IniFile, PathBuf)> = FILES
        .into_iter()
        .map(|f| (f, path(server_root, f)))
        .filter(|(_, p)| p.is_file())
        .collect();
    if existing.is_empty() {
        return Ok(());
    }
    let mut stamp = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .map_or(0, |d| d.as_millis() as u64);
    let mut target = backup_root.join(stamp.to_string());
    while target.exists() {
        stamp += 1;
        target = backup_root.join(stamp.to_string());
    }
    fs::create_dir_all(&target).map_err(|e| e.to_string())?;
    for (file, source) in existing {
        fs::copy(source, target.join(file.file_name())).map_err(|e| e.to_string())?;
    }
    prune(backup_root, BACKUPS_TO_KEEP).map_err(|e| e.to_string())
}

/// Applies `changes` (key to new value, or `None` to go back to the game's default).
/// `Err("invalid_option:<key>")` for a key outside the catalog or a value its kind refuses;
/// nothing is written in that case.
pub fn write_values(
    server_root: &Path,
    backup_root: &Path,
    changes: &HashMap<String, Option<String>>,
) -> Result<(), String> {
    let mut plan = Vec::new();
    for (key, value) in changes {
        let invalid = || format!("invalid_option:{key}");
        let entry = ini_catalog::find(key).ok_or_else(invalid)?;
        if value.as_deref().is_some_and(|v| !entry.is_valid(v)) {
            return Err(invalid());
        }
        let canonical = entry
            .keys()
            .into_iter()
            .find(|k| k.eq_ignore_ascii_case(key))
            .ok_or_else(invalid)?;
        plan.push((entry, canonical, value));
    }

    let mut edits = Vec::new();
    for file in FILES.into_iter().filter(|f| plan.iter().any(|(e, ..)| e.file == *f)) {
        let original = read_text(&path(server_root, file))?;
        let mut edited = original.clone();
        for (entry, key, value) in plan.iter().filter(|(e, ..)| e.file == file) {
            edited = match value {
                // The same rules again leave the file alone, even when its lines are apart.
                Some(v) if entry.kind == Kind::List
                    && ini_file::get_values(&edited, &entry.section, key).join("\n") == *v =>
                {
                    edited
                }
                Some(v) if entry.kind == Kind::List => {
                    let lines: Vec<String> = v.split('\n').map(str::to_owned).collect();
                    ini_file::set_values(&edited, &entry.section, key, &lines)
                }
                Some(v) => ini_file::set_value(&edited, &entry.section, key, v),
                None => ini_file::remove_value(&edited, &entry.section, key),
            };
        }
        if edited != original {
            edits.push((file, edited));
        }
    }
    if edits.is_empty() {
        return Ok(());
    }
    backup_files(server_root, backup_root)?;
    for (file, text) in edits {
        let target = path(server_root, file);
        if let Some(dir) = target.parent() {
            fs::create_dir_all(dir).map_err(|e| e.to_string())?;
        }
        fs::write(target, text).map_err(|e| e.to_string())?;
    }
    Ok(())
}

/// Backup names, newest first.
pub fn list_backups(backup_root: &Path) -> Vec<String> {
    let mut names: Vec<u64> = fs::read_dir(backup_root)
        .into_iter()
        .flatten()
        .filter_map(Result::ok)
        .filter_map(|e| e.file_name().to_string_lossy().parse().ok())
        .collect();
    names.sort_unstable_by(|a, b| b.cmp(a));
    names.into_iter().map(|n| n.to_string()).collect()
}

/// Puts the files of backup `name` back. The current files are backed up first, so a
/// restore can be undone with another restore.
pub fn restore_backup(server_root: &Path, backup_root: &Path, name: &str) -> Result<(), String> {
    if name.is_empty() || !name.bytes().all(|b| b.is_ascii_digit()) {
        return Err("backup_not_found".into());
    }
    let source = backup_root.join(name);
    if !source.is_dir() {
        return Err("backup_not_found".into());
    }
    backup_files(server_root, backup_root)?;
    for file in FILES {
        let from = source.join(file.file_name());
        if from.is_file() {
            let to = path(server_root, file);
            if let Some(dir) = to.parent() {
                fs::create_dir_all(dir).map_err(|e| e.to_string())?;
            }
            fs::copy(from, to).map_err(|e| e.to_string())?;
        }
    }
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;

    fn temp(tag: &str) -> PathBuf {
        let p = std::env::temp_dir().join(format!("enz-ini-{}-{tag}", std::process::id()));
        let _ = fs::remove_dir_all(&p);
        fs::create_dir_all(&p).unwrap();
        p
    }

    fn put(root: &Path, file: IniFile, text: &str) {
        let p = path(root, file);
        fs::create_dir_all(p.parent().unwrap()).unwrap();
        fs::write(p, text).unwrap();
    }

    fn set(pairs: &[(&str, Option<&str>)]) -> HashMap<String, Option<String>> {
        pairs
            .iter()
            .map(|(k, v)| ((*k).to_owned(), v.map(str::to_owned)))
            .collect()
    }

    const GAME: &str = "; mine\r\n[/Script/ShooterGame.ShooterGameMode]\r\nPerLevelStatsMultiplier_DinoTamed[0]=0.600000\r\nUnknownKey=keep\r\n";

    #[test]
    fn writes_both_files_keeping_everything_else_and_reads_back() {
        let (root, bk) = (temp("rw"), temp("rw-bk"));
        put(&root, IniFile::Game, GAME);
        put(&root, IniFile::Gus, "[ServerSettings]\nXPMultiplier=1.2\n");
        let changes = set(&[
            ("KillXPMultiplier", Some("2")),
            ("PerLevelStatsMultiplier_DinoTamed[1]", Some("0.5")),
            ("RCONEnabled", Some("True")),
        ]);
        write_values(&root, &bk, &changes).unwrap();
        let game = fs::read_to_string(path(&root, IniFile::Game)).unwrap();
        assert!(game.starts_with("; mine\r\n[/Script/ShooterGame.ShooterGameMode]\r\n"));
        assert!(game.contains("PerLevelStatsMultiplier_DinoTamed[0]=0.600000\r\n"));
        assert!(game.contains("UnknownKey=keep\r\n"));
        assert!(game.contains("KillXPMultiplier=2\r\n"));
        let raw = read_raw(&root);
        assert_eq!(raw["KillXPMultiplier"], "2");
        assert_eq!(raw["PerLevelStatsMultiplier_DinoTamed[1]"], "0.5");
        assert_eq!(raw["PerLevelStatsMultiplier_DinoTamed[0]"], "0.600000");
        assert_eq!(raw["RCONEnabled"], "True");
        assert_eq!(raw["XPMultiplier"], "1.2");
        assert!(!raw.contains_key("UnknownKey"));
    }

    #[test]
    fn a_list_round_trips_as_one_line_per_rule_in_place() {
        let (root, bk) = (temp("list"), temp("list-bk"));
        let npc = |a: &str, b: &str| format!(r#"NPCReplacements=(FromClassName="{a}",ToClassName="{b}")"#);
        let original = format!(
            "[/Script/ShooterGame.ShooterGameMode]\r\nKillXPMultiplier=2\r\n{}\r\nUnknownKey=keep\r\n{}\r\n",
            npc("A_C", "B_C"),
            npc("C_C", "D_C")
        );
        put(&root, IniFile::Game, &original);
        let read = read_raw(&root);
        assert_eq!(read["NPCReplacements"].lines().count(), 2);
        // Writing back what was read changes nothing and makes no backup.
        write_values(&root, &bk, &set(&[("NPCReplacements", Some(&read["NPCReplacements"]))])).unwrap();
        assert_eq!(fs::read_to_string(path(&root, IniFile::Game)).unwrap(), original);
        assert!(list_backups(&bk).is_empty());

        let three = [npc("A_C", "B_C"), npc("X_C", "Y_C"), npc("C_C", "D_C")]
            .map(|l| l.trim_start_matches("NPCReplacements=").to_owned())
            .join("\n");
        write_values(&root, &bk, &set(&[("NPCReplacements", Some(&three))])).unwrap();
        assert_eq!(
            fs::read_to_string(path(&root, IniFile::Game)).unwrap(),
            format!(
                "[/Script/ShooterGame.ShooterGameMode]\r\nKillXPMultiplier=2\r\n{}\r\n{}\r\n{}\r\nUnknownKey=keep\r\n",
                npc("A_C", "B_C"),
                npc("X_C", "Y_C"),
                npc("C_C", "D_C")
            )
        );
        write_values(&root, &bk, &set(&[("NPCReplacements", None)])).unwrap();
        assert_eq!(
            fs::read_to_string(path(&root, IniFile::Game)).unwrap(),
            "[/Script/ShooterGame.ShooterGameMode]\r\nKillXPMultiplier=2\r\nUnknownKey=keep\r\n"
        );
        assert!(write_values(&root, &bk, &set(&[("NPCReplacements", Some("(FromClassName=\"A_C\")"))])).is_err());
    }

    #[test]
    fn restoring_a_default_removes_only_that_line() {
        let (root, bk) = (temp("def"), temp("def-bk"));
        put(&root, IniFile::Game, "[/script/shootergame.shootergamemode]\nKillXPMultiplier=2\nUnknownKey=keep\n");
        write_values(&root, &bk, &set(&[("KillXPMultiplier", None)])).unwrap();
        assert_eq!(
            fs::read_to_string(path(&root, IniFile::Game)).unwrap(),
            "[/script/shootergame.shootergamemode]\nUnknownKey=keep\n"
        );
    }

    #[test]
    fn a_backup_of_both_files_is_made_before_the_write_and_can_be_restored() {
        let (root, bk) = (temp("bk"), temp("bk-bk"));
        let gus = "[ServerSettings]\nXPMultiplier=1.2\n";
        put(&root, IniFile::Game, GAME);
        put(&root, IniFile::Gus, gus);
        write_values(&root, &bk, &set(&[("KillXPMultiplier", Some("2")), ("XPMultiplier", Some("9"))])).unwrap();
        let names = list_backups(&bk);
        assert_eq!(names.len(), 1);
        assert_eq!(fs::read_to_string(bk.join(&names[0]).join("Game.ini")).unwrap(), GAME);
        assert_eq!(fs::read_to_string(bk.join(&names[0]).join("GameUserSettings.ini")).unwrap(), gus);

        restore_backup(&root, &bk, &names[0]).unwrap();
        assert_eq!(fs::read_to_string(path(&root, IniFile::Game)).unwrap(), GAME);
        assert_eq!(fs::read_to_string(path(&root, IniFile::Gus)).unwrap(), gus);
        assert_eq!(list_backups(&bk).len(), 2, "the restore backed up the edited files first");
        assert_eq!(restore_backup(&root, &bk, "../x"), Err("backup_not_found".into()));
        assert_eq!(restore_backup(&root, &bk, "123"), Err("backup_not_found".into()));
    }

    #[test]
    fn no_change_means_no_backup_and_no_write() {
        let (root, bk) = (temp("noop"), temp("noop-bk"));
        put(&root, IniFile::Game, "[/script/shootergame.shootergamemode]\nKillXPMultiplier=2\n");
        write_values(&root, &bk, &set(&[("KillXPMultiplier", Some("2"))])).unwrap();
        write_values(&root, &bk, &set(&[("HarvestXPMultiplier", None)])).unwrap();
        assert!(list_backups(&bk).is_empty());
    }

    #[test]
    fn only_the_newest_ten_backups_are_kept() {
        let (root, bk) = (temp("keep"), temp("keep-bk"));
        put(&root, IniFile::Gus, "[ServerSettings]\n");
        for n in 0..12 {
            write_values(&root, &bk, &set(&[("XPMultiplier", Some(&format!("{}", n + 2)))])).unwrap();
        }
        assert_eq!(list_backups(&bk).len(), BACKUPS_TO_KEEP);
    }

    #[test]
    fn unknown_keys_bad_values_and_injection_are_refused_and_write_nothing() {
        let (root, bk) = (temp("bad"), temp("bad-bk"));
        put(&root, IniFile::Gus, "[ServerSettings]\nXPMultiplier=1.2\n");
        let before = fs::read_to_string(path(&root, IniFile::Gus)).unwrap();
        for (k, v) in [
            ("BossKillXPMultiplier", "2"),
            ("DinoSpawnWeightMultipliers", "(x)"),
            ("PerLevelStatsMultiplier_DinoWild[11]", "1"),
            ("XPMultiplier", "-1"),
            ("serverPVE", "yes"),
            ("ServerAdminPassword", "a\n[ServerSettings]\nRCONEnabled=True"),
            ("AutoPvEStartTimeSeconds", "90000"),
        ] {
            let changes = set(&[("XPMultiplier", Some("3")), (k, Some(v))]);
            assert_eq!(write_values(&root, &bk, &changes), Err(format!("invalid_option:{k}")), "{k}");
        }
        assert_eq!(fs::read_to_string(path(&root, IniFile::Gus)).unwrap(), before);
        assert!(list_backups(&bk).is_empty());
    }

    #[test]
    fn an_unreadable_file_is_never_overwritten() {
        let (root, bk) = (temp("utf"), temp("utf-bk"));
        let p = path(&root, IniFile::Gus);
        fs::create_dir_all(p.parent().unwrap()).unwrap();
        let bytes = [0xFF, 0xFE, b'[', 0, b'S', 0];
        fs::write(&p, bytes).unwrap();
        assert!(write_values(&root, &bk, &set(&[("XPMultiplier", Some("3"))])).is_err());
        assert_eq!(fs::read(&p).unwrap(), bytes);
    }

    #[test]
    fn secrets_are_never_returned_only_flagged() {
        let root = temp("sec");
        put(&root, IniFile::Gus, "[ServerSettings]\nServerAdminPassword=hunter2\nServerPassword=\nXPMultiplier=2\n");
        let v = read_values(&root);
        assert_eq!(v.secrets_set, ["ServerAdminPassword"]);
        assert!(!v.values.contains_key("ServerAdminPassword") && !v.values.contains_key("ServerPassword"));
        assert_eq!(v.values["XPMultiplier"], "2");
        assert!(!format!("{v:?}").contains("hunter2"));
    }

    #[test]
    fn the_last_line_wins_when_a_key_repeats() {
        let root = temp("last");
        put(&root, IniFile::Gus, "[ServerSettings]\nXPMultiplier=1\nXPMultiplier=4\n");
        assert_eq!(read_raw(&root)["XPMultiplier"], "4");
    }
}
