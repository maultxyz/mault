import {
  listScannerControlActions,
  type ScannerControlCommand,
  type ScannerControlCommandNames,
} from "@magic-vault/shared";
import { describe, expect, it } from "vitest";
import type { ScannerTFunction } from "@/lib/interfaces/control-cards";
import { pickControlCardIllustration } from "./control-card-illustration";

const names: ScannerControlCommandNames = {
  collectionName: () => "Trade Binder",
  presetName: () => "Commander Staples",
  setName: (setCode) => setCode.toUpperCase(),
  conditionName: (condition) => condition,
};

const echoTranslation = ((key: string, values?: Record<string, string>) =>
  values ? `${key}:${Object.values(values).join(",")}` : key) as unknown as ScannerTFunction;

function pick(command: ScannerControlCommand, label = "") {
  return pickControlCardIllustration(
    command,
    listScannerControlActions(command, names),
    label,
    echoTranslation,
  );
}

describe("pickControlCardIllustration", () => {
  it("uses the matching artwork for a single fixed action", () => {
    expect(pick({ condition: "LP" })).toEqual({
      kind: "artwork",
      imagePath: "/control-cards/lightly-played-ruins.webp",
    });
    expect(pick({ forcedFoilType: null })).toEqual({
      kind: "artwork",
      imagePath: "/control-cards/not-foil.webp",
    });
  });

  it("writes dynamic rules text on a blank frame for collection and preset cards", () => {
    expect(pick({ collectionGuid: "collection-a", presetGuid: "preset-a" })).toEqual({
      kind: "frame",
      imagePath: "/control-cards/blank-blue.webp",
      text: {
        name: "controlCards.illustrated.names.collection:Trade Binder",
        typeLine: "controlCards.illustrated.typeLines.sorcery",
        rulesParagraphs: [
          "controlCards.illustrated.rules.collection:Trade Binder",
          "controlCards.illustrated.rules.preset:Commander Staples",
        ],
      },
    });
  });

  it("falls back to a frame when a fixed action is combined with another", () => {
    const illustration = pick({ condition: "NM", pauseScanner: true }, "Bulk NM");
    expect(illustration.kind).toBe("frame");
    if (illustration.kind !== "frame") return;
    expect(illustration.text.name).toBe("Bulk NM");
    expect(illustration.text.rulesParagraphs).toHaveLength(2);
  });
});
