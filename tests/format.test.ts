import { describe, expect, it } from "vitest";
import { formatMemory, formatPercent, formatUptime } from "../src/lib/format";
import { describeError } from "../src/i18n/errors";

describe("formatUptime", () => {
  it("pads hours, minutes and seconds", () => {
    expect(formatUptime(3 * 3600 + 42 * 60 + 10)).toBe("03:42:10");
    expect(formatUptime(0)).toBe("00:00:00");
  });
});

describe("formatMemory", () => {
  it("uses GB with a decimal comma from 1 GB up", () => {
    expect(formatMemory(11.8 * 1024 ** 3)).toBe("11,8 GB");
  });
  it("uses MB below 1 GB", () => {
    expect(formatMemory(512 * 1024 ** 2)).toBe("512 MB");
  });
});

describe("formatPercent", () => {
  it("rounds to whole percent", () => {
    expect(formatPercent(30.6)).toBe("31%");
  });
});

describe("describeError", () => {
  it("translates known codes", () => {
    expect(describeError("map_not_installed")).toContain("não está instalado");
  });
  it("fills the port argument", () => {
    expect(describeError("port_in_use:27015")).toContain("27015");
  });
  it("falls back to a generic message", () => {
    expect(describeError("weird")).toContain("weird");
  });
});
