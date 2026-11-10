//! Mods the owner has in the Steam game client, and which of them the server loads.
//! A mod is the folder `Content/Mods/<id>` plus `Content/Mods/<id>.mod`. The server
//! loads the ids listed in `ActiveMods` of its ini.

use crate::server_ini;
use serde::Serialize;
use std::collections::{BTreeMap, BTreeSet};
use std::path::{Path, PathBuf};

#[derive(Debug, PartialEq, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ModView {
    pub id: String,
    pub name: String,
    /// The mod is in the game client, so it can be copied to the server.
    pub in_steam: bool,
    /// The mod files are already in the server folder.
    pub on_server: bool,
    /// The server loads it (id is in `ActiveMods`).
    pub active: bool,
}

fn server_mods_dir(root: &Path) -> PathBuf {
    root.join("ShooterGame/Content/Mods")
}

/// The game client sits beside the server in the same Steam library: `common/ARK`.
fn client_mods_dir(root: &Path) -> Option<PathBuf> {
    Some(root.parent()?.join("ARK/ShooterGame/Content/Mods"))
}

/// Name stored in a `.mod` file: two u32 (id, 0), then a u32 length and the name with a trailing NUL.
fn mod_name(file: &Path) -> Option<String> {
    let bytes = std::fs::read(file).ok()?;
    let len = u32::from_le_bytes(bytes.get(8..12)?.try_into().ok()?) as usize;
    let raw = bytes.get(12..12usize.checked_add(len)?)?;
    let name = String::from_utf8(raw.to_vec()).ok()?;
    let name = name.trim_end_matches('\0').trim();
    (!name.is_empty()).then(|| name.to_owned())
}

fn is_id(s: &str) -> bool {
    !s.is_empty() && s.bytes().all(|b| b.is_ascii_digit())
}

/// Complete mods in `dir` (folder and `.mod` both present), id to display name.
fn installed(dir: &Path) -> BTreeMap<String, String> {
    let Ok(entries) = std::fs::read_dir(dir) else {
        return BTreeMap::new();
    };
    entries
        .flatten()
        .filter(|e| e.path().is_dir())
        .filter_map(|e| e.file_name().into_string().ok())
        .filter(|id| is_id(id) && dir.join(format!("{id}.mod")).is_file())
        .map(|id| {
            let name = mod_name(&dir.join(format!("{id}.mod"))).unwrap_or_else(|| id.clone());
            (id, name)
        })
        .collect()
}

pub fn list(root: &Path) -> Vec<ModView> {
    let on_server = installed(&server_mods_dir(root));
    let in_steam = client_mods_dir(root).map(|d| installed(&d)).unwrap_or_default();
    let active = server_ini::read_active_mods(root);
    let ids: BTreeSet<&String> = on_server.keys().chain(in_steam.keys()).chain(&active).collect();
    let mut mods: Vec<ModView> = ids
        .into_iter()
        .map(|id| ModView {
            name: in_steam
                .get(id)
                .or_else(|| on_server.get(id))
                .cloned()
                .unwrap_or_else(|| id.clone()),
            in_steam: in_steam.contains_key(id),
            on_server: on_server.contains_key(id),
            active: active.contains(id),
            id: id.clone(),
        })
        .collect();
    // Active mods first in load order (it can matter between mods), the rest by name.
    mods.sort_by_key(|m| {
        (
            active.iter().position(|a| *a == m.id).unwrap_or(usize::MAX),
            m.name.to_lowercase(),
        )
    });
    mods
}

fn copy_dir(from: &Path, to: &Path) -> std::io::Result<()> {
    std::fs::create_dir_all(to)?;
    for entry in std::fs::read_dir(from)? {
        let entry = entry?;
        let target = to.join(entry.file_name());
        if entry.file_type()?.is_dir() {
            copy_dir(&entry.path(), &target)?;
        } else {
            std::fs::copy(entry.path(), target)?;
        }
    }
    Ok(())
}

/// Makes `ids` the mods the server loads: copies the ones the server lacks from the game
/// client, then writes `ActiveMods`. Mods switched off keep their files on the server.
/// `Err` is a code for the UI: `invalid_mod:<id>`, `mod_missing:<id>` or an I/O message.
pub fn apply(root: &Path, ids: &[String]) -> Result<(), String> {
    if let Some(bad) = ids.iter().find(|id| !is_id(id)) {
        return Err(format!("invalid_mod:{bad}"));
    }
    let mut seen = BTreeSet::new();
    let ids: Vec<String> = ids.iter().filter(|id| seen.insert(id.as_str())).cloned().collect();

    let server = server_mods_dir(root);
    let on_server = installed(&server);
    let client = client_mods_dir(root);
    let in_steam = client.as_deref().map(installed).unwrap_or_default();
    for id in ids.iter().filter(|id| !on_server.contains_key(*id)) {
        let from = client.as_ref().filter(|_| in_steam.contains_key(id));
        let from = from.ok_or_else(|| format!("mod_missing:{id}"))?;
        // Copied under a name that is not an id and renamed at the end, so an
        // interrupted copy never looks like an installed mod.
        let staging = server.join(format!("{id}.partial"));
        let _ = std::fs::remove_dir_all(&staging);
        copy_dir(&from.join(id), &staging).map_err(|e| e.to_string())?;
        let dest = server.join(id);
        let _ = std::fs::remove_dir_all(&dest);
        std::fs::rename(&staging, &dest).map_err(|e| e.to_string())?;
        std::fs::copy(from.join(format!("{id}.mod")), server.join(format!("{id}.mod")))
            .map_err(|e| e.to_string())?;
    }
    server_ini::write_active_mods(root, &ids)
}

#[cfg(test)]
mod tests {
    use super::*;

    fn mod_file(id: u32, name: &str) -> Vec<u8> {
        let mut b = id.to_le_bytes().to_vec();
        b.extend([0; 4]);
        b.extend((name.len() as u32 + 1).to_le_bytes());
        b.extend(name.as_bytes());
        b.push(0);
        b
    }

    fn add_mod(mods: &Path, id: u32, name: &str) {
        std::fs::create_dir_all(mods.join(id.to_string())).unwrap();
        std::fs::write(mods.join(id.to_string()).join("a.uasset"), b"data").unwrap();
        std::fs::write(mods.join(format!("{id}.mod")), mod_file(id, name)).unwrap();
    }

    /// `<tmp>/common/Server` next to `<tmp>/common/ARK`, like a Steam library.
    fn library(tag: &str) -> (PathBuf, PathBuf, PathBuf) {
        let base = std::env::temp_dir().join(format!("enz-mods-{tag}-{}", std::process::id()));
        let _ = std::fs::remove_dir_all(&base);
        let root = base.join("common/Server");
        let server = server_mods_dir(&root);
        let client = client_mods_dir(&root).unwrap();
        std::fs::create_dir_all(&server).unwrap();
        std::fs::create_dir_all(&client).unwrap();
        (base, root, client)
    }

    #[test]
    fn reads_the_name_from_a_mod_file() {
        let (base, root, client) = library("name");
        add_mod(&client, 538827119, "Omnicular v1.51");
        assert_eq!(mod_name(&client.join("538827119.mod")).as_deref(), Some("Omnicular v1.51"));
        std::fs::write(client.join("1.mod"), [1, 2, 3]).unwrap();
        assert_eq!(mod_name(&client.join("1.mod")), None);
        assert_eq!(mod_name(&root.join("nope.mod")), None);
        std::fs::remove_dir_all(base).unwrap();
    }

    #[test]
    fn lists_mods_from_steam_and_server_with_their_state() {
        let (base, root, client) = library("list");
        add_mod(&client, 10, "Beta");
        add_mod(&client, 20, "Alpha");
        add_mod(&server_mods_dir(&root), 20, "Alpha");
        // A map folder and a mod folder without its .mod are not mods.
        std::fs::create_dir_all(client.join("Ragnarok")).unwrap();
        std::fs::create_dir_all(client.join("30")).unwrap();
        server_ini::write_active_mods(&root, &["99".into(), "20".into()]).unwrap();
        let mods = list(&root);
        let view = |id: &str, name: &str, steam, server, active| ModView {
            id: id.into(),
            name: name.into(),
            in_steam: steam,
            on_server: server,
            active,
        };
        assert_eq!(
            mods,
            vec![
                view("99", "99", false, false, true),
                view("20", "Alpha", true, true, true),
                view("10", "Beta", true, false, false),
            ]
        );
        std::fs::remove_dir_all(base).unwrap();
    }

    #[test]
    fn apply_copies_missing_mods_and_writes_the_active_list() {
        let (base, root, client) = library("apply");
        add_mod(&client, 10, "Beta");
        add_mod(&client, 20, "Alpha");
        add_mod(&server_mods_dir(&root), 20, "Alpha");
        apply(&root, &["10".into(), "20".into(), "10".into()]).unwrap();
        let server = server_mods_dir(&root);
        assert!(server.join("10/a.uasset").is_file() && server.join("10.mod").is_file());
        assert!(!server.join("10.partial").exists());
        assert_eq!(server_ini::read_active_mods(&root), ["10", "20"]);
        // Switching one off keeps its files on the server.
        apply(&root, &["20".into()]).unwrap();
        assert_eq!(server_ini::read_active_mods(&root), ["20"]);
        assert!(server.join("10.mod").is_file());
        std::fs::remove_dir_all(base).unwrap();
    }

    #[test]
    fn apply_refuses_bad_ids_and_mods_that_are_nowhere() {
        let (base, root, _client) = library("bad");
        assert_eq!(apply(&root, &["1;2".into()]), Err("invalid_mod:1;2".into()));
        assert_eq!(apply(&root, &["../x".into()]), Err("invalid_mod:../x".into()));
        assert_eq!(apply(&root, &["77".into()]), Err("mod_missing:77".into()));
        assert!(server_ini::read_active_mods(&root).is_empty());
        std::fs::remove_dir_all(base).unwrap();
    }
}
