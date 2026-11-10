import type {
  MapView,
  Overview,
  ServerStateName,
  Settings,
} from "../../src/lib/native";

export function map(id: string, over: Partial<MapView> = {}): MapView {
  return {
    id,
    displayName: id.toUpperCase(),
    edition: "ase",
    launchToken: id,
    dlcRequired: false,
    installedCheck: "",
    thumbnail: "",
    verified: true,
    installed: true,
    saveBytes: null,
    ...over,
  };
}

export const MAPS: MapView[] = [
  map("alpha", { saveBytes: 34 * 1024 ** 2 }),
  map("bravo"),
  map("charlie", { installed: false }),
  map("delta", { verified: false }),
];

export const SETTINGS: Settings = {
  serverRoot: "D:\\ark",
  sessionName: "ENZ",
  gamePort: null,
  queryPort: null,
  readyMarker: "advertising for join",
  stopTimeoutSecs: 60,
  backupOnStop: true,
  lastMap: "alpha",
  autostartRadmin: true,
  radminPath: "C:\\Radmin\\RvRvpnGui.exe",
};

export function overview(
  state: ServerStateName,
  over: Partial<Overview> = {},
): Overview {
  const running = state !== "stopped" && state !== "failed";
  return {
    state: { state },
    pid: running ? 100 : null,
    external: false,
    mapId: "alpha",
    players: null,
    rconReady: true,
    availableMemoryBytes: 8 * 1024 ** 3,
    metrics: running
      ? {
          cpuPercent: 31,
          memoryBytes: 8 * 1024 ** 3,
          runTimeSecs: 65,
          totalMemoryBytes: 32 * 1024 ** 3,
        }
      : null,
    ...over,
  };
}
