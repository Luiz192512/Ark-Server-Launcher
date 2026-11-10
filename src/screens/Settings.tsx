import { useEffect, useState, type FormEvent } from "react";
import { t } from "../i18n";
import {
  checkServerRoot,
  hasAdminPassword,
  pickFolder,
  saveAdminPassword,
  saveSettings,
  type Settings as SettingsData,
} from "../lib/native";

import { ModsTab } from "./ModsTab";
import { RulesTab } from "./RulesTab";

interface Props {
  settings: SettingsData | null;
  onSaved: () => Promise<void>;
}

function parsePort(text: string): number | null {
  const n = Number.parseInt(text, 10);
  return Number.isInteger(n) && n > 0 && n < 65536 ? n : null;
}

export function Settings({ settings, onSaved }: Props) {
  const [draft, setDraft] = useState<SettingsData | null>(settings);
  const [tab, setTab] = useState<"launcher" | "server" | "mods">("launcher");
  const [password, setPassword] = useState("");
  const [passwordStored, setPasswordStored] = useState(false);
  const [rootOk, setRootOk] = useState<boolean | null>(null);
  const [message, setMessage] = useState<{
    kind: "ok" | "error";
    text: string;
  } | null>(null);

  useEffect(() => setDraft(settings), [settings]);
  useEffect(() => {
    void hasAdminPassword().then(setPasswordStored);
  }, []);
  useEffect(() => {
    if (!draft?.serverRoot) {
      setRootOk(null);
      return;
    }
    let live = true;
    void checkServerRoot(draft.serverRoot).then((ok) => live && setRootOk(ok));
    return () => {
      live = false;
    };
  }, [draft?.serverRoot]);

  if (!draft)
    return (
      <main className="screen">
        <p>{t("common.loading")}</p>
      </main>
    );

  const update = (patch: Partial<SettingsData>) =>
    setDraft({ ...draft, ...patch });

  async function browse() {
    const folder = await pickFolder();
    if (folder) update({ serverRoot: folder });
  }

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (!draft) return;
    try {
      await saveSettings(draft);
      if (password) {
        await saveAdminPassword(password);
        setPassword("");
        setPasswordStored(true);
      }
      await onSaved();
      setMessage({ kind: "ok", text: t("settings.saved") });
    } catch (err) {
      setMessage({
        kind: "error",
        text: t("settings.saveFailed", { reason: String(err) }),
      });
    }
  }

  return (
    <main className="screen">
      <header className="screen__header">
        <div>
          <h1 className="screen__title">{t("settings.title")}</h1>
          <p className="screen__subtitle">{t("settings.subtitle")}</p>
        </div>
      </header>

      <div className="tabs" role="tablist">
        {(["launcher", "server", "mods"] as const).map((id) => (
          <button
            key={id}
            type="button"
            role="tab"
            aria-selected={tab === id}
            className={`tabs__tab${tab === id ? " tabs__tab--on" : ""}`}
            onClick={() => setTab(id)}
          >
            {t(`settings.tab.${id}`)}
          </button>
        ))}
      </div>

      {tab === "server" && <RulesTab serverRoot={draft.serverRoot} />}
      {tab === "mods" && <ModsTab serverRoot={draft.serverRoot} />}

      <form
        className="form"
        hidden={tab !== "launcher"}
        onSubmit={(e) => void submit(e)}
      >
        <div className="field field--wide">
          <label htmlFor="root">{t("settings.root")}</label>
          <div className="field__row">
            <input
              id="root"
              type="text"
              value={draft.serverRoot}
              onChange={(e) => update({ serverRoot: e.target.value })}
            />
            <button
              type="button"
              className="btn btn--outline btn--small"
              onClick={() => void browse()}
            >
              {t("settings.browse")}
            </button>
          </div>
          {rootOk !== null && (
            <span className={rootOk ? "hint hint--ok" : "hint hint--bad"}>
              {rootOk ? t("settings.root.ok") : t("settings.root.bad")}
            </span>
          )}
        </div>

        <div className="field">
          <label htmlFor="session">{t("settings.session")}</label>
          <input
            id="session"
            type="text"
            value={draft.sessionName}
            onChange={(e) => update({ sessionName: e.target.value })}
          />
        </div>
        <div className="field">
          <label htmlFor="gamePort">{t("settings.gamePort")}</label>
          <input
            id="gamePort"
            type="text"
            inputMode="numeric"
            placeholder={t("settings.portPlaceholder")}
            value={draft.gamePort ?? ""}
            onChange={(e) => update({ gamePort: parsePort(e.target.value) })}
          />
        </div>
        <div className="field">
          <label htmlFor="queryPort">{t("settings.queryPort")}</label>
          <input
            id="queryPort"
            type="text"
            inputMode="numeric"
            placeholder={t("settings.portPlaceholder")}
            value={draft.queryPort ?? ""}
            onChange={(e) => update({ queryPort: parsePort(e.target.value) })}
          />
        </div>

        <div className="field field--wide">
          <label htmlFor="password">{t("settings.password")}</label>
          <input
            id="password"
            type="password"
            autoComplete="new-password"
            placeholder={t("settings.passwordPlaceholder")}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
          <span className="hint">
            {passwordStored
              ? t("settings.passwordSaved")
              : t("settings.passwordHint")}
          </span>
        </div>

        <div className="toggle-row field--wide">
          <div>
            <div className="toggle-row__title">{t("settings.backup")}</div>
            <div className="toggle-row__hint">{t("settings.backupHint")}</div>
          </div>
          <button
            type="button"
            role="switch"
            aria-checked={draft.backupOnStop}
            aria-label={t("settings.backup")}
            className={`switch${draft.backupOnStop ? " switch--on" : ""}`}
            onClick={() => update({ backupOnStop: !draft.backupOnStop })}
          >
            <span />
          </button>
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
          <button type="submit" className="btn btn--primary">
            {t("settings.save")}
          </button>
          <button
            type="button"
            className="btn btn--outline"
            onClick={() => setDraft(settings)}
          >
            {t("settings.discard")}
          </button>
        </div>
      </form>
    </main>
  );
}
