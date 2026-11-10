use serde::Serialize;
use sysinfo::{Pid, ProcessRefreshKind, ProcessesToUpdate, System};

#[derive(Debug, Clone, Copy, PartialEq, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct Metrics {
    /// Share of the whole machine, 0 to 100.
    pub cpu_percent: f32,
    pub memory_bytes: u64,
    /// Seconds since the process started.
    pub run_time_secs: u64,
    /// Installed RAM of the machine, to size the memory bar.
    pub total_memory_bytes: u64,
}

/// Keeps one `System` so CPU usage can be computed between two samples.
pub struct Probe {
    sys: System,
    cores: f32,
    total_memory: u64,
}

impl Default for Probe {
    fn default() -> Self {
        Self::new()
    }
}

impl Probe {
    pub fn new() -> Self {
        let cores = std::thread::available_parallelism().map_or(1, |n| n.get()) as f32;
        let mut sys = System::new();
        sys.refresh_memory();
        let total_memory = sys.total_memory();
        Self {
            sys,
            cores,
            total_memory,
        }
    }

    /// RAM the system can hand out right now, in bytes.
    pub fn available_memory(&mut self) -> u64 {
        self.sys.refresh_memory();
        self.sys.available_memory()
    }

    pub fn sample(&mut self, pid: u32) -> Option<Metrics> {
        let pid = Pid::from_u32(pid);
        self.sys.refresh_processes_specifics(
            ProcessesToUpdate::Some(&[pid]),
            true,
            ProcessRefreshKind::nothing().with_cpu().with_memory(),
        );
        self.sys.process(pid).map(|p| Metrics {
            cpu_percent: (p.cpu_usage() / self.cores).clamp(0.0, 100.0),
            memory_bytes: p.memory(),
            run_time_secs: p.run_time(),
            total_memory_bytes: self.total_memory,
        })
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn samples_the_current_process() {
        let mut probe = Probe::new();
        let m = probe.sample(std::process::id()).expect("own pid exists");
        assert!(m.memory_bytes > 0);
        assert!(m.total_memory_bytes >= m.memory_bytes);
        assert!((0.0..=100.0).contains(&m.cpu_percent));
    }

    #[test]
    fn reports_some_available_memory_below_the_total() {
        let mut probe = Probe::new();
        let free = probe.available_memory();
        assert!(free > 0 && free <= probe.total_memory);
    }

    #[test]
    fn unknown_pid_yields_none() {
        assert!(Probe::new().sample(u32::MAX - 1).is_none());
    }
}
