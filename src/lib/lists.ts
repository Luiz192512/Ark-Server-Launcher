import type { MessageKey } from "../i18n";
import type { IniColumn, IniEntry } from "./native";

/** One list line as text per column ("" = field left out; `ints` as "10, 35, 75"). */
export type Row = Record<string, string>;

/** Same shape the native core accepts (ini_catalog.rs `parse_fields`): `(A=1,B="x",C=(D=2))`. */
function parseFields(line: string): [string, string][] | null {
  const out: [string, string][] = [];
  let at = 0;
  const group = (prefix: string): boolean => {
    if (line[at] !== "(") return false;
    at++;
    // "()" is a row the owner added and left empty: kept so it can still be edited.
    if (prefix === "" && line === "()") {
      at = 2;
      return true;
    }
    for (;;) {
      const eq = line.indexOf("=", at);
      if (eq < 0) return false;
      const name = line.slice(at, eq);
      if (!/^[A-Za-z0-9_[\]]+$/.test(name)) return false;
      const full = prefix ? `${prefix}.${name}` : name;
      at = eq + 1;
      if (line[at] === "(") {
        if (!group(full)) return false;
      } else if (line[at] === '"') {
        const end = line.indexOf('"', at + 1);
        if (end < 0) return false;
        out.push([full, line.slice(at + 1, end)]);
        at = end + 1;
      } else {
        const rest = line.slice(at);
        const end = rest.search(/[,)]/);
        if (end < 0 || /[("=]/.test(rest.slice(0, end))) return false;
        out.push([full, rest.slice(0, end)]);
        at += end;
      }
      if (line[at] === ",") at++;
      else if (line[at] === ")") {
        at++;
        return true;
      } else return false;
    }
  };
  return group("") && at === line.length ? out : null;
}

const bare = (e: IniEntry) =>
  e.columns.length === 1 && e.columns[0].name === "";

/** A file line as a row, or null when it has something the editor cannot keep. */
export function parseLine(e: IniEntry, line: string): Row | null {
  if (bare(e)) return { "": line.trim() };
  const fields = parseFields(line.trim());
  if (!fields) return null;
  const row: Row = Object.fromEntries(e.columns.map((c) => [c.name, ""]));
  const ints: Record<string, string[]> = {};
  for (const [name, value] of fields) {
    const m = /^(.*)\[(\d+)\]$/.exec(name);
    const col = e.columns.find((c) => c.name === (m ? m[1] : name));
    if (!col || (col.kind === "ints") !== Boolean(m)) return null;
    if (m) {
      const list = (ints[col.name] ??= []);
      if (list[+m[2]] !== undefined) return null;
      list[+m[2]] = value;
    } else {
      if (row[col.name] !== "") return null;
      row[col.name] =
        col.kind === "bool" && /^(true|false)$/i.test(value)
          ? value[0].toUpperCase() + value.slice(1).toLowerCase()
          : value;
    }
  }
  for (const [name, list] of Object.entries(ints)) {
    // A gap in the indexes cannot be shown as a plain list of numbers.
    if (Object.keys(list).length !== list.length) return null;
    row[name] = list.join(", ");
  }
  return row;
}

/** Every line of the list as rows; null when any line cannot be edited safely. */
export function parseList(e: IniEntry, raw: string): Row[] | null {
  if (raw === "") return [];
  const rows = raw.split("\n").map((l) => parseLine(e, l));
  return rows.every((r) => r !== null) ? (rows as Row[]) : null;
}

function render(fields: [string[], string][]): string {
  const parts: string[] = [];
  for (const [path] of fields) {
    const head = path[0];
    if (parts.some((p) => p.startsWith(`${head}=`))) continue;
    const same = fields.filter(([p]) => p[0] === head);
    parts.push(
      same.length === 1 && same[0][0].length === 1
        ? `${head}=${same[0][1]}`
        : `${head}=${render(same.map(([p, v]) => [p.slice(1), v]))}`,
    );
  }
  return `(${parts.join(",")})`;
}

/** The text after `Key=` for one row, fields in catalog order. */
export function serializeLine(e: IniEntry, row: Row): string {
  if (bare(e)) return row[""].trim();
  const fields: [string[], string][] = [];
  for (const c of e.columns) {
    const v = (row[c.name] ?? "").trim();
    if (v === "") continue;
    if (c.kind === "ints") {
      v.split(",").forEach((n, i) =>
        fields.push([[`${c.name}[${i}]`], n.trim()]),
      );
    } else {
      fields.push([c.name.split("."), c.quoted ? `"${v}"` : v]);
    }
  }
  return render(fields);
}

/** Characters that can never be part of a field; dropped as they are typed. */
export const strip = (c: IniColumn, v: string) =>
  v.replace(c.kind === "ints" ? /[\r\n"()=[\]]/g : /[\r\n"(),=[\]]/g, "");

/** Mirrors ColumnKind::is_valid in ini_catalog.rs. */
export function cellError(c: IniColumn, value: string): MessageKey | null {
  const v = value.trim();
  if (v === "") return c.optional ? null : "rules.error.required";
  switch (c.kind) {
    case "class":
      return /^[A-Za-z0-9_]{1,126}_C$/.test(v) ? null : "rules.error.class";
    case "tag":
      return /^[A-Za-z0-9_]{1,64}$/.test(v) ? null : "rules.error.tag";
    case "rate":
      return /^(\d+\.?\d*|\.\d+)$/.test(v) ? null : "rules.error.number";
    case "int":
      return /^\d+$/.test(v) && +v <= 4294967295 ? null : "rules.error.int";
    case "ints":
      return /^\d+(\s*,\s*\d+)*$/.test(v) ? null : "rules.error.ints";
    case "bool":
      return v === "True" || v === "False" ? null : "rules.error.text";
  }
}

/** The whole list value, as validate() needs it before saving. */
export function listError(e: IniEntry, raw: string): MessageKey | null {
  const rows = parseList(e, raw);
  if (!rows || rows.length === 0) return "rules.error.list";
  return rows.some((r) => e.columns.some((c) => cellError(c, r[c.name] ?? "")))
    ? "rules.error.list"
    : null;
}
