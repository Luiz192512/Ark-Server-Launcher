import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { Settings } from "../../src/screens/Settings";
import { SETTINGS } from "./fixtures";
import { nativeSpies, resetSpies } from "./native.mock";

vi.mock("../../src/lib/native", async () => (await import("./native.mock")).nativeSpies);

beforeEach(resetSpies);

describe("Settings", () => {
  it("saves the edited session name without touching the password", async () => {
    const onSaved = vi.fn().mockResolvedValue(undefined);
    render(<Settings settings={SETTINGS} onSaved={onSaved} />);
    const field = screen.getByLabelText("NOME DA SESSÃO");
    await userEvent.clear(field);
    await userEvent.type(field, "Casa");
    await userEvent.click(screen.getByRole("button", { name: "SALVAR" }));
    await waitFor(() => expect(nativeSpies.saveSettings).toHaveBeenCalled());
    expect(nativeSpies.saveSettings.mock.calls[0][0].sessionName).toBe("Casa");
    expect(nativeSpies.saveAdminPassword).not.toHaveBeenCalled();
    expect(await screen.findByText("Configurações salvas.")).toBeInTheDocument();
  });

  it("stores a typed password through the credential store only", async () => {
    render(<Settings settings={SETTINGS} onSaved={vi.fn().mockResolvedValue(undefined)} />);
    await userEvent.type(screen.getByLabelText("SENHA DE ADMINISTRADOR"), "segredo");
    await userEvent.click(screen.getByRole("button", { name: "SALVAR" }));
    await waitFor(() => expect(nativeSpies.saveAdminPassword).toHaveBeenCalledWith("segredo"));
    const saved = nativeSpies.saveSettings.mock.calls[0][0];
    expect(JSON.stringify(saved)).not.toContain("segredo");
  });

  it("warns when the folder has no server executable", async () => {
    nativeSpies.checkServerRoot.mockResolvedValue(false);
    render(<Settings settings={SETTINGS} onSaved={vi.fn()} />);
    expect(await screen.findByText(/não encontrado nesta pasta/)).toBeInTheDocument();
  });

  it("fills the folder from the picker", async () => {
    nativeSpies.pickFolder.mockResolvedValue("E:\\novo");
    render(<Settings settings={SETTINGS} onSaved={vi.fn()} />);
    await userEvent.click(screen.getByRole("button", { name: "PROCURAR" }));
    await waitFor(() => expect(screen.getByLabelText("PASTA DO SERVIDOR")).toHaveValue("E:\\novo"));
  });

  it("reports a save failure", async () => {
    nativeSpies.saveSettings.mockRejectedValue("disco protegido");
    render(<Settings settings={SETTINGS} onSaved={vi.fn()} />);
    await userEvent.click(screen.getByRole("button", { name: "SALVAR" }));
    expect(await screen.findByText(/Não consegui salvar: disco protegido/)).toBeInTheDocument();
  });

  it("toggles the backup switch", async () => {
    render(<Settings settings={SETTINGS} onSaved={vi.fn()} />);
    const toggle = screen.getByRole("switch", { name: "Backup do save ao parar" });
    expect(toggle).toHaveAttribute("aria-checked", "true");
    await userEvent.click(toggle);
    expect(toggle).toHaveAttribute("aria-checked", "false");
  });
});
