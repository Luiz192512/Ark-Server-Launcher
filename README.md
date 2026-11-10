# Ark Server Launcher

The app is called **ENZ Launcher**. Desktop launcher for the ARK: Survival Evolved dedicated server on Windows. Pick a map, start, stop and watch the server from one window. Unofficial fan tool, not affiliated with Studio Wildcard. All artwork is original.

Stack: Tauri 2 (Rust core) + React + TypeScript + Vite. No Python anywhere. The decision is recorded in [docs/ADR-001-stack.md](docs/ADR-001-stack.md).

## Download

Get `ENZ-Launcher_0.1.0_x64-setup.exe` from the [latest release](../../releases/latest). It installs for the current user, no administrator needed. The installer is unsigned, so Windows SmartScreen may warn: choose **More info**, then **Run anyway**. The release notes list the SHA-256 of the file. To build it yourself, see [Build](#build).

On first run open **Configurações** and set the server folder, for example `D:\SteamLibrary\steamapps\common\ARK Survival Evolved Dedicated Server`. The launcher checks that `ShooterGameServer.exe` is there.

Settings live in `%APPDATA%\enz-launcher\settings.json`. The admin password is stored in the Windows Credential Manager, never in that file.

## Use

- **Mapas**: choose a map and press **Iniciar servidor**. Maps whose level file is missing are disabled. Maps not yet confirmed appear only with "Mostrar mapas não verificados".
- **Painel**: state, uptime, CPU, memory, players and the live log, with these buttons:
  - **Salvar jogo**: writes the world now, without stopping (RCON `saveworld`).
  - **Regerar selvagens**: destroys every wild creature so new ones spawn at the current difficulty (RCON `DestroyWildDinos`), after a second click.
  - **Reiniciar** and **Fechar jogo**: Fechar jogo saves the world and exits (Ctrl+C to the server console), after a second click, and also copies the world, player profiles and tribes (`.ark`, `.arkprofile`, `.arktribe`) to `%APPDATA%\enz-launcher\backups` (newest 10 are kept) when the backup switch is on.
- **RCON**: the two RCON buttons need `RCONEnabled=True` and a `ServerAdminPassword` in the server's `[ServerSettings]`. The launcher reads them from that ini and never shows the password. Without them the buttons are disabled and the panel says why.
- **Power button**: the hexagon at the top of the panel starts the server, cancels a start in progress (right away, since nothing is loaded yet to save) and closes a running server (saves first, after a second press). It is the same button as the phone design that turns the PC on from far away.
- **The server window**: the ARK server opens its own console window even without `-log`. The launcher hides it as soon as it appears (the console stays alive, so Ctrl+C still works) and starts the server without `-log`. Everything shows in the panel.
- **Low memory**: the panel warns when the PC has less than 4 GB of free RAM before a start. Below that the server tends to stall while loading (it was seen stuck at 0.3 GB free).
- **Players**: read from the server's own query port (Steam A2S, UDP 27015), so no RCON or password is needed. The limit comes from the query, or from `MaxPlayers` in the server's `GameUserSettings.ini` when the query reports none.
- A server started outside the launcher is detected and can be stopped from the dashboard.
- **Configurações > SERVIDOR E MAPA**: the server rules, read from and written to `Game.ini` and `GameUserSettings.ini` under `ShooterGame\Saved\Config\WindowsServer`. Saving is locked while the server runs, because the server rewrites its ini when it exits.
  - **Categories**: 13 groups built from `data/ini-catalog.json` (130 verified keys, see `docs/catalogo-ini-ase.md`). Each field shows its default, unit and an explanation. **Voltar ao padrão** removes the line so the game uses its own default. Search looks in the name, the explanation and the ini key.
  - **Atributos por nível** (Dinossauros, Jogador): the `PerLevelStatsMultiplier_*` tables. Attributes with no effect are locked and never written (creatures: water, temperature, fortitude; player: temperature).
  - **Lists** (Spawn de criaturas, Engramas, rampa de experiência, pilha por item): one row per ini line, with add, remove and a preview of the lines. A line the launcher could not write back the same makes that list read-only.
  - **INI personalizado**: keys outside the catalog. The launcher remembers the keys it created (`%APPDATA%\enz-launcher\custom-ini.json`) and only edits those lines. Keys another screen manages, command line options and values with a line break are refused. Values of keys that look secret are never shown.
  - **Backups**: every write first copies both ini files to `%APPDATA%\enz-launcher\ini-backups` (newest 10 kept). Restoring copies the current files first, so a restore can be undone.
  - Passwords (`ServerAdminPassword`, `ServerPassword`) are never shown: only "definida" or "não definida". A blank field keeps the current one.

## Move a single-player world to the server

A world played from the game's own menu lives in the game client, not in the dedicated server, so a fresh server shows no character. With the server stopped, copy these from `<ARK client>\ShooterGame\Saved\SavedArksLocal` to `<server>\ShooterGame\Saved\SavedArks`:

- `TheIsland.ark` (or the map's `.ark`): the world.
- `LocalPlayer.arkprofile`, renamed to `<your SteamID64>.arkprofile`: your character. Other `<SteamID64>.arkprofile` files are other players and are copied as they are.
- The `.arktribe` files: the tribes.

Back up the server's folder first. Checked on this setup: the world, one profile and two tribes were copied and matched byte for byte. Seeing the character in game was not checked.

## Add a map

Edit [data/maps.json](data/maps.json) and rebuild. No code change is needed.

```json
{ "id": "mymap", "displayName": "My Map", "edition": "ase", "launchToken": "MyMap",
  "dlcRequired": false, "installedCheck": "Mods/MyMap/MyMap.umap",
  "thumbnail": "assets/maps/mymap.webp", "verified": false }
```

- `launchToken` is the text before the first `?` in the server command line (the level name).
- `installedCheck` is the level file path relative to `ShooterGame/Content`. The map shows as installed only when that file exists.
- Keep `verified` false until you have started the map once. Then set it to true.
- For artwork add a gradient in [src/lib/mapArt.ts](src/lib/mapArt.ts), keyed by `id`.

## Command line

The same executable works without a window when given a flag. Exit codes are stable so scripts can rely on them.

```powershell
enz-launcher.exe --map theisland --start   # start detached
enz-launcher.exe --status                  # prints "running pid=N" or "stopped"
enz-launcher.exe --stop                    # graceful stop, forced after the timeout
```

| Code | Meaning |
|---|---|
| 0 | Done |
| 1 | Error, or invalid arguments |
| 2 | `--start` while the server is already running |
| 3 | `--stop` or `--status` while the server is not running |
| 4 | A required UDP port is already in use |
| 5 | Map unknown or not installed |

CLI start does not supervise the server. Automatic restart after a crash only works while the window is open and started the server. See [docs/boot-task.md](docs/boot-task.md) for the boot-time task.

## Develop

Requirements: Node (built with 25), Rust stable (MSVC), Visual Studio Build Tools, WebView2 (included in Windows 11).

```powershell
npm install
npm run tauri dev          # app with hot reload
npm run dev                # UI only in a browser
```

In the browser, `http://localhost:1420/?mock=running` runs the UI against fake data. Scenarios: `stopped`, `starting`, `running`, `stopping`, `failed`, `empty`, `loading`. This code exists only in development builds.

## Test

```powershell
npm run typecheck ; npm run lint ; npm test          # UI, accessibility, contrast
cd src-tauri ; cargo clippy --all-targets ; cargo test   # core, with a fake server
```

Tests never touch the real server. They start `src/bin/fake_server.rs` from temporary folders.

## Build

```powershell
npm run tauri build        # NSIS installer
```

The first build downloads the NSIS tooling. Output is in `src-tauri/target/release/bundle/nsis`.

## App icon

The icon is original art inspired by ARK's look (a teal hexagon with a chevron), not the official logo. Edit `design/icon.svg`, then run `npm run icon` to rebuild `design/icon.png` and every file in `src-tauri/icons`. Delete the `android` and `ios` folders it creates.

## Layout

| Path | Contents |
|---|---|
| `src/` | React UI: screens, components, i18n (pt-BR), styles from the design tokens |
| `src-tauri/src/` | Rust core: map registry, command builder, supervisor, restart policy, backup, metrics, CLI |
| `data/maps.json` | Map registry |
| `data/ini-catalog.json` | The ini settings the launcher may write: file, section, kind, default, group, list columns |
| `design/` | Design tokens (`tokens.json`, `tokens.css`) exported from the Claude Design canvas |
| `tests/` | UI, accessibility and contrast tests |
| `docs/` | Architecture decision, boot task note, ini catalog evidence |

## How the real server behaves

Checked against the real ARK: Survival Evolved dedicated server (build 361.7), started and stopped through the launcher window and the CLI:

- **Log**: the server keeps `ShooterGame.log` empty unless it runs with `-forcelogflush`. The launcher adds that flag. A server started outside the launcher without it shows no log in the panel.
- **Ready**: the game port (UDP 7777) opens about 30 seconds before startup ends. The launcher marks the server ready on the log line `has successfully started!` (setting `readyMarker`). With a silent log it falls back to the port after a 45 second grace period. A full start took about 150 to 260 seconds on the test machine.
- **Stop**: the launcher sends Ctrl+C to the server console. The server then saves the world and exits, in about 2 to 5 seconds. Typing `saveworld` or `DoExit` in its console has no effect, and closing the window exits without saving. If the console cannot be reached, the launcher falls back to closing the window (no save) and then to a forced kill after the stop timeout.
- **Ports**: 7777 (game) and 27015 (query) are confirmed as the defaults.

## Known limits

- Checked on the real server, with the owner: start and stop from the window and the CLI, ready detection, log, player count, save on stop, and the RCON buttons (Salvar jogo, Regerar selvagens). Checked only with a fake server so far: the console without a window plus Ctrl+C on the real server, and the `--autostart` boot flow.
- The admin password field in Configurações is kept in the Windows Credential Manager but the RCON buttons read the password from the server's ini, which is what the server itself uses.
- The ini rules screens were checked once on the real server (05/11/2026): `AutoSavePeriodMinutes` changed from 5 to 6 through the UI, only that line changed, the server started and stopped with the new value kept, and the value was set back so both files ended byte for byte as before. Lists, attribute tables, INI personalizado and backup restore are tested on copies of the real files and with the dev mock only.
- With little free memory the start is very slow: with 3.6 GB free a start took 1188 seconds instead of the usual 150 to 260.
- A rewritten list line keeps its content but uses the catalog's field order and quoting, so its text can differ from the original.
- RCON listens on port 27020 of this PC. Do not forward that port on the router. The launcher only connects to 127.0.0.1.
- The mobile version and remote power-on are designed but not built. Remote power-on needs an always-on device on the home network to relay the Wake-on-LAN packet.

## License

[MIT](LICENSE). ARK: Survival Evolved is a trademark of Studio Wildcard. This project is unofficial.
