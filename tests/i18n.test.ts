import { describe, expect, it } from "vitest";
import { t } from "../src/i18n";
import { INI_CATALOG } from "../src/dev/mockTauri";
import { ptBR } from "../src/i18n/pt-BR";

describe("t", () => {
  it("returns the message for a key", () => {
    expect(t("app.title")).toBe("ENZ Launcher");
  });

  it("replaces named parameters", () => {
    expect(t("maps.startingAt", { map: "The Island" })).toBe(
      "Vai iniciar em The Island",
    );
  });

  it("has a message for every server state", () => {
    for (const state of ["stopped", "starting", "running", "stopping", "failed"]) {
      expect(ptBR).toHaveProperty(`state.${state}`);
      expect(ptBR).toHaveProperty(`state.sidebar.${state}`);
    }
  });

  it("has a label and an explanation for every catalog setting", () => {
    const table: Record<string, string> = ptBR;
    for (const e of INI_CATALOG) {
      for (let i = 0; i < (e.count ?? 0); i++) expect(table).toHaveProperty(`stat.${i}`);
      expect(table, e.key).toHaveProperty(`opt.${e.key}`);
      expect(table, e.key).toHaveProperty(`opt.${e.key}.info`);
      if (e.kind === "list") expect(table, e.key).toHaveProperty(`opt.${e.key}.row`);
      for (const c of e.columns) expect(table, `${e.key} ${c.name}`).toHaveProperty([`opt.${e.key}.col.${c.name}`]);
      expect(table, e.group).toHaveProperty(`rules.cat.${e.group}`);
      if (e.unit && e.unit !== "count") expect(table).toHaveProperty(`unit.${e.unit}`);
    }
  });

  it("never uses long dashes in user-facing text", () => {
    const joined = Object.values(ptBR).join(" ");
    expect(joined).not.toMatch(/[–—]/);
  });
});
