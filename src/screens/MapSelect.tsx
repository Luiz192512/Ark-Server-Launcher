import { useEffect, useMemo, useState } from "react";
import { MapCard } from "../components/MapCard";
import { describeError } from "../i18n/errors";
import { t } from "../i18n";
import { formatSaveSize } from "../lib/format";
import { mapArt } from "../lib/mapArt";
import {
  startServer,
  type MapView,
  type Overview,
  type Settings,
} from "../lib/native";

interface Props {
  maps: MapView[] | null;
  overview: Overview | null;
  settings: Settings | null;
  onStarted: () => void;
  onOpenSettings: () => void;
}

export function MapSelect({
  maps,
  overview,
  settings,
  onStarted,
  onOpenSettings,
}: Props) {
  const [showUnverified, setShowUnverified] = useState(false);
  const [picked, setPicked] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const visible = useMemo(
    () => (maps ?? []).filter((m) => m.verified || showUnverified),
    [maps, showUnverified],
  );

  useEffect(() => {
    if (picked && visible.some((m) => m.id === picked && m.installed)) return;
    const preferred = visible.find(
      (m) => m.id === settings?.lastMap && m.installed,
    );
    setPicked((preferred ?? visible.find((m) => m.installed))?.id ?? null);
  }, [visible, settings?.lastMap, picked]);

  const selected = visible.find((m) => m.id === picked) ?? null;
  const serverBusy =
    overview !== null &&
    overview.state.state !== "stopped" &&
    overview.state.state !== "failed";
  const nothingInstalled = maps !== null && !maps.some((m) => m.installed);

  async function start() {
    if (!selected) return;
    setBusy(true);
    setError(null);
    try {
      await startServer(selected.id);
      onStarted();
    } catch (e) {
      setError(describeError(e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="screen">
      <header className="screen__header">
        <div>
          <h1 className="screen__title">{t("maps.title")}</h1>
          <p className="screen__subtitle">{t("maps.subtitle")}</p>
        </div>
        <div className="screen__tag">{t("maps.edition")}</div>
      </header>

      <div className="maps-layout">
        <section className="maps-grid-wrap" aria-label={t("maps.list")}>
          {maps === null && (
            <div
              className="maps-grid"
              role="status"
              aria-label={t("maps.loading")}
            >
              {Array.from({ length: 9 }, (_, i) => (
                <div className="map-skeleton" key={i} />
              ))}
            </div>
          )}
          {maps !== null && nothingInstalled && (
            <div className="empty">
              <h2>{t("maps.empty.title")}</h2>
              <p>{t("maps.empty.body")}</p>
              <button
                type="button"
                className="btn btn--outline"
                onClick={onOpenSettings}
              >
                {t("maps.empty.action")}
              </button>
            </div>
          )}
          {maps !== null && !nothingInstalled && (
            <>
              <div className="maps-grid">
                {visible.map((m) => (
                  <MapCard
                    key={m.id}
                    map={m}
                    selected={m.id === picked}
                    onSelect={setPicked}
                  />
                ))}
              </div>
              <label className="check">
                <input
                  type="checkbox"
                  checked={showUnverified}
                  onChange={(e) => setShowUnverified(e.target.checked)}
                />
                {t("maps.showUnverified")}
              </label>
            </>
          )}
        </section>

        <aside className="detail" aria-label={t("maps.selected")}>
          <div
            className="detail__art"
            style={{ background: selected ? mapArt(selected.id) : undefined }}
          >
            <div className="detail__fade" />
            <div className="detail__name">{selected?.displayName ?? ""}</div>
          </div>
          <dl className="facts">
            <div>
              <dt>{t("maps.fact.edition")}</dt>
              <dd>{t("maps.fact.edition.value")}</dd>
            </div>
            <div>
              <dt>{t("maps.fact.save")}</dt>
              <dd>
                {formatSaveSize(selected?.saveBytes ?? null) ??
                  t("maps.noSave")}
              </dd>
            </div>
            <div>
              <dt>{t("maps.fact.session")}</dt>
              <dd>{settings?.sessionName ?? ""}</dd>
            </div>
            <div>
              <dt>{t("maps.fact.ports")}</dt>
              <dd>{settings?.gamePort ?? t("maps.fact.ports.default")}</dd>
            </div>
          </dl>
          <div className="detail__actions">
            {error && (
              <p className="alert alert--error" role="alert">
                {error}
              </p>
            )}
            <button
              type="button"
              className="btn btn--primary btn--wide"
              disabled={!selected || serverBusy || busy}
              onClick={() => void start()}
            >
              {busy
                ? t("maps.starting")
                : serverBusy
                  ? t("maps.running")
                  : t("maps.start")}
            </button>
            <p className="detail__hint">
              {serverBusy
                ? t("maps.runningHint")
                : selected
                  ? t("maps.startingAt", { map: selected.displayName })
                  : ""}
            </p>
          </div>
        </aside>
      </div>
    </main>
  );
}
