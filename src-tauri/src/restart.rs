use std::time::{Duration, Instant};

#[derive(Debug, Clone)]
pub struct RestartPolicy {
    /// Failures inside `window` that stop automatic restarts.
    pub max_failures: usize,
    pub window: Duration,
    pub base_delay: Duration,
    pub max_delay: Duration,
}

#[derive(Debug, PartialEq)]
pub enum RestartDecision {
    Restart { delay: Duration },
    GiveUp,
}

impl Default for RestartPolicy {
    fn default() -> Self {
        Self {
            max_failures: 3,
            window: Duration::from_secs(300),
            base_delay: Duration::from_secs(5),
            max_delay: Duration::from_secs(60),
        }
    }
}

impl RestartPolicy {
    /// `failures` holds the time of every unexpected exit, newest last.
    pub fn decide(&self, failures: &[Instant], now: Instant) -> RestartDecision {
        let recent = failures
            .iter()
            .filter(|t| now.saturating_duration_since(**t) <= self.window)
            .count();
        if recent >= self.max_failures {
            return RestartDecision::GiveUp;
        }
        let exponent = recent.saturating_sub(1).min(16) as u32;
        let delay = self
            .base_delay
            .saturating_mul(2u32.saturating_pow(exponent))
            .min(self.max_delay);
        RestartDecision::Restart { delay }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    fn policy() -> RestartPolicy {
        RestartPolicy {
            max_failures: 3,
            window: Duration::from_secs(300),
            base_delay: Duration::from_secs(5),
            max_delay: Duration::from_secs(12),
        }
    }

    #[test]
    fn first_failure_restarts_with_base_delay() {
        let t0 = Instant::now();
        assert_eq!(
            policy().decide(&[t0], t0),
            RestartDecision::Restart {
                delay: Duration::from_secs(5)
            }
        );
    }

    #[test]
    fn delay_doubles_and_is_capped() {
        let t0 = Instant::now();
        let second = policy().decide(&[t0, t0], t0);
        assert_eq!(
            second,
            RestartDecision::Restart {
                delay: Duration::from_secs(10)
            }
        );
        let mut p = policy();
        p.max_failures = 10;
        assert_eq!(
            p.decide(&[t0, t0, t0], t0),
            RestartDecision::Restart {
                delay: Duration::from_secs(12)
            }
        );
    }

    #[test]
    fn gives_up_at_the_crash_loop_limit() {
        let t0 = Instant::now();
        assert_eq!(policy().decide(&[t0, t0, t0], t0), RestartDecision::GiveUp);
    }

    #[test]
    fn old_failures_outside_the_window_are_ignored() {
        let t0 = Instant::now();
        let now = t0 + Duration::from_secs(1000);
        let decision = policy().decide(&[t0, t0, t0, now], now);
        assert_eq!(
            decision,
            RestartDecision::Restart {
                delay: Duration::from_secs(5)
            }
        );
    }
}
