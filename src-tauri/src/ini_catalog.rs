//! The settings the launcher may write to the server's ini files, from `data/ini-catalog.json`.
//! Anything outside the catalog is refused, so the UI cannot rewrite arbitrary lines.

use serde::{Deserialize, Serialize};
use std::collections::{HashMap, HashSet};
use std::sync::OnceLock;

const CATALOG_JSON: &str = include_str!("../../data/ini-catalog.json");

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum IniFile {
    /// `Game.ini`
    Game,
    /// `GameUserSettings.ini`
    Gus,
}

impl IniFile {
    pub fn file_name(self) -> &'static str {
        match self {
            Self::Game => "Game.ini",
            Self::Gus => "GameUserSettings.ini",
        }
    }
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum Kind {
    Text,
    Bool,
    /// Decimal number, zero or more.
    Rate,
    /// Whole number, zero or more.
    Int,
    /// Player limit, 1 to 255.
    Players,
    /// TCP or UDP port, 1 to 65535.
    Port,
    /// A key repeated once per line, each line shaped by `columns`.
    List,
}

/// What one field of a list line may hold.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum ColumnKind {
    /// Blueprint class name, ending in `_C`.
    Class,
    /// Short name made of letters, digits and `_` (spawn `DinoNameTag`).
    Tag,
    Rate,
    Int,
    Bool,
    /// Whole numbers written as `Name[0]=..,Name[1]=..` (the experience ramp).
    Ints,
}

impl ColumnKind {
    fn is_valid(self, v: &str) -> bool {
        let ident = |max: usize| {
            !v.is_empty() && v.len() <= max && v.bytes().all(|b| b.is_ascii_alphanumeric() || b == b'_')
        };
        match self {
            Self::Class => ident(128) && v.ends_with("_C"),
            Self::Tag => ident(64),
            Self::Rate => v.parse::<f32>().is_ok_and(|n| n.is_finite() && n >= 0.0),
            Self::Int | Self::Ints => v.parse::<u32>().is_ok(),
            Self::Bool => v == "True" || v == "False",
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Column {
    /// Field name. `A.B` is the field `B` inside `A=(..)`. An empty name means each line
    /// is just the value (`OverridePlayerLevelEngramPoints=8`).
    pub name: String,
    pub kind: ColumnKind,
    #[serde(default)]
    pub optional: bool,
    /// Written between double quotes.
    #[serde(default)]
    pub quoted: bool,
    pub example: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Entry {
    pub key: String,
    pub file: IniFile,
    pub section: String,
    pub kind: Kind,
    /// ARK's own default. `None` when the game has none to show.
    pub default: Option<String>,
    pub group: String,
    /// For array keys: the key is written as `Name[0]` to `Name[count - 1]`.
    #[serde(default)]
    pub count: Option<u8>,
    /// Upper limit for `Rate` and `Int`.
    #[serde(default)]
    pub max: Option<f64>,
    /// Unit code shown beside the field: `x`, `s`, `min`, `xp`, `count` or `uu`.
    #[serde(default)]
    pub unit: Option<String>,
    /// Array indexes the UI shows but does not let the owner edit (they have no effect).
    #[serde(default)]
    pub locked_indexes: Vec<u8>,
    /// Never shown or logged: the UI only learns whether it is set.
    #[serde(default)]
    pub secret: bool,
    /// One of the settings the launcher edited before the catalog existed.
    #[serde(default)]
    pub legacy: bool,
    /// For `List`: the fields of each line.
    #[serde(default)]
    pub columns: Vec<Column>,
}

impl Entry {
    /// The keys this entry writes: itself, or `Name[0]` to `Name[count - 1]`.
    pub fn keys(&self) -> Vec<String> {
        match self.count {
            Some(n) => (0..n).map(|i| format!("{}[{i}]", self.key)).collect(),
            None => vec![self.key.clone()],
        }
    }

    pub fn is_valid(&self, value: &str) -> bool {
        let within_max = |n: f64| self.max.is_none_or(|max| n <= max);
        match self.kind {
            Kind::Text => !value.chars().any(char::is_control) && value.len() <= 64,
            Kind::Bool => value == "True" || value == "False",
            Kind::Rate => value
                .parse::<f32>()
                .is_ok_and(|n| n.is_finite() && n >= 0.0 && within_max(f64::from(n))),
            Kind::Int => value.parse::<u32>().is_ok_and(|n| within_max(f64::from(n))),
            Kind::Players => value.parse::<u8>().is_ok_and(|n| n > 0),
            Kind::Port => value.parse::<u16>().is_ok_and(|n| n > 0),
            // A list travels as its lines joined by `\n`; going back to no lines is `None`.
            Kind::List => !value.is_empty() && value.split('\n').all(|l| self.line_is_valid(l)),
        }
    }

    fn line_is_valid(&self, line: &str) -> bool {
        if line.len() > 4096 || line.chars().any(char::is_control) {
            return false;
        }
        if let [col] = self.columns.as_slice()
            && col.name.is_empty()
        {
            return col.kind.is_valid(line);
        }
        let Some(fields) = parse_fields(line) else {
            return false;
        };
        let mut seen = HashSet::new();
        let mut ints: HashMap<&str, Vec<usize>> = HashMap::new();
        for (name, value) in &fields {
            if !seen.insert(name.as_str()) {
                return false;
            }
            let (base, index) = match name.strip_suffix(']').and_then(|n| n.split_once('[')) {
                Some((base, i)) => (base, Some(i.parse::<usize>().ok())),
                None => (name.as_str(), None),
            };
            let Some(col) = self.columns.iter().find(|c| c.name == base) else {
                return false;
            };
            match (col.kind, index) {
                (ColumnKind::Ints, Some(Some(i))) => ints.entry(base).or_default().push(i),
                (ColumnKind::Ints, _) | (_, Some(_)) => return false,
                _ => {}
            }
            if !col.kind.is_valid(value) {
                return false;
            }
        }
        let contiguous = ints.values_mut().all(|ix| {
            ix.sort_unstable();
            ix.iter().enumerate().all(|(n, i)| n == *i)
        });
        contiguous
            && self.columns.iter().all(|c| {
                c.optional
                    || if c.kind == ColumnKind::Ints {
                        ints.contains_key(c.name.as_str())
                    } else {
                        seen.contains(c.name.as_str())
                    }
            })
    }
}

/// `(A=1,B="x",C=(D=2))` as the flat fields `A`, `B` and `C.D`, in order. `None` when the
/// line is not exactly that shape, so nothing that could open a new key or section passes.
pub fn parse_fields(line: &str) -> Option<Vec<(String, String)>> {
    let mut out = Vec::new();
    let rest = parse_group(line, "", &mut out)?;
    rest.is_empty().then_some(out)
}

fn parse_group<'a>(text: &'a str, prefix: &str, out: &mut Vec<(String, String)>) -> Option<&'a str> {
    let mut s = text.strip_prefix('(')?;
    loop {
        let (name, rest) = s.split_once('=')?;
        if name.is_empty() || !name.bytes().all(|b| b.is_ascii_alphanumeric() || b"_[]".contains(&b)) {
            return None;
        }
        let full = if prefix.is_empty() { name.to_owned() } else { format!("{prefix}.{name}") };
        s = if rest.starts_with('(') {
            parse_group(rest, &full, out)?
        } else if let Some(q) = rest.strip_prefix('"') {
            let (value, after) = q.split_once('"')?;
            out.push((full, value.to_owned()));
            after
        } else {
            let end = rest.find([',', ')'])?;
            if rest[..end].contains(['(', '"', '=']) {
                return None;
            }
            out.push((full, rest[..end].to_owned()));
            &rest[end..]
        };
        match s.strip_prefix(',') {
            Some(next) => s = next,
            None => return s.strip_prefix(')'),
        }
    }
}

pub fn catalog() -> &'static [Entry] {
    static CATALOG: OnceLock<Vec<Entry>> = OnceLock::new();
    CATALOG.get_or_init(|| {
        serde_json::from_str(CATALOG_JSON).expect("data/ini-catalog.json is bundled and tested")
    })
}

/// The entry that owns `key` (`Name` or `Name[i]` within range), case-insensitively.
pub fn find(key: &str) -> Option<&'static Entry> {
    catalog().iter().find(|e| {
        e.keys().iter().any(|k| k.eq_ignore_ascii_case(key))
    })
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::collections::HashSet;

    #[test]
    fn bundled_catalog_parses_with_unique_keys_and_valid_defaults() {
        let mut seen = HashSet::new();
        for e in catalog() {
            for k in e.keys() {
                assert!(seen.insert(k.to_lowercase()), "duplicate key {k}");
            }
            if let Some(d) = &e.default {
                assert!(e.is_valid(d), "default of {} is invalid: {d}", e.key);
            }
        }
    }

    #[test]
    fn sections_match_the_file_they_belong_to() {
        for e in catalog() {
            let ok = match e.file {
                IniFile::Game => e.section == "[/script/shootergame.shootergamemode]",
                IniFile::Gus => e.section == "[ServerSettings]" || e.section == "[/Script/Engine.GameSession]",
            };
            assert!(ok, "{} has section {} in {:?}", e.key, e.section, e.file);
        }
    }

    #[test]
    fn units_and_locked_indexes_are_known() {
        for e in catalog() {
            if let Some(u) = &e.unit {
                assert!(["x", "s", "min", "xp", "count", "uu"].contains(&u.as_str()), "{} unit {u}", e.key);
            }
            assert!(e.locked_indexes.iter().all(|i| e.count.is_some_and(|n| *i < n)), "{}", e.key);
            assert_eq!(e.kind == Kind::List, !e.columns.is_empty(), "{}", e.key);
        }
        assert!(find("PerLevelStatsMultiplier_Player[0]").is_some_and(|e| e.locked_indexes == [6]));
    }

    #[test]
    fn the_original_settings_are_all_still_there() {
        assert_eq!(catalog().iter().filter(|e| e.legacy).count(), 56);
        assert!(catalog().iter().filter(|e| e.legacy).all(|e| e.file == IniFile::Gus));
    }

    #[test]
    fn secrets_are_flagged_and_array_keys_expand() {
        assert!(find("ServerAdminPassword").is_some_and(|e| e.secret));
        assert!(find("serverpassword").is_some_and(|e| e.secret));
        assert!(find("PerLevelStatsMultiplier_DinoWild[10]").is_some());
        assert!(find("PerLevelStatsMultiplier_DinoWild[11]").is_none());
        assert!(find("PerLevelStatsMultiplier_DinoWild").is_none());
        assert!(find("BossKillXPMultiplier").is_none());
    }

    #[test]
    fn list_lines_are_checked_field_by_field() {
        let e = |k| find(k).unwrap();
        let npc = e("NPCReplacements");
        assert!(npc.is_valid(r#"(FromClassName="MegaRaptor_Character_BP_C",ToClassName="Raptor_Character_BP_C")"#));
        assert!(npc.is_valid("(FromClassName=\"A_C\",ToClassName=\"B_C\")\n(FromClassName=\"C_C\",ToClassName=\"D_C\")"));
        assert!(!npc.is_valid(r#"(FromClassName="Spino",ToClassName="B_C")"#), "class must end in _C");
        assert!(!npc.is_valid(r#"(FromClassName="A_C")"#), "required field missing");
        assert!(!npc.is_valid(r#"(FromClassName="A_C",ToClassName="B_C",Other=1)"#), "unknown field");
        assert!(!npc.is_valid(r#"(FromClassName="A_C",ToClassName="B_C")x"#), "trailing text");
        assert!(!npc.is_valid("(FromClassName=\"A_C\",ToClassName=\"B_C\")\n[ServerSettings]"), "new section");
        assert!(!npc.is_valid(""));
        let spawn = e("DinoSpawnWeightMultipliers");
        assert!(spawn.is_valid(
            "(DinoNameTag=Bronto,SpawnWeightMultiplier=10.0,OverrideSpawnLimitPercentage=True,SpawnLimitPercentage=0.5)"
        ));
        assert!(spawn.is_valid("(DinoNameTag=Bronto)"), "the rest is optional");
        let ramp = e("LevelExperienceRampOverrides");
        assert!(ramp.is_valid("(ExperiencePointsForLevel[0]=10,ExperiencePointsForLevel[1]=35)"));
        assert!(!ramp.is_valid("(ExperiencePointsForLevel[0]=10,ExperiencePointsForLevel[2]=35)"), "gap");
        assert!(!ramp.is_valid("(ExperiencePointsForLevel=10)"));
        let points = e("OverridePlayerLevelEngramPoints");
        assert!(points.is_valid("8\n12") && !points.is_valid("8\n-1"));
        let stack = e("ConfigOverrideItemMaxQuantity");
        assert!(stack.is_valid(
            r#"(ItemClassString="PrimalItemResource_Stone_C",Quantity=(MaxItemQuantity=1000,bIgnoreMultiplier=True))"#
        ));
        assert!(!stack.is_valid(r#"(ItemClassString="PrimalItemResource_Stone_C",Quantity=(bIgnoreMultiplier=True))"#));
    }

    #[test]
    fn values_are_validated_by_kind_and_limit() {
        let e = |k| find(k).unwrap();
        assert!(e("AutoPvEStartTimeSeconds").is_valid("86400"));
        assert!(!e("AutoPvEStartTimeSeconds").is_valid("86401"));
        assert!(!e("XPMultiplier").is_valid("-1"));
        assert!(!e("XPMultiplier").is_valid("NaN"));
        assert!(!e("serverPVE").is_valid("yes"));
        assert!(!e("MaxPlayers").is_valid("0"));
        assert!(e("RCONPort").is_valid("27020") && !e("RCONPort").is_valid("0"));
        assert!(e("FastDecayInterval").is_valid("43200") && !e("FastDecayInterval").is_valid("1.5"));
        assert!(!e("ServerPassword").is_valid("a\nb"));
    }
}
