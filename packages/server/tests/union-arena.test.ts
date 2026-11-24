import assert from "node:assert/strict";
import { test } from "node:test";
import {
  normalizeUnionArenaCard,
  unionArenaCardName,
  unionArenaRarity,
  unionArenaSetCode,
} from "../src/lib/adapters/union-arena/search";
import { UNION_ARENA_RARE_PRINTING_NAME_PATTERN } from "../src/lib/constants/card-search";
import type { TcgtrackingCatalogEntry } from "../src/lib/interfaces/tcgtracking";

function entry(
  name: string,
  number: string | null = "UE08BT/BCV-1-016",
  setAbbreviation: string | null = "UE08BT",
  ext: Record<string, unknown> | null = null,
  rarity: string | null = "Rare",
): TcgtrackingCatalogEntry {
  return {
    product: {
      id: 632525,
      name,
      number,
      rarity,
      ext_data: ext,
      image_url: null,
    },
    set: { id: 24015, name: "UE08BT: Black Clover", abbreviation: setAbbreviation },
  };
}

test("Union Arena names drop number, rarity and event tags but keep character forms", () => {
  const cases: [string, string][] = [
    ["Luck Voltia (016)", "Luck Voltia"],
    ["Yami Sukehiro (015) (SR**)", "Yami Sukehiro"],
    ["Obanai Iguro (003) (C*)", "Obanai Iguro"],
    ["Suzaku Kururugi (035) (Gold)", "Suzaku Kururugi"],
    ["Dorothy (Winner)", "Dorothy"],
    ["Eren Jaeger (Attack Titan) (093) (Gold)", "Eren Jaeger (Attack Titan)"],
    ["Asuna (Stacia, the Goddess of Creation) (019) (Box Topper Foil)", "Asuna (Stacia, the Goddess of Creation)"],
    ["Evangelion Test Type-01 (Spear of Gaius) (Regionals 26-27)", "Evangelion Test Type-01 (Spear of Gaius)"],
    ["Evangelion Test Type-01 Pseudo DMS Phase (SR***) (Serialized)", "Evangelion Test Type-01 Pseudo DMS Phase"],
    ["Action Point Card (AP03) (Nobara Kugisaki)", "Action Point Card (Nobara Kugisaki)"],
    ["Ichigo Kurosaki (Super Pre-Release Winner)", "Ichigo Kurosaki"],
    ["Gon Freecss (Gen Con 2024 Promo)", "Gon Freecss"],
    ["Terrible Tornado (Promotion Pack 2025)", "Terrible Tornado"],
    ["Muzan Kibutsuji (Geisha Form)", "Muzan Kibutsuji (Geisha Form)"],
  ];
  for (const [productName, cardName] of cases) {
    assert.equal(unionArenaCardName(entry(productName)), cardName);
  }
});

test("Union Arena set codes are the printed set before the slash", () => {
  assert.equal(unionArenaSetCode(entry("Luck Voltia")), "UE08BT");
  assert.equal(unionArenaSetCode(entry("Loyd Loyd", "UEPR/BLC-1-025", "UE01BT_RE")), "UEPR");
  assert.equal(unionArenaSetCode(entry("Byakuya", "UEX01BT/BLC-2-029", "UEX01BT")), "UEX01BT");
  assert.equal(unionArenaSetCode(entry("BP Counter", null, "UE10BT")), "UE10BT");
  assert.equal(unionArenaSetCode(entry("BP Counter", null, null)), "24015");
});

test("Union Arena abbreviated rarities expand to TCGplayer's long names", () => {
  assert.equal(unionArenaRarity("U"), "Uncommon");
  assert.equal(unionArenaRarity("SR**"), "Super Rare 2-Star");
  assert.equal(unionArenaRarity("PcSR"), "Precious Super Rare");
  assert.equal(unionArenaRarity("AP"), "Action Point");
  assert.equal(unionArenaRarity("Rare 1-Star"), "Rare 1-Star");
  assert.equal(unionArenaRarity("None"), "");
  assert.equal(unionArenaRarity(null), "");
});

test("Union Arena cards normalize TCGTracking ext data", () => {
  const card = normalizeUnionArenaCard(
    entry("Luck Voltia (016)", "UE08BT/BCV-1-016", "UE08BT", {
      Description: "[During Your Turn] This character gains 1000 BP.<br>\n[When Played] Switch this character to active.",
      SeriesName: "Black Clover",
      CardType: "Character",
      Affinities: "Black Bulls",
      ActivationEnergy: "Purple",
      RequiredEnergy: "4",
      ActionPointCost: "1",
      BattlePointBP: "3000+",
      Trigger: "[Draw] Draw a card.",
      GeneratedEnergy: "P",
    }),
    "632525",
    "en",
  );
  assert.equal(card.name, "Luck Voltia");
  assert.equal(card.collectorNumber, "UE08BT/BCV-1-016");
  assert.equal(card.set, "UE08BT");
  assert.equal(card.typeLine, "Character | Black Clover | Black Bulls");
  assert.equal(
    card.text,
    "[During Your Turn] This character gains 1000 BP.\n[When Played] Switch this character to active.\n\n[Draw] Draw a card.",
  );
  assert.equal(card.power, "3000+");
  assert.equal(card.cmc, 4);
  assert.deepEqual(card.colorIdentity, ["Purple"]);
  assert.equal(card.tcgplayerId, "632525");

  const lowercase = normalizeUnionArenaCard(
    entry("Rill Boismortier", "UE08BT/BCV-1-062", "UE08BT", {
      cardType: ["Character"],
      activationEnergy: "Red;Purple",
      requiredEnergy: null,
      battlePointBp: null,
    }),
    "632600",
    "en",
  );
  assert.equal(lowercase.typeLine, "Character");
  assert.deepEqual(lowercase.colorIdentity, ["Red", "Purple"]);
  assert.equal(lowercase.cmc, undefined);
  assert.equal(lowercase.text, undefined);
});

test("Union Arena rare printings are event and promo products, not star parallels", () => {
  const rarePrinting = new RegExp(UNION_ARENA_RARE_PRINTING_NAME_PATTERN);
  for (const name of [
    "Luck Voltia (016)",
    "Yami Sukehiro (015) (SR**)",
    "Eren Jaeger (Attack Titan) (094)",
    "Muzan Kibutsuji (Geisha Form)",
    "Action Point Card (AP03) (Nobara Kugisaki)",
  ]) {
    assert.equal(rarePrinting.test(name), false, name);
  }
  for (const name of [
    "Suzaku Kururugi (035) (Gold)",
    "Dorothy (Winner)",
    "Asuna (Stacia, the Goddess of Creation) (019) (Box Topper Foil)",
    "Leafa (Earth Goddess, Terraria) (026) (Release Event Participation)",
    "Evangelion Test Type-01 (Spear of Gaius) (Regionals 26-27)",
    "Evangelion Test Type-01 Pseudo DMS Phase (SR***) (Serialized)",
    "Asuna (Stacia, the Goddess of Creation) (Judge Pack)",
    "Ichigo Kurosaki (New York Comic Con 2024)",
    "Gon Freecss (Gen Con 2024 Promo)",
  ]) {
    assert.equal(rarePrinting.test(name), true, name);
  }
});
