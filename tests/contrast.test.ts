import { describe, expect, it } from "vitest";
import tokens from "../design/tokens.json";

function channel(v: number): number {
  const s = v / 255;
  return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
}

function luminance(hex: string): number {
  const n = Number.parseInt(hex.slice(1), 16);
  return (
    0.2126 * channel((n >> 16) & 255) +
    0.7152 * channel((n >> 8) & 255) +
    0.0722 * channel(n & 255)
  );
}

export function contrast(a: string, b: string): number {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
}

const c = tokens.color;
const LIGHT_DANGER = "#ff9a9a"; // text color used for danger labels on dark panels

// Text pairs actually used by the UI. WCAG AA needs 4.5 for body text.
const TEXT_PAIRS: [string, string, string][] = [
  ["body text on page", c.text, c.bg0],
  ["body text on panel", c.text, c.panel],
  ["soft text on page", c.textSoft, c.bg0],
  ["soft text on panel", c.textSoft, c.panel],
  ["muted text on page", c.muted, c.bg0],
  ["muted text on panel", c.muted, c.panel],
  ["muted text on sidebar", c.muted, c.bg1],
  ["teal text on page", c.teal, c.bg0],
  ["teal text on panel", c.teal, c.panel],
  ["amber text on page", c.amber, c.bg0],
  ["danger text on panel", LIGHT_DANGER, c.panel],
  ["danger border text on page", c.danger, c.bg0],
  ["dark text on teal button", c.onAccent, c.teal],
  ["dark text on danger button", c.onAccent, c.danger],
];

describe("color contrast (WCAG AA)", () => {
  it.each(TEXT_PAIRS)("%s is at least 4.5:1", (_name, fg, bg) => {
    expect(contrast(fg, bg)).toBeGreaterThanOrEqual(4.5);
  });

  it("matches the CSS tokens file", async () => {
    const { readFileSync } = await import("node:fs");
    const css = readFileSync("src/styles/tokens.css", "utf8");
    expect(css).toContain(`--color-teal: ${c.teal.toLowerCase()}`);
    expect(css).toContain(`--color-muted: ${c.muted.toLowerCase()}`);
  });
});
