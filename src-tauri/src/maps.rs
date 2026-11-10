use serde::{Deserialize, Serialize};
use std::path::Path;

const REGISTRY_JSON: &str = include_str!("../../data/maps.json");

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct MapEntry {
    pub id: String,
    pub display_name: String,
    pub edition: String,
    pub launch_token: String,
    pub dlc_required: bool,
    /// Path of the map's level file, relative to `ShooterGame/Content`.
    pub installed_check: String,
    pub thumbnail: String,
    pub verified: bool,
}

impl MapEntry {
    pub fn is_installed(&self, server_root: &Path) -> bool {
        server_root
            .join("ShooterGame")
            .join("Content")
            .join(&self.installed_check)
            .is_file()
    }
}

pub fn parse_registry(json: &str) -> Result<Vec<MapEntry>, serde_json::Error> {
    serde_json::from_str(json)
}

pub fn load_registry() -> Result<Vec<MapEntry>, serde_json::Error> {
    parse_registry(REGISTRY_JSON)
}

pub fn find<'a>(maps: &'a [MapEntry], id: &str) -> Option<&'a MapEntry> {
    maps.iter().find(|m| m.id == id)
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::collections::HashSet;
    use std::fs;

    #[test]
    fn bundled_registry_parses_and_has_unique_ids() {
        let maps = load_registry().expect("bundled registry must parse");
        let ids: HashSet<_> = maps.iter().map(|m| m.id.as_str()).collect();
        assert_eq!(ids.len(), maps.len());
        assert!(maps.iter().all(|m| !m.launch_token.is_empty()));
    }

    #[test]
    fn unverified_entries_are_flagged() {
        let maps = load_registry().unwrap();
        assert!(find(&maps, "aquatica").is_some_and(|m| !m.verified));
        assert!(find(&maps, "theisland").is_some_and(|m| m.verified));
    }

    #[test]
    fn find_returns_none_for_unknown_id() {
        let maps = load_registry().unwrap();
        assert!(find(&maps, "nope").is_none());
    }

    #[test]
    fn is_installed_checks_the_level_file() {
        let root = std::env::temp_dir().join(format!("enz-maps-{}", std::process::id()));
        let level = root.join("ShooterGame/Content/Maps/TheIslandSubMaps");
        fs::create_dir_all(&level).unwrap();
        let maps = load_registry().unwrap();
        let island = find(&maps, "theisland").unwrap();
        assert!(!island.is_installed(&root));
        fs::write(level.join("TheIsland.umap"), b"x").unwrap();
        assert!(island.is_installed(&root));
        fs::remove_dir_all(&root).unwrap();
    }
}
