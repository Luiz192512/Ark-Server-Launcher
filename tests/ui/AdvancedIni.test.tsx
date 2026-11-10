import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import axe from "axe-core";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { forgetCustomDraft } from "../../src/screens/CustomIniPanel";
import { forgetRulesDraft, RulesTab } from "../../src/screens/RulesTab";
import { overview } from "./fixtures";
import { nativeSpies, resetSpies } from "./native.mock";

vi.mock("../../src/lib/native", async () => (await import("./native.mock")).nativeSpies);

const GM = "[/script/shootergame.shootergamemode]";
beforeEach(() => {
  resetSpies();
  forgetRulesDraft();
  forgetCustomDraft();
  nativeSpies.getCustomIni.mockResolvedValue({
    tracked: [{ file: "gus", section: "[ServerSettings]", key: "KickIdlePlayersPeriod" }],
    sections: [
      {
        file: "game",
        section: "[/Script/ShooterGame.ShooterGameMode]",
        lines: [{ key: "bUseSingleplayerSettings", value: "True", secret: false, isSet: true }],
      },
      {
        file: "gus",
        section: "[ServerSettings]",
        lines: [
          { key: "KickIdlePlayersPeriod", value: "3600", secret: false, isSet: true },
          { key: "SpectatorPassword", value: null, secret: true, isSet: true },
        ],
      },
    ],
  });
});

async function open(category: string) {
  render(<RulesTab serverRoot="D:\\srv" />);
  const rail = await screen.findByRole("navigation", { name: "Categorias de regras" });
  await userEvent.click(within(rail).getByRole("button", { name: new RegExp(`^${category}`) }));
  return rail;
}
const save = () => screen.getByRole("button", { name: "SALVAR" });
const feedback = () => document.getElementById("custom-feedback") as HTMLElement;

describe("INI personalizado", () => {
  it("lists the keys it created with the value from the file", async () => {
    const rail = await open("INI personalizado");
    expect(within(rail).getByRole("button", { name: /^INI personalizado1 chave$/ })).toBeInTheDocument();
    const row = await screen.findByRole("row", { name: /KickIdlePlayersPeriod/ });
    expect(row).toHaveTextContent("3600");
    expect(row).toHaveTextContent("GameUserSettings.ini");
  });

  it("warns before replacing a line the file already has, then saves only that key", async () => {
    await open("INI personalizado");
    await userEvent.type(await screen.findByLabelText("CHAVE"), "bUseSingleplayerSettings");
    expect(screen.getByText(/já está no seu Game.ini com o valor True/)).toBeInTheDocument();
    await userEvent.type(screen.getByLabelText("VALOR"), "False");
    await userEvent.click(screen.getByRole("button", { name: "ADICIONAR" }));
    expect(screen.getByLabelText("CHAVE")).toHaveValue("");
    expect(screen.getByRole("row", { name: /bUseSingleplayerSettings/ })).toHaveTextContent(/False.*Alteração não salva/);
    await userEvent.click(save());
    await waitFor(() =>
      expect(nativeSpies.saveCustomIni).toHaveBeenCalledWith([
        { file: "game", section: GM, key: "bUseSingleplayerSettings", value: "False" },
      ]),
    );
  });

  it("refuses a key another screen manages and offers a shortcut there", async () => {
    await open("INI personalizado");
    await userEvent.type(await screen.findByLabelText("CHAVE"), "KillXPMultiplier");
    // Not shown while typing: only once the field is left.
    expect(feedback()).not.toHaveTextContent(/tela própria/);
    await userEvent.tab();
    expect(feedback()).toHaveTextContent(/tela própria em Experiência/);
    await userEvent.click(screen.getByRole("button", { name: "Abrir Experiência" }));
    expect(screen.getByRole("heading", { name: "EXPERIÊNCIA" })).toBeInTheDocument();
  });

  it("refuses command line options, bad keys, duplicates and the mods key", async () => {
    await open("INI personalizado");
    const key = await screen.findByLabelText("CHAVE");
    const problem = async (text: string) => {
      await userEvent.clear(key);
      await userEvent.type(key, text);
      await userEvent.tab();
      return feedback().textContent;
    };
    expect(await problem("-ForceRespawnDinos")).toMatch(/linha de comando/);
    expect(await problem("Foo Bar")).toMatch(/Sem espaço/);
    await userEvent.selectOptions(screen.getByLabelText("ARQUIVO"), "gus");
    expect(await problem("KickIdlePlayersPeriod")).toMatch(/já está na lista/);
    expect(await problem("ActiveMods")).toMatch(/aba MODS/);
    await userEvent.click(screen.getByRole("button", { name: "ADICIONAR" }));
    expect(nativeSpies.saveCustomIni).not.toHaveBeenCalled();
    expect(screen.getByText("Nada para salvar.")).toBeInTheDocument();
  });

  it("edits and removes a key, and the removal can be undone before saving", async () => {
    await open("INI personalizado");
    await userEvent.click(await screen.findByRole("button", { name: "Editar KickIdlePlayersPeriod" }));
    expect(screen.getByLabelText("CHAVE")).toHaveValue("KickIdlePlayersPeriod");
    expect(screen.getByLabelText("VALOR")).toHaveValue("3600");
    await userEvent.clear(screen.getByLabelText("VALOR"));
    await userEvent.type(screen.getByLabelText("VALOR"), "1800");
    await userEvent.click(screen.getByRole("button", { name: "ATUALIZAR" }));

    await userEvent.click(screen.getByRole("button", { name: "Remover KickIdlePlayersPeriod" }));
    expect(screen.queryByRole("row", { name: /KickIdlePlayersPeriod/ })).toBeNull();
    const undo = screen.getByRole("button", { name: "Desfazer" });
    expect(undo).toHaveFocus();
    await userEvent.click(undo);
    await userEvent.click(screen.getByRole("button", { name: "Remover KickIdlePlayersPeriod" }));
    await userEvent.click(save());
    await waitFor(() =>
      expect(nativeSpies.saveCustomIni).toHaveBeenCalledWith([
        { file: "gus", section: "[ServerSettings]", key: "KickIdlePlayersPeriod", value: null },
      ]),
    );
  });

  it("never shows a secret-looking value", async () => {
    await open("INI personalizado");
    await userEvent.selectOptions(await screen.findByLabelText("ARQUIVO"), "gus");
    await userEvent.type(screen.getByLabelText("CHAVE"), "SpectatorPassword");
    expect(screen.getByLabelText("VALOR")).toHaveAttribute("type", "password");
    expect(screen.getByText(/com um valor definido/)).toBeInTheDocument();
  });

  it("locks saving while the server runs", async () => {
    nativeSpies.serverOverview.mockResolvedValue(overview("running"));
    await open("INI personalizado");
    await userEvent.type(await screen.findByLabelText("CHAVE"), "MaxTamedDinos");
    await userEvent.type(screen.getByLabelText("VALOR"), "5000");
    await userEvent.click(screen.getByRole("button", { name: "ADICIONAR" }));
    expect(save()).toBeDisabled();
  });

  it("has no axe violations", async () => {
    await open("INI personalizado");
    await screen.findByLabelText("CHAVE");
    const result = await axe.run(document.body, {
      rules: { "color-contrast": { enabled: false }, region: { enabled: false } },
    });
    expect(result.violations.map((v) => `${v.id}: ${v.help}`)).toEqual([]);
  });
});

describe("Backups", () => {
  const names = ["1793840000000", "1793830000000"];
  beforeEach(() => nativeSpies.listIniBackups.mockResolvedValue(names));

  it("asks before restoring, and Cancel or Escape leave everything as it was", async () => {
    const rail = await open("Backups");
    expect(within(rail).getByRole("button", { name: /^Backups2 cópias/ })).toBeInTheDocument();
    const buttons = await screen.findAllByRole("button", { name: /^Restaurar backup de/ });
    await userEvent.click(buttons[1]);
    const dialog = screen.getByRole("dialog", { name: "RESTAURAR BACKUP?" });
    expect(within(dialog).getByRole("button", { name: "CANCELAR" })).toHaveFocus();
    await userEvent.click(within(dialog).getByRole("button", { name: "CANCELAR" }));
    expect(screen.queryByRole("dialog")).toBeNull();
    expect(buttons[1]).toHaveFocus();

    await userEvent.click(buttons[1]);
    await userEvent.keyboard("{Escape}");
    expect(screen.queryByRole("dialog")).toBeNull();
    expect(nativeSpies.restoreIniBackup).not.toHaveBeenCalled();
  });

  it("restores the chosen copy and reads the files again", async () => {
    await open("Backups");
    await userEvent.click((await screen.findAllByRole("button", { name: /^Restaurar backup de/ }))[1]);
    const dialog = screen.getByRole("dialog");
    await userEvent.click(within(dialog).getByRole("button", { name: "RESTAURAR BACKUP" }));
    await waitFor(() => expect(nativeSpies.restoreIniBackup).toHaveBeenCalledWith(names[1]));
    expect(await screen.findByText(/restaurado\. O estado anterior virou uma cópia nova/)).toBeInTheDocument();
    expect(nativeSpies.getIniValues.mock.calls.length).toBeGreaterThan(1);
  });

  it("cannot restore while the server runs", async () => {
    nativeSpies.serverOverview.mockResolvedValue(overview("running"));
    await open("Backups");
    for (const b of await screen.findAllByRole("button", { name: /^Restaurar backup de/ })) expect(b).toBeDisabled();
  });

  it("explains when there is no copy yet", async () => {
    nativeSpies.listIniBackups.mockResolvedValue([]);
    await open("Backups");
    expect(await screen.findByText(/Nenhuma cópia ainda/)).toBeInTheDocument();
  });

  it("has no axe violations with the dialog open", async () => {
    await open("Backups");
    await userEvent.click((await screen.findAllByRole("button", { name: /^Restaurar backup de/ }))[0]);
    const result = await axe.run(document.body, {
      rules: { "color-contrast": { enabled: false }, region: { enabled: false } },
    });
    expect(result.violations.map((v) => `${v.id}: ${v.help}`)).toEqual([]);
  });
});
