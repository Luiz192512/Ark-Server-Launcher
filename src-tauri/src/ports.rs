use std::net::UdpSocket;

/// True when nothing else holds the UDP port on this machine.
pub fn udp_port_is_free(port: u16) -> bool {
    UdpSocket::bind(("0.0.0.0", port)).is_ok()
}

/// IPv4 UDP ports currently bound by the process `pid`.
#[cfg(windows)]
pub fn udp_ports_of(pid: u32) -> Vec<u16> {
    use windows_sys::Win32::NetworkManagement::IpHelper::{
        GetExtendedUdpTable, UDP_TABLE_OWNER_PID,
    };
    use windows_sys::Win32::Networking::WinSock::AF_INET;

    const ROW_BYTES: usize = 12; // MIB_UDPROW_OWNER_PID: addr, port, pid
    let mut size = 0u32;
    // First call only reports the buffer size needed.
    unsafe {
        GetExtendedUdpTable(
            std::ptr::null_mut(),
            &mut size,
            0,
            u32::from(AF_INET),
            UDP_TABLE_OWNER_PID,
            0,
        );
    }
    if size == 0 {
        return Vec::new();
    }
    let mut buf = vec![0u8; size as usize];
    let rc = unsafe {
        GetExtendedUdpTable(
            buf.as_mut_ptr().cast(),
            &mut size,
            0,
            u32::from(AF_INET),
            UDP_TABLE_OWNER_PID,
            0,
        )
    };
    if rc != 0 || buf.len() < 4 {
        return Vec::new();
    }
    let word = |at: usize| u32::from_ne_bytes([buf[at], buf[at + 1], buf[at + 2], buf[at + 3]]);
    let rows = word(0) as usize;
    (0..rows)
        .map(|i| 4 + i * ROW_BYTES)
        .take_while(|off| off + ROW_BYTES <= buf.len())
        .filter(|off| word(off + 8) == pid)
        // The port sits in the low 16 bits, in network byte order.
        .map(|off| u16::from_be(word(off + 4) as u16))
        .collect()
}

#[cfg(not(windows))]
pub fn udp_ports_of(_pid: u32) -> Vec<u16> {
    Vec::new()
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn reports_a_held_port_as_in_use() {
        let held = UdpSocket::bind(("0.0.0.0", 0)).unwrap();
        let port = held.local_addr().unwrap().port();
        assert!(!udp_port_is_free(port));
        drop(held);
        assert!(udp_port_is_free(port));
    }

    #[cfg(windows)]
    #[test]
    fn lists_the_ports_this_process_holds() {
        let held = UdpSocket::bind(("0.0.0.0", 0)).unwrap();
        let port = held.local_addr().unwrap().port();
        assert!(udp_ports_of(std::process::id()).contains(&port));
    }

    #[cfg(windows)]
    #[test]
    fn another_pid_does_not_own_our_port() {
        let held = UdpSocket::bind(("0.0.0.0", 0)).unwrap();
        let port = held.local_addr().unwrap().port();
        assert!(!udp_ports_of(u32::MAX - 1).contains(&port));
    }
}
