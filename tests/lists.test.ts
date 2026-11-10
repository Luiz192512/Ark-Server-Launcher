import { describe, expect, it } from "vitest";
import { INI_CATALOG } from "../src/dev/mockTauri";
import { cellError, listError, parseLine, parseList, serializeLine } from "../src/lib/lists";

const entry = (key: string) => INI_CATALOG.find((e) => e.key === key)!;

// The exact lines verified in Phase 0 (docs/catalogo-ini-ase.md), each must come back unchanged.
const lines: [string, string][] = [
  ["NPCReplacements", '(FromClassName="MegaRaptor_Character_BP_C",ToClassName="Dodo_Character_BP_C")'],
  [
    "DinoSpawnWeightMultipliers",
    "(DinoNameTag=Bronto,SpawnWeightMultiplier=10.0,OverrideSpawnLimitPercentage=True,SpawnLimitPercentage=0.5)",
  ],
  ["DinoClassDamageMultipliers", '(ClassName="MegaRex_Character_BP_C",Multiplier=0.1)'],
  ["DinoClassResistanceMultipliers", '(ClassName="MegaRex_Character_BP_C",Multiplier=0.1)'],
  ["OverrideNamedEngramEntries", '(EngramClassName="EngramEntry_Campfire_C",EngramHidden=False)'],
  ["OverrideEngramEntries", "(EngramIndex=0,EngramHidden=False)"],
  ["EngramEntryAutoUnlocks", '(EngramClassName="EngramEntry_TekTeleporter_C",LevelToAutoUnlock=0)'],
  ["LevelExperienceRampOverrides", "(ExperiencePointsForLevel[0]=1,ExperiencePointsForLevel[1]=5)"],
  ["OverridePlayerLevelEngramPoints", "5"],
  [
    "ConfigOverrideItemMaxQuantity",
    '(ItemClassString="PrimalItemResource_Stone_C",Quantity=(MaxItemQuantity=1000,bIgnoreMultiplier=True))',
  ],
];

describe("structured lists", () => {
  it.each(lines)("%s round-trips the verified syntax exactly", (key, line) => {
    const e = entry(key);
    const row = parseLine(e, line);
    expect(row).not.toBeNull();
    expect(serializeLine(e, row!)).toBe(line);
    expect(listError(e, line)).toBeNull();
  });

  it("reads the ramp as a list of numbers and the nested stack fields by path", () => {
    expect(parseLine(entry("LevelExperienceRampOverrides"), lines[7][1])).toEqual({
      ExperiencePointsForLevel: "1, 5",
    });
    expect(parseLine(entry("ConfigOverrideItemMaxQuantity"), lines[9][1])).toMatchObject({
      "Quantity.MaxItemQuantity": "1000",
      "Quantity.bIgnoreMultiplier": "True",
    });
  });

  it("refuses to edit a line it could not write back the same", () => {
    const npc = entry("NPCReplacements");
    expect(parseLine(npc, '(FromClassName="A_C",ToClassName="B_C",Extra=1)')).toBeNull();
    expect(parseLine(npc, '(FromClassName="A_C",FromClassName="B_C")')).toBeNull();
    expect(parseLine(npc, "FromClassName=A_C")).toBeNull();
    const ramp = entry("LevelExperienceRampOverrides");
    expect(parseLine(ramp, "(ExperiencePointsForLevel[0]=1,ExperiencePointsForLevel[2]=5)")).toBeNull();
    expect(parseList(npc, `${lines[0][1]}\n(Broken`)).toBeNull();
  });

  it("writes a lowercase boolean back in the game's form", () => {
    const e = entry("OverrideNamedEngramEntries");
    const row = parseLine(e, '(EngramClassName="EngramEntry_Campfire_C",EngramHidden=true)')!;
    expect(serializeLine(e, row)).toBe('(EngramClassName="EngramEntry_Campfire_C",EngramHidden=True)');
  });

  it("validates each field the same way as the native core", () => {
    const [from] = entry("NPCReplacements").columns;
    expect(cellError(from, "Spino")).toBe("rules.error.class");
    expect(cellError(from, "")).toBe("rules.error.required");
    expect(cellError(from, "Spino_Character_BP_C")).toBeNull();
    const ramp = entry("LevelExperienceRampOverrides").columns[0];
    expect(cellError(ramp, "10, 35,75")).toBeNull();
    expect(cellError(ramp, "10,,35")).toBe("rules.error.ints");
    expect(listError(entry("NPCReplacements"), "()")).toBe("rules.error.list");
    expect(listError(entry("OverridePlayerLevelEngramPoints"), "8\n-1")).toBe("rules.error.list");
  });
});
