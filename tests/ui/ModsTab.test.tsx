import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { Settings } from "../../src/screens/Settings";
import { SETTINGS } from "./fixtures";
import { nativeSpies, resetSpies } from "./native.mock";

vi.mock("../../src/lib/native", async () => (await import("./native.mock")).nativeSpies);

const mod = (id: string, name: string, inSteam: boolean, onServer: boolean, active: boolean) => ({
  id,
  name,
  inSteam,
  onServer,
  active,
});

const MODS = [
  mod("10", "Omnicular", true, true, true),
  mod("20", "Stacks", true, true, true),
  mod("30", "Novo", true, false, false),
  mod("40", "Sem arquivos", false, false, false),
];

beforeEach(() => {
  resetSpies();
  nativeSpies.listMods.mockResolvedValue(MODS);
});

async function openMods() {
  render(<Settings settings={SETTINGS} onSaved={vi.fn()} />);
  await userEvent.click(screen.getByRole("tab", { name: "MODS" }));
  await screen.findByText("Omnicular");
}

const sw = (name: string) => screen.getByRole("switch", { name: `Carregar ${name} no servidor` });

describe("Mods tab", () => {
  it("puts active mods in one column and the others in the other", async () => {
    await openMods();
    const on = within(screen.getByRole("group", { name: "ATIVADOS" }));
    const off = within(screen.getByRole("group", { name: "DESATIVADOS" }));
    expect(on.getByText("Omnicular")).toBeInTheDocument();
    expect(on.getByText("Stacks")).toBeInTheDocument();
    expect(off.getByText("Novo")).toBeInTheDocument();
    expect(screen.getByText("ATIVADOS (2)")).toBeInTheDocument();
    expect(screen.getByText(/Será copiado para o servidor/)).toBeInTheDocument();
  });

  it("moves a mod to the other column when its switch is clicked", async () => {
    await openMods();
    await userEvent.click(sw("Novo"));
    expect(within(screen.getByRole("group", { name: "ATIVADOS" })).getByText("Novo")).toBeInTheDocument();
    await userEvent.click(sw("Omnicular"));
    expect(within(screen.getByRole("group", { name: "DESATIVADOS" })).getByText("Omnicular")).toBeInTheDocument();
  });

  it("reads the mods again on refresh and drops unsaved changes", async () => {
    await openMods();
    await userEvent.click(sw("Novo"));
    nativeSpies.listMods.mockResolvedValue([...MODS, mod("50", "Recém instalado", true, false, false)]);
    await userEvent.click(screen.getByRole("button", { name: "ATUALIZAR" }));
    expect(await screen.findByText("Recém instalado")).toBeInTheDocument();
    expect(within(screen.getByRole("group", { name: "DESATIVADOS" })).getByText("Novo")).toBeInTheDocument();
    expect(screen.getByText("Lista atualizada.")).toBeInTheDocument();
  });

  it("cannot switch on a mod that is neither in Steam nor on the server", async () => {
    await openMods();
    expect(sw("Sem arquivos")).toBeDisabled();
  });

  it("sends active mods in their load order, new ones last", async () => {
    await openMods();
    await userEvent.click(sw("Novo"));
    await userEvent.click(sw("Omnicular"));
    await userEvent.click(screen.getByRole("button", { name: "SALVAR" }));
    await waitFor(() => expect(nativeSpies.applyMods).toHaveBeenCalledWith(["20", "30"]));
    expect(await screen.findByText(/Mods atualizados/)).toBeInTheDocument();
  });

  it("explains a refusal while the server runs", async () => {
    nativeSpies.applyMods.mockRejectedValue("server_running");
    await openMods();
    await userEvent.click(screen.getByRole("button", { name: "SALVAR" }));
    expect(await screen.findByText(/Pare o servidor antes/)).toBeInTheDocument();
  });
});
