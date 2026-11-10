import { useEffect, useRef, useState } from "react";
import { t, type MessageKey } from "../i18n";
import {
  cellError,
  parseList,
  serializeLine,
  strip,
  type Row,
} from "../lib/lists";
import type { IniColumn, IniEntry } from "../lib/native";
import { info, label } from "../lib/rules";

interface Props {
  entry: IniEntry;
  /** The lines joined by "\n"; "" when the file has none. */
  value: string;
  /** After a save attempt: show every error, not only the fields already left. */
  showErrors: boolean;
  canRestore: boolean;
  /** null means no lines (the game's default). A notice is shown with an undo. */
  onChange: (value: string | null, notice?: string) => void;
  onRestore: () => void;
}

const msg = (key: string, params?: Record<string, string>) =>
  t(key as MessageKey, params);

/** Editable table for a key the ini repeats once per line (one row per line). */
export function ListEditor({
  entry,
  value,
  showErrors,
  canRestore,
  onChange,
  onRestore,
}: Props) {
  const [rows, setRows] = useState<Row[] | null>(() => parseList(entry, value));
  const [touched, setTouched] = useState<Set<string>>(new Set());
  const emitted = useRef(value);
  const focusRow = useRef<number | null>(null);
  const body = useRef<HTMLTableSectionElement>(null);

  // A change from outside (discard, undo, restore) replaces what is being edited.
  useEffect(() => {
    if (value === emitted.current) return;
    emitted.current = value;
    setRows(parseList(entry, value));
    setTouched(new Set());
  }, [entry, value]);

  useEffect(() => {
    if (focusRow.current === null) return;
    body.current?.rows[focusRow.current]
      ?.querySelector<HTMLElement>("input, select")
      ?.focus();
    focusRow.current = null;
  });

  const id = `list-${entry.key}`;
  const name = label(entry);
  const rowLabel = (i: number) =>
    msg(`opt.${entry.key}.row`, { n: String(i + 1) });
  const colLabel = (c: IniColumn) => msg(`opt.${entry.key}.col.${c.name}`);

  const emit = (next: Row[], notice?: string) => {
    const text = next.map((r) => serializeLine(entry, r)).join("\n");
    emitted.current = text;
    setRows(next);
    onChange(next.length ? text : null, notice);
  };

  const restore = (
    <button
      type="button"
      className="btn btn--ghost btn--tiny"
      aria-label={t("rules.restoreField", { field: name })}
      disabled={!canRestore}
      onClick={onRestore}
    >
      {t("rules.list.restore")}
    </button>
  );

  if (rows === null) {
    return (
      <div className="stat-table list-editor">
        <div className="stat-table__head">
          <p className="hint">{info(entry)}</p>
          {restore}
        </div>
        <p className="alert alert--warn">{t("rules.list.readOnly")}</p>
        <pre className="list-preview">
          {value
            .split("\n")
            .map((l) => `${entry.key}=${l}`)
            .join("\n")}
        </pre>
      </div>
    );
  }

  const cell = (r: Row, i: number, c: IniColumn) => {
    const cid = `${id}-${i}-${c.name || "v"}`.replace(/\./g, "-");
    const field = t("rules.list.cell", {
      row: rowLabel(i),
      column: colLabel(c),
    });
    const error =
      showErrors || touched.has(cid) ? cellError(c, r[c.name] ?? "") : null;
    const set = (v: string) =>
      emit(rows.map((x, j) => (j === i ? { ...x, [c.name]: v } : x)));
    return (
      <td key={c.name}>
        {c.kind === "bool" ? (
          <select
            id={cid}
            aria-label={field}
            value={r[c.name]}
            onChange={(ev) => set(ev.target.value)}
          >
            <option value="">{t("rules.list.boolDefault")}</option>
            <option value="True">{t("rules.list.yes")}</option>
            <option value="False">{t("rules.list.no")}</option>
          </select>
        ) : (
          <input
            id={cid}
            type="text"
            className={
              c.kind === "class" || c.kind === "tag" ? "mono" : undefined
            }
            inputMode={
              c.kind === "rate"
                ? "decimal"
                : c.kind === "int"
                  ? "numeric"
                  : undefined
            }
            aria-label={field}
            placeholder={t("rules.list.example", { value: c.example })}
            value={r[c.name]}
            aria-invalid={error ? true : undefined}
            aria-describedby={error ? `${cid}-err` : undefined}
            onChange={(ev) => set(strip(c, ev.target.value))}
            onBlur={() => setTouched((s) => new Set(s).add(cid))}
          />
        )}
        {error && (
          <p className="field-error" id={`${cid}-err`}>
            {t(error)}
          </p>
        )}
      </td>
    );
  };

  const add = () => {
    focusRow.current = rows.length;
    emit([...rows, Object.fromEntries(entry.columns.map((c) => [c.name, ""]))]);
  };
  const remove = (i: number) =>
    emit(
      rows.filter((_, j) => j !== i),
      t("rules.list.removed", { row: rowLabel(i) }),
    );

  return (
    <div className="stat-table list-editor">
      <div className="stat-table__head">
        <p className="hint" id={`${id}-cap`}>
          {info(entry)}
        </p>
        {restore}
      </div>
      {rows.length > 0 ? (
        <div className="stat-table__scroll">
          <table
            className={`list-table${entry.columns.length > 2 ? " list-table--many" : ""}`}
            aria-label={name}
            aria-describedby={`${id}-cap`}
          >
            <thead>
              <tr>
                <th scope="col" className="list-table__row">
                  {t("rules.list.rowHead")}
                </th>
                {entry.columns.map((c) => (
                  <th
                    scope="col"
                    key={c.name}
                    className={
                      c.kind === "class" && entry.columns.length > 2
                        ? "list-table__wide"
                        : undefined
                    }
                  >
                    {colLabel(c)}
                  </th>
                ))}
                <th scope="col" className="list-table__actions">
                  <span className="sr-only">{t("rules.list.remove")}</span>
                </th>
              </tr>
            </thead>
            <tbody ref={body}>
              {rows.map((r, i) => (
                <tr key={i}>
                  <th scope="row">{rowLabel(i)}</th>
                  {entry.columns.map((c) => cell(r, i, c))}
                  <td>
                    <button
                      type="button"
                      className="btn btn--ghost btn--tiny"
                      aria-label={t("rules.list.removeRow", {
                        row: rowLabel(i),
                      })}
                      onClick={() => remove(i)}
                    >
                      {t("rules.list.remove")}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <p className="hint">{t("rules.list.empty")}</p>
      )}
      <button
        type="button"
        className="btn btn--outline btn--small list-editor__add"
        onClick={add}
      >
        {t("rules.list.add")}
      </button>
      <p className="hint">{t("rules.list.preview")}</p>
      <pre className="list-preview">
        {rows.length
          ? rows
              .map((r) => `${entry.key}=${serializeLine(entry, r)}`)
              .join("\n")
          : t("rules.list.previewEmpty")}
      </pre>
    </div>
  );
}
