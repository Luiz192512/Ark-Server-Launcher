import { useCallback, useEffect, useState } from "react";
import { describeError } from "../i18n/errors";
import { t, type MessageKey } from "../i18n";
import { applyMods, listMods, type ModView } from "../lib/native";

function status(m: ModView): MessageKey {
  if (m.inSteam && m.onServer) return "mods.status.ready";
  if (m.inSteam) return "mods.status.copy";
  if (m.onServer) return "mods.status.serverOnly";
  return "mods.status.missing";
}

export function ModsTab({ serverRoot }: { serverRoot: string }) {
  const [mods, setMods] = useState<ModView[] | null>(null);
  const [on, setOn] = useState<Set<string>>(new Set());
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<{
    kind: "ok" | "error";
    text: string;
  } | null>(null);

  const load = useCallback(async () => {
    const list = await listMods();
    setMods(list);
    setOn(new Set(list.filter((m) => m.active).map((m) => m.id)));
  }, []);

  useEffect(() => {
    load().catch((err) =>
      setMessage({ kind: "error", text: describeError(err) }),
    );
  }, [load, serverRoot]);

  if (!mods) return <p>{message?.text ?? t("common.loading")}</p>;

  const toggle = (id: string) => {
    const next = new Set(on);
    if (!next.delete(id)) next.add(id);
    setOn(next);
  };

  /** Reads the Steam and server folders again, e.g. after installing a mod. Drops unsaved changes. */
  async function refresh() {
    setMessage(null);
    try {
      await load();
      setMessage({ kind: "ok", text: t("mods.refreshed") });
    } catch (err) {
      setMessage({ kind: "error", text: describeError(err) });
    }
  }

  async function save() {
    if (!mods) return;
    // Mods that were already active keep their load order; new ones go last.
    const ids = [
      ...mods.filter((m) => m.active && on.has(m.id)),
      ...mods.filter((m) => !m.active && on.has(m.id)),
    ].map((m) => m.id);
    setBusy(true);
    setMessage(null);
    try {
      await applyMods(ids);
      await load();
      setMessage({ kind: "ok", text: t("mods.saved") });
    } catch (err) {
      setMessage({
        kind: "error",
        text: t("settings.saveFailed", { reason: describeError(err) }),
      });
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="form">
      <p className="hint field--wide">{t("mods.hint")}</p>
      <p className="alert alert--info field--wide">{t("mods.warn")}</p>
      <div className="mods-bar field--wide">
        <p className="hint">{t("mods.refreshHint")}</p>
        <button
          type="button"
          className="btn btn--outline btn--small"
          disabled={busy}
          onClick={() => void refresh()}
        >
          {t("mods.refresh")}
        </button>
      </div>

      {mods.length === 0 && <p className="field--wide">{t("mods.empty")}</p>}

      <div className="mods-cols field--wide">
        {[
          {
            key: "on",
            title: t("mods.on"),
            list: mods.filter((m) => on.has(m.id)),
          },
          {
            key: "off",
            title: t("mods.off"),
            list: mods.filter((m) => !on.has(m.id)),
          },
        ].map((col) => (
          <section
            className="mods-col"
            key={col.key}
            role="group"
            aria-label={col.title}
          >
            <h2 className="mods-col__title">
              {col.title} ({col.list.length})
            </h2>
            {col.list.map((m) => (
              <div className="toggle-row" key={m.id}>
                <div>
                  <div className="toggle-row__title">{m.name}</div>
                  <div className="toggle-row__hint">
                    {m.id} · {t(status(m))}
                  </div>
                </div>
                <button
                  type="button"
                  role="switch"
                  aria-checked={on.has(m.id)}
                  aria-label={t("mods.toggle", { name: m.name })}
                  disabled={!m.inSteam && !m.onServer && !on.has(m.id)}
                  className={`switch${on.has(m.id) ? " switch--on" : ""}`}
                  onClick={() => toggle(m.id)}
                >
                  <span />
                </button>
              </div>
            ))}
          </section>
        ))}
      </div>

      {message && (
        <p
          className={`alert alert--${message.kind === "ok" ? "ok" : "error"} field--wide`}
          role="status"
        >
          {message.text}
        </p>
      )}

      <div className="actions actions--start field--wide">
        <button
          type="button"
          className="btn btn--primary"
          disabled={busy}
          onClick={() => void save()}
        >
          {busy ? t("mods.saving") : t("settings.save")}
        </button>
      </div>
    </div>
  );
}
