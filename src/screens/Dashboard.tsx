import { useEffect, useState } from "react";
import { LogPanel } from "../components/LogPanel";
import { MetricCard } from "../components/MetricCard";
import { PowerButton } from "../components/PowerButton";
import { usePolling } from "../hooks/usePolling";
import { t } from "../i18n";
import { describeError } from "../i18n/errors";
import { formatMemory, formatPercent, formatUptime } from "../lib/format";
import {
  regenWildDinos,
  saveWorld,
  serverLogs,
  startServer,
  stopServer,
  type MapView,
  type Overview,
  type Settings,
} from "../lib/native";

interface Props {
  overview: Overview | null;
  maps: MapView[] | null;
  settings: Settings | null;
  onChanged: () => Promise<void>;
  onPickMap: () => void;
}

const CONFIRM_MS = 5000;
/** Below this the server tends to stall while loading (seen at 0.3 GB free). */
const LOW_MEMORY_BYTES = 4 * 1024 ** 3;

export function Dashboard({
  overview,
  maps,
  settings,
  onChanged,
  onPickMap,
}: Props) {
  const logs = usePolling(serverLogs, 1500);
  const [confirming, setConfirming] = useState<"stop" | "regen" | null>(null);
  const [pending, setPending] = useState<
    "starting" | "stopping" | "saving" | "regen" | null
  >(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  useEffect(() => {
    if (!confirming) return;
    const id = window.setTimeout(() => setConfirming(null), CONFIRM_MS);
    return () => window.clearTimeout(id);
  }, [confirming]);

  const name = overview?.state.state ?? "stopped";
  const mapId = overview?.mapId ?? settings?.lastMap ?? null;
  const mapName = maps?.find((m) => m.id === mapId)?.displayName ?? null;
  const metrics = overview?.metrics ?? null;
  const active =
    name === "running" || name === "starting" || name === "stopping";
  const rconReady = overview?.rconReady ?? false;
  const idle = name === "stopped" || name === "failed";
  const lowMemory =
    overview !== null && overview.availableMemoryBytes < LOW_MEMORY_BYTES;
  const busy = pending !== null;

  async function run(
    kind: NonNullable<typeof pending>,
    action: () => Promise<string | void>,
    successNotice?: (answer: string | void) => string,
  ) {
    setPending(kind);
    setError(null);
    setNotice(null);
    setConfirming(null);
    try {
      const answer = await action();
      if (successNotice) setNotice(successNotice(answer));
    } catch (e) {
      setError(describeError(e));
    } finally {
      setPending(null);
      await onChanged();
    }
  }

  const start = () =>
    mapId ? run("starting", () => startServer(mapId)) : onPickMap();
  const stop = () => run("stopping", stopServer);
  const restart = () =>
    run("starting", async () => {
      await stopServer();
      if (mapId) await startServer(mapId);
    });
  const save = () =>
    run("saving", saveWorld, () =>
      t("dash.saved", { time: new Date().toLocaleTimeString("pt-BR") }),
    );
  const regen = () => run("regen", regenWildDinos, () => t("dash.regenerated"));

  // One button starts the server, cancels a start in progress, or closes it.
  // Closing needs a second press so a stray click cannot drop the players.
  function pressPower() {
    if (idle) void start();
    else if (confirming === "stop") void stop();
    else setConfirming("stop");
  }

  const powerLabel = busy
    ? pending === "stopping"
      ? t("dash.stopping")
      : pending === "starting" && idle
        ? t("dash.starting")
        : t("dash.working")
    : name === "stopping"
      ? t("dash.stopping")
      : idle
        ? mapId
          ? t("dash.startServer")
          : t("dash.pickMap")
        : confirming === "stop"
          ? t("dash.confirmStopServer")
          : t("dash.stopServer");
  const powerDisabled = busy || name === "stopping";

  return (
    <main className="screen">
      <header className="screen__header">
        <div>
          <h1 className="screen__title">{t("dash.title")}</h1>
          <p className="screen__subtitle">
            {mapName
              ? t("dash.map", {
                  map: mapName,
                  session: settings?.sessionName ?? "",
                })
              : t("dash.mapUnknown", { session: settings?.sessionName ?? "" })}
          </p>
        </div>
        <div className={`pill pill--${name}`} role="status">
          {t(`state.${name}`)}
        </div>
      </header>

      {overview?.external && (
        <p className="alert alert--info">{t("dash.external")}</p>
      )}
      {name === "failed" && (
        <p className="alert alert--error" role="alert">
          {t("dash.crashed")}
        </p>
      )}
      {error && (
        <p className="alert alert--error" role="alert">
          {error}
        </p>
      )}
      {notice && (
        <p className="alert alert--ok" role="status">
          {notice}
        </p>
      )}
      {(idle || name === "starting") && lowMemory && (
        <p className="alert alert--error" role="alert">
          {t("dash.lowMemory", {
            free: formatMemory(overview?.availableMemoryBytes ?? 0),
          })}
        </p>
      )}
      {name === "running" && !rconReady && (
        <p className="alert alert--info">{t("dash.rconOff")}</p>
      )}

      <section className="control" aria-label={t("dash.controls")}>
        <PowerButton
          state={name}
          label={powerLabel}
          disabled={powerDisabled}
          onPress={pressPower}
        />
        <div className="actions">
          {confirming === "stop" && (
            <button
              type="button"
              className="btn btn--ghost"
              onClick={() => setConfirming(null)}
            >
              {t("dash.cancel")}
            </button>
          )}
          {name === "running" && !busy && (
            <>
              <button
                type="button"
                className="btn btn--outline"
                disabled={!rconReady}
                onClick={() => void save()}
              >
                {t("dash.save")}
              </button>
              {confirming === "regen" ? (
                <>
                  <button
                    type="button"
                    className="btn btn--ghost"
                    onClick={() => setConfirming(null)}
                  >
                    {t("dash.cancel")}
                  </button>
                  <button
                    type="button"
                    className="btn btn--danger"
                    onClick={() => void regen()}
                  >
                    {t("dash.confirmRegen")}
                  </button>
                </>
              ) : (
                <button
                  type="button"
                  className="btn btn--outline"
                  disabled={!rconReady}
                  onClick={() => setConfirming("regen")}
                >
                  {t("dash.regen")}
                </button>
              )}
              <button
                type="button"
                className="btn btn--outline"
                onClick={() => void restart()}
              >
                {t("dash.restart")}
              </button>
            </>
          )}
          {busy && pending !== "stopping" && pending !== "starting" && (
            <button type="button" className="btn btn--ghost" disabled>
              {pending === "saving" ? t("dash.saving") : t("dash.regenerating")}
            </button>
          )}
        </div>
      </section>

      <section className="metrics" aria-label={t("dash.metrics")}>
        <MetricCard
          label={t("dash.uptime")}
          value={formatUptime(active && metrics ? metrics.runTimeSecs : 0)}
        />
        <MetricCard
          label={t("dash.players")}
          value={
            overview?.players
              ? overview.players.max
                ? `${overview.players.current} / ${overview.players.max}`
                : String(overview.players.current)
              : "—"
          }
          hint={overview?.players ? undefined : t("dash.playersUnavailable")}
        />
        <MetricCard
          label={t("dash.cpu")}
          value={formatPercent(metrics?.cpuPercent ?? 0)}
          bar={metrics?.cpuPercent ?? 0}
          barClass="metric__bar--cyan"
        />
        <MetricCard
          label={t("dash.memory")}
          value={metrics ? formatMemory(metrics.memoryBytes) : "0 GB"}
          bar={
            metrics ? (metrics.memoryBytes / metrics.totalMemoryBytes) * 100 : 0
          }
          barClass="metric__bar--amber"
        />
      </section>

      <LogPanel lines={logs.data ?? []} />
    </main>
  );
}
