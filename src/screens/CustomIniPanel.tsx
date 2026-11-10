import { useCallback, useEffect, useRef, useState } from "react";
import { describeError } from "../i18n/errors";
import { t, type MessageKey } from "../i18n";
import {
  getCustomIni,
  saveCustomIni,
  type CustomChange,
  type CustomIni,
  type CustomKey,
  type IniEntry,
} from "../lib/native";

const FILE_NAME = { game: "Game.ini", gus: "GameUserSettings.ini" } as const;
/** Offered even when the file does not have them yet. */
const KNOWN_SECTIONS = {
  game: ["[/script/shootergame.shootergamemode]"],
  gus: [
    "[ServerSettings]",
    "[SessionSettings]",
    "[/Script/Engine.GameSession]",
  ],
} as const;

const same = (a: CustomKey, b: CustomKey) =>
  a.file === b.file &&
  a.section.toLowerCase() === b.section.toLowerCase() &&
  a.key.toLowerCase() === b.key.toLowerCase();
/** Mirrors ini_custom.rs `is_secret`. */
export const looksSecret = (key: string) => /password|token|secret/i.test(key);

type Problem = { code: MessageKey; group?: string };

/** Mirrors ini_custom.rs `check`, plus the duplicate check the list needs. */
function problemOf(
  catalog: IniEntry[],
  id: CustomKey,
  value: string,
  taken: boolean,
): Problem | null {
  const key = id.key.trim();
  if (key === "") return { code: "custom.error.keyRequired" };
  if (/^[-?]/.test(key)) return { code: "custom.error.cmdline" };
  if (key.length > 128 || !/^[A-Za-z0-9_]+(\[\d+\])?$/.test(key))
    return { code: "custom.error.key" };
  const name = key.replace(/\[\d+\]$/, "").toLowerCase();
  const managed = catalog.find((e) => e.key.toLowerCase() === name);
  if (managed) return { code: "custom.error.managed", group: managed.group };
  if (id.file === "gus" && name === "activemods")
    return { code: "custom.error.mods" };
  if (!/^\[[^[\]\p{Cc}]*[^[\]\s\p{Cc}][^[\]\p{Cc}]*\]$/u.test(id.section))
    return { code: "custom.error.section" };
  if (value.length > 1024 || /\p{Cc}/u.test(value))
    return { code: "custom.error.value" };
  if (taken) return { code: "custom.error.duplicate" };
  return null;
}

interface Props {
  catalog: IniEntry[];
  running: boolean;
  /** After a save: the rules tab reads the files again. */
  onSaved: () => void;
  onOpenGroup: (group: string) => void;
}

const emptyForm = (): CustomKey & { value: string } => ({
  file: "game",
  section: KNOWN_SECTIONS.game[0],
  key: "",
  value: "",
});

// Kept across unmounts, like the rules draft (RulesTab.tsx).
let keptChanges: CustomChange[] = [];
export const forgetCustomDraft = () => {
  keptChanges = [];
};

export function CustomIniPanel({
  catalog,
  running,
  onSaved,
  onOpenGroup,
}: Props) {
  const [state, setState] = useState<CustomIni | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [changes, setChanges] = useState<CustomChange[]>(() => keptChanges);
  const [form, setForm] = useState(emptyForm);
  const [editing, setEditing] = useState<CustomKey | null>(null);
  const [tried, setTried] = useState(false);
  const [keyLeft, setKeyLeft] = useState(false);
  const [notice, setNotice] = useState<{
    kind: "ok" | "info" | "error";
    text: string;
    undo?: CustomChange[];
  } | null>(null);
  const [busy, setBusy] = useState(false);
  const undoRef = useRef<HTMLButtonElement>(null);
  const keyRef = useRef<HTMLInputElement>(null);

  const load = useCallback(
    () =>
      getCustomIni()
        .then(setState)
        .catch((err) => setLoadError(describeError(err))),
    [],
  );
  useEffect(() => {
    void load();
  }, [load]);
  useEffect(() => {
    if (notice?.undo) undoRef.current?.focus();
  }, [notice]);
  useEffect(() => {
    keptChanges = changes;
  }, [changes]);
  // Keep the verdict on the key in view, never under the sticky save bar.
  useEffect(() => {
    if (keyLeft || tried)
      document
        .getElementById("custom-feedback")
        ?.scrollIntoView?.({ block: "nearest" });
  }, [keyLeft, tried]);

  if (loadError)
    return (
      <p className="alert alert--error" role="alert">
        {t("custom.loadFailed", { reason: loadError })}
      </p>
    );
  if (!state) return <p role="status">{t("rules.loading")}</p>;

  const fileLine = (id: CustomKey) =>
    state.sections
      .find(
        (s) =>
          s.file === id.file &&
          s.section.toLowerCase() === id.section.toLowerCase(),
      )
      ?.lines.filter((l) => l.key.toLowerCase() === id.key.toLowerCase())
      .pop();
  const pending = (id: CustomKey) => changes.find((c) => same(c, id));

  // What the list shows: the saved keys with their pending edits, then the new ones.
  const rows: CustomKey[] = [
    ...state.tracked.filter((k) => pending(k)?.value !== null),
    ...changes.filter(
      (c) => c.value !== null && !state.tracked.some((k) => same(k, c)),
    ),
  ];

  const sections = [
    ...new Map(
      [
        ...KNOWN_SECTIONS[form.file],
        ...state.sections
          .filter((s) => s.file === form.file)
          .map((s) => s.section),
      ].map((s) => [s.toLowerCase(), s]),
    ).values(),
  ];
  const id: CustomKey = {
    file: form.file,
    section: form.section,
    key: form.key.trim(),
  };
  const secret = looksSecret(id.key);
  const taken = !editing && rows.some((r) => same(r, id));
  const problem = problemOf(catalog, id, form.value, taken);
  const existing = id.key && !problem ? fileLine(id) : undefined;
  // Checked when the key field is left or on ADICIONAR, not on every key press.
  const showProblem = problem && (tried || keyLeft);

  const put = (change: CustomChange, text?: string) => {
    const before = changes;
    const savedLine = fileLine(change);
    const tracked = state.tracked.some((k) => same(k, change));
    const next = changes.filter((c) => !same(c, change));
    // Going back to what is saved is no change at all.
    const unchanged =
      change.value === null
        ? !tracked
        : tracked &&
          !looksSecret(change.key) &&
          savedLine?.value === change.value;
    setChanges(unchanged ? next : [...next, change]);
    setNotice(text ? { kind: "info", text, undo: before } : null);
  };

  const submit = () => {
    setTried(true);
    if (problem) return;
    if (secret && editing && form.value === "") {
      // A blank secret keeps the one in the file.
      setEditing(null);
      setForm(emptyForm());
      setTried(false);
      setKeyLeft(false);
      return;
    }
    put({ ...id, value: form.value });
    setEditing(null);
    setForm(emptyForm());
    setTried(false);
    setKeyLeft(false);
    keyRef.current?.focus();
  };

  const edit = (r: CustomKey) => {
    setEditing(r);
    const p = pending(r);
    setForm({
      ...r,
      value: p?.value ?? (looksSecret(r.key) ? "" : (fileLine(r)?.value ?? "")),
    });
    keyRef.current?.focus();
  };

  async function save() {
    setBusy(true);
    setNotice(null);
    try {
      await saveCustomIni(changes);
      setChanges([]);
      await load();
      onSaved();
      setNotice({ kind: "ok", text: t("rules.saved") });
    } catch (err) {
      setNotice({
        kind: "error",
        text: t("rules.saveFailed", { reason: describeError(err) }),
      });
    } finally {
      setBusy(false);
    }
  }

  const shownValue = (r: CustomKey) => {
    const p = pending(r);
    if (looksSecret(r.key)) {
      const set = (p?.value ?? "") !== "" || fileLine(r)?.isSet;
      return `(${set ? t("rules.secretSet") : t("rules.secretUnset")})`;
    }
    return p?.value ?? fileLine(r)?.value ?? t("custom.notInFile");
  };

  const count = changes.length;
  return (
    <div className="custom-ini">
      {running && (
        <p className="alert alert--warn">{t("rules.serverRunning")}</p>
      )}
      <form
        className="custom-ini__form"
        aria-label={t(editing ? "custom.editTitle" : "custom.addTitle")}
        onSubmit={(ev) => {
          ev.preventDefault();
          submit();
        }}
      >
        <div className="field">
          <label htmlFor="custom-file">{t("custom.file")}</label>
          <select
            id="custom-file"
            value={form.file}
            disabled={Boolean(editing)}
            onChange={(ev) => {
              const file = ev.target.value as CustomKey["file"];
              setForm({ ...form, file, section: KNOWN_SECTIONS[file][0] });
            }}
          >
            <option value="game">Game.ini</option>
            <option value="gus">GameUserSettings.ini</option>
          </select>
        </div>
        <div className="field">
          <label htmlFor="custom-key">{t("custom.key")}</label>
          <input
            id="custom-key"
            ref={keyRef}
            className="mono"
            value={form.key}
            readOnly={Boolean(editing)}
            autoComplete="off"
            spellCheck={false}
            aria-invalid={showProblem ? true : undefined}
            aria-describedby="custom-feedback"
            onChange={(ev) => {
              setForm({ ...form, key: ev.target.value });
              setKeyLeft(false);
            }}
            onBlur={(ev) => setKeyLeft(ev.target.value.trim() !== "")}
          />
        </div>
        <div className="field custom-ini__wide">
          <label htmlFor="custom-section">{t("custom.section")}</label>
          <select
            id="custom-section"
            className="mono"
            value={form.section}
            disabled={Boolean(editing)}
            onChange={(ev) => setForm({ ...form, section: ev.target.value })}
          >
            {sections.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </div>
        <div className="field custom-ini__wide">
          <label htmlFor="custom-value">{t("custom.value")}</label>
          <input
            id="custom-value"
            className="mono"
            type={secret ? "password" : "text"}
            autoComplete={secret ? "new-password" : "off"}
            placeholder={
              secret && editing ? t("rules.secretPlaceholder") : undefined
            }
            value={form.value}
            onChange={(ev) => setForm({ ...form, value: ev.target.value })}
          />
        </div>
        <div
          className="custom-ini__wide"
          id="custom-feedback"
          aria-live="polite"
        >
          {showProblem ? (
            <p className="alert alert--error">
              {t(problem.code, {
                category: problem.group
                  ? t(`rules.cat.${problem.group}` as MessageKey)
                  : "",
              })}
              {problem.group && (
                <button
                  type="button"
                  className="btn btn--ghost btn--tiny"
                  onClick={() => onOpenGroup(problem.group as string)}
                >
                  {t("custom.openGroup", {
                    category: t(`rules.cat.${problem.group}` as MessageKey),
                  })}
                </button>
              )}
            </p>
          ) : id.key && !editing && !problem ? (
            <p className="alert alert--warn">
              <strong>{t("custom.outside")}</strong>{" "}
              {existing
                ? t(existing.secret ? "custom.existsSecret" : "custom.exists", {
                    file: FILE_NAME[id.file],
                    value: existing.value ?? "",
                  })
                : t("custom.outsideHint")}
            </p>
          ) : null}
        </div>
        <div className="custom-ini__wide custom-ini__actions">
          <button type="submit" className="btn btn--outline btn--small">
            {t(editing ? "custom.update" : "custom.add")}
          </button>
          <button
            type="button"
            className="btn btn--outline btn--small"
            onClick={() => {
              setEditing(null);
              setForm(emptyForm());
              setTried(false);
              setKeyLeft(false);
            }}
          >
            {t(editing ? "custom.cancelEdit" : "custom.clear")}
          </button>
        </div>
      </form>

      {rows.length > 0 ? (
        <div className="stat-table__scroll">
          <table className="custom-ini__table">
            <caption className="hint">{t("custom.caption")}</caption>
            <thead>
              <tr>
                <th scope="col">{t("custom.file")}</th>
                <th scope="col">{t("custom.key")}</th>
                <th scope="col">{t("custom.value")}</th>
                <th scope="col">
                  <span className="sr-only">{t("custom.actions")}</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={`${r.file}${r.section}${r.key}`}>
                  <td>{FILE_NAME[r.file]}</td>
                  <th scope="row" className="mono">
                    {r.key}
                    <span className="rule-row__key">{r.section}</span>
                  </th>
                  <td className="mono">
                    {shownValue(r)}
                    {pending(r) && (
                      <span className="rule-badge rule-badge--unsaved">
                        {" "}
                        {t("rules.unsaved")}
                      </span>
                    )}
                  </td>
                  <td>
                    <div className="custom-ini__row-actions">
                      <button
                        type="button"
                        className="btn btn--ghost btn--tiny"
                        aria-label={t("custom.editKey", { key: r.key })}
                        onClick={() => edit(r)}
                      >
                        {t("custom.edit")}
                      </button>
                      <button
                        type="button"
                        className="btn btn--ghost btn--tiny"
                        aria-label={t("custom.removeKey", { key: r.key })}
                        onClick={() =>
                          put(
                            { ...r, value: null },
                            t("custom.removed", { key: r.key }),
                          )
                        }
                      >
                        {t("rules.list.remove")}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <p className="hint">{t("custom.empty")}</p>
      )}
      <p className="hint">{t("custom.note")}</p>

      <div
        className="save-bar"
        role="region"
        aria-label={t("custom.saveRegion")}
      >
        <div className="save-bar__status">
          {notice && (
            <p
              className={`alert alert--${notice.kind}`}
              role={notice.kind === "error" ? "alert" : "status"}
            >
              {notice.text}
              {notice.undo && (
                <button
                  ref={undoRef}
                  type="button"
                  className="btn btn--ghost btn--tiny"
                  onClick={() => {
                    setChanges(notice.undo as CustomChange[]);
                    setNotice(null);
                  }}
                >
                  {t("rules.undo")}
                </button>
              )}
            </p>
          )}
          <p role="status" className={count ? "save-bar__count" : "hint"}>
            {count === 0
              ? t("rules.noUnsaved")
              : `${count === 1 ? t("rules.unsavedOne") : t("rules.unsavedCount", { count: String(count) })}. ${t("rules.backupFirst")}`}
          </p>
        </div>
        <div className="save-bar__actions">
          <button
            type="button"
            className="btn btn--outline btn--small"
            disabled={count === 0 || busy}
            onClick={() => {
              setNotice({
                kind: "info",
                text: t("rules.discarded"),
                undo: changes,
              });
              setChanges([]);
            }}
          >
            {t("rules.discard")}
          </button>
          <button
            type="button"
            className="btn btn--primary"
            disabled={count === 0 || busy || running}
            onClick={() => void save()}
          >
            {busy ? t("rules.saving") : t("rules.save")}
          </button>
        </div>
      </div>
    </div>
  );
}
