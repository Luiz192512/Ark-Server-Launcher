//! Line-preserving edits of ARK ini text. Every function takes the whole file as text and
//! returns the new text: comments, blank lines, unknown keys and the line ending style are kept.
//! Section and key names match case-insensitively, as ARK reads them.

fn eol(ini: &str) -> &'static str {
    if ini.contains("\r\n") { "\r\n" } else { "\n" }
}

fn is_key(line: &str, key: &str) -> bool {
    line.split_once('=')
        .is_some_and(|(k, _)| k.trim().eq_ignore_ascii_case(key))
}

/// Line range `(first line after the header, end)` of the first `section`, if it exists.
fn section_range(lines: &[String], section: &str) -> Option<(usize, usize)> {
    let start = lines.iter().position(|l| l.trim().eq_ignore_ascii_case(section))? + 1;
    let end = lines[start..]
        .iter()
        .position(|l| l.trim().starts_with('['))
        .map_or(lines.len(), |i| start + i);
    Some((start, end))
}

/// Section headers in file order, each once (`[ServerSettings]`).
pub fn sections(ini: &str) -> Vec<String> {
    let mut out: Vec<String> = Vec::new();
    for l in ini.lines().map(str::trim).filter(|l| l.starts_with('[') && l.ends_with(']')) {
        if !out.iter().any(|s| s.eq_ignore_ascii_case(l)) {
            out.push(l.to_owned());
        }
    }
    out
}

/// `(key, value)` of every line of the first `section`, comments and blank lines left out.
pub fn lines(ini: &str, section: &str) -> Vec<(String, String)> {
    let all: Vec<String> = ini.lines().map(str::to_owned).collect();
    let Some((start, end)) = section_range(&all, section) else {
        return Vec::new();
    };
    all[start..end]
        .iter()
        .filter(|l| !l.trim_start().starts_with(';'))
        .filter_map(|l| l.split_once('='))
        .map(|(k, v)| (k.trim().to_owned(), v.trim().to_owned()))
        .collect()
}

/// Every value of `key` in `section`, in file order (one per line, so repeated keys work).
pub fn get_values(ini: &str, section: &str, key: &str) -> Vec<String> {
    let lines: Vec<String> = ini.lines().map(str::to_owned).collect();
    let Some((start, end)) = section_range(&lines, section) else {
        return Vec::new();
    };
    lines[start..end]
        .iter()
        .filter(|l| is_key(l, key))
        .filter_map(|l| l.split_once('=').map(|(_, v)| v.trim().to_owned()))
        .collect()
}

/// Replaces every line of `key` in `section` with `values`, one `key=value` line each.
/// The new lines go where the first old line was; with no old line they go after the last
/// non-blank line of the section, and a missing section is added at the end.
/// An empty `values` removes the key.
pub fn set_values(ini: &str, section: &str, key: &str, values: &[String]) -> String {
    let eol = eol(ini);
    let new_lines: Vec<String> = values.iter().map(|v| format!("{key}={v}")).collect();
    let mut lines: Vec<String> = ini.lines().map(str::to_owned).collect();
    let Some((start, end)) = section_range(&lines, section) else {
        if new_lines.is_empty() {
            return ini.to_owned();
        }
        lines.push(section.to_owned());
        lines.extend(new_lines);
        return lines.join(eol) + eol;
    };
    let old: Vec<usize> = (start..end).filter(|&i| is_key(&lines[i], key)).collect();
    let at = match old.first() {
        Some(&first) => {
            for &i in old.iter().rev() {
                lines.remove(i);
            }
            first
        }
        None => (start..end)
            .rev()
            .find(|&i| !lines[i].trim().is_empty())
            .map_or(start, |i| i + 1),
    };
    for (n, line) in new_lines.into_iter().enumerate() {
        lines.insert(at + n, line);
    }
    lines.join(eol) + eol
}

/// Sets one scalar key. Later duplicates of the same key in the section are dropped,
/// because ARK would let them override the new value.
pub fn set_value(ini: &str, section: &str, key: &str, value: &str) -> String {
    set_values(ini, section, key, &[value.to_owned()])
}

/// Removes every line of `key` in `section`, which makes the game use its default.
pub fn remove_value(ini: &str, section: &str, key: &str) -> String {
    set_values(ini, section, key, &[])
}

#[cfg(test)]
mod tests {
    use super::*;

    const SEC: &str = "[/Script/ShooterGame.ShooterGameMode]";

    #[test]
    fn replaces_in_place_and_keeps_comments_and_unknown_keys() {
        let ini = format!("; note\n{SEC}\nA=1\n# keep\nKillXPMultiplier=1.0\nUnknown=zzz\n\n[Other]\nB=2\n");
        let out = set_value(&ini, &SEC.to_lowercase(), "killxpmultiplier", "5");
        assert_eq!(
            out,
            format!("; note\n{SEC}\nA=1\n# keep\nkillxpmultiplier=5\nUnknown=zzz\n\n[Other]\nB=2\n")
        );
    }

    #[test]
    fn inserts_after_the_last_non_blank_line_and_adds_missing_sections() {
        let ini = "[S]\nA=1\n\n[T]\nB=2\n";
        assert_eq!(set_value(ini, "[S]", "C", "3"), "[S]\nA=1\nC=3\n\n[T]\nB=2\n");
        assert_eq!(set_value(ini, "[New]", "C", "3"), "[S]\nA=1\n\n[T]\nB=2\n[New]\nC=3\n");
    }

    #[test]
    fn keeps_crlf_and_lf() {
        assert_eq!(set_value("[S]\r\nA=1\r\n", "[S]", "A", "2"), "[S]\r\nA=2\r\n");
        assert_eq!(set_value("[S]\nA=1\n", "[S]", "A", "2"), "[S]\nA=2\n");
    }

    #[test]
    fn a_commented_key_is_not_the_key() {
        let ini = "[S]\n;A=1\nB=2\n";
        assert_eq!(set_value(ini, "[S]", "A", "9"), "[S]\n;A=1\nB=2\nA=9\n");
        assert_eq!(get_values(ini, "[S]", "A"), Vec::<String>::new());
    }

    #[test]
    fn a_scalar_set_collapses_duplicates() {
        let ini = "[S]\nA=1\nB=2\nA=3\n";
        assert_eq!(set_value(ini, "[S]", "A", "7"), "[S]\nA=7\nB=2\n");
    }

    #[test]
    fn repeated_keys_are_read_and_replaced_as_a_list() {
        let ini = "[S]\nL=(a)\nB=2\nL=(b)\n[T]\nL=(other)\n";
        assert_eq!(get_values(ini, "[S]", "L"), ["(a)", "(b)"]);
        let out = set_values(ini, "[S]", "L", &["(x)".into(), "(y)".into(), "(z)".into()]);
        assert_eq!(out, "[S]\nL=(x)\nL=(y)\nL=(z)\nB=2\n[T]\nL=(other)\n");
        assert_eq!(get_values(&out, "[T]", "L"), ["(other)"]);
    }

    #[test]
    fn indexed_keys_are_independent_keys() {
        let ini = "[S]\nP[0]=1\nP[1]=2\n";
        assert_eq!(set_value(ini, "[S]", "P[1]", "9"), "[S]\nP[0]=1\nP[1]=9\n");
    }

    #[test]
    fn remove_deletes_only_that_key_and_is_a_no_op_when_absent() {
        let ini = "[S]\nA=1\nB=2\nA=3\n";
        assert_eq!(remove_value(ini, "[S]", "A"), "[S]\nB=2\n");
        assert_eq!(remove_value(ini, "[S]", "Z"), ini);
        assert_eq!(remove_value(ini, "[Missing]", "A"), ini);
    }
}
