import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { describeError } from "../i18n/errors";
import { t, type MessageKey } from "../i18n";
import {
  getCustomIni,
  getIniCatalog,
  getIniValues,
  listIniBackups,
  saveIniValues,
  serverOverview,
  type IniEntry,
} from "../lib/native";
import { BackupsPanel } from "./BackupsPanel";
import { CustomIniPanel } from "./CustomIniPanel";
import { ListEditor } from "./ListEditor";
import {
  GROUPS,
  info,
  label,
  matches,
  sameValue,
  unitText,
  validate,
} from "../lib/rules";

/** Key to new value; null goes back to the game's default (removes the line). */
type Draft = Record<string, string | null>;
type Notice = { kind: "ok" | "info" | "error"; text: string; undo?: Draft };

function without<T>(all: Record<string, T>, key: string): Record<string, T> {
  const rest = { ...all };
  delete rest[key];
  return rest;
}

const groupLabel = (g: string) => t(`rules.cat.${g}` as MessageKey);
const plural = (n: number, one: MessageKey, many: MessageKey) =>
  n === 1 ? t(one) : t(many, { count: String(n) });
/** Rail entries after the catalog groups: their own screens, not catalog fields. */
const TOOLS = ["custom", "backups"] as const;
const statLabel = (i: number) => t(`stat.${i}` as MessageKey);
/** `Name[3]` belongs to the catalog entry `Name`. */
const baseKey = (key: string) => key.replace(/\[\d+\]$/, "");
/** One cell of an attribute table, handled like a single field keyed `Name[i]`. */
const cellOf = (e: IniEntry, i: number): IniEntry => ({
  ...e,
  key: `${e.key}[${i}]`,
  count: null,
});
const indexes = (e: IniEntry) => [...Array(e.count ?? 0).keys()];

function InfoIcon() {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      aria-hidden="true"
    >
      <circle cx="12" cy="12" r="10" />
      <path d="M12 11v6M12 7h.01" />
    </svg>
  );
}

// The tab unmounts when the owner opens LAUNCHER, MODS or another screen: unsaved changes,
// the category and its part are kept here so they are still there on the way back.
let kept = { draft: {} as Draft, group: GROUPS[0] as string, part: "" };
/** Tests start from a clean tab. */
export const forgetRulesDraft = () => {
  kept = { draft: {}, group: GROUPS[0], part: "" };
};

export function RulesTab({ serverRoot }: { serverRoot: string }) {
  const [catalog, setCatalog] = useState<IniEntry[] | null>(null);
  const [saved, setSaved] = useState<Record<string, string>>({});
  const [secretsSet, setSecretsSet] = useState<string[]>([]);
  const [running, setRunning] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [draft, setDraft] = useState<Draft>(() => kept.draft);
  const [errors, setErrors] = useState<Record<string, MessageKey>>({});
  const [group, setGroupState] = useState<string>(() => kept.group);
  // "fields", "table" or the key of a list: which part of the category is shown.
  const [part, setPart] = useState(() => kept.part);
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState<string | null>(null);
  const [notice, setNotice] = useState<Notice | null>(null);
  const [busy, setBusy] = useState(false);
  const [toolCounts, setToolCounts] = useState({ custom: 0, backups: 0 });
  const undoRef = useRef<HTMLButtonElement>(null);

  const load = useCallback(async () => {
    const [entries, current, overview] = await Promise.all([
      getIniCatalog(),
      getIniValues(),
      serverOverview(),
    ]);
    setCatalog(entries);
    setSaved(current.values);
    setSecretsSet(current.secretsSet);
    setRunning(!["stopped", "failed"].includes(overview.state.state));
    // The counts in the rail are a convenience: a failure here must not hide the rules.
    const [custom, backups] = await Promise.all([
      getCustomIni().catch(() => null),
      listIniBackups().catch(() => null),
    ]);
    setToolCounts({
      custom: custom?.tracked.length ?? 0,
      backups: backups?.length ?? 0,
    });
  }, []);

  useEffect(() => {
    load().catch((err) => setLoadError(describeError(err)));
  }, [load, serverRoot]);

  useEffect(() => {
    if (notice?.undo) undoRef.current?.focus();
  }, [notice]);
  useEffect(() => {
    kept = { draft, group, part };
  }, [draft, group, part]);

  // Array keys are shown as attribute tables and list keys as list editors, not as rows.
  const fields = useMemo(
    () => (catalog ?? []).filter((e) => e.count === null && e.kind !== "list"),
    [catalog],
  );
  const setGroup = (g: string) => {
    setGroupState(g);
    setPart("");
    setQuery("");
  };

  if (loadError) {
    return (
      <p className="alert alert--error" role="alert">
        {t("rules.loadFailed", { reason: loadError })}
      </p>
    );
  }
  if (!catalog) return <p role="status">{t("rules.loading")}</p>;

  const fileValue = (e: IniEntry) => saved[e.key] ?? e.default ?? "";
  const shown = (e: IniEntry) => {
    if (!(e.key in draft)) return fileValue(e);
    return draft[e.key] ?? e.default ?? "";
  };
  const isDefault = (e: IniEntry, v: string) =>
    e.default !== null && sameValue(e, v, e.default);
  const differs = (e: IniEntry) =>
    !e.secret &&
    e.key in saved &&
    !(e.key in draft) &&
    !isDefault(e, saved[e.key]);
  const canRestore = (e: IniEntry) =>
    !e.secret &&
    (e.key in draft
      ? draft[e.key] !== null
      : e.key in saved && !isDefault(e, saved[e.key]));

  const edit = (next: Draft) => {
    setDraft(next);
    if (notice?.undo) setNotice(null);
  };
  const change = (e: IniEntry, value: string) => {
    const next = { ...draft };
    const unchanged = e.secret
      ? value === ""
      : e.key in saved
        ? sameValue(e, value, saved[e.key])
        : false;
    if (unchanged) delete next[e.key];
    else next[e.key] = value;
    edit(next);
    if (errors[e.key]) setErrors((all) => without(all, e.key));
  };
  const changeList = (e: IniEntry, value: string | null, text?: string) => {
    const next = { ...draft };
    if (value === (saved[e.key] ?? null)) delete next[e.key];
    else next[e.key] = value;
    setDraft(next);
    if (text) setNotice({ kind: "info", text, undo: draft });
    else if (notice?.undo) setNotice(null);
    if (errors[e.key]) setErrors((all) => without(all, e.key));
  };
  const restoreInto = (next: Draft, e: IniEntry) => {
    if (e.key in saved) next[e.key] = null;
    else delete next[e.key];
  };
  const restore = (e: IniEntry) => {
    const next = { ...draft };
    restoreInto(next, e);
    edit(next);
    setErrors((all) => without(all, e.key));
  };
  const check = (e: IniEntry) => {
    const v = draft[e.key];
    const problem =
      typeof v === "string" && !(e.secret && v === "") ? validate(e, v) : null;
    setErrors((all) =>
      problem ? { ...all, [e.key]: problem } : without(all, e.key),
    );
  };

  const inGroup = (g: string) => fields.filter((e) => e.group === g);
  const columnsOf = (g: string) =>
    catalog.filter((e) => e.group === g && e.count !== null);
  const byKey = new Map(catalog.map((e) => [e.key, e]));
  const entryOf = (key: string) => byKey.get(baseKey(key));
  const changedIn = (g: string) =>
    Object.keys(draft).filter((k) => entryOf(k)?.group === g).length;
  const searching = query.trim() !== "";
  const results = searching ? catalog.filter((e) => matches(e, query)) : [];
  const resultGroups = GROUPS.filter((g) => results.some((e) => e.group === g));
  const changes = Object.keys(draft).length;
  const errorKeys = Object.keys(errors);
  const listsOf = (g: string) =>
    catalog.filter((e) => e.group === g && e.kind === "list");
  const listValue = (e: IniEntry) =>
    e.key in draft ? (draft[e.key] ?? "") : (saved[e.key] ?? "");
  const lineCount = (e: IniEntry) =>
    listValue(e) === "" ? 0 : listValue(e).split("\n").length;
  const partsOf = (g: string) => [
    ...(inGroup(g).length ? ["fields"] : []),
    ...(columnsOf(g).length ? ["table"] : []),
    ...listsOf(g).map((e) => e.key),
  ];
  const tool = !searching && (TOOLS as readonly string[]).includes(group);
  const parts = partsOf(group);
  const current = parts.includes(part) ? part : parts[0];

  /** The cells a restore may touch: locked indexes stay as the file has them. */
  const editableCells = (cols: IniEntry[], only?: number) =>
    cols.flatMap((c) =>
      indexes(c)
        .filter(
          (i) =>
            (only === undefined || i === only) && !c.lockedIndexes.includes(i),
        )
        .map((i) => cellOf(c, i)),
    );
  const restoreMany = (targets: IniEntry[], what: string) => {
    const before = draft;
    const next = { ...draft };
    for (const e of targets) if (!e.secret) restoreInto(next, e);
    setDraft(next);
    setErrors((all) => {
      const rest = { ...all };
      for (const e of targets) delete rest[e.key];
      return rest;
    });
    setNotice({
      kind: "info",
      text: t("rules.categoryRestored", { category: what }),
      undo: before,
    });
  };
  const restoreGroup = () =>
    restoreMany(groupTargets(group), groupLabel(group));
  const discard = () => {
    setNotice({ kind: "info", text: t("rules.discarded"), undo: draft });
    setDraft({});
    setErrors({});
  };
  const undo = () => {
    if (notice?.undo) setDraft(notice.undo);
    setNotice(null);
  };

  async function save() {
    const found: Record<string, MessageKey> = {};
    for (const [key, value] of Object.entries(draft)) {
      const e = entryOf(key);
      const problem = e && value !== null ? validate(e, value) : null;
      if (problem) found[key] = problem;
    }
    setErrors(found);
    if (Object.keys(found).length > 0) return;
    setBusy(true);
    setNotice(null);
    try {
      await saveIniValues(draft);
      setDraft({});
      await load();
      setNotice({ kind: "ok", text: t("rules.saved") });
    } catch (err) {
      if (String(err) === "server_running") setRunning(true);
      setNotice({
        kind: "error",
        text: t("rules.saveFailed", { reason: describeError(err) }),
      });
    } finally {
      setBusy(false);
    }
  }

  const row = (e: IniEntry) => {
    const name = label(e);
    const id = `rule-${e.key}`;
    const value = shown(e);
    const unit = unitText(e);
    const error = errors[e.key];
    const describedBy = [
      `${id}-def`,
      unit && `${id}-unit`,
      error && `${id}-err`,
    ]
      .filter(Boolean)
      .join(" ");
    const pending = e.key in draft;
    return (
      <div className="rule-row" key={e.key}>
        <div className="rule-row__label">
          <div className="rule-row__line">
            {e.kind === "bool" ? (
              <span className="rule-row__name" id={`${id}-name`}>
                {name}
              </span>
            ) : (
              <label className="rule-row__name" htmlFor={id}>
                {name}
              </label>
            )}
            <button
              type="button"
              className="info-btn"
              aria-label={t("rules.info", { field: name })}
              aria-expanded={open === e.key}
              aria-controls={`${id}-info`}
              onClick={() => setOpen(open === e.key ? null : e.key)}
            >
              <InfoIcon />
            </button>
          </div>
          <span className="rule-row__key">
            {e.key} · {e.file === "game" ? "Game.ini" : "GameUserSettings.ini"}
          </span>
          <p className="info-text" id={`${id}-info`} hidden={open !== e.key}>
            {info(e)}
          </p>
        </div>
        <div className="rule-row__value">
          {e.kind === "bool" ? (
            <>
              <button
                type="button"
                role="switch"
                aria-checked={value === "True"}
                aria-labelledby={`${id}-name`}
                aria-describedby={describedBy}
                className={`switch${value === "True" ? " switch--on" : ""}`}
                onClick={() => change(e, value === "True" ? "False" : "True")}
              >
                <span />
              </button>
              <span className="rule-row__unit">
                {value === "True" ? t("rules.on") : t("rules.off")}
              </span>
            </>
          ) : (
            <>
              <input
                id={id}
                type={e.secret ? "password" : "text"}
                autoComplete={e.secret ? "new-password" : undefined}
                inputMode={
                  e.kind === "text"
                    ? undefined
                    : e.kind === "rate"
                      ? "decimal"
                      : "numeric"
                }
                placeholder={
                  e.secret ? t("rules.secretPlaceholder") : undefined
                }
                value={e.secret ? (draft[e.key] ?? "") : value}
                aria-invalid={error ? true : undefined}
                aria-describedby={describedBy}
                onChange={(ev) => change(e, ev.target.value)}
                onBlur={() => check(e)}
              />
              {unit && (
                <span className="rule-row__unit" id={`${id}-unit`}>
                  {unit}
                </span>
              )}
            </>
          )}
        </div>
        <div className="rule-row__meta">
          <span id={`${id}-def`}>
            {e.secret
              ? `${t("rules.secretHint")} (${secretsSet.includes(e.key) ? t("rules.secretSet") : t("rules.secretUnset")})`
              : e.default === null
                ? t("rules.noDefault")
                : t("rules.default", {
                    value:
                      e.kind === "bool"
                        ? e.default === "True"
                          ? t("rules.on")
                          : t("rules.off")
                        : e.default,
                  })}
            {pending && (
              <span className="rule-badge rule-badge--unsaved">
                {" "}
                {t("rules.unsaved")}
              </span>
            )}
            {differs(e) && (
              <span className="rule-badge rule-badge--differs">
                {" "}
                {t("rules.differs")}
              </span>
            )}
          </span>
          {!e.secret && (
            <button
              type="button"
              className="btn btn--ghost btn--tiny"
              aria-label={t("rules.restoreField", { field: name })}
              disabled={!canRestore(e)}
              onClick={() => restore(e)}
            >
              {t("rules.restore")}
            </button>
          )}
        </div>
        {error && (
          <p className="field-error" id={`${id}-err`}>
            {t(error, { max: String(e.max ?? "") })}
          </p>
        )}
      </div>
    );
  };

  const restoreButton = (field: string, cells: IniEntry[]) => (
    <button
      type="button"
      className="btn btn--ghost btn--tiny"
      aria-label={t("rules.restoreField", { field })}
      disabled={!cells.some(canRestore)}
      onClick={() => restoreMany(cells, field)}
    >
      {t("rules.restore")}
    </button>
  );

  const cellInput = (c: IniEntry, i: number, stat: string) => {
    if (c.lockedIndexes.includes(i)) {
      return (
        <td key={c.key} className="stat-table__locked">
          {t("rules.table.lockedCell")}
        </td>
      );
    }
    const e = cellOf(c, i);
    const id = `rule-${c.key}-${i}`;
    const error = errors[e.key];
    const badge = e.key in draft ? "unsaved" : differs(e) ? "differs" : null;
    const describedBy =
      [badge && `${id}-badge`, error && `${id}-err`]
        .filter(Boolean)
        .join(" ") || undefined;
    return (
      <td key={c.key}>
        <input
          id={id}
          type="text"
          inputMode="decimal"
          aria-label={t("rules.table.cell", { stat, column: label(c) })}
          value={shown(e)}
          aria-invalid={error ? true : undefined}
          aria-describedby={describedBy}
          onChange={(ev) => change(e, ev.target.value)}
          onBlur={() => check(e)}
        />
        {badge && (
          <span
            className={`rule-badge rule-badge--${badge}`}
            id={`${id}-badge`}
          >
            {t(badge === "unsaved" ? "rules.unsaved" : "rules.differs")}
          </span>
        )}
        {error && (
          <p className="field-error" id={`${id}-err`}>
            {t(error, { max: "" })}
          </p>
        )}
      </td>
    );
  };

  const attributeTable = (g: string) => {
    const cols = columnsOf(g);
    const rows = [...Array(Math.max(...cols.map((c) => c.count ?? 0))).keys()];
    const capId = `tbl-${g}-cap`;
    return (
      <div className="stat-table">
        <div className="stat-table__head">
          <p className="hint" id={capId}>
            {t("rules.table.caption", { value: `${cols[0].default} x` })}
          </p>
          <button
            type="button"
            className="btn btn--ghost btn--tiny"
            disabled={!editableCells(cols).some(canRestore)}
            onClick={() =>
              restoreMany(editableCells(cols), t("rules.table.whole"))
            }
          >
            {t("rules.table.restoreWhole")}
          </button>
        </div>
        <div className="stat-table__scroll">
          <table aria-labelledby={capId}>
            <thead>
              <tr>
                <th scope="col">{t("rules.table.stat")}</th>
                {cols.map((c) => (
                  <th scope="col" key={c.key}>
                    {label(c)}
                  </th>
                ))}
                <th scope="col">
                  <span className="sr-only">{t("rules.table.actions")}</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {rows.map((i) => {
                const stat = statLabel(i);
                const cells = editableCells(cols, i);
                return (
                  <tr key={i}>
                    <th scope="row">
                      {stat} <span className="rule-row__key">[{i}]</span>
                    </th>
                    {cells.length === 0 ? (
                      <td colSpan={cols.length} className="stat-table__locked">
                        {t("rules.table.locked")}
                      </td>
                    ) : (
                      cols.map((c) => cellInput(c, i, stat))
                    )}
                    <td>
                      {cells.length > 0 &&
                        restoreButton(
                          t("rules.table.row", { row: stat }),
                          cells,
                        )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot>
              <tr>
                <th scope="row">{t("rules.table.restoreFooter")}</th>
                {cols.map((c) => (
                  <td key={c.key}>
                    {restoreButton(
                      t("rules.table.column", { column: label(c) }),
                      editableCells([c]),
                    )}
                  </td>
                ))}
                <td />
              </tr>
            </tfoot>
          </table>
        </div>
        <dl className="stat-table__legend">
          {cols.map((c) => (
            <div key={c.key}>
              <dt>{label(c)}</dt>
              <dd>{info(c)}</dd>
            </div>
          ))}
        </dl>
      </div>
    );
  };

  const metaOf = (g: string) => {
    const n = inGroup(g).length;
    const l = listsOf(g).length;
    return [
      n > 0 && plural(n, "rules.fieldsOne", "rules.fields"),
      columnsOf(g).length > 0 && t("rules.tableOne"),
      l > 0 && plural(l, "rules.listsOne", "rules.lists"),
    ]
      .filter(Boolean)
      .join(" · ");
  };
  const groupTargets = (g: string) => [
    ...inGroup(g).filter((e) => !e.secret),
    ...editableCells(columnsOf(g)),
    ...listsOf(g),
  ];
  const partLabel = (p: string) => {
    if (p === "fields")
      return t("rules.part.fields", { count: String(inGroup(group).length) });
    if (p === "table")
      return t("rules.part.table", {
        count: String(columnsOf(group).length),
      });
    const e = byKey.get(p) as IniEntry;
    return `${label(e)} (${lineCount(e)})`;
  };
  const listEditor = (e: IniEntry) => (
    <ListEditor
      key={e.key}
      entry={e}
      value={listValue(e)}
      showErrors={Boolean(errors[e.key])}
      canRestore={listValue(e) !== ""}
      onChange={(v, text) => changeList(e, v, text)}
      onRestore={() => restoreMany([e], label(e))}
    />
  );

  const summary =
    changes === 0
      ? t("rules.noUnsaved")
      : (changes === 1
          ? t("rules.unsavedOne")
          : t("rules.unsavedCount", { count: String(changes) })) +
        (errorKeys.length
          ? `. ${t("rules.withErrors", { count: String(errorKeys.length) })}`
          : `. ${t("rules.backupFirst")}`);

  return (
    <div className="rules">
      <nav className="rules-rail" aria-label={t("rules.categories")}>
        {GROUPS.map((g) => (
          <button
            key={g}
            type="button"
            className="rules-rail__cat"
            aria-current={!searching && group === g ? "true" : undefined}
            onClick={() => setGroup(g)}
          >
            {groupLabel(g)}
            <span className="rules-rail__meta">
              {metaOf(g)}
              {changedIn(g) > 0 && (
                <b>
                  {" "}
                  ·{" "}
                  {changedIn(g) === 1
                    ? t("rules.unsavedOne")
                    : t("rules.unsavedCount", { count: String(changedIn(g)) })}
                </b>
              )}
            </span>
          </button>
        ))}
        {TOOLS.map((g) => (
          <button
            key={g}
            type="button"
            className="rules-rail__cat"
            aria-current={!searching && group === g ? "true" : undefined}
            onClick={() => setGroup(g)}
          >
            {groupLabel(g)}
            <span className="rules-rail__meta">
              {g === "custom"
                ? plural(toolCounts[g], "custom.countOne", "custom.count")
                : plural(toolCounts[g], "backups.countOne", "backups.count")}
            </span>
          </button>
        ))}
      </nav>
      <section className="rules-panel" aria-labelledby="rules-title">
        <div className="rules-top">
          <div className="field rules-select">
            <label htmlFor="rules-cat">{t("rules.category")}</label>
            <select
              id="rules-cat"
              value={group}
              onChange={(ev) => setGroup(ev.target.value)}
            >
              {[...GROUPS, ...TOOLS].map((g) => (
                <option key={g} value={g}>
                  {groupLabel(g)}
                </option>
              ))}
            </select>
          </div>
          <div className="field">
            <label htmlFor="rules-q">{t("rules.search")}</label>
            <input
              id="rules-q"
              type="search"
              placeholder={t("rules.searchPlaceholder")}
              value={query}
              onChange={(ev) => setQuery(ev.target.value)}
            />
          </div>
        </div>

        <p className="sr-only" role="status">
          {searching
            ? results.length
              ? t("rules.searchCount", {
                  count: String(results.length),
                  groups: String(resultGroups.length),
                })
              : t("rules.searchNone", { query: query.trim() })
            : ""}
        </p>
        {running && !tool && (
          <p className="alert alert--warn">{t("rules.serverRunning")}</p>
        )}

        <div className="rules-panel__head">
          <div>
            <h2 id="rules-title">
              {searching
                ? t("rules.searchTitle", { query: query.trim() })
                : groupLabel(group).toUpperCase()}
            </h2>
            <p className="hint">
              {searching
                ? results.length
                  ? t("rules.searchCount", {
                      count: String(results.length),
                      groups: String(resultGroups.length),
                    })
                  : t("rules.searchNone", { query: query.trim() })
                : tool
                  ? t(`${group as "custom" | "backups"}.hint`)
                  : t("rules.hint")}
            </p>
          </div>
          {!searching && !tool && (
            <button
              type="button"
              className="btn btn--ghost btn--small"
              disabled={
                !groupTargets(group).some((e) =>
                  e.kind === "list" ? listValue(e) !== "" : canRestore(e),
                )
              }
              onClick={restoreGroup}
            >
              {t("rules.restoreCategory")}
            </button>
          )}
        </div>

        {tool && group === "custom" && (
          <CustomIniPanel
            catalog={catalog}
            running={running}
            onSaved={() => void load()}
            onOpenGroup={setGroup}
          />
        )}
        {tool && group === "backups" && (
          <BackupsPanel running={running} onChanged={() => void load()} />
        )}

        {!searching && !tool && parts.length > 1 && (
          <div className="seg" role="group" aria-label={t("rules.part")}>
            {parts.map((p) => (
              <button
                key={p}
                type="button"
                aria-pressed={current === p}
                onClick={() => setPart(p)}
              >
                {partLabel(p)}
              </button>
            ))}
          </div>
        )}

        {!tool && (
          <div className="rule-list">
            {searching
              ? resultGroups.map((g) => (
                  <section
                    key={g}
                    aria-label={groupLabel(g)}
                    className="rule-group"
                  >
                    <h3 className="rule-group__title">{groupLabel(g)}</h3>
                    {results
                      .filter(
                        (e) =>
                          e.group === g &&
                          e.count === null &&
                          e.kind !== "list",
                      )
                      .map(row)}
                    {results.some((e) => e.group === g && e.count !== null) &&
                      attributeTable(g)}
                    {results
                      .filter((e) => e.group === g && e.kind === "list")
                      .map((e) => (
                        <div key={e.key} className="rule-group">
                          <h4 className="rule-group__title">{label(e)}</h4>
                          {listEditor(e)}
                        </div>
                      ))}
                  </section>
                ))
              : current === "table"
                ? attributeTable(group)
                : current === "fields"
                  ? inGroup(group).map(row)
                  : current && listEditor(byKey.get(current) as IniEntry)}
          </div>
        )}

        {!tool && (
          <div className="save-bar" role="region" aria-label={t("rules.save")}>
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
                      onClick={undo}
                    >
                      {t("rules.undo")}
                    </button>
                  )}
                </p>
              )}
              <p role="status" className={changes ? "save-bar__count" : "hint"}>
                {summary}
              </p>
            </div>
            <div className="save-bar__actions">
              <button
                type="button"
                className="btn btn--outline btn--small"
                disabled={changes === 0 || busy}
                onClick={discard}
              >
                {t("rules.discard")}
              </button>
              <button
                type="button"
                className="btn btn--primary"
                disabled={changes === 0 || busy || running}
                onClick={() => void save()}
              >
                {busy ? t("rules.saving") : t("rules.save")}
              </button>
            </div>
          </div>
        )}
      </section>
    </div>
  );
}
