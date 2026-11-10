# Starting the server at boot

The launcher can start the server by itself when Windows logs you in. Register the app as a logon task with the `--autostart` flag. There is no script loop and no console left open.

## What `--autostart` does

1. Minimizes the app window to the taskbar.
2. Waits for the network (checks every 5 s, gives up after 3 minutes and goes on).
3. Opens Radmin VPN if `autostartRadmin` is true, the file at `radminPath` exists and Radmin is not already running.
4. Starts the map from `--map <id>` or, without it, the last map started from the launcher. If there is neither, it starts nothing and never guesses.
5. If the server is already running, it starts nothing.

The server runs under the app's supervisor: the state, live log, metrics, players and the buttons Salvar jogo and Fechar jogo work from the first minute, and a crash restarts it (three crashes in five minutes stop the restarts). The server console exists but has no window.

Settings in `%APPDATA%\enz-launcher\settings.json` (defaults shown):

```json
{ "autostartRadmin": true, "radminPath": "C:\\Program Files (x86)\\Radmin VPN\\RvRvpnGui.exe" }
```

## Registering the logon task

Create a scheduled task that runs at logon, in your user session, with the action:

```text
"%LOCALAPPDATA%\ENZ Launcher\enz-launcher.exe" --autostart --map theisland
```

The NSIS installer installs per user, so that is the default app path. Confirm it after installing. Drop `--map` to start the last map used from the launcher.

## Things to know

- The Windows user must be logged in: the task runs at logon, in the user's session. Automatic login is a security trade-off, so decide it on your own.
- The command line `enz-launcher.exe --map <id> --start` still exists for scripts. It starts the server detached and unsupervised, with no window. `--stop` saves the world and exits the server, and `--status` prints running or stopped (exit code 0 or 3).
- Not validated yet: the registered task itself and a full reboot with this flow.
