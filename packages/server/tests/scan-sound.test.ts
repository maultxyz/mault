import assert from "node:assert/strict";
import { test } from "node:test";
import { selectScanSound, toRuleCard, withScanRuleFields, type PlayingCard, type SoundRule } from "@magic-vault/shared";

const card: PlayingCard = {
  id: "card", name: "Example", image: null, set: "set", setName: "Set",
  collectorNumber: "1", rarity: "rare", typeLine: "Creature", colorIdentity: [],
  price: null, priceFoil: null,
};
function rule(clipGuid: string | null, extra: Partial<SoundRule> = {}): SoundRule {
  return {
    guid: "rule", gameGuid: "game", name: "Rule", position: 0, isEnabled: true,
    clipGuid, rules: { id: "group", combinator: "and", conditions: [{ id: "name", field: "name", operator: "equals", value: "Example" }] }, ...extra,
  };
}

test("scan sounds skip disabled and missing clips and preserve supplied priority", () => {
  const rules = [rule("disabled", { isEnabled: false }), rule(null), rule("first"), rule("second")];
  assert.equal(selectScanSound(card, rules, [{ field: "name", label: "Name", type: "string", path: "name", operators: [] }]), "first");
  assert.equal(selectScanSound(card, [...rules].reverse(), [{ field: "name", label: "Name", type: "string", path: "name", operators: [] }]), "second");
});

test("scan sounds evaluate scan fields through the same rule engine", () => {
  const foilRule = rule("foil", {
    rules: { id: "group", combinator: "and", conditions: [
      { id: "foil", field: "isFoil", operator: "equals", value: "foil" },
    ] },
  });
  const fields = withScanRuleFields([], []);
  assert.equal(selectScanSound(toRuleCard(card, { isFoil: true }), [foilRule], fields), "foil");
  assert.equal(selectScanSound(toRuleCard(card, { isFoil: false }), [foilRule], fields), null);
  assert.equal(selectScanSound(card, [], fields), null);
});
