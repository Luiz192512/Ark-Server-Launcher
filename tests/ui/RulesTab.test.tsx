import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import axe from "axe-core";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { forgetCustomDraft } from "../../src/screens/CustomIniPanel";
import { forgetRulesDraft, RulesTab } from "../../src/screens/RulesTab";
import { overview } from "./fixtures";
import { nativeSpies, resetSpies } from "./native.mock";

vi.mock("../../src/lib/native", async () => (await import("./native.mock")).nativeSpies);

beforeEach(() => {
  resetSpies();
  forgetRulesDraft();
  forgetCustomDraft();
  nativeSpies.getIniValues.mockResolvedValue({
    values: { MaxPlayers: "70", StructurePickupTimeAfterPlacement: "30.000000", bAllowPlatformSaddleMultiFloors: "True" },
    secretsSet: ["ServerAdminPassword"],
  });
});

async function open(category?: string) {
  render(<RulesTab serverRoot="D:\\srv" />);
  const rail = await screen.findByRole("navigation", { name: "Categorias de regras" });
  if (category) await userEvent.click(within(rail).getByRole("button", { name: new RegExp(`^${category}`) }));
  return rail;
}

const save = () => screen.getByRole("button", { name: "SALVAR" });

describe("Server rules tab", () => {
  it("lists every category with its field count from the catalog", async () => {
    const rail = await open();
    expect(within(rail).getByRole("button", { name: /^Construção18 campos/ })).toBeInTheDocument();
    expect(within(rail).getByRole("button", { name: /^Geral13 campos/ })).toBeInTheDocument();
    expect(screen.getByLabelText("Máximo de jogadores")).toHaveValue("70");
  });

  it("saves only the changed key and marks it as not saved", async () => {
    await open("Construção");
    const field = screen.getByLabelText("Tempo para pegar de volta");
    await userEvent.clear(field);
    await userEvent.type(field, "60");
    expect(screen.getAllByText(/Alteração não salva/).length).toBeGreaterThan(0);
    await userEvent.click(save());
    await waitFor(() =>
      expect(nativeSpies.saveIniValues).toHaveBeenCalledWith({ StructurePickupTimeAfterPlacement: "60" }),
    );
    expect(await screen.findByText(/Salvo\. O backup/)).toBeInTheDocument();
  });

  it("going back to the default removes a key the file sets", async () => {
    await open("Construção");
    expect(screen.getAllByText(/Fora do padrão/).length).toBe(1);
    await userEvent.click(screen.getByRole("button", { name: "Voltar ao padrão: Plataforma com vários andares" }));
    await userEvent.click(save());
    await waitFor(() =>
      expect(nativeSpies.saveIniValues).toHaveBeenCalledWith({ bAllowPlatformSaddleMultiFloors: null }),
    );
  });

  it("refuses an invalid value and explains it", async () => {
    await open("Construção");
    const field = screen.getByLabelText("Limite de torres na área");
    await userEvent.type(field, "12.5");
    await userEvent.tab();
    expect(field).toHaveAttribute("aria-invalid", "true");
    expect(screen.getByText(/número inteiro/)).toBeInTheDocument();
    await userEvent.click(save());
    expect(nativeSpies.saveIniValues).not.toHaveBeenCalled();
  });

  it("searches across categories", async () => {
    await open();
    await userEvent.type(screen.getByLabelText("BUSCAR CONFIGURAÇÃO"), "torre");
    expect(screen.getByRole("heading", { name: /RESULTADOS PARA “torre”/ })).toBeInTheDocument();
    expect(screen.getByRole("region", { name: "Construção" })).toBeInTheDocument();
    expect(screen.getByRole("region", { name: "Dinossauros" })).toBeInTheDocument();
  });

  it("locks saving while the server runs", async () => {
    nativeSpies.serverOverview.mockResolvedValue(overview("running"));
    await open();
    expect(await screen.findByText(/O servidor está rodando/)).toBeInTheDocument();
    await userEvent.type(screen.getByLabelText("Máximo de jogadores"), "1");
    expect(save()).toBeDisabled();
  });

  it("never shows a secret and only sends a new one when typed", async () => {
    await open("Administração");
    const pw = screen.getByLabelText("Senha de admin no ini (jogo e RCON)");
    expect(pw).toHaveValue("");
    expect(screen.getByText(/\(definida\)/)).toBeInTheDocument();
    await userEvent.type(pw, "nova");
    await userEvent.click(save());
    await waitFor(() => expect(nativeSpies.saveIniValues).toHaveBeenCalledWith({ ServerAdminPassword: "nova" }));
  });

  it("discarding can be undone", async () => {
    await open("Construção");
    await userEvent.type(screen.getByLabelText("Tempo para pegar de volta"), "5");
    await userEvent.click(screen.getByRole("button", { name: "DESCARTAR" }));
    expect(screen.getByText("Nada para salvar.")).toBeInTheDocument();
    const undo = screen.getByRole("button", { name: "Desfazer" });
    expect(undo).toHaveFocus();
    await userEvent.click(undo);
    expect(screen.getByLabelText("Tempo para pegar de volta")).toHaveValue("30.0000005");
  });

  it("keeps the draft and reports a failed write", async () => {
    nativeSpies.saveIniValues.mockRejectedValue("arquivo bloqueado");
    await open();
    await userEvent.type(screen.getByLabelText("Intervalo do autosave"), "0");
    await userEvent.click(save());
    expect(await screen.findByRole("alert")).toHaveTextContent(/Não consegui gravar: .*arquivo bloqueado/);
    expect(screen.getByLabelText("Intervalo do autosave")).toHaveValue("150");
  });

  it("shows the explanation on click, not only on hover", async () => {
    await open("Construção");
    const btn = screen.getByRole("button", { name: "Explicação: Plataforma com vários andares" });
    expect(btn).toHaveAttribute("aria-expanded", "false");
    await userEvent.click(btn);
    expect(btn).toHaveAttribute("aria-expanded", "true");
    expect(screen.getByText(/mais de um andar/)).toBeVisible();
  });

  describe("attribute tables", () => {
    const tamed = Object.fromEntries(
      ["DinoTamed", "DinoTamed_Add", "DinoTamed_Affinity"].flatMap((col) =>
        [0, 8].map((i) => [`PerLevelStatsMultiplier_${col}[${i}]`, col.endsWith("Affinity") ? "0.440000" : "0.600000"]),
      ),
    );
    beforeEach(() => {
      nativeSpies.getIniValues.mockResolvedValue({
        values: { ...tamed, "PerLevelStatsMultiplier_DinoWild[5]": "1.000000" },
        secretsSet: [],
      });
    });
    async function openTable(category = "Dinossauros") {
      await open(category);
      await userEvent.click(screen.getByRole("button", { name: /^Atributos por nível/ }));
      expect(screen.getByRole("button", { name: /^Atributos por nível/ })).toHaveAttribute("aria-pressed", "true");
    }
    const cell = (stat: string, column: string) => screen.getByRole("textbox", { name: `${stat}, ${column}` });

    it("loads the values the file has, exactly, and marks the ones off the default", async () => {
      await openTable();
      expect(cell("Vida", "Domesticado, por nível")).toHaveValue("0.600000");
      expect(cell("Dano corpo a corpo", "Bônus pela afinidade")).toHaveValue("0.440000");
      expect(cell("Vida", "Selvagem, por nível")).toHaveValue("1.0");
      expect(screen.getAllByText("Fora do padrão")).toHaveLength(6);
    });

    it("locks the attributes that have no effect for creatures and never sends them", async () => {
      await openTable();
      for (const stat of ["Água", "Temperatura", "Fortitude"]) {
        expect(screen.queryByRole("textbox", { name: `${stat}, Selvagem, por nível` })).toBeNull();
        expect(screen.getByRole("row", { name: new RegExp(`^${stat}`) })).toHaveTextContent(/Travado/);
      }
      await userEvent.click(screen.getByRole("button", { name: "Voltar ao padrão (tabela)" }));
      await userEvent.click(save());
      await waitFor(() => expect(nativeSpies.saveIniValues).toHaveBeenCalled());
      const sent = nativeSpies.saveIniValues.mock.calls[0][0];
      expect(Object.keys(sent).sort()).toEqual(Object.keys(tamed).sort());
      expect(Object.values(sent).every((v) => v === null)).toBe(true);
    });

    it("the player table only locks temperature", async () => {
      await openTable("Jogador");
      expect(cell("Água", "Jogador, por nível")).toHaveValue("1.0");
      expect(screen.queryByRole("textbox", { name: "Temperatura, Jogador, por nível" })).toBeNull();
    });

    it("saves an edited cell with its index", async () => {
      await openTable();
      const field = cell("Stamina", "Selvagem, por nível");
      await userEvent.clear(field);
      await userEvent.type(field, "2.5");
      expect(screen.getByText("Alteração não salva")).toBeInTheDocument();
      await userEvent.click(save());
      await waitFor(() =>
        expect(nativeSpies.saveIniValues).toHaveBeenCalledWith({ "PerLevelStatsMultiplier_DinoWild[1]": "2.5" }),
      );
    });

    it("restores a row and a column, and the restore can be undone", async () => {
      await openTable();
      await userEvent.click(screen.getByRole("button", { name: "Voltar ao padrão: Linha Vida" }));
      expect(cell("Vida", "Domesticado, por nível")).toHaveValue("1.0");
      expect(cell("Dano corpo a corpo", "Domesticado, por nível")).toHaveValue("0.600000");
      const undo = screen.getByRole("button", { name: "Desfazer" });
      expect(undo).toHaveFocus();
      await userEvent.click(undo);
      expect(cell("Vida", "Domesticado, por nível")).toHaveValue("0.600000");

      await userEvent.click(screen.getByRole("button", { name: "Voltar ao padrão: Coluna Bônus pela afinidade" }));
      await userEvent.click(save());
      await waitFor(() =>
        expect(nativeSpies.saveIniValues).toHaveBeenCalledWith({
          "PerLevelStatsMultiplier_DinoTamed_Affinity[0]": null,
          "PerLevelStatsMultiplier_DinoTamed_Affinity[8]": null,
        }),
      );
    });

    it("refuses an invalid cell", async () => {
      await openTable();
      const field = cell("Peso", "Bônus ao domesticar");
      await userEvent.clear(field);
      await userEvent.type(field, "-1");
      await userEvent.tab();
      expect(field).toHaveAttribute("aria-invalid", "true");
      await userEvent.click(save());
      expect(nativeSpies.saveIniValues).not.toHaveBeenCalled();
    });

    it("search finds a table column", async () => {
      await open();
      await userEvent.type(screen.getByLabelText("BUSCAR CONFIGURAÇÃO"), "afinidade");
      const region = screen.getByRole("region", { name: "Dinossauros" });
      expect(within(region).getByRole("table")).toBeInTheDocument();
    });

    it("has no axe violations", async () => {
      await openTable();
      const result = await axe.run(document.body, {
        rules: { "color-contrast": { enabled: false }, region: { enabled: false } },
      });
      expect(result.violations.map((v) => `${v.id}: ${v.help}`)).toEqual([]);
    });
  });

  describe("structured lists", () => {
    const a = '(FromClassName="MegaRaptor_Character_BP_C",ToClassName="Raptor_Character_BP_C")';
    const b = '(FromClassName="Spino_Character_BP_C",ToClassName="Rex_Character_BP_C")';
    beforeEach(() => {
      nativeSpies.getIniValues.mockResolvedValue({ values: { NPCReplacements: `${a}\n${b}` }, secretsSet: [] });
    });
    const field = (row: string, column: string) => screen.getByRole("textbox", { name: `${row}, ${column}` });

    it("shows every list of the category and loads the file's lines", async () => {
      const rail = await open("Spawn de criaturas");
      expect(within(rail).getByRole("button", { name: /^Spawn de criaturas4 listas/ })).toBeInTheDocument();
      expect(screen.getByRole("button", { name: "Substituir espécie (2)" })).toHaveAttribute("aria-pressed", "true");
      expect(screen.getByRole("button", { name: "Frequência de spawn (0)" })).toBeInTheDocument();
      expect(field("Regra 1", "Espécie que some")).toHaveValue("MegaRaptor_Character_BP_C");
      expect(field("Regra 2", "Espécie que nasce no lugar")).toHaveValue("Rex_Character_BP_C");
    });

    it("adds a rule, keeps the others as they were and saves the whole list", async () => {
      await open("Spawn de criaturas");
      await userEvent.click(screen.getByRole("button", { name: "+ Adicionar linha" }));
      expect(field("Regra 3", "Espécie que some")).toHaveFocus();
      // The longest real class names must stay whole, the layout must not cut the value.
      const long = "Bionic_Quetz_Character_BP_Winter_Event_Very_Long_Mod_Name_Variant_C";
      await userEvent.type(field("Regra 3", "Espécie que some"), long);
      await userEvent.type(field("Regra 3", "Espécie que nasce no lugar"), "Dodo_Character_BP_C");
      expect(field("Regra 3", "Espécie que some")).toHaveValue(long);
      await userEvent.click(save());
      await waitFor(() =>
        expect(nativeSpies.saveIniValues).toHaveBeenCalledWith({
          NPCReplacements: `${a}\n${b}\n(FromClassName="${long}",ToClassName="Dodo_Character_BP_C")`,
        }),
      );
    });

    it("refuses a species that is not a class name and points at the field", async () => {
      await open("Spawn de criaturas");
      const from = field("Regra 1", "Espécie que some");
      await userEvent.clear(from);
      await userEvent.type(from, "Spino");
      await userEvent.tab();
      expect(from).toHaveAttribute("aria-invalid", "true");
      expect(screen.getByText(/^Use o nome da classe/)).toBeInTheDocument();
      await userEvent.click(save());
      expect(nativeSpies.saveIniValues).not.toHaveBeenCalled();
      expect(screen.getByText(/1 com erro/)).toBeInTheDocument();
    });

    it("removing a rule can be undone and an empty list removes the lines", async () => {
      await open("Spawn de criaturas");
      await userEvent.click(screen.getByRole("button", { name: "Remover: Regra 1" }));
      expect(field("Regra 1", "Espécie que some")).toHaveValue("Spino_Character_BP_C");
      const undo = screen.getByRole("button", { name: "Desfazer" });
      expect(undo).toHaveFocus();
      await userEvent.click(undo);
      expect(field("Regra 1", "Espécie que some")).toHaveValue("MegaRaptor_Character_BP_C");

      await userEvent.click(screen.getByRole("button", { name: "Voltar ao padrão: Substituir espécie" }));
      expect(screen.getByText("Nenhuma linha. O jogo usa o comportamento padrão.")).toBeInTheDocument();
      await userEvent.click(save());
      await waitFor(() => expect(nativeSpies.saveIniValues).toHaveBeenCalledWith({ NPCReplacements: null }));
    });

    it("leaves a line it cannot edit safely untouched", async () => {
      nativeSpies.getIniValues.mockResolvedValue({
        values: { NPCReplacements: '(FromClassName="A_C",ToClassName="B_C",Weird=1)' },
        secretsSet: [],
      });
      await open("Spawn de criaturas");
      expect(screen.getByText(/não sabe editar sem perder algo/)).toBeInTheDocument();
      expect(screen.queryByRole("button", { name: "+ Adicionar linha" })).toBeNull();
    });

    it("edits the nested stack fields of an item", async () => {
      nativeSpies.getIniValues.mockResolvedValue({ values: {}, secretsSet: [] });
      await open("Itens");
      await userEvent.click(screen.getByRole("button", { name: "Pilha máxima por item (0)" }));
      await userEvent.click(screen.getByRole("button", { name: "+ Adicionar linha" }));
      await userEvent.type(field("Regra 1", "Item"), "PrimalItemResource_Stone_C");
      await userEvent.type(field("Regra 1", "Pilha máxima"), "1000");
      await userEvent.selectOptions(screen.getByRole("combobox", { name: "Regra 1, Ignorar multiplicador" }), "True");
      await userEvent.click(save());
      await waitFor(() =>
        expect(nativeSpies.saveIniValues).toHaveBeenCalledWith({
          ConfigOverrideItemMaxQuantity:
            '(ItemClassString="PrimalItemResource_Stone_C",Quantity=(MaxItemQuantity=1000,bIgnoreMultiplier=True))',
        }),
      );
    });

    it("search finds a list", async () => {
      await open();
      await userEvent.type(screen.getByLabelText("BUSCAR CONFIGURAÇÃO"), "NPCReplacements");
      const region = screen.getByRole("region", { name: "Spawn de criaturas" });
      expect(within(region).getByRole("table", { name: "Substituir espécie" })).toBeInTheDocument();
    });

    it("has no axe violations", async () => {
      await open("Spawn de criaturas");
      const result = await axe.run(document.body, {
        rules: { "color-contrast": { enabled: false }, region: { enabled: false } },
      });
      expect(result.violations.map((v) => `${v.id}: ${v.help}`)).toEqual([]);
    });
  });

  it("shows the loading state, then a load failure without losing the screen", async () => {
    nativeSpies.getIniValues.mockRejectedValue("stream did not contain valid UTF-8");
    render(<RulesTab serverRoot="D:\\srv" />);
    expect(screen.getByRole("status")).toHaveTextContent(/Lendo Game.ini/);
    expect(await screen.findByRole("alert")).toHaveTextContent(/Não consegui ler as regras do servidor/);
  });

  it("says when a search finds nothing, in a status region that is always there", async () => {
    await open();
    const status = document.querySelector<HTMLElement>(".rules > .rules-panel > p.sr-only[role=status]");
    expect(status).toBeInTheDocument();
    await userEvent.type(screen.getByLabelText("BUSCAR CONFIGURAÇÃO"), "zzzz");
    expect(status).toHaveTextContent(/Nada encontrado para “zzzz”/);
  });

  it("counts fields, tables and lists in the rail, with the singular for one", async () => {
    const rail = await open();
    expect(within(rail).getByRole("button", { name: /^Dinossauros12 campos · 1 tabela$/ })).toBeInTheDocument();
    expect(within(rail).getByRole("button", { name: /^Itens7 campos · 1 lista$/ })).toBeInTheDocument();
  });

  it("the category restore is off when nothing differs from the default", async () => {
    nativeSpies.getIniValues.mockResolvedValue({ values: {}, secretsSet: [] });
    await open("Construção");
    expect(screen.getByRole("button", { name: "Voltar ao padrão (categoria)" })).toBeDisabled();
  });

  it("keeps unsaved changes when the tab is left and opened again", async () => {
    const { unmount } = render(<RulesTab serverRoot="D:\\srv" />);
    const rail = await screen.findByRole("navigation", { name: "Categorias de regras" });
    await userEvent.click(within(rail).getByRole("button", { name: /^Construção/ }));
    await userEvent.type(screen.getByLabelText("Tempo para pegar de volta"), "5");
    unmount();
    render(<RulesTab serverRoot="D:\\srv" />);
    expect(await screen.findByLabelText("Tempo para pegar de volta")).toHaveValue("30.0000005");
    expect(screen.getByText("1 alteração não salva. Antes de gravar, o launcher faz backup dos dois ini.")).toBeInTheDocument();
  });

  it("has no axe violations", async () => {
    render(<RulesTab serverRoot="D:\\srv" />);
    await screen.findByRole("navigation", { name: "Categorias de regras" });
    const result = await axe.run(document.body, {
      rules: { "color-contrast": { enabled: false }, region: { enabled: false } },
    });
    expect(result.violations.map((v) => `${v.id}: ${v.help}`)).toEqual([]);
  });
});
