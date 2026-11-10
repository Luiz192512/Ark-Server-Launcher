use std::collections::VecDeque;
use std::fs::File;
use std::io::{self, Read, Seek, SeekFrom};
use std::path::Path;
use std::sync::{Arc, Mutex};

const TAIL_WINDOW_BYTES: u64 = 64 * 1024;

/// Bounded in-memory log lines. Clones share the same buffer.
#[derive(Clone)]
pub struct LogBuffer {
    lines: Arc<Mutex<VecDeque<String>>>,
    capacity: usize,
}

impl LogBuffer {
    pub fn new(capacity: usize) -> Self {
        Self {
            lines: Arc::new(Mutex::new(VecDeque::with_capacity(capacity))),
            capacity,
        }
    }

    pub fn push(&self, line: String) {
        let mut lines = self.lines.lock().unwrap();
        if lines.len() == self.capacity {
            lines.pop_front();
        }
        lines.push_back(line);
    }

    pub fn snapshot(&self) -> Vec<String> {
        self.lines.lock().unwrap().iter().cloned().collect()
    }
}

/// True when the file was written at or after `unix_secs`. A server rotates
/// its log on start, so an older file belongs to a previous run.
pub fn modified_since(path: &Path, unix_secs: u64) -> bool {
    std::fs::metadata(path)
        .and_then(|m| m.modified())
        .ok()
        .and_then(|t| t.duration_since(std::time::UNIX_EPOCH).ok())
        .is_some_and(|d| d.as_secs() >= unix_secs)
}

/// Last `count` lines of a file, reading at most the final 64 KiB.
pub fn tail_file(path: &Path, count: usize) -> io::Result<Vec<String>> {
    let (text, _) = read_from(path, None)?;
    let lines: Vec<String> = text.lines().map(str::to_owned).collect();
    let skip = lines.len().saturating_sub(count);
    Ok(lines.into_iter().skip(skip).collect())
}

/// Reads the bytes appended after `offset`. Returns the text and the new offset.
/// With `offset == None` it reads the final 64 KiB of the file.
pub fn read_from(path: &Path, offset: Option<u64>) -> io::Result<(String, u64)> {
    let mut file = File::open(path)?;
    let len = file.metadata()?.len();
    let start = match offset {
        Some(o) if o <= len => o,
        Some(_) => 0,
        None => len.saturating_sub(TAIL_WINDOW_BYTES),
    };
    file.seek(SeekFrom::Start(start))?;
    let mut bytes = Vec::new();
    file.read_to_end(&mut bytes)?;
    Ok((String::from_utf8_lossy(&bytes).into_owned(), len))
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::fs;

    #[test]
    fn modified_since_tells_a_fresh_log_from_a_stale_one() {
        let path = std::env::temp_dir().join(format!("enz-mod-{}.log", std::process::id()));
        fs::write(&path, "x").unwrap();
        let now = std::time::SystemTime::now()
            .duration_since(std::time::UNIX_EPOCH)
            .unwrap()
            .as_secs();
        assert!(modified_since(&path, now - 60));
        assert!(!modified_since(&path, now + 3600));
        assert!(!modified_since(&path.with_extension("missing"), 0));
        fs::remove_file(&path).unwrap();
    }

    #[test]
    fn buffer_drops_the_oldest_line_when_full() {
        let buf = LogBuffer::new(2);
        for l in ["a", "b", "c"] {
            buf.push(l.into());
        }
        assert_eq!(buf.snapshot(), vec!["b", "c"]);
    }

    #[test]
    fn clones_share_the_same_lines() {
        let buf = LogBuffer::new(5);
        buf.clone().push("x".into());
        assert_eq!(buf.snapshot(), vec!["x"]);
    }

    #[test]
    fn tail_returns_the_last_lines_only() {
        let path = std::env::temp_dir().join(format!("enz-tail-{}.log", std::process::id()));
        fs::write(&path, "1\n2\n3\n4\n").unwrap();
        assert_eq!(tail_file(&path, 2).unwrap(), vec!["3", "4"]);
        fs::remove_file(&path).unwrap();
    }

    #[test]
    fn read_from_returns_only_appended_text() {
        let path = std::env::temp_dir().join(format!("enz-append-{}.log", std::process::id()));
        fs::write(&path, "old\n").unwrap();
        let (_, offset) = read_from(&path, None).unwrap();
        fs::write(&path, "old\nnew\n").unwrap();
        let (text, _) = read_from(&path, Some(offset)).unwrap();
        assert_eq!(text, "new\n");
        fs::remove_file(&path).unwrap();
    }
}
