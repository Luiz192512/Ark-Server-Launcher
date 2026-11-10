//! Minimal Source RCON client (the protocol the ARK server speaks on its
//! RCON port). One connection per command is enough for the launcher.

use std::io::{self, Read, Write};
use std::net::{SocketAddr, TcpStream, ToSocketAddrs};
use std::time::Duration;

const TYPE_RESPONSE: i32 = 0;
const TYPE_EXEC_OR_AUTH_RESPONSE: i32 = 2;
const TYPE_AUTH: i32 = 3;
/// Header fields after the size (id, type) plus the two terminating zeros.
const FIXED_BODY: i32 = 10;
const MAX_PACKET: i32 = 64 * 1024;

#[derive(Debug, PartialEq)]
pub enum RconError {
    Io(String),
    AuthFailed,
    Protocol(String),
}

impl From<io::Error> for RconError {
    fn from(e: io::Error) -> Self {
        RconError::Io(e.to_string())
    }
}

impl RconError {
    /// Stable code the UI turns into a translated message.
    pub fn code(&self) -> String {
        match self {
            Self::Io(m) => format!("rcon_unreachable:{m}"),
            Self::AuthFailed => "rcon_auth_failed".into(),
            Self::Protocol(m) => format!("rcon_protocol:{m}"),
        }
    }
}

fn write_packet(w: &mut impl Write, id: i32, kind: i32, body: &str) -> io::Result<()> {
    let mut packet = Vec::with_capacity(14 + body.len());
    packet.extend_from_slice(&(FIXED_BODY + body.len() as i32).to_le_bytes());
    packet.extend_from_slice(&id.to_le_bytes());
    packet.extend_from_slice(&kind.to_le_bytes());
    packet.extend_from_slice(body.as_bytes());
    packet.extend_from_slice(&[0, 0]);
    w.write_all(&packet)?;
    w.flush()
}

fn read_i32(r: &mut impl Read) -> io::Result<i32> {
    let mut b = [0u8; 4];
    r.read_exact(&mut b)?;
    Ok(i32::from_le_bytes(b))
}

fn read_packet(r: &mut impl Read) -> Result<(i32, i32, String), RconError> {
    let size = read_i32(r)?;
    if !(FIXED_BODY..=MAX_PACKET).contains(&size) {
        return Err(RconError::Protocol(format!("bad packet size {size}")));
    }
    let id = read_i32(r)?;
    let kind = read_i32(r)?;
    let mut body = vec![0u8; (size - FIXED_BODY) as usize];
    r.read_exact(&mut body)?;
    let mut tail = [0u8; 2];
    r.read_exact(&mut tail)?;
    Ok((id, kind, String::from_utf8_lossy(&body).into_owned()))
}

pub struct Rcon {
    stream: TcpStream,
    next_id: i32,
}

impl Rcon {
    /// Connects and authenticates. `addr` is for example `127.0.0.1:27020`.
    pub fn connect(addr: &str, password: &str, timeout: Duration) -> Result<Self, RconError> {
        let target: SocketAddr = addr
            .to_socket_addrs()?
            .next()
            .ok_or_else(|| RconError::Protocol("no address".into()))?;
        let stream = TcpStream::connect_timeout(&target, timeout)?;
        stream.set_read_timeout(Some(timeout))?;
        stream.set_write_timeout(Some(timeout))?;
        let mut rcon = Rcon { stream, next_id: 1 };
        let auth_id = rcon.take_id();
        write_packet(&mut rcon.stream, auth_id, TYPE_AUTH, password)?;
        // The server may send an empty response first, then the auth result.
        loop {
            let (id, kind, _) = read_packet(&mut rcon.stream)?;
            if kind == TYPE_EXEC_OR_AUTH_RESPONSE {
                return if id == auth_id {
                    Ok(rcon)
                } else {
                    Err(RconError::AuthFailed)
                };
            }
        }
    }

    fn take_id(&mut self) -> i32 {
        let id = self.next_id;
        self.next_id += 1;
        id
    }

    /// Runs a command and returns the server's text answer.
    pub fn exec(&mut self, command: &str) -> Result<String, RconError> {
        let id = self.take_id();
        write_packet(&mut self.stream, id, TYPE_EXEC_OR_AUTH_RESPONSE, command)?;
        loop {
            let (got, kind, body) = read_packet(&mut self.stream)?;
            if kind == TYPE_RESPONSE && got == id {
                return Ok(body.trim().to_owned());
            }
            // Anything else (game log pushes, other ids) is not our answer.
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::net::TcpListener;
    use std::thread;

    /// Serves one client: accepts `password`, answers commands with
    /// `reply(command)`, and first pushes an unrelated log packet.
    fn serve(password: &'static str, reply: fn(&str) -> String) -> String {
        let listener = TcpListener::bind("127.0.0.1:0").unwrap();
        let addr = listener.local_addr().unwrap().to_string();
        thread::spawn(move || {
            let (mut s, _) = listener.accept().unwrap();
            let (id, _, body) = read_packet(&mut s).unwrap();
            // Real servers send an empty response before the auth result.
            write_packet(&mut s, id, TYPE_RESPONSE, "").unwrap();
            let auth_id = if body == password { id } else { -1 };
            write_packet(&mut s, auth_id, TYPE_EXEC_OR_AUTH_RESPONSE, "").unwrap();
            while let Ok((id, _, command)) = read_packet(&mut s) {
                write_packet(&mut s, 0, TYPE_RESPONSE, "server log line").unwrap();
                write_packet(&mut s, id, TYPE_RESPONSE, &reply(&command)).unwrap();
            }
        });
        addr
    }

    #[test]
    fn a_packet_survives_a_round_trip() {
        let mut wire = Vec::new();
        write_packet(&mut wire, 7, TYPE_AUTH, "segredo").unwrap();
        assert_eq!(&wire[..4], &(10 + 7i32).to_le_bytes());
        let (id, kind, body) = read_packet(&mut wire.as_slice()).unwrap();
        assert_eq!((id, kind, body.as_str()), (7, TYPE_AUTH, "segredo"));
    }

    #[test]
    fn rejects_an_absurd_packet_size() {
        let wire = (-5i32).to_le_bytes();
        assert!(matches!(
            read_packet(&mut wire.as_slice()),
            Err(RconError::Protocol(_))
        ));
    }

    #[test]
    fn authenticates_and_runs_a_command() {
        let addr = serve("segredo", |c| format!("ok:{c}"));
        let mut rcon = Rcon::connect(&addr, "segredo", Duration::from_secs(2)).unwrap();
        assert_eq!(rcon.exec("saveworld").unwrap(), "ok:saveworld");
        assert_eq!(
            rcon.exec("DestroyWildDinos").unwrap(),
            "ok:DestroyWildDinos"
        );
    }

    #[test]
    fn a_wrong_password_is_reported_as_such() {
        let addr = serve("segredo", |c| c.to_owned());
        assert_eq!(
            Rcon::connect(&addr, "errada", Duration::from_secs(2)).err(),
            Some(RconError::AuthFailed)
        );
    }

    #[test]
    fn nothing_listening_is_an_io_error_with_a_stable_code() {
        let port = {
            let l = TcpListener::bind("127.0.0.1:0").unwrap();
            l.local_addr().unwrap().port()
        };
        let err = Rcon::connect(
            &format!("127.0.0.1:{port}"),
            "x",
            Duration::from_millis(300),
        )
        .err()
        .unwrap();
        assert!(err.code().starts_with("rcon_unreachable:"));
    }

    #[test]
    fn a_silent_server_times_out_instead_of_hanging() {
        let listener = TcpListener::bind("127.0.0.1:0").unwrap();
        let addr = listener.local_addr().unwrap().to_string();
        thread::spawn(move || {
            let _hold = listener.accept().unwrap();
            thread::sleep(Duration::from_secs(2));
        });
        let started = std::time::Instant::now();
        assert!(Rcon::connect(&addr, "x", Duration::from_millis(300)).is_err());
        assert!(started.elapsed() < Duration::from_secs(2));
    }
}
