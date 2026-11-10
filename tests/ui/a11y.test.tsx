import { render } from "@testing-library/react";
import axe from "axe-core";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { Sidebar } from "../../src/components/Sidebar";
import { About } from "../../src/screens/About";
import { Dashboard } from "../../src/screens/Dashboard";
import { MapSelect } from "../../src/screens/MapSelect";
import { Settings } from "../../src/screens/Settings";
import { MAPS, SETTINGS, overview } from "./fixtures";
import { resetSpies } from "./native.mock";

vi.mock("../../src/lib/native", async () => (await import("./native.mock")).nativeSpies);

beforeEach(resetSpies);

// jsdom has no layout, so color contrast is covered by tests/contrast.test.ts.
async function violations(container: HTMLElement) {
  const result = await axe.run(container, {
    rules: { "color-contrast": { enabled: false }, region: { enabled: false } },
  });
  return result.violations.map((v) => `${v.id}: ${v.help}`);
}

describe("accessibility (axe)", () => {
  it("sidebar", async () => {
    const { container } = render(<Sidebar current="maps" serverState="running" onNavigate={vi.fn()} />);
    expect(await violations(container)).toEqual([]);
  });

  it("map select", async () => {
    const { container } = render(
      <MapSelect maps={MAPS} overview={overview("stopped")} settings={SETTINGS} onStarted={vi.fn()} onOpenSettings={vi.fn()} />,
    );
    expect(await violations(container)).toEqual([]);
  });

  it("dashboard in every state", async () => {
    for (const state of ["stopped", "starting", "running", "stopping", "failed"] as const) {
      const { container, unmount } = render(
        <Dashboard
          overview={overview(state)}
          maps={MAPS}
          settings={SETTINGS}
          onChanged={vi.fn().mockResolvedValue(undefined)}
          onPickMap={vi.fn()}
        />,
      );
      expect(await violations(container), state).toEqual([]);
      unmount();
    }
  });

  it("settings", async () => {
    const { container } = render(<Settings settings={SETTINGS} onSaved={vi.fn()} />);
    expect(await violations(container)).toEqual([]);
  });

  it("about", async () => {
    const { container } = render(<About info={{ name: "x", version: "0.1.0" }} />);
    expect(await violations(container)).toEqual([]);
  });
});
