import { invoke } from "@tauri-apps/api/core";
import { open } from "@tauri-apps/plugin-dialog";

export interface AppInfo {
  name: string;
  version: string;
}

export type ServerStateName =
  "stopped" | "starting" | "running" | "stopping" | "failed";

export interface ServerState {
  state: ServerStateName;
  detail?: string;
}

export interface Metrics {
  cpuPercent: number;
  memoryBytes: number;
  runTimeSecs: number;
  totalMemoryBytes: number;
}

export interface Players {
  current: number;
  /** Null when neither the query nor the server ini gives a limit. */
  max: number | null;
}

export interface Overview {
  state: ServerState;
  pid: number | null;
  external: boolean;
  mapId: string | null;
  metrics: Metrics | null;
  /** From the server's query port. Null while it does not answer. */
  players: Players | null;
  /** True when the server's ini enables RCON and has an admin password. */
  rconReady: boolean;
  /** RAM the system can still hand out. The server needs about 4 GB to load. */
  availableMemoryBytes: number;
}

export interface MapView {
  id: string;
  displayName: string;
  edition: string;
  launchToken: string;
  dlcRequired: boolean;
  installedCheck: string;
  thumbnail: string;
  verified: boolean;
  installed: boolean;
  saveBytes: number | null;
}

export interface Settings {
  serverRoot: string;
  sessionName: string;
  gamePort: number | null;
  queryPort: number | null;
  readyMarker: string;
  stopTimeoutSecs: number;
  backupOnStop: boolean;
  lastMap: string | null;
  autostartRadmin: boolean;
  radminPath: string;
}

export const getAppInfo = () => invoke<AppInfo>("app_info");
export const listMaps = () => invoke<MapView[]>("list_maps");
export const getSettings = () => invoke<Settings>("get_settings");
export const saveSettings = (settings: Settings) =>
  invoke<void>("save_settings", { settings });
/** Ini key -> value of the map/server rules. Keys missing from the ini are absent. */
export type ServerOptions = Record<string, string>;
export const getServerOptions = () =>
  invoke<ServerOptions>("get_server_options");
export const saveServerOptions = (options: ServerOptions) =>
  invoke<void>("save_server_options", { options });
export type IniKind =
  "text" | "bool" | "rate" | "int" | "players" | "port" | "list";

/** One field of a list line. `A.B` is `B` inside `A=(..)`; "" means the line is the bare value. */
export interface IniColumn {
  name: string;
  kind: "class" | "tag" | "rate" | "int" | "bool" | "ints";
  optional: boolean;
  quoted: boolean;
  example: string;
}

/** One setting the launcher can write, from data/ini-catalog.json. */
export interface IniEntry {
  key: string;
  file: "game" | "gus";
  section: string;
  kind: IniKind;
  /** ARK's own default; null when the game has none to show. */
  default: string | null;
  group: string;
  /** Array keys are written as key[0] to key[count - 1]. */
  count: number | null;
  max: number | null;
  /** x, s, min, xp, count or uu. */
  unit: string | null;
  lockedIndexes: number[];
  secret: boolean;
  legacy: boolean;
  /** For "list": the fields of each line. The value is the lines joined by a line break. */
  columns: IniColumn[];
}

export interface IniValues {
  /** Current value of each catalog key the files set. Secrets are left out. */
  values: Record<string, string>;
  /** Secret keys that have a value in the file. */
  secretsSet: string[];
}

export const getIniCatalog = () => invoke<IniEntry[]>("get_ini_catalog");
export const getIniValues = () => invoke<IniValues>("get_ini_values");
/** Key to new value, or null to go back to the game's default (the line is removed). */
export const saveIniValues = (changes: Record<string, string | null>) =>
  invoke<void>("save_ini_values", { changes });

/** Backup folder names (unix milliseconds), newest first. */
export const listIniBackups = () => invoke<string[]>("list_ini_backups");
export const restoreIniBackup = (name: string) =>
  invoke<void>("restore_ini_backup", { name });

export interface CustomKey {
  file: IniEntry["file"];
  section: string;
  key: string;
}
export interface IniLine {
  key: string;
  /** null for a key that looks secret; only isSet is told. */
  value: string | null;
  secret: boolean;
  isSet: boolean;
}
export interface CustomIni {
  /** Keys added in INI PERSONALIZADO, in the order they were added. */
  tracked: CustomKey[];
  sections: { file: IniEntry["file"]; section: string; lines: IniLine[] }[];
}
/** value null removes the line and forgets the key. */
export type CustomChange = CustomKey & { value: string | null };
export const getCustomIni = () => invoke<CustomIni>("get_custom_ini");
export const saveCustomIni = (changes: CustomChange[]) =>
  invoke<void>("save_custom_ini", { changes });

export interface ModView {
  id: string;
  name: string;
  /** In the game client, so it can be copied to the server. */
  inSteam: boolean;
  /** Its files are already in the server folder. */
  onServer: boolean;
  /** The server loads it. */
  active: boolean;
}
/** Active mods first, in the server's load order, then the rest by name. */
export const listMods = () => invoke<ModView[]>("list_mods");
/** Makes `ids` the mods the server loads, copying missing ones from the game client. */
export const applyMods = (ids: string[]) => invoke<void>("apply_mods", { ids });
export const checkServerRoot = (path: string) =>
  invoke<boolean>("check_server_root", { path });
export const saveAdminPassword = (password: string) =>
  invoke<void>("save_admin_password", { password });
export const hasAdminPassword = () => invoke<boolean>("has_admin_password");
export const serverOverview = () => invoke<Overview>("server_overview");
export const serverLogs = () => invoke<string[]>("server_logs");
export const startServer = (mapId: string) =>
  invoke<void>("start_server", { mapId });
export const stopServer = () => invoke<void>("stop_server");
/** Writes the world to disk now. Needs RCON; resolves with the server's text. */
export const saveWorld = () => invoke<string>("save_world");
/** Destroys all wild creatures so new ones spawn at the current difficulty. */
export const regenWildDinos = () => invoke<string>("regen_wild_dinos");

export async function pickFolder(): Promise<string | null> {
  const picked = await open({ directory: true, multiple: false });
  return typeof picked === "string" ? picked : null;
}
