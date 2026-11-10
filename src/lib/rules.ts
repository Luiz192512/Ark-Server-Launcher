import type { MessageKey } from "../i18n";
import { ptBR } from "../i18n/pt-BR";
import { listError } from "./lists";
import type { IniEntry } from "./native";

/** Categories of the SERVIDOR E MAPA tab, in rail order (the catalog's `group`). */
export const GROUPS = [
  "general",
  "xp",
  "harvest",
  "creatures",
  "player",
  "breeding",
  "items",
  "building",
  "pvp",
  "world",
  "spawns",
  "engrams",
  "admin",
] as const;

// The catalog comes from the native core at run time, so a key may lack a text.
const table: Record<string, string | undefined> = ptBR;

export const label = (e: IniEntry) => table[`opt.${e.key}`] ?? e.key;
export const info = (e: IniEntry) => table[`opt.${e.key}.info`] ?? "";

export function unitText(e: IniEntry): string | null {
  if (!e.unit) return null;
  if (e.unit === "count")
    return table[`opt.${e.key}.unit`] ?? ptBR["unit.count"];
  return table[`unit.${e.unit}`] ?? null;
}

const NUMERIC = new Set(["rate", "int", "players", "port"]);

/** Same rules as the native core (ini_catalog.rs), so a value the UI accepts is never refused. */
export function validate(e: IniEntry, value: string): MessageKey | null {
  const v = value.trim();
  switch (e.kind) {
    case "bool":
      return v === "True" || v === "False" ? null : "rules.error.text";
    case "text":
      // eslint-disable-next-line no-control-regex
      return /[\u0000-\u001f\u007f]/.test(value) ||
        new TextEncoder().encode(value).length > 64
        ? "rules.error.text"
        : null;
    case "players":
      return /^\d+$/.test(v) && +v >= 1 && +v <= 255
        ? null
        : "rules.error.players";
    case "port":
      return /^\d+$/.test(v) && +v >= 1 && +v <= 65535
        ? null
        : "rules.error.port";
    case "int":
      if (!/^\d+$/.test(v)) return "rules.error.int";
      break;
    case "rate":
      if (!/^(\d+\.?\d*|\.\d+)$/.test(v)) return "rules.error.number";
      break;
    case "list":
      return listError(e, value);
  }
  return e.max !== null && Number(v) > e.max ? "rules.error.max" : null;
}

/** "1.000000" and "1" are the same number for the game. */
export function sameValue(e: IniEntry, a: string, b: string): boolean {
  return NUMERIC.has(e.kind) ? Number(a) === Number(b) : a === b;
}

const fold = (s: string) =>
  s
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase();

/** Search in the label, the explanation and the ini key. */
export function matches(e: IniEntry, query: string): boolean {
  const q = fold(query.trim());
  return (
    q !== "" && [label(e), info(e), e.key].some((s) => fold(s).includes(q))
  );
}
