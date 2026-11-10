import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { Dashboard } from "../../src/screens/Dashboard";
import type { ServerStateName } from "../../src/lib/native";
import { MAPS, SETTINGS, overview } from "./fixtures";
import { nativeSpies, resetSpies } from "./native.mock";

vi.mock("../../src/lib/native", async () => (await import("./native.mock")).nativeSpies);

function renderDash(state: ServerStateName, over = {}, settings = SETTINGS) {
  const onChanged = vi.fn().mockResolvedValue(undefined);
  const onPickMap = vi.fn();
  render(
    <Dashboard
      overview={overview(state, over)}
      maps={MAPS}
      settings={settings}
      onChanged={onChanged}
      onPickMap={onPickMap}
    />,
  );
  return { onChanged, onPickMap };
}

beforeEach(resetSpies);

describe("Dashboard", () => {
  it("offers START when stopped and starts the last map", async () => {
    const { onChanged } = renderDash("stopped");
    await userEvent.click(screen.getByRole("button", { name: "INICIAR SERVIDOR" }));
    expect(nativeSpies.startServer).toHaveBeenCalledWith("alpha");
    await waitFor(() => expect(onChanged).toHaveBeenCalled());
  });

  it("asks to pick a map when none was ever used", async () => {
    const { onPickMap } = renderDash("stopped", { mapId: null }, { ...SETTINGS, lastMap: null });
    await userEvent.click(screen.getByRole("button", { name: "ESCOLHER MAPA" }));
    expect(onPickMap).toHaveBeenCalled();
  });

  it("requires a second click to stop a running server", async () => {
    renderDash("running");
    await userEvent.click(screen.getByRole("button", { name: "ENCERRAR SERVIDOR" }));
    expect(nativeSpies.stopServer).not.toHaveBeenCalled();
    await userEvent.click(screen.getByRole("button", { name: "CONFIRMAR ENCERRAR" }));
    expect(nativeSpies.stopServer).toHaveBeenCalledTimes(1);
  });

  it("cancels the stop confirmation", async () => {
    renderDash("running");
    await userEvent.click(screen.getByRole("button", { name: "ENCERRAR SERVIDOR" }));
    await userEvent.click(screen.getByRole("button", { name: "CANCELAR" }));
    expect(screen.getByRole("button", { name: "ENCERRAR SERVIDOR" })).toBeInTheDocument();
    expect(nativeSpies.stopServer).not.toHaveBeenCalled();
  });

  it("restarts by stopping and starting the same map", async () => {
    renderDash("running");
    await userEvent.click(screen.getByRole("button", { name: "REINICIAR" }));
    await waitFor(() => expect(nativeSpies.startServer).toHaveBeenCalledWith("alpha"));
    expect(nativeSpies.stopServer).toHaveBeenCalledTimes(1);
  });

  it("shows metrics for a running server", () => {
    renderDash("running");
    expect(screen.getByText("00:01:05")).toBeInTheDocument();
    expect(screen.getByText("31%")).toBeInTheDocument();
    expect(screen.getByText("8,0 GB")).toBeInTheDocument();
    expect(screen.getByText("indisponível")).toBeInTheDocument();
  });

  it("shows the player count when the server answers its query", () => {
    renderDash("running", { players: { current: 3, max: 70 } });
    expect(screen.getByText("3 / 70")).toBeInTheDocument();
    expect(screen.queryByText("indisponível")).not.toBeInTheDocument();
  });

  it("shows zero players as a number, not as unavailable", () => {
    renderDash("running", { players: { current: 0, max: 70 } });
    expect(screen.getByText("0 / 70")).toBeInTheDocument();
  });

  it("shows only the count when no player limit is known", () => {
    renderDash("running", { players: { current: 2, max: null } });
    expect(screen.getByText("2")).toBeInTheDocument();
    expect(screen.queryByText(/\//)).not.toBeInTheDocument();
  });

  it("warns when the PC has too little free memory to load the server", () => {
    renderDash("stopped", { availableMemoryBytes: 0.3 * 1024 ** 3 });
    expect(screen.getByRole("alert")).toHaveTextContent("Pouca memória livre no PC");
    expect(screen.getByRole("alert")).toHaveTextContent("cerca de 4 GB");
  });

  it("stays quiet about memory when there is enough", () => {
    renderDash("stopped");
    expect(screen.queryByText(/Pouca memória livre/)).not.toBeInTheDocument();
  });

  it("shows a disabled button while the server is stopping", () => {
    renderDash("stopping");
    expect(screen.getByRole("button", { name: "PARANDO..." })).toBeDisabled();
  });

  it("lets you cancel a start in progress, after a second press", async () => {
    renderDash("starting");
    await userEvent.click(screen.getByRole("button", { name: "ENCERRAR SERVIDOR" }));
    expect(nativeSpies.stopServer).not.toHaveBeenCalled();
    await userEvent.click(screen.getByRole("button", { name: "CONFIRMAR ENCERRAR" }));
    expect(nativeSpies.stopServer).toHaveBeenCalledTimes(1);
  });

  it("uses one hexagonal power button for start and stop", () => {
    const { rerender } = render(
      <Dashboard overview={overview("stopped")} maps={MAPS} settings={SETTINGS} onChanged={vi.fn()} onPickMap={vi.fn()} />,
    );
    expect(screen.getByRole("button", { name: "INICIAR SERVIDOR" }).className).toContain("power--stopped");
    rerender(
      <Dashboard overview={overview("running")} maps={MAPS} settings={SETTINGS} onChanged={vi.fn()} onPickMap={vi.fn()} />,
    );
    expect(screen.getByRole("button", { name: "ENCERRAR SERVIDOR" }).className).toContain("power--running");
  });

  it("explains a crash loop", () => {
    renderDash("failed");
    expect(screen.getByRole("alert")).toHaveTextContent("reinicialização automática foi pausada");
    expect(screen.getByRole("button", { name: "INICIAR SERVIDOR" })).toBeEnabled();
  });

  it("saves the world on demand and says when", async () => {
    renderDash("running");
    await userEvent.click(screen.getByRole("button", { name: "SALVAR JOGO" }));
    await waitFor(() => expect(nativeSpies.saveWorld).toHaveBeenCalledTimes(1));
    expect(await screen.findByText(/Mundo salvo às/)).toBeInTheDocument();
  });

  it("asks twice before destroying the wild dinos", async () => {
    renderDash("running");
    await userEvent.click(screen.getByRole("button", { name: "REGERAR SELVAGENS" }));
    expect(nativeSpies.regenWildDinos).not.toHaveBeenCalled();
    await userEvent.click(screen.getByRole("button", { name: "CONFIRMAR REGERAR" }));
    await waitFor(() => expect(nativeSpies.regenWildDinos).toHaveBeenCalledTimes(1));
    expect(await screen.findByText(/Dinos selvagens destruídos/)).toBeInTheDocument();
  });

  it("disables save and regen, and explains why, when RCON is not ready", () => {
    renderDash("running", { rconReady: false });
    expect(screen.getByRole("button", { name: "SALVAR JOGO" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "REGERAR SELVAGENS" })).toBeDisabled();
    expect(screen.getByText(/precisam de RCON ativo/)).toBeInTheDocument();
  });

  it("shows a translated error when the RCON password is refused", async () => {
    nativeSpies.saveWorld.mockRejectedValue("rcon_auth_failed");
    renderDash("running");
    await userEvent.click(screen.getByRole("button", { name: "SALVAR JOGO" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("recusou a senha de admin");
  });

  it("flags a server started outside the launcher", () => {
    renderDash("running", { external: true });
    expect(
      screen.getByText(/Este servidor foi iniciado fora do launcher/),
    ).toBeInTheDocument();
  });

  it("shows the error when stopping fails", async () => {
    nativeSpies.stopServer.mockRejectedValue("backup_failed:disco cheio");
    renderDash("running");
    await userEvent.click(screen.getByRole("button", { name: "ENCERRAR SERVIDOR" }));
    await userEvent.click(screen.getByRole("button", { name: "CONFIRMAR ENCERRAR" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("backup do save falhou");
  });
});
