//! Steam server query (A2S_INFO) over UDP. The ARK server answers it on its
//! query port with the player count, so no RCON or password is needed.

use serde::Serialize;
use std::net::UdpSocket;
use std::time::Duration;

const HEADER: [u8; 4] = [0xFF; 4];
const INFO_REQUEST: u8 = 0x54;
const INFO_RESPONSE: u8 = 0x49;
const CHALLENGE_RESPONSE: u8 = 0x41;
const QUERY_TEXT: &[u8] = b"Source Engine Query\0";

#[derive(Debug, Clone, PartialEq, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ServerInfo {
    pub name: String,
    pub map: String,
    pub players: u8,
    pub max_players: u8,
    pub bots: u8,
}

fn request(challenge: Option<[u8; 4]>) -> Vec<u8> {
    let mut packet = HEADER.to_vec();
    packet.push(INFO_REQUEST);
    packet.extend_from_slice(QUERY_TEXT);
    if let Some(c) = challenge {
        packet.extend_from_slice(&c);
    }
    packet
}

/// Asks the server at `addr` (for example `127.0.0.1:27015`) for its info.
/// Newer servers first answer with a challenge that must be sent back.
pub fn query_info(addr: &str, timeout: Duration) -> Result<ServerInfo, String> {
    let socket = UdpSocket::bind("0.0.0.0:0").map_err(|e| e.to_string())?;
    socket
        .set_read_timeout(Some(timeout))
        .map_err(|e| e.to_string())?;
    socket.connect(addr).map_err(|e| e.to_string())?;

    let mut buf = [0u8; 1400];
    socket.send(&request(None)).map_err(|e| e.to_string())?;
    let mut len = socket.recv(&mut buf).map_err(|e| e.to_string())?;
    if len >= 9 && buf[..4] == HEADER && buf[4] == CHALLENGE_RESPONSE {
        let challenge = [buf[5], buf[6], buf[7], buf[8]];
        socket
            .send(&request(Some(challenge)))
            .map_err(|e| e.to_string())?;
        len = socket.recv(&mut buf).map_err(|e| e.to_string())?;
    }
    parse_info(&buf[..len])
}

fn read_text(packet: &[u8], at: &mut usize) -> Result<String, String> {
    let rest = packet.get(*at..).ok_or("packet too short")?;
    let end = rest
        .iter()
        .position(|b| *b == 0)
        .ok_or("unterminated text")?;
    *at += end + 1;
    Ok(String::from_utf8_lossy(&rest[..end]).into_owned())
}

pub fn parse_info(packet: &[u8]) -> Result<ServerInfo, String> {
    if packet.len() < 6 || packet[..4] != HEADER || packet[4] != INFO_RESPONSE {
        return Err("not an info response".into());
    }
    let mut at = 6; // header, type, protocol
    let name = read_text(packet, &mut at)?;
    let map = read_text(packet, &mut at)?;
    read_text(packet, &mut at)?; // folder
    read_text(packet, &mut at)?; // game
    at += 2; // app id
    let counts = packet.get(at..at + 3).ok_or("packet too short")?;
    Ok(ServerInfo {
        name,
        map,
        players: counts[0],
        max_players: counts[1],
        bots: counts[2],
    })
}

#[cfg(test)]
mod tests {
    use super::*;

    /// A response shaped like the real one: header, type, protocol, four
    /// texts, app id, then player, max player and bot counts.
    fn info_packet(players: u8, max: u8) -> Vec<u8> {
        let mut p = vec![0xFF, 0xFF, 0xFF, 0xFF, INFO_RESPONSE, 17];
        for text in ["ENZ - (v361.7)", "TheIsland", "ark_survival_evolved", "ARK"] {
            p.extend_from_slice(text.as_bytes());
            p.push(0);
        }
        p.extend_from_slice(&[0x00, 0x00, players, max, 0, b'd', b'w', 0, 1]);
        p
    }

    #[test]
    fn parses_name_map_and_counts() {
        let info = parse_info(&info_packet(3, 70)).unwrap();
        assert_eq!(info.name, "ENZ - (v361.7)");
        assert_eq!(info.map, "TheIsland");
        assert_eq!((info.players, info.max_players, info.bots), (3, 70, 0));
    }

    #[test]
    fn rejects_other_packets_and_truncated_ones() {
        assert!(parse_info(b"junk").is_err());
        let mut truncated = info_packet(1, 70);
        truncated.truncate(12);
        assert!(parse_info(&truncated).is_err());
        let mut wrong_type = info_packet(1, 70);
        wrong_type[4] = 0x44;
        assert!(parse_info(&wrong_type).is_err());
    }

    /// Serves one query on a local port. With `challenge` it first demands the
    /// challenge round trip, like current Steam servers.
    fn serve(socket: UdpSocket, players: u8, challenge: bool) {
        let mut buf = [0u8; 256];
        let (n, peer) = socket.recv_from(&mut buf).unwrap();
        assert_eq!(&buf[..5], &[0xFF, 0xFF, 0xFF, 0xFF, INFO_REQUEST]);
        if challenge && n == request(None).len() {
            socket
                .send_to(
                    &[0xFF, 0xFF, 0xFF, 0xFF, CHALLENGE_RESPONSE, 1, 2, 3, 4],
                    peer,
                )
                .unwrap();
            let (n, peer) = socket.recv_from(&mut buf).unwrap();
            assert_eq!(&buf[n - 4..n], &[1, 2, 3, 4], "challenge not echoed");
            socket.send_to(&info_packet(players, 70), peer).unwrap();
        } else {
            socket.send_to(&info_packet(players, 70), peer).unwrap();
        }
    }

    fn query_against(players: u8, challenge: bool) -> Result<ServerInfo, String> {
        let socket = UdpSocket::bind("127.0.0.1:0").unwrap();
        let addr = socket.local_addr().unwrap().to_string();
        let server = std::thread::spawn(move || serve(socket, players, challenge));
        let result = query_info(&addr, Duration::from_secs(2));
        server.join().unwrap();
        result
    }

    #[test]
    fn queries_a_server_without_a_challenge() {
        assert_eq!(query_against(2, false).unwrap().players, 2);
    }

    #[test]
    fn answers_the_challenge_and_gets_the_info() {
        assert_eq!(query_against(5, true).unwrap().players, 5);
    }

    #[test]
    fn a_silent_server_times_out_with_an_error() {
        let socket = UdpSocket::bind("127.0.0.1:0").unwrap();
        let addr = socket.local_addr().unwrap().to_string();
        assert!(query_info(&addr, Duration::from_millis(150)).is_err());
    }
}
