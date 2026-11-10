import { vi } from "vitest";
import { INI_CATALOG } from "../../src/dev/mockTauri";
import { overview } from "./fixtures";

/** Replaces the native bridge with spies. Use with vi.mock(path, factory). */
export const nativeSpies = {
  startServer: vi.fn(),
  stopServer: vi.fn(),
  saveWorld: vi.fn(),
  regenWildDinos: vi.fn(),
  serverLogs: vi.fn(),
  saveSettings: vi.fn(),
  saveAdminPassword: vi.fn(),
  hasAdminPassword: vi.fn(),
  checkServerRoot: vi.fn(),
  pickFolder: vi.fn(),
  listMods: vi.fn(),
  applyMods: vi.fn(),
  getIniCatalog: vi.fn(),
  getIniValues: vi.fn(),
  saveIniValues: vi.fn(),
  serverOverview: vi.fn(),
  getCustomIni: vi.fn(),
  saveCustomIni: vi.fn(),
  listIniBackups: vi.fn(),
  restoreIniBackup: vi.fn(),
};

export function resetSpies() {
  for (const spy of Object.values(nativeSpies)) spy.mockReset();
  nativeSpies.startServer.mockResolvedValue(undefined);
  nativeSpies.stopServer.mockResolvedValue(undefined);
  nativeSpies.saveWorld.mockResolvedValue("World Saved");
  nativeSpies.regenWildDinos.mockResolvedValue("All Wild Dinos Destroyed");
  nativeSpies.serverLogs.mockResolvedValue(["linha 1"]);
  nativeSpies.saveSettings.mockResolvedValue(undefined);
  nativeSpies.saveAdminPassword.mockResolvedValue(undefined);
  nativeSpies.hasAdminPassword.mockResolvedValue(false);
  nativeSpies.checkServerRoot.mockResolvedValue(true);
  nativeSpies.pickFolder.mockResolvedValue(null);
  nativeSpies.listMods.mockResolvedValue([]);
  nativeSpies.applyMods.mockResolvedValue(undefined);
  nativeSpies.getIniCatalog.mockResolvedValue(INI_CATALOG);
  nativeSpies.getIniValues.mockResolvedValue({ values: {}, secretsSet: [] });
  nativeSpies.saveIniValues.mockResolvedValue(undefined);
  nativeSpies.serverOverview.mockResolvedValue(overview("stopped"));
  nativeSpies.getCustomIni.mockResolvedValue({ tracked: [], sections: [] });
  nativeSpies.saveCustomIni.mockResolvedValue(undefined);
  nativeSpies.listIniBackups.mockResolvedValue([]);
  nativeSpies.restoreIniBackup.mockResolvedValue(undefined);
}
