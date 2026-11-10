use std::fs;
use std::io;
use std::path::{Path, PathBuf};
use std::time::{SystemTime, UNIX_EPOCH};

/// The world, plus the player profiles and tribes that live beside it.
const BACKED_UP: [&str; 3] = ["ark", "arkprofile", "arktribe"];

/// Copies the world, player profiles and tribes into `<backup_root>/<unix seconds>/` and keeps only
/// the newest `keep` backups. Returns the new folder, or `None` when there was
/// nothing to copy.
pub fn backup_saves(
    server_root: &Path,
    backup_root: &Path,
    keep: usize,
) -> io::Result<Option<PathBuf>> {
    let saves = server_root.join("ShooterGame").join("SavedArks");
    let saves = if saves.is_dir() {
        saves
    } else {
        server_root
            .join("ShooterGame")
            .join("Saved")
            .join("SavedArks")
    };
    if !saves.is_dir() {
        return Ok(None);
    }
    let files: Vec<PathBuf> = fs::read_dir(&saves)?
        .filter_map(Result::ok)
        .map(|e| e.path())
        .filter(|p| {
            p.extension()
                .is_some_and(|x| BACKED_UP.iter().any(|b| x == *b))
        })
        .collect();
    if files.is_empty() {
        return Ok(None);
    }
    let stamp = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .map_or(0, |d| d.as_secs());
    let target = backup_root.join(stamp.to_string());
    fs::create_dir_all(&target)?;
    for file in &files {
        if let Some(name) = file.file_name() {
            fs::copy(file, target.join(name))?;
        }
    }
    prune(backup_root, keep)?;
    Ok(Some(target))
}

pub(crate) fn prune(backup_root: &Path, keep: usize) -> io::Result<()> {
    let mut dirs: Vec<(u64, PathBuf)> = fs::read_dir(backup_root)?
        .filter_map(Result::ok)
        .filter_map(|e| {
            let n = e.file_name().to_string_lossy().parse::<u64>().ok()?;
            Some((n, e.path()))
        })
        .collect();
    dirs.sort_by_key(|(n, _)| *n);
    let excess = dirs.len().saturating_sub(keep);
    for (_, path) in dirs.into_iter().take(excess) {
        fs::remove_dir_all(path)?;
    }
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;

    fn temp(tag: &str) -> PathBuf {
        let p = std::env::temp_dir().join(format!("enz-bak-{}-{tag}", std::process::id()));
        let _ = fs::remove_dir_all(&p);
        fs::create_dir_all(&p).unwrap();
        p
    }

    fn server_with_save(root: &Path) {
        let dir = root.join("ShooterGame/Saved/SavedArks");
        fs::create_dir_all(&dir).unwrap();
        fs::write(dir.join("TheIsland.ark"), b"world").unwrap();
        fs::write(dir.join("notes.txt"), b"skip").unwrap();
    }

    #[test]
    fn copies_the_world_profiles_and_tribes_only() {
        let root = temp("copy-src");
        let backups = temp("copy-dst");
        server_with_save(&root);
        let saves = root.join("ShooterGame/Saved/SavedArks");
        fs::write(saves.join("76561198000000000.arkprofile"), b"me").unwrap();
        fs::write(saves.join("1111111111.arktribe"), b"tribe").unwrap();
        fs::write(saves.join("TheIsland_NewLaunchBackup.bak"), b"old").unwrap();
        let target = backup_saves(&root, &backups, 5).unwrap().unwrap();
        assert!(target.join("TheIsland.ark").is_file());
        assert!(target.join("76561198000000000.arkprofile").is_file());
        assert!(target.join("1111111111.arktribe").is_file());
        assert!(!target.join("notes.txt").exists());
        assert!(!target.join("TheIsland_NewLaunchBackup.bak").exists());
    }

    #[test]
    fn nothing_to_back_up_returns_none() {
        let root = temp("none-src");
        let backups = temp("none-dst");
        assert_eq!(backup_saves(&root, &backups, 5).unwrap(), None);
    }

    #[test]
    fn prune_keeps_only_the_newest() {
        let backups = temp("prune");
        for n in [10, 20, 30] {
            fs::create_dir_all(backups.join(n.to_string())).unwrap();
        }
        prune(&backups, 2).unwrap();
        assert!(!backups.join("10").exists());
        assert!(backups.join("20").exists() && backups.join("30").exists());
    }
}
