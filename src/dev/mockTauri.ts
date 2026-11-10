// Development only: lets the UI run in a plain browser (?mock=<scenario>)
// so every screen state can be inspected without the native core.
import catalogJson from "../../data/ini-catalog.json";
import type {
  IniColumn,
  IniEntry,
  MapView,
  ModView,
  Overview,
  ServerStateName,
  Settings,
} from "../lib/native";

/** The bundled catalog in the shape the native core sends (absent fields filled in). */
export const INI_CATALOG: IniEntry[] = catalogJson.map((e) => ({
  count: null,
  max: null,
  unit: null,
  lockedIndexes: [],
  secret: false,
  legacy: false,
  ...e,
  file: e.file as IniEntry["file"],
  kind: e.kind as IniEntry["kind"],
  columns: (("columns" in e && e.columns) || []).map((c) => ({
    optional: false,
    quoted: false,
    ...c,
    kind: c.kind as IniColumn["kind"],
  })),
}));

const MAP_ROWS: [string, string, string, boolean, number | null][] = [
  ["theisland", "The Island", "TheIsland", false, 34 * 1024 ** 2],
  ["scorchedearth", "Scorched Earth", "ScorchedEarth_P", true, null],
  ["thecenter", "The Center", "TheCenter", false, null],
  ["aberration", "Aberration", "Aberration_P", true, null],
  ["extinction", "Extinction", "Extinction", true, null],
  ["ragnarok", "Ragnarok", "Ragnarok", false, null],
  ["valguero", "Valguero", "Valguero_P", false, null],
  ["crystalisles", "Crystal Isles", "CrystalIsles", false, null],
  ["genesis", "Genesis: Part 1", "Genesis", true, null],
];

const LOGS: Record<string, string[]> = {
  stopped: ["Servidor parado."],
  starting: ["Verificando porta... livre.", "Carregando The Island..."],
  running: [
    "Mapa carregado.",
    "Server has completed startup and is now advertising for join.",
    "Autosave concluido.",
    "Warning: pouca memoria livre",
  ],
  stopping: ["Salvando o mundo antes de encerrar..."],
  failed: [
    "Processo encerrou de forma inesperada.",
    "Fatal error: limite de falhas atingido.",
  ],
};

export function installMock(scenario: string) {
  const empty = scenario === "empty";
  const loading = scenario === "loading";
  let current: ServerStateName = (
    ["stopped", "starting", "running", "stopping", "failed"].includes(scenario)
      ? scenario
      : "stopped"
  ) as ServerStateName;
  let settings: Settings = {
    serverRoot: empty
      ? ""
      : "D:\\SteamLibrary\\steamapps\\common\\ARK Survival Evolved Dedicated Server",
    sessionName: "ENZ",
    gamePort: null,
    queryPort: null,
    readyMarker: "advertising for join",
    stopTimeoutSecs: 60,
    backupOnStop: true,
    lastMap: "theisland",
    autostartRadmin: true,
    radminPath: "C:\\Radmin\\RvRvpnGui.exe",
  };

  let options: Record<string, string> = { MaxPlayers: "70", XPMultiplier: "2" };
  const iniValues: Record<string, string> = {
    MaxPlayers: "70",
    XPMultiplier: "1.200000",
    StructurePickupTimeAfterPlacement: "30.000000",
    bAllowPlatformSaddleMultiFloors: "True",
    DinoHarvestingDamageMultiplier: "3.200000",
    NPCReplacements: [
      '(FromClassName="MegaRaptor_Character_BP_C",ToClassName="Raptor_Character_BP_C")',
      '(FromClassName="Spino_Character_BP_C",ToClassName="Rex_Character_BP_C")',
    ].join("\n"),
    ...Object.fromEntries(
      ["DinoTamed", "DinoTamed_Add", "DinoTamed_Affinity"].flatMap((col) =>
        [0, 8].map((i) => [
          `PerLevelStatsMultiplier_${col}[${i}]`,
          col.endsWith("Affinity") ? "0.440000" : "0.600000",
        ]),
      ),
    ),
  };

  const customTracked = [
    { file: "gus", section: "[ServerSettings]", key: "KickIdlePlayersPeriod" },
  ];

  let mods: ModView[] = [
    ["538827119", "Omnicular v1.51", true, true, true],
    ["1404697612", "Awesome SpyGlass", true, true, true],
    ["761535755", "Ultra Stacks", true, true, true],
    ["1967741708", "Lethals Reusables", true, false, false],
    ["817096835", "Extinction Core", true, true, false],
  ].map(([id, name, inSteam, onServer, active]) => ({
    id: id as string,
    name: name as string,
    inSteam: inSteam as boolean,
    onServer: onServer as boolean,
    active: active as boolean,
  }));

  const maps = (): MapView[] =>
    MAP_ROWS.map(([id, displayName, launchToken, dlcRequired, saveBytes]) => ({
      id,
      displayName,
      edition: "ase",
      launchToken,
      dlcRequired,
      installedCheck: "",
      thumbnail: "",
      verified: true,
      installed: !empty,
      saveBytes,
    }));

  const overview = (): Overview => ({
    state:
      current === "failed"
        ? { state: current, detail: "crash loop" }
        : { state: current },
    pid: current === "stopped" || current === "failed" ? null : 4242,
    external: scenario === "external",
    mapId: "theisland",
    players: current === "running" ? { current: 4, max: 70 } : null,
    rconReady: scenario !== "norcon",
    availableMemoryBytes: (scenario === "lowmem" ? 0.3 : 8) * 1024 ** 3,
    metrics:
      current === "stopped" || current === "failed"
        ? null
        : {
            cpuPercent: 31,
            memoryBytes: 11.8 * 1024 ** 3,
            runTimeSecs: 13330,
            totalMemoryBytes: 32 * 1024 ** 3,
          },
  });

  const handlers: Record<string, (args: Record<string, unknown>) => unknown> = {
    app_info: () => ({ name: "enz-launcher", version: "0.1.0" }),
    list_maps: () => (loading ? new Promise(() => undefined) : maps()),
    get_settings: () => settings,
    save_settings: (a) => {
      settings = a.settings as Settings;
    },
    get_server_options: () => options,
    save_server_options: (a) => {
      options = a.options as Record<string, string>;
    },
    get_ini_catalog: () => INI_CATALOG,
    get_ini_values: () => {
      if (scenario === "inierror") throw "stream did not contain valid UTF-8";
      return { values: { ...iniValues }, secretsSet: ["ServerAdminPassword"] };
    },
    save_ini_values: (a) => {
      if (scenario === "savefail")
        throw "Game.ini está aberto em outro programa";
      for (const [k, v] of Object.entries(
        a.changes as Record<string, string | null>,
      )) {
        if (v === null) delete iniValues[k];
        else iniValues[k] = v;
      }
    },
    get_custom_ini: () => ({
      tracked: customTracked,
      sections: [
        {
          file: "game",
          section: "[/Script/ShooterGame.ShooterGameMode]",
          lines: [
            {
              key: "bUseSingleplayerSettings",
              value: "True",
              secret: false,
              isSet: true,
            },
          ],
        },
        {
          file: "gus",
          section: "[ServerSettings]",
          lines: [
            {
              key: "KickIdlePlayersPeriod",
              value: "3600",
              secret: false,
              isSet: true,
            },
            {
              key: "SpectatorPassword",
              value: null,
              secret: true,
              isSet: true,
            },
          ],
        },
      ],
    }),
    save_custom_ini: () => undefined,
    list_ini_backups: () =>
      [0, 1, 26].map((h) => String(Date.now() - h * 3_600_000)),
    restore_ini_backup: () => undefined,
    list_mods: () => mods,
    apply_mods: (a) => {
      const ids = a.ids as string[];
      mods = mods
        .map((m) => ({
          ...m,
          active: ids.includes(m.id),
          onServer: m.onServer || ids.includes(m.id),
        }))
        .sort((x, y) => Number(y.active) - Number(x.active));
    },
    check_server_root: (a) => String(a.path).length > 0,
    has_admin_password: () => false,
    save_admin_password: () => undefined,
    server_overview: overview,
    server_logs: () => LOGS[current] ?? [],
    start_server: () => {
      current = "starting";
      window.setTimeout(() => (current = "running"), 2500);
    },
    save_world: () => "World Saved",
    regen_wild_dinos: () => "All Wild Dinos Destroyed",
    stop_server: () => {
      current = "stopping";
      window.setTimeout(() => (current = "stopped"), 2500);
    },
  };

  Object.assign(window, {
    __TAURI_INTERNALS__: {
      invoke: async (cmd: string, args: Record<string, unknown> = {}) => {
        const handler = handlers[cmd];
        if (!handler) throw new Error(`mock: unknown command ${cmd}`);
        return handler(args);
      },
      transformCallback: () => 0,
    },
  });
}
