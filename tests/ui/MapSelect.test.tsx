import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { MapSelect } from "../../src/screens/MapSelect";
import { MAPS, SETTINGS, overview } from "./fixtures";
import { nativeSpies, resetSpies } from "./native.mock";

vi.mock("../../src/lib/native", async () => (await import("./native.mock")).nativeSpies);

function renderScreen(props: Partial<Parameters<typeof MapSelect>[0]> = {}) {
  const onStarted = vi.fn();
  const onOpenSettings = vi.fn();
  render(
    <MapSelect
      maps={MAPS}
      overview={overview("stopped")}
      settings={SETTINGS}
      onStarted={onStarted}
      onOpenSettings={onOpenSettings}
      {...props}
    />,
  );
  return { onStarted, onOpenSettings };
}

beforeEach(resetSpies);

describe("MapSelect", () => {
  it("selects the last used map by default", () => {
    renderScreen();
    expect(screen.getByRole("button", { name: /ALPHA/ })).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByText("Vai iniciar em ALPHA")).toBeInTheDocument();
  });

  it("disables maps that are not installed", () => {
    renderScreen();
    expect(screen.getByRole("button", { name: /CHARLIE/ })).toBeDisabled();
    expect(screen.getByRole("button", { name: /BRAVO/ })).toBeEnabled();
  });

  it("hides unverified maps until the toggle is on", async () => {
    renderScreen();
    expect(screen.queryByRole("button", { name: /DELTA/ })).not.toBeInTheDocument();
    await userEvent.click(screen.getByLabelText("Mostrar mapas não verificados"));
    expect(screen.getByRole("button", { name: /DELTA/ })).toBeInTheDocument();
  });

  it("moves the selection and starts the chosen map", async () => {
    const { onStarted } = renderScreen();
    await userEvent.click(screen.getByRole("button", { name: /BRAVO/ }));
    expect(screen.getByRole("button", { name: /BRAVO/ })).toHaveAttribute("aria-pressed", "true");
    await userEvent.click(screen.getByRole("button", { name: "INICIAR SERVIDOR" }));
    expect(nativeSpies.startServer).toHaveBeenCalledWith("bravo");
    await waitFor(() => expect(onStarted).toHaveBeenCalled());
  });

  it("shows a translated error when the start is refused", async () => {
    nativeSpies.startServer.mockRejectedValue("port_in_use:27015");
    const { onStarted } = renderScreen();
    await userEvent.click(screen.getByRole("button", { name: "INICIAR SERVIDOR" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("A porta 27015 já está em uso");
    expect(onStarted).not.toHaveBeenCalled();
  });

  it("blocks the start while the server is running", () => {
    renderScreen({ overview: overview("running") });
    expect(screen.getByRole("button", { name: "SERVIDOR EM EXECUÇÃO" })).toBeDisabled();
  });

  it("shows skeletons while the maps load", () => {
    renderScreen({ maps: null });
    expect(screen.getByRole("status", { name: "Procurando mapas instalados" })).toBeInTheDocument();
  });

  it("shows the empty state and opens settings", async () => {
    const { onOpenSettings } = renderScreen({ maps: MAPS.map((m) => ({ ...m, installed: false })) });
    expect(screen.getByText("NENHUM MAPA ENCONTRADO")).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "ABRIR CONFIGURAÇÕES" }));
    expect(onOpenSettings).toHaveBeenCalled();
  });
});
